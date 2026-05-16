/**
 * WebGPU TTS engine — thin wrapper around the GPU DedicatedWorker.
 *
 * The actual ONNX inference runs in /public/tts-gpu-worker.js, a plain ES
 * module worker that imports ORT from the raw dist path (bypassing Vite's
 * bundler which can't resolve onnxruntime-web/webgpu in worker context).
 *
 * This module provides the same interface that speak.ts expects:
 *   - initGPU(modelUrl) → boots the worker, loads models
 *   - isGPUReady() → true once models are loaded
 *   - synthesizeGPU(text, speakerData, opts?) → Promise<{data, sampleRate}>
 *
 * Each synthesizeGPU call gets a monotonically-increasing `id`. The worker
 * echoes the id in its response, and the main-thread listener ignores
 * responses whose id doesn't match — so a timed-out synth that completes
 * late can't cross-contaminate the next call's resolution.
 *
 * Crash handling: a post-init `onerror` from the worker (e.g. OOM
 * mid-synth on iPad — a real risk for the decoder's ConvTranspose on
 * long phrases) rejects every in-flight synth immediately rather than
 * making callers wait out their 300s pre-gen timeout, and flips `ready`
 * back to false so subsequent calls fail fast. A follow-up init would
 * need to respawn the worker.
 */

import { recordStage } from "../diagnostics/crashTombstone";
import { sessionNeedsCangjie } from "./bootModels";
import { relayWorkerLog } from "../dev/logSink";
import { embeddingFingerprint } from "./speakerFingerprint";

interface SpeakerData {
  condEmb: Float32Array | number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: Float32Array | number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: Float32Array | number[];
  speakerFeaturesShape: number[];
}

let worker: Worker | null = null;
let ready = false;
const readyListeners = new Set<() => void>();

// Remembered so handlePostInitCrash can re-invoke initGPU with the same
// modelUrl the app originally booted with. The respawn budget is tiny: a
// deterministic device-OOM reproduces on each respawn, and we don't want
// to spin. The counter resets to zero from markReady() so a transient
// crash that recovers on the next attempt refills the budget for any
// future transient crash in the same session.
let lastModelUrl: string | null = null;
let crashRespawnCount = 0;
const MAX_CRASH_RESPAWNS = 2;

// Monotonic synth request ID. Each synthesizeGPU call increments this and
// attaches a listener that only resolves/rejects on a matching echoed id —
// late responses from timed-out synths are ignored instead of resolving
// the next call's promise with stale audio.
let nextSynthId = 0;

// Fingerprint of the speaker the GPU worker currently has cached (#303).
// Per-synth structured-clone of speakerData (~146 KB × 700 phrases) was
// the dominant main-thread allocation source during pre-gen; this tracks
// what the worker holds so we only send `set-speaker` (with transferable
// buffers) when the speaker actually changes. Reset on worker spawn/crash
// because the cache lives on the worker side and dies with the worker.
let installedSpeakerId: string | null = null;

// Every in-flight synthesizeGPU records its reject callback + listener
// cleanup here. A post-init worker crash drains this map and rejects
// each entry with a clear "worker crashed" error, instead of leaving
// the caller waiting out a 300s pre-gen timeout. Entries remove
// themselves on normal resolve/reject/timeout.
const pendingSynths = new Map<
  number,
  { reject: (err: Error) => void; cleanup: () => void }
>();

// Default timeout for live taps — sub-second GPU synth on M5 iPad, so 2s
// surfaces a failure without blocking the UI. Pre-gen overrides this with
// a much longer budget (see audioCache.ts).
const DEFAULT_SYNTH_TIMEOUT_MS = 2000;

export function isGPUReady(): boolean {
  return ready;
}

export function hasWebGPU(): boolean {
  return "gpu" in navigator;
}

/**
 * In-flight synth registry size. Used by the heap-watermark sampler
 * (`?memdiag=true` builds) and by `ttsEngine.test.ts` as a leak guard:
 * the registry is drained on every exit path (normal resolve, timeout,
 * error response, post-init crash), but a mutant that removes
 * `pendingSynths.delete(id)` wouldn't produce an observable failure
 * from the outside since reject on a settled promise is a no-op and
 * removeEventListener on an absent handler is idempotent. This
 * accessor exposes the invariant directly.
 */
export function getGpuPendingSynths(): number {
  return pendingSynths.size;
}

