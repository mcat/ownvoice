import { getModelManager } from "./modelManager";
import { MODEL_URLS } from "./types";

/**
 * Boot all on-device models.
 *
 * Creates Web Workers, sends init messages to load ONNX models,
 * and registers them with the model manager.
 *
 * Workers are created as module workers pointing to the worker source files.
 * Vite handles bundling them correctly via `new Worker(url, { type: 'module' })`.
 *
 * Call this once after the model manager is initialized and the app is ready.
 */
export async function bootModels(): Promise<void> {
  const mgr = getModelManager();
  await mgr.init();

  // Boot TTS worker (Chatterbox Turbo runtime: embed_tokens + language_model + conditional_decoder)
  try {
    const ttsWorker = new Worker(
      new URL("./ttsWorker.ts", import.meta.url),
      { type: "module" },
    );

    let ttsInitDone = false;
    ttsWorker.onmessage = (e) => {
      if (e.data.type === "ready") {
        ttsInitDone = true;
        mgr.setReady("tts");
      } else if (e.data.type === "progress" && e.data.total === -1) {
        // Debug: EP signal from synthesis start (loaded=1 → WebGPU, loaded=0 → WASM)
        console.log(`[OwnVoice:TTS] Synthesis EP: ${e.data.loaded ? "WebGPU" : "WASM"}`);
      } else if (e.data.type === "error") {
        if (!ttsInitDone) {
          // Init failure — mark model as broken
          mgr.setError("tts", e.data.message);
        } else {
          // Synthesis failure — log but keep model ready for retries
          console.error(`[OwnVoice:TTS] synthesis error: ${e.data.message}`);
        }
      }
    };

    mgr.setWorker("tts", ttsWorker);
    ttsWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.tts });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create TTS worker:", err);
  }

  // Boot LLM worker (LFM2.5-1.2B-Instruct)
  try {
    const llmWorker = new Worker(
      new URL("./llmWorker.ts", import.meta.url),
      { type: "module" },
    );

    llmWorker.onmessage = (e) => {
      if (e.data.type === "ready") {
        mgr.setReady("llm");
      } else if (e.data.type === "error") {
        mgr.setError("llm", e.data.message);
      }
    };

    mgr.setWorker("llm", llmWorker);
    llmWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.llm });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create LLM worker:", err);
  }

  // Boot STT: try WebGPU first (plain JS worker in public/), fall back to WASM
  bootSTT(mgr);
}

/**
 * Boot STT with WebGPU → WASM fallback (non-blocking).
 *
 * If WebGPU is available, starts the plain JS GPU worker (public/stt-gpu-worker.js)
 * and lets it download + init in the background. If GPU fails, falls back to the
 * Vite-bundled WASM worker (sttWorker.ts).
 *
 * This is non-blocking: the model won't be ready immediately, but useMicrophone
 * handles that gracefully ("model not loaded yet" until ready).
 */
function bootSTT(mgr: ReturnType<typeof getModelManager>): void {
  if ("gpu" in navigator) {
    try {
      const gpuWorker = new Worker("/stt-gpu-worker.js", { type: "module" });

      gpuWorker.onmessage = (e) => {
        if (e.data.type === "ready") {
          mgr.setWorker("stt", gpuWorker);
          mgr.setReady("stt");
          console.log("[OwnVoice] STT: WebGPU ready");
        } else if (e.data.type === "error" && !mgr.isReady("stt")) {
          console.warn("[OwnVoice] STT GPU error:", e.data.message);
          bootSTTWasm(mgr);
        }
      };

      gpuWorker.onerror = (e) => {
        console.warn("[OwnVoice] STT GPU worker error:", e.message);
        if (!mgr.isReady("stt")) bootSTTWasm(mgr);
      };

      gpuWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.stt });
      return;
    } catch (err) {
      console.warn("[OwnVoice] STT GPU failed:", err);
    }
  }

  bootSTTWasm(mgr);
}

/** Start the WASM STT worker (Vite-bundled, onnxruntime-web base package). */
function bootSTTWasm(mgr: ReturnType<typeof getModelManager>): void {
  console.log("[OwnVoice] STT: using WASM fallback");
  try {
    const sttWorker = new Worker(
      new URL("./sttWorker.ts", import.meta.url),
      { type: "module" },
    );

    sttWorker.onmessage = (e) => {
      if (e.data.type === "ready") {
        mgr.setWorker("stt", sttWorker);
        mgr.setReady("stt");
      } else if (e.data.type === "error") {
        mgr.setError("stt", e.data.message);
      }
    };

    sttWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.stt });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create STT WASM worker:", err);
  }
}
