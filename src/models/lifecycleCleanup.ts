import { getModelManager } from "./modelManager";
import type { ModelId } from "./types";

const MODEL_IDS: ModelId[] = ["tts", "tts-encoder", "stt"];

/**
 * Tear down every model worker before the page unloads. The previously
 * held WebGPU device state (pinned KV-cache buffers, compiled shader
 * pipelines, model weight allocations) leaks across a refresh on
 * Safari/iPad and breaks the next page's `InferenceSession.create`
 * partway through deserializing model weights — surfaces as
 * "Deserialize tensor model.layers.N.…weight_scales failed", plus
 * downstream "Cannot load … due to access control checks" on the WASM
 * fallback workers.
 *
 * Triggered on `pagehide`. Skipped when `event.persisted=true`
 * (bfcache): workers stay alive and we want them ready to resume.
 *
 * **Why synchronous `terminate()`:** an earlier version queued a 750 ms
 * timeout before terminate() to give the worker time to run its
 * `shutdown` message handler (which calls `session.release()`).
 * On `location.reload()` that worked. On manual nav-bar refresh the
 * document is destroyed before the timeout fires, so terminate never
 * ran and the worker's GPU device was cleaned up non-deterministically.
 * Calling `terminate()` synchronously in the listener forces immediate
 * worker destruction, which forces Safari to tear down the WebGPU
 * device tied to that worker before the new page boots.
 *
 * We still post `shutdown` first as a best-effort hint — if the
 * worker's event loop happens to process the message before being
 * killed (typical on the slower `location.reload()` path), the
 * explicit `session.release()` lets ORT teardown be ordered rather
 * than abrupt.
 */
export function installModelLifecycleCleanup(): void {
  const handler = (e: PageTransitionEvent): void => {
    if (e.persisted) return;
    const mgr = getModelManager();
    for (const id of MODEL_IDS) {
      const w = mgr.getWorker(id);
      if (!w) continue;
      try { w.postMessage({ type: "shutdown" }); } catch { /* ignore */ }
      try { w.terminate(); } catch { /* ignore */ }
    }
  };
  window.addEventListener("pagehide", handler);
}
