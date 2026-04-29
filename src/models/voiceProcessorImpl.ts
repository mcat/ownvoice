import { getModelManager } from "./modelManager";

let nextRequestId = 1;
const IDLE_TIMEOUT_MS = 60_000;

/** Run an embed call against the TTS worker. Mirrors VoiceCapture's
 *  extractEmbedding but lives in the model layer so the store-side
 *  processor can use it without depending on the UI. */
export function runEmbedOnWorker(audio: Float32Array): Promise<unknown> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");
  if (!worker || !mgr.isWarm("tts")) {
    return Promise.reject(new Error("TTS worker not warm"));
  }
  const requestId = nextRequestId++;

  return new Promise((resolve, reject) => {
    let idle: ReturnType<typeof setTimeout> | null = null;
    function resetIdle() {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        worker!.removeEventListener("message", handler);
        reject(new Error("Voice processing is taking longer than expected."));
      }, IDLE_TIMEOUT_MS);
    }
    const handler = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "embed-progress") return resetIdle();
      if (m.type === "embedding" && m.requestId === requestId) {
        if (idle) clearTimeout(idle);
        worker!.removeEventListener("message", handler);
        resolve(m.data);
      } else if (m.type === "error" && m.requestId === requestId) {
        if (idle) clearTimeout(idle);
        worker!.removeEventListener("message", handler);
        reject(new Error(m.message));
      }
    };
    worker.addEventListener("message", handler);
    resetIdle();
    worker.postMessage({
      type: "embed",
      audio,
      sampleRate: 24000,
      requestId,
    });
  });
}
