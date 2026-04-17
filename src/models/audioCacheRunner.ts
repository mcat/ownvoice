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
  getPatientSpeakablePhrases,
  getProviderSpeakablePhrases,
} from "../data/phraseRegistry";

/**
 * Orchestrates background pre-generation of cloned-voice audio for the
 * patient and each provider. Sequential across speakers — WebGPU/WASM
 * TTS shares state that isn't safe to run concurrently.
 *
 * Trigger model:
 *   - App.tsx calls `runPreGeneration(cfg, patientEmbedding)` whenever
 *     the embedding set or patient locale changes.
 *   - A fresh call aborts the previous run. Any in-flight worker await
 *     unblocks via the AbortSignal passed into generateAllPhrases.
 *   - Runs are resumable: `generateAllPhrases` skips cached phrases, so
 *     on page reload the runner just resumes from where it left off.
 */

let currentController: AbortController | null = null;
let currentRunId = 0;

interface SpeakerPlan {
  key: SpeakerKey;
  speakerData: unknown;
  phrases: string[];
}

/** A speaker is runnable if its speakerData yields a real fingerprint. */
function isRunnable(speakerData: unknown): boolean {
  return embeddingFingerprint(speakerData) !== "none";
}

function buildPlan(
  cfg: AppSettings,
  patientSpeakerData: unknown,
): SpeakerPlan[] {
  const plan: SpeakerPlan[] = [];
  if (isRunnable(patientSpeakerData)) {
    plan.push({
      key: "patient",
      speakerData: patientSpeakerData,
      phrases: getPatientSpeakablePhrases(cfg.patientLang),
    });
  }
  cfg.providers.forEach((p, i) => {
    if (isRunnable(p.embedding)) {
      plan.push({
        key: `provider:${i}`,
        speakerData: p.embedding,
        phrases: getProviderSpeakablePhrases(cfg.patientLang),
      });
    }
  });
  return plan;
}

/**
 * Start (or restart) pre-generation. Safe to call repeatedly — earlier
 * runs abort cleanly. Returns a promise that resolves when the full
 * sequence finishes or is aborted.
 */
export async function runPreGeneration(
  cfg: AppSettings,
  patientSpeakerData: unknown,
): Promise<void> {
  abort();

  const plan = buildPlan(cfg, patientSpeakerData);
  if (plan.length === 0) return;

  const controller = new AbortController();
  currentController = controller;
  const runId = ++currentRunId;

  const store = useAudioCacheStore.getState();

  for (const speaker of plan) {
    if (controller.signal.aborted || runId !== currentRunId) return;

    const fingerprint = embeddingFingerprint(speaker.speakerData);
    store.start(
      speaker.key,
      speaker.phrases.length,
      cfg.patientLang,
      fingerprint,
    );

    try {
      for await (const progress of generateAllPhrases(
        speaker.phrases,
        speaker.speakerData,
        controller.signal,
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
  patientSpeakerData: unknown,
  key: SpeakerKey,
): Promise<void> {
  const plan = buildPlan(cfg, patientSpeakerData);
  const speaker = plan.find((p) => p.key === key);
  if (!speaker) return;

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
  store.start(key, failed.length, cfg.patientLang, fingerprint);

  try {
    for await (const progress of retryFailedGen(
      failed,
      speaker.speakerData,
      controller.signal,
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
