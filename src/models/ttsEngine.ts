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
 *   - synthesizeGPU(text, speakerData) → Promise<{data, sampleRate}>
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

export function isGPUReady(): boolean {
  return ready;
}

export function hasWebGPU(): boolean {
  return "gpu" in navigator;
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
          ready = true;
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
 */
export function synthesizeGPU(
  text: string,
  speakerData: SpeakerData,
): Promise<{ data: Float32Array; sampleRate: number }> {
  if (!worker || !ready) {
    return Promise.reject(new Error("GPU TTS not ready"));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("GPU synthesis timeout (120s)"));
    }, 120000);

    const handler = (e: MessageEvent) => {
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

    worker!.addEventListener("message", handler);
    worker!.postMessage({ type: "synthesize", text, speakerData });
  });
}
