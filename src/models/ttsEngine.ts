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
 * Initialize the WebGPU TTS engine. Spawns a DedicatedWorker and loads models.
 * Returns true if WebGPU is available and models loaded successfully.
 */
export function initGPU(modelUrl: string): Promise<boolean> {
  if (!("gpu" in navigator)) {
    console.log("[OwnVoice:TTS:GPU] WebGPU not available");
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    try {
      // Plain JS worker in public/ — not bundled by Vite
      worker = new Worker("/tts-gpu-worker.js", { type: "module" });

      const timeout = setTimeout(() => {
        console.warn("[OwnVoice:TTS:GPU] Init timeout (60s)");
        resolve(false);
      }, 60000);

      worker.onmessage = (e) => {
        if (e.data.type === "ready") {
          clearTimeout(timeout);
          markReady();
          document.title = "OwnVoice [GPU ready]";
          console.log("[OwnVoice:TTS:GPU] WebGPU TTS engine ready");
          resolve(true);
        } else if (e.data.type === "error") {
          clearTimeout(timeout);
          document.title = "GPU ERR: " + (e.data.message || "unknown").slice(0, 80);
          console.warn("[OwnVoice:TTS:GPU] Init error:", e.data.message);
          resolve(false);
        }
      };

      worker.onerror = (e) => {
        clearTimeout(timeout);
        document.title = "GPU WERR: " + (e.message || "unknown").slice(0, 80);
        console.warn("[OwnVoice:TTS:GPU] Worker error:", e.message);
        resolve(false);
      };

      worker.postMessage({ type: "init", modelUrl });
    } catch (err) {
      console.warn("[OwnVoice:TTS:GPU] Failed to create worker:", err);
      resolve(false);
    }
  });
}

/**
 * Synthesize speech on the GPU worker.
 *
 * Pass `opts.timeoutMs` to override the default. Live taps use the
 * short default (fail fast so the UI doesn't stall); pre-gen passes a
 * longer budget since pain-matrix sentences are 5–20× longer than
 * quick phrases and take proportionally longer to decode.
 */
export function synthesizeGPU(
  text: string,
  speakerData: SpeakerData,
  opts?: { timeoutMs?: number },
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
        worker!.removeEventListener("message", handler);
        resolve({ data: e.data.data, sampleRate: e.data.sampleRate });
      } else if (e.data.type === "error") {
        clearTimeout(timeout);
        worker!.removeEventListener("message", handler);
        reject(new Error(e.data.message));
      }
    };

    const timeout = setTimeout(() => {
      // Remove the listener so a late response doesn't leak across into
      // the next synth — the worker may still be processing this phrase
      // serialized behind our request.
      worker!.removeEventListener("message", handler);
      reject(new Error(`GPU synthesis timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    worker!.addEventListener("message", handler);
    worker!.postMessage({ type: "synthesize", text, speakerData, id });
  });
}
