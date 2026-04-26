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

interface SpeakerData {
  condEmb: number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: number[];
  speakerFeaturesShape: number[];
}

let worker: Worker | null = null;
let ready = false;
const readyListeners = new Set<() => void>();

// Monotonic synth request ID. Each synthesizeGPU call increments this and
// attaches a listener that only resolves/rejects on a matching echoed id —
// late responses from timed-out synths are ignored instead of resolving
// the next call's promise with stale audio.
let nextSynthId = 0;

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
 * Test-only accessor for the in-flight synth registry size. The
 * registry is drained on every exit path (normal resolve, timeout,
 * error response, post-init crash); a silent leak — e.g., a mutant
 * that removes `pendingSynths.delete(id)` — wouldn't produce an
 * observable failure from the outside since reject on a settled
 * promise is a no-op and removeEventListener on an absent handler is
 * idempotent. This accessor lets ttsEngine.test.ts assert the
 * invariant directly. Not part of the public API; do not use from app
 * code.
 */
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

      // 180s budget for multilingual: worker loads ~913 MB across 4 ONNX
      // sessions (vs Turbo's ~381 MB), and the 30-layer Llama LM has
      // significantly more WebGPU shaders to compile on first run than
      // Turbo's 24-layer GPT-2. Empirically Turbo needs ~10-20s on M5;
      // multilingual likely needs 30-90s cold. Tighter budgets risk a
      // false-negative WASM fallback before WebGPU has a chance to finish.
      timeout = setTimeout(() => {
        console.warn("[OwnVoice:TTS:GPU] Init timeout (180s)");
        settle(false);
      }, 180000);

      worker.onmessage = (e) => {
        if (e.data.type === "ready") {
          markReady();
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

      worker.postMessage({ type: "init", modelUrl });
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
    worker!.postMessage({
      type: "synthesize",
      text,
      speakerData,
      id,
      languageId,
      exaggeration: opts?.exaggeration ?? 0.5,
    });
  });
}