/** @deprecated test-only alias kept for the `__test*` naming convention
 *  in `ttsEngine.test.ts`; new callers should use {@link getGpuPendingSynths}. */
export function __testPendingSynthsSize(): number {
  return pendingSynths.size;
}

/**
 * Subscribe to the one-time "GPU TTS became ready" event. Fires
 * synchronously if GPU is already ready. Returns an unsubscribe function.
 *
 * Consumers (the audio cache pre-gen trigger) need to start working the
 * moment EITHER the WASM worker or the GPU engine is ready — whichever
 * comes first. `mgr.onProgress` already covers WASM; this covers GPU.
 */
export function onGPUReady(cb: () => void): () => void {
  if (ready) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

function markReady() {
  if (ready) return;
  ready = true;
  // Refill the crash-respawn budget on every successful ready transition —
  // including the one that follows a respawn. A transient OOM that
  // recovers should not deplete the budget for the next transient OOM
  // hours later in the same session.
  crashRespawnCount = 0;
  for (const cb of readyListeners) {
    try { cb(); } catch (err) { console.warn("[OwnVoice:TTS:GPU] listener threw:", err); }
  }
  readyListeners.clear();
}

/**
 * A post-init crash is fatal for the GPU engine — every in-flight synth
 * is aborted and subsequent calls are rejected until a new initGPU
 * succeeds. Called from the worker's `onerror` once init has already
 * settled; the init path has its own settle-false handling.
 */
function handlePostInitCrash(message: string) {
  ready = false;
  document.title = `GPU CRASH: ${(message || "unknown").slice(0, 80)}`;
  console.error(
    `[OwnVoice:TTS:GPU] Worker crashed post-init: ${message}. ` +
      `Rejecting ${pendingSynths.size} in-flight synth(s).`,
  );
  const snapshot = Array.from(pendingSynths.values());
  pendingSynths.clear();
  for (const { reject, cleanup } of snapshot) {
    cleanup();
    reject(new Error(`GPU worker crashed: ${message || "unknown"}`));
  }

  // Best-effort: kill the crashed worker handle and attempt a bounded
  // respawn so a transient OOM doesn't take the GPU TTS path out for the
  // rest of the session. Live taps fall through to Web Speech (see
  // speak.ts priority chain — Cache → Web Speech → tone; WASM TTS is
  // explicitly NOT on the tap path) while the respawn is in flight.
  try {
    worker?.terminate();
  } catch {
    // ignore — already dead
  }
  worker = null;
  // Worker is gone → its speakerData cache is gone. Force the next
  // synth to re-send set-speaker on the respawned worker.
  installedSpeakerId = null;

  if (lastModelUrl && crashRespawnCount < MAX_CRASH_RESPAWNS) {
    crashRespawnCount += 1;
    const attempt = crashRespawnCount;
    const url = lastModelUrl;
    console.warn(
      `[OwnVoice:TTS:GPU] Auto-respawn attempt ${attempt}/${MAX_CRASH_RESPAWNS} after crash`,
    );
    recordStage(`tts-gpu-respawn:${attempt}`);
    // Defer to a microtask so the rejected in-flight synth callers run
    // their cleanup before the new worker starts allocating WebGPU
    // resources. initGPU never rejects — every code path resolves to a
    // boolean — so the bare .then is safe.
    queueMicrotask(() => {
      initGPU(url).then((ok) => {
        console.log(
          `[OwnVoice:TTS:GPU] Auto-respawn ${attempt} ${ok ? "succeeded" : "failed"}`,
        );
      });
    });
  } else if (lastModelUrl) {
    console.error(
      `[OwnVoice:TTS:GPU] Crash respawn budget exhausted (${MAX_CRASH_RESPAWNS}); live taps will use Web Speech and pre-gen will refill the cache via WASM TTS for the rest of the session.`,
    );
  }
}

/**
 * Initialize the WebGPU TTS engine. Spawns a DedicatedWorker and loads models.
 * Returns true if WebGPU is available and models loaded successfully.
 */
export function initGPU(modelUrl: string): Promise<boolean> {
  if (!("gpu" in navigator)) {
    console.log("[OwnVoice:TTS:GPU] WebGPU not available");
    return Promise.resolve(false);
  }

  recordStage("boot:tts-gpu-init");
  lastModelUrl = modelUrl;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    // Declared at Promise-closure scope so `settle` can clear it; the
    // actual setTimeout assignment happens inside `try` below. Keeping
    // `timeout` here rather than inside the try block is what lets
    // `settle` be extracted (each exit path — onmessage ready,
    // onmessage error, onerror, init-timeout — uses the same
    // settle-once + clearTimeout flow).
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(value);
    };

    try {
      // Plain JS worker in public/ — not bundled by Vite
      worker = new Worker("/tts-gpu-worker.js", { type: "module" });
      // Fresh worker → empty speakerData cache. The first synth call
      // will trip ensureSpeakerInstalled to send set-speaker before
      // posting its synthesize message.
      installedSpeakerId = null;

      // 300s budget for multilingual: worker loads ~913 MB across 4 ONNX
      // sessions (vs Turbo's ~381 MB), and the 30-layer Llama LM has
      // significantly more WebGPU shaders to compile on first run than
      // Turbo's 24-layer GPT-2. With the conditional_decoder also on
      // WebGPU EP (rather than WASM-only), shader compilation grew —
      // observed 187s cold-load on M5 iPad after the WebGPU-decoder
      // switch, which tripped the previous 180s timeout despite the
      // worker succeeding seconds later. Tighter budgets risk a
      // false-negative WASM fallback before WebGPU has a chance to finish.
      const INIT_TIMEOUT_MS = 300000;
      timeout = setTimeout(() => {
        console.warn(`[OwnVoice:TTS:GPU] Init timeout (${INIT_TIMEOUT_MS / 1000}s)`);
        settle(false);
      }, INIT_TIMEOUT_MS);

      worker.onmessage = (e) => {
        if (e.data.type === "__log") {
          // Dev-only relay from public/tts-gpu-worker.js — re-emit through
          // the main-thread (patched) console so the line lands in
          // logs/dev.log via the existing /__log sink. Issue #306.
          relayWorkerLog(e.data);
          return;
        }
        if (e.data.type === "ready") {
          markReady();
          recordStage("boot:tts-gpu-ready");
          document.title = "OwnVoice [GPU ready]";
          console.log("[OwnVoice:TTS:GPU] WebGPU TTS engine ready");
          settle(true);
        } else if (e.data.type === "error" && !e.data.id) {
          // Init-path error has no id — distinguished from a per-synth error.
          document.title = "GPU ERR: " + (e.data.message || "unknown").slice(0, 80);
          console.warn("[OwnVoice:TTS:GPU] Init error:", e.data.message);
          settle(false);
        }
      };

      // onerror branches on init lifecycle stage:
      //   not yet settled (init in progress) → fall back to WASM by
      //                                         resolving initGPU with false
      //   already settled (post-init crash) → reject every in-flight
      //                                        synth immediately so callers
      //                                        aren't stuck on their 300s
      //                                        pre-gen timeout
      worker.onerror = (e) => {
        const message = e.message || "unknown";
        if (!settled) {
          document.title = "GPU WERR: " + message.slice(0, 80);
          console.warn("[OwnVoice:TTS:GPU] Worker error:", message);
          settle(false);
        } else {
          handlePostInitCrash(message);
        }
      };

      // `?bench=true` flag set by main-app.tsx — forwards to the GPU
      // worker so it can log per-step timings (LM + decode + RTF).
      const bench = (globalThis as { __OV_BENCH__?: boolean }).__OV_BENCH__ === true;
      // Skip the Cangjie5 lookup table (~1.9 MB JSON + several MB of
      // Maps in worker heap) when no zh locale is in the session.
      // sessionNeedsCangjie defaults to true on uncertain state, so a
      // pre-hydration boot preserves the prior eager-load behavior.
      const loadCangjie = sessionNeedsCangjie();
      worker.postMessage({ type: "init", modelUrl, bench, loadCangjie });
    } catch (err) {
      console.warn("[OwnVoice:TTS:GPU] Failed to create worker:", err);
      settle(false);
    }
  });
}

