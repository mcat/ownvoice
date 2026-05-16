import type { AppSettings } from "../types";
import {
  generateAllPhrases,
  retryFailed as retryFailedGen,
  embeddingFingerprint,
} from "./audioCache";
import {
  useAudioCacheStore,
  type SpeakerKey,
} from "../stores/audioCacheStore";
import {
  getPatientSpokenPhrases,
  getProviderSpokenPhrases,
  getPatientPainSentencesForSpeech,
} from "../data/phraseRegistry";
import { canCloneForLocale, baseLocale } from "../data/chatterboxLocales";
import { isGPUReady } from "./ttsEngine";
import { recordStage } from "../diagnostics/crashTombstone";

/**
 * Orchestrates background pre-generation of cloned-voice audio for the
 * patient and each provider. Sequential across speakers — WebGPU/WASM
 * TTS shares state that isn't safe to run concurrently.
 *
 * Trigger model:
 *   - App.tsx calls `runPreGeneration(cfg)` whenever the active patient,
 *     embedding set, or locale changes.
 *   - A fresh call aborts the previous run. Any in-flight worker await
 *     unblocks via the AbortSignal passed into generateAllPhrases.
 *   - Runs are resumable: `generateAllPhrases` skips cached phrases, so
 *     on page reload the runner just resumes from where it left off.
 */

let currentController: AbortController | null = null;
let currentRunId = 0;

export interface SpeakerPlan {
  key: SpeakerKey;
  speakerData: unknown;
  phrases: string[];
  /**
   * The patient this speaker belongs to. Set for patient base + pain
   * entries; null for provider entries (provider clips are not tracked
   * in the per-patient index).
   */
  patientId: string | null;
  /**
   * Base BCP 47 language tag for TTS synthesis (e.g. "en", "es").
   * Patient entries use caregiverLang; provider entries use patientLang.
   */
  languageId: string;
  /**
   * When true, the generator skips entirely if WebGPU isn't ready and
   * never falls back to WASM mid-run. Used for the 702-phrase pain
   * matrix whose WASM cost (hours) would be worse than no cache at all.
   */
  gpuOnly?: boolean;
}

/** A speaker is runnable if its speakerData yields a real fingerprint. */
function isRunnable(speakerData: unknown): boolean {
  return embeddingFingerprint(speakerData) !== "none";
}

/** Strip the raw patient UUID from a SpeakerKey for safe inclusion in
 *  diagnostic stage labels (which flow to localStorage and the audit
 *  log). Patient IDs are hashed elsewhere in the audit pipeline; this
 *  preserves the WORKFLOW shape ("patient", "patient:pain",
 *  "provider:N") without leaking the per-patient identifier.
 *  Exported for the PHI-invariant test in audioCacheRunner.test.ts. */
export function speakerKindForLog(key: SpeakerKey): string {
  const parts = key.split(":");
  if (parts[0] === "patient") {
    return parts[2] === "pain" ? "patient:pain" : "patient";
  }
  return key; // "provider:N" is already a workflow descriptor.
}

function buildPlan(cfg: AppSettings): SpeakerPlan[] {
  const plan: SpeakerPlan[] = [];
  const activeId = cfg.activePatientId;
  const activePatient = activeId
    ? cfg.patients.find((p) => p.id === activeId)
    : null;
  if (!activePatient) return plan;

  // Patient voice speaks caregiverLang; provider voice speaks patientLang.
  const patientLangId = baseLocale(cfg.caregiverLang);
  const providerLangId = baseLocale(activePatient.patientLang);

  if (
    canCloneForLocale(cfg.caregiverLang) &&
    isRunnable(activePatient.speakerData)
  ) {
    plan.push({
      key: `patient:${activePatient.id}`,
      speakerData: activePatient.speakerData,
      phrases: getPatientSpokenPhrases(cfg.caregiverLang),
      patientId: activePatient.id,
      languageId: patientLangId,
    });
  }

  if (canCloneForLocale(activePatient.patientLang)) {
    cfg.providers.forEach((p, i) => {
      if (isRunnable(p.embedding)) {
        plan.push({
          key: `provider:${i}`,
          speakerData: p.embedding,
          phrases: getProviderSpokenPhrases(activePatient.patientLang),
          patientId: null,
          languageId: providerLangId,
        });
      }
    });
  }

  // Pain matrix: ~700 composed sentences, runs last and only when GPU is
  // available. On WASM-only systems it's omitted entirely (WASM would take
  // hours) — pain taps continue to fall through to Web Speech per speak.ts.
  if (
    canCloneForLocale(cfg.caregiverLang) &&
    isRunnable(activePatient.speakerData) &&
    isGPUReady()
  ) {
    plan.push({
      key: `patient:${activePatient.id}:pain`,
      speakerData: activePatient.speakerData,
      phrases: getPatientPainSentencesForSpeech(cfg.caregiverLang),
      patientId: activePatient.id,
      languageId: patientLangId,
      gpuOnly: true,
    });
  }
  return plan;
}

