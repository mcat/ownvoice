import { getModelManager } from "./modelManager";
import type { ModelId } from "./types";

const MODEL_IDS: ModelId[] = ["tts", "tts-encoder", "stt"];

/**
 * Tell every model worker to release its ORT sessions before the page
 * unloads. The previously held WebGPU device state (pinned KV-cache
 * buffers, compiled shader pipelines, model weight allocations) leaks
 * across a refresh on Safari/iPad and breaks the next page's
 * `InferenceSession.create` partway through deserializing model weights
 * — surfaces as "Deserialize tensor model.layers.N.…weight_scales failed".
 *
 * Triggered on `pagehide`. Skipped when `event.persisted=true`
 * (bfcache): workers stay alive and we want them ready to resume.
 *
 * The main thread cannot reliably `await` inside a pagehide listener
 * (the browser may discard the task), so we post the shutdown messages
 * synchronously and let the workers handle cleanup asynchronously. The
 * worker call site (`case "shutdown"`) calls `self.close()` after
 * `session.release()`. As a safety net we also `terminate()` after a
 * short delay — if the worker hasn't already closed itself, we force
 * it so the browser doesn't keep half-released resources around.
 */
export function installModelLifecycleCleanup(): void {
  const handler = (e: PageTransitionEvent): void => {
    if (e.persisted) return;
    const mgr = getModelManager();
    for (const id of MODEL_IDS) {
      const w = mgr.getWorker(id);
      if (!w) continue;
      try {
        w.postMessage({ type: "shutdown" });
      } catch {
        /* worker may already be dead — ignore */
      }
      setTimeout(() => {
        try {
          w.terminate();
        } catch {
          /* ignore */
        }
      }, 750);
    }
  };
  window.addEventListener("pagehide", handler);
}