/**
 * Synthesize speech on the GPU worker.
 *
 * @param languageId — Base BCP 47 tag (e.g. "en", "es", "zh") identifying
 *   the target synthesis language. Required by the Chatterbox Multilingual
 *   worker — it maps the tag to the model's internal language token.
 * @param opts.exaggeration — Prosody exaggeration factor (0–1, default 0.5).
 *   Higher values produce more expressive speech.
 * @param opts.timeoutMs — Override the default synthesis timeout. Live taps
 *   use the short default (fail fast); pre-gen passes a longer budget.
 */
/** Send `set-speaker` if the worker doesn't already have this speaker cached.
 *  Returns the speaker id the synthesize message should reference.
 *
 *  The float vectors are copied with `new Float32Array(source)` *before*
 *  being transferred so the store's originals stay attached for other
 *  readers (live taps, settings panel). For a 700-phrase pre-gen with
 *  one patient this fires once; old code paid 700× structured-clone.
 *
 *  Returns null when the speakerData has no recognisable embedding —
 *  the caller falls back to inline `speakerData` so the worker still
 *  has a chance to surface a useful error. */
function ensureSpeakerInstalled(speakerData: SpeakerData): string | null {
  if (!worker) return null;
  const id = embeddingFingerprint(speakerData);
  if (id === "none") return null;
  if (id === installedSpeakerId) return id;

  const condEmb = new Float32Array(speakerData.condEmb);
  const speakerEmbeddings = new Float32Array(speakerData.speakerEmbeddings);
  const speakerFeatures = new Float32Array(speakerData.speakerFeatures);
  const cached = {
    condEmb,
    condEmbShape: speakerData.condEmbShape,
    promptToken: speakerData.promptToken,
    promptTokenShape: speakerData.promptTokenShape,
    speakerEmbeddings,
    speakerEmbeddingsShape: speakerData.speakerEmbeddingsShape,
    speakerFeatures,
    speakerFeaturesShape: speakerData.speakerFeaturesShape,
  };
  worker.postMessage(
    { type: "set-speaker", speakerId: id, speakerData: cached },
    [condEmb.buffer, speakerEmbeddings.buffer, speakerFeatures.buffer],
  );
  installedSpeakerId = id;
  return id;
}