/**
 * Start (or restart) pre-generation. Safe to call repeatedly — earlier
 * runs abort cleanly. Returns a promise that resolves when the full
 * sequence finishes or is aborted.
 */
export async function runPreGeneration(cfg: AppSettings): Promise<void> {
  // Cancel any in-flight controller without calling the public `abort()`,
  // which also calls store.abortAll() and would wipe steady-state entries
  // that VoiceCloneStatus's reconciler-on-mount seeded with `done`. We
  // want to *cancel work*, not *wipe state* — the per-speaker isAlreadyDone
  // check below decides what to keep.
  if (currentController) {
    currentController.abort();
    currentController = null;
  }

  const plan = buildPlan(cfg);
  if (plan.length === 0) return;

  const activePatient = cfg.activePatientId
    ? cfg.patients.find((p) => p.id === cfg.activePatientId)
    : null;
  const locale = activePatient?.patientLang ?? cfg.caregiverLang;

  const controller = new AbortController();
  currentController = controller;
  const runId = ++currentRunId;

  const store = useAudioCacheStore.getState();

  // A speaker is "already at the desired terminal state" when the store
  // already holds `done` for the same fingerprint AND locale AND total —
  // i.e. nothing has changed that would invalidate the prior pre-gen run.
  // VoiceCloneStatus's reconciler-on-mount writes exactly this shape after
  // verifying OPFS, so without this gate every reload would briefly flash
  // through "Preparing 0/N" → "all N ready" while generateAllPhrases
  // re-iterated the cached entries. Match on locale + total because
  // fingerprint alone doesn't encode the corpus the run was scoped to.
  function isAlreadyDone(speaker: SpeakerPlan, fingerprint: string): boolean {
    const existing = useAudioCacheStore.getState().runs[speaker.key];
    return (
      !!existing &&
      existing.status === "done" &&
      existing.fingerprint === fingerprint &&
      existing.locale === locale &&
      existing.total === speaker.phrases.length
    );
  }

  // Seed every planned speaker as "queued" up front so VoiceCloneStatus
  // has a row to render for providers while the patient run is still in
  // progress. Without this, provider rows stay blank for the full patient
  // pass (~150 phrases) before their own run even starts.
  for (const speaker of plan) {
    const fingerprint = embeddingFingerprint(speaker.speakerData);
    if (isAlreadyDone(speaker, fingerprint)) continue;
    store.queue(speaker.key, speaker.phrases.length, locale, fingerprint);
  }

  // Track whether any speaker actually ran. A re-entry where every
  // speaker is already done — common after the #290 visibility backoff
  // wakes pre-gen back up with nothing to do — should not pollute the
  // tombstone trail with a spurious `pregen:all-done` stage label.
  let workDone = false;

  for (const speaker of plan) {
    if (controller.signal.aborted || runId !== currentRunId) return;

    const fingerprint = embeddingFingerprint(speaker.speakerData);
    if (isAlreadyDone(speaker, fingerprint)) continue;
    workDone = true;
    recordStage(`pregen:${speakerKindForLog(speaker.key)}:start`);
    store.start(
      speaker.key,
      speaker.phrases.length,
      locale,
      fingerprint,
    );

    try {
      for await (const progress of generateAllPhrases(
        speaker.phrases,
        speaker.speakerData,
        controller.signal,
        { gpuOnly: speaker.gpuOnly === true, patientId: speaker.patientId, languageId: speaker.languageId },
      )) {
        if (controller.signal.aborted) return;
        recordStage(
          `pregen:${speakerKindForLog(speaker.key)}:${progress.current}/${speaker.phrases.length}`,
        );
        if (progress.failed) {
          store.fail(speaker.key, progress.phrase, progress.current);
        } else {
          store.progress(speaker.key, progress.phrase, progress.current);
        }
      }
      if (!controller.signal.aborted) {
        recordStage(`pregen:${speakerKindForLog(speaker.key)}:done`);
        store.finish(speaker.key);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.warn(
        `[OwnVoice:CacheRunner] Run for ${speaker.key} errored:`,
        err,
      );
      store.finish(speaker.key);
    }
  }
  if (workDone) {
    recordStage("pregen:all-done");
  }
}

/** Retry only the previously-failed phrases for one speaker. */
export async function retryFailed(
  cfg: AppSettings,
  key: SpeakerKey,
): Promise<void> {
  const plan = buildPlan(cfg);
  const speaker = plan.find((p) => p.key === key);
  if (!speaker) return;

  const activePatient = cfg.activePatientId
    ? cfg.patients.find((p) => p.id === cfg.activePatientId)
    : null;
  const locale = activePatient?.patientLang ?? cfg.caregiverLang;

  const store = useAudioCacheStore.getState();
  const prev = store.runs[key];
  const failed = prev?.failedPhrases ?? [];
  if (failed.length === 0) return;

  const controller = new AbortController();
  // Retries reuse currentController so abort() still stops them.
  currentController = controller;
  const runId = ++currentRunId;

  store.resetFailed(key);
  const fingerprint = embeddingFingerprint(speaker.speakerData);
  store.start(key, failed.length, locale, fingerprint);

  try {
    for await (const progress of retryFailedGen(
      failed,
      speaker.speakerData,
      controller.signal,
      { gpuOnly: speaker.gpuOnly === true, patientId: speaker.patientId, languageId: speaker.languageId },
    )) {
      if (controller.signal.aborted || runId !== currentRunId) return;
      if (progress.failed) {
        store.fail(key, progress.phrase, progress.current);
      } else {
        store.progress(key, progress.phrase, progress.current);
      }
    }
    if (!controller.signal.aborted) store.finish(key);
  } catch (err) {
    if (controller.signal.aborted) return;
    console.warn(`[OwnVoice:CacheRunner] Retry for ${key} errored:`, err);
    store.finish(key);
  }
}

/** Cancel any in-flight run. Safe to call when nothing is running. */
export function abort(): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  useAudioCacheStore.getState().abortAll();
}

