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
import { canCloneForLocale } from "../data/chatterboxLocales";
import { isGPUReady } from "./ttsEngine";

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

function buildPlan(cfg: AppSettings): SpeakerPlan[] {
  const plan: SpeakerPlan[] = [];
  const activeId = cfg.activePatientId;
  const activePatient = activeId
    ? cfg.patients.find((p) => p.id === activeId)
    : null;
  if (!activePatient) return plan;

  if (
    canCloneForLocale(cfg.caregiverLang) &&
    isRunnable(activePatient.speakerData)
  ) {
    plan.push({
      key: `patient:${activePatient.id}`,
      speakerData: activePatient.speakerData,
      phrases: getPatientSpokenPhrases(cfg.caregiverLang),
      patientId: activePatient.id,
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
  abort();

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

  // Seed every planned speaker as "queued" up front so VoiceCacheProgress
  // has a row to render for providers while the patient run is still in
  // progress. Without this, provider rows stay blank for the full patient
  // pass (~150 phrases) before their own run even starts.
  for (const speaker of plan) {
    store.queue(
      speaker.key,
      speaker.phrases.length,
      locale,
      embeddingFingerprint(speaker.speakerData),
    );
  }

  for (const speaker of plan) {
    if (controller.signal.aborted || runId !== currentRunId) return;

    const fingerprint = embeddingFingerprint(speaker.speakerData);
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
        { gpuOnly: speaker.gpuOnly === true, patientId: speaker.patientId },
      )) {
        if (controller.signal.aborted) return;
        if (progress.failed) {
          store.fail(speaker.key, progress.phrase, progress.current);
        } else {
          store.progress(speaker.key, progress.phrase, progress.current);
        }
      }
      if (!controller.signal.aborted) {
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
      { gpuOnly: speaker.gpuOnly === true, patientId: speaker.patientId },
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