export function synthesizeGPU(
  text: string,
  speakerData: SpeakerData,
  languageId: string,
  opts?: { timeoutMs?: number; exaggeration?: number },
): Promise<{ data: Float32Array; sampleRate: number }> {
  if (!worker || !ready) {
    return Promise.reject(new Error("GPU TTS not ready"));
  }

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_SYNTH_TIMEOUT_MS;
  const id = ++nextSynthId;
  // Stage label scoped to one synth, so a crash mid-decode tells us
  // whether KV-cache buffer growth on this call's specific text/length
  // tripped Safari, vs. an earlier boundary.
  recordStage(`synth:gpu:${id}`);
  const speakerId = ensureSpeakerInstalled(speakerData);

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      // Ignore responses for other (possibly timed-out) synths. Without
      // this id check, a slow synth that eventually completes after its
      // main-thread timeout would resolve whichever listener is currently
      // attached — caching wrong audio for whatever phrase that is.
      if (e.data?.id !== id) return;
      if (e.data.type === "audio") {
        clearTimeout(timeout);
        finalize();
        recordStage(`synth:gpu:${id}:done`);
        resolve({ data: e.data.data, sampleRate: e.data.sampleRate });
      } else if (e.data.type === "error") {
        clearTimeout(timeout);
        finalize();
        reject(new Error(e.data.message));
      }
    };

    const cleanup = () => worker!.removeEventListener("message", handler);

    // Register for worker-crash fan-out. Removed when the synth
    // finishes normally (resolve/reject below) or when a crash rejects
    // this entry via handlePostInitCrash.
    pendingSynths.set(id, { reject, cleanup });
    const finalize = () => {
      pendingSynths.delete(id);
      cleanup();
    };

    const timeout = setTimeout(() => {
      // Remove the listener so a late response doesn't leak across into
      // the next synth — the worker may still be processing this phrase
      // serialized behind our request.
      finalize();
      reject(new Error(`GPU synthesis timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    worker!.addEventListener("message", handler);
    // Reference the cached speaker by id when ensureSpeakerInstalled
    // succeeded; otherwise (no recognisable embedding) fall through to
    // inline speakerData so the worker can surface a meaningful error.
    const msg: Record<string, unknown> = {
      type: "synthesize",
      text,
      id,
      languageId,
      exaggeration: opts?.exaggeration ?? 0.5,
    };
    if (speakerId) {
      msg.speakerId = speakerId;
    } else {
      msg.speakerData = speakerData;
    }
    worker!.postMessage(msg);
  });
}