/**
 * Soft-stop: abort the in-flight run but keep store state intact and
 * mark running speakers as "paused". Resumable via `resumeAll`.
 */
export function pauseAll(): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  useAudioCacheStore.getState().pauseAllRuns();
}

/**
 * Resume a paused run. Internally this just re-enters `runPreGeneration`
 * — cached phrases are skipped by the generator, so the counter catches
 * up quickly to where the paused run left off. Safe to call even if no
 * runs are paused; it will kick off a fresh plan.
 */
export async function resumeAll(cfg: AppSettings): Promise<void> {
  await runPreGeneration(cfg);
}

/**
 * Transition helper for switching active patients. Synchronously pauses
 * any in-flight run, then kicks off pre-generation for the new patient
 * on the next microtask. Callers (App.tsx) should call this after
 * updating `cfg.activePatientId`.
 */
export function switchPatientTransition(cfg: AppSettings): void {
  pauseAll();
  queueMicrotask(() => runPreGeneration(cfg));
}

/**
 * Permanently discard this speaker's run state and stop the current run.
 * Other speakers in the plan also stop (we abort the shared controller);
 * callers who want them to continue should call `resumeAll` afterward.
 * Cached OPFS audio for the speaker is left in place — discard affects
 * progress state only. Call `resetAll` or `clearAudioCache` to wipe the
 * on-disk cache itself.
 */
export function discardRun(key: SpeakerKey): void {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
  useAudioCacheStore.getState().discard(key);
}
