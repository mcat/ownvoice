/**
 * WebGPU TTS engine — thin wrapper around two DedicatedWorkers.
 *
 * Synthesis is split across two workers so that the conditional decoder's
 * WASM session runs in an isolated ORT runtime from the LM worker's WASM
 * session (embed_tokens). Earlier single-worker pipelining (PR #82
 * original) overlapped phrase N+1's LM with phrase N's decoder inside
 * one worker, which corrupted LM output because ORT Web's WASM Module
 * is shared across sessions in the same worker — concurrent runs on
 * embedTokens and conditional_decoder produced stuttering audio.
 *
 *   tts-gpu-worker.js    — embed_tokens (WASM) + language_model (WebGPU).
 *                          Receives "synthesizeLM", returns decoder tokens.
 *   tts-decoder-worker.js — conditional_decoder (WASM).
 *                          Receives "decode" + tokens, returns audio.
 *
 * Each DedicatedWorker has its own ORT runtime and WASM Module, so
 * phrase N+1's LM can run in parallel with phrase N's decoder without
 * cross-session state corruption. Main thread orchestrates:
 *
 *   synthesizeGPU(text, ...) →
 *     postMessage synthesizeLM → await lmResult →
 *     postMessage decode → await audio → resolve
 *
 * Each synthesizeGPU call uses a monotonic `id` echoed through both
 * workers so late responses from timed-out synths can't cross-contaminate
 * the next call.
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

let lmWorker: Worker | null = null;
let decoderWorker: Worker | null = null;
let ready = false;
const readyListeners = new Set<() => void>();

// Monotonic synth request ID. Each synthesizeGPU call increments this and
// attaches listeners that only resolve/reject on a matching echoed id —
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
 * Initialize the WebGPU TTS engine. Spawns both workers (LM + decoder)
 * and resolves true once both have posted "ready". If either worker
 * errors or times out, resolves false so the caller can fall back to
 * WASM-only synthesis.
 */
export function initGPU(modelUrl: string): Promise<boolean> {
  if (!("gpu" in navigator)) {
    console.log("[OwnVoice:TTS:GPU] WebGPU not available");
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    let lmReady = false;
    let decoderReady = false;
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };

    const markBothReadyIfDone = () => {
      if (lmReady && decoderReady) {
        markReady();
        document.title = "OwnVoice [GPU ready]";
        console.log("[OwnVoice:TTS:GPU] Both workers ready");
        settle(true);
      }
    };

    const timeout = setTimeout(() => {
      console.warn(
        `[OwnVoice:TTS:GPU] Init timeout (60s). LM ready: ${lmReady}, decoder ready: ${decoderReady}`,
      );
      settle(false);
    }, 60000);

    try {
      lmWorker = new Worker("/tts-gpu-worker.js", { type: "module" });
      decoderWorker = new Worker("/tts-decoder-worker.js", { type: "module" });

      lmWorker.onmessage = (e) => {
        if (e.data.type === "ready") {
          lmReady = true;
          markBothReadyIfDone();
        } else if (e.data.type === "error" && !e.data.id) {
          // Init-path error (no id) — fatal for this worker.
          document.title = "GPU ERR (LM): " + (e.data.message || "unknown").slice(0, 80);
          console.warn("[OwnVoice:TTS:GPU] LM init error:", e.data.message);
          settle(false);
        }
      };
      decoderWorker.onmessage = (e) => {
        if (e.data.type === "ready") {
          decoderReady = true;
          markBothReadyIfDone();
        } else if (e.data.type === "error" && !e.data.id) {
          document.title = "GPU ERR (Dec): " + (e.data.message || "unknown").slice(0, 80);
          console.warn("[OwnVoice:TTS:GPU] Decoder init error:", e.data.message);
          settle(false);
        }
      };

      lmWorker.onerror = (e) => {
        document.title = "GPU WERR (LM): " + (e.message || "unknown").slice(0, 80);
        console.warn("[OwnVoice:TTS:GPU] LM worker error:", e.message);
        settle(false);
      };
      decoderWorker.onerror = (e) => {
        document.title = "GPU WERR (Dec): " + (e.message || "unknown").slice(0, 80);
        console.warn("[OwnVoice:TTS:GPU] Decoder worker error:", e.message);
        settle(false);
      };

      lmWorker.postMessage({ type: "init", modelUrl });
      decoderWorker.postMessage({ type: "init", modelUrl });
    } catch (err) {
      console.warn("[OwnVoice:TTS:GPU] Failed to create workers:", err);
      settle(false);
    }
  });
}

/**
 * Synthesize speech on the GPU workers.
 *
 * Drives the two-worker dance: post `synthesizeLM` to the LM worker,
 * await `lmResult`, then post `decode` to the decoder worker, await
 * `audio`. A single shared `timeoutMs` applies to the whole synth so
 * neither stage can drift past the caller's budget.
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
  if (!lmWorker || !decoderWorker || !ready) {
    return Promise.reject(new Error("GPU TTS not ready"));
  }

  const timeoutMs = opts?.timeoutMs ?? DEFAULT_SYNTH_TIMEOUT_MS;
  const id = ++nextSynthId;

  return new Promise((resolve, reject) => {
    // Held outside the handlers so the timeout closure can also clean up
    // partially-attached listeners if we time out between phases.
    let lmHandler: ((e: MessageEvent) => void) | null = null;
    let decHandler: ((e: MessageEvent) => void) | null = null;

    const cleanup = () => {
      if (lmHandler) lmWorker!.removeEventListener("message", lmHandler);
      if (decHandler) decoderWorker!.removeEventListener("message", decHandler);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`GPU synthesis timeout (${timeoutMs}ms)`));
    }, timeoutMs);

    // Stage 2: attached after we receive the LM result. Posts decode and
    // waits for audio. Any late audio for a different id is ignored.
    const onLmResult = (decoderTokens: number[]) => {
      decHandler = (e: MessageEvent) => {
        if (e.data?.id !== id) return;
        if (e.data.type === "audio") {
          clearTimeout(timeout);
          cleanup();
          resolve({ data: e.data.data, sampleRate: e.data.sampleRate });
        } else if (e.data.type === "error") {
          clearTimeout(timeout);
          cleanup();
          reject(new Error(e.data.message));
        }
      };
      decoderWorker!.addEventListener("message", decHandler);
      decoderWorker!.postMessage({
        type: "decode",
        decoderTokens,
        speakerData,
        id,
      });
    };

    // Stage 1: post the LM request, wait for lmResult. An error from the
    // LM worker resolves this synth's id as failed; we never reach stage 2.
    lmHandler = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      if (e.data.type === "lmResult") {
        // Stop listening on the LM worker — the rest of the synth is the
        // decoder worker's job. Without this removal, a hypothetical
        // second "lmResult" for the same id (shouldn't happen, but
        // belt-and-suspenders) would re-post a decode and double-resolve.
        lmWorker!.removeEventListener("message", lmHandler!);
        lmHandler = null;
        onLmResult(e.data.decoderTokens);
      } else if (e.data.type === "error") {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(e.data.message));
      }
    };

    lmWorker!.addEventListener("message", lmHandler);
    lmWorker!.postMessage({ type: "synthesizeLM", text, speakerData, id });
  });
}
