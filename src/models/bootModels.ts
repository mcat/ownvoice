import { getModelManager } from "./modelManager";
import { MODEL_URLS } from "./types";
import { loadManifest, type ModelId } from "./modelsManifest";
import { useOfflineStore } from "../stores/offlineStore";

/**
 * Boot all on-device models.
 *
 * Creates Web Workers, sends init messages to load ONNX models,
 * and registers them with the model manager.
 *
 * Workers are created as module workers pointing to the worker source files.
 * Vite handles bundling them correctly via `new Worker(url, { type: 'module' })`.
 *
 * For most callers, prefer the split entry points so STT and LLM can begin
 * downloading without waiting for GPU TTS shader compilation:
 *   - {@link bootSTTAndLLM} — start immediately, in parallel with `initGPU()`.
 *   - {@link bootTTSWasm}    — call after `initGPU()` resolves to keep the
 *                              "no concurrent ORT WASM/GPU init" invariant.
 *
 * `bootModels()` is preserved for tests and any caller that wants a single
 * "boot everything" entry point; it composes the two split paths.
 */
export async function bootModels(): Promise<void> {
  // Order matters for callers that introspect worker-creation sequence
  // (notably bootModels.test.ts): TTS first, then LLM + STT inside
  // bootSTTAndLLM. Both halves still start essentially in parallel —
  // the order only governs which Worker constructor wins the microtask
  // race when init() is synchronous (real production: doesn't matter).
  await Promise.all([bootTTSWasm(), bootSTTAndLLM()]);
}

/**
 * Boot the STT (WebGPU primary, WASM fallback) and LLM workers.
 *
 * Safe to call before `initGPU()` resolves: STT-GPU and LLM each run in their
 * own DedicatedWorkers on independent ORT instances and don't share resources
 * with the main-thread GPU TTS load path. Earlier code awaited `initGPU()`
 * before calling `bootModels()`, which left STT and LLM unable to even start
 * downloading until GPU TTS finished compiling shaders — minutes on first
 * cold load, indefinite if the GPU TTS init hung.
 */
export async function bootSTTAndLLM(): Promise<void> {
  const mgr = getModelManager();
  await mgr.init();
  bootLLM(mgr);
  bootSTT(mgr);
}

/**
 * Boot the TTS WASM worker. Always available alongside the GPU TTS path;
 * falls back automatically when synthesis can't run on WebGPU.
 *
 * Call this *after* `initGPU()` resolves (success or failure) so that ORT
 * WASM session creation doesn't race with the WebGPU shader compilation —
 * the original concern documented in `App.tsx` when these were serialized.
 */
export async function bootTTSWasm(): Promise<void> {
  const mgr = getModelManager();
  await mgr.init();

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
        // Eager warmup: download + run a one-shot encoder inference so
        // the user's first cloning attempt isn't gated on a 591 MB fetch.
        ttsWorker.postMessage({ type: "warmup" });
      } else if (e.data.type === "warm") {
        mgr.markWarm("tts");
      } else if (e.data.type === "progress" && e.data.total === -1) {
        // Debug: EP signal from synthesis start (loaded=1 → WebGPU, loaded=0 → WASM)
        console.log(`[OwnVoice:TTS] Synthesis EP: ${e.data.loaded ? "WebGPU" : "WASM"}`);
      } else if (e.data.type === "error") {
        if (!ttsInitDone || e.data.phase === "warmup" || e.data.phase === "init") {
          // Init or warmup failure — mark model as broken so the UI can
          // surface a recovery action. Without this, a failed warmup
          // leaves the model in `ready` forever — the UI shows
          // "Voice will start as soon as it's ready" with no error path.
          mgr.setError("tts", e.data.message);
        } else {
          // Synthesis or embed failure — log but keep model ready for
          // retries; the speak() pathway falls back to Web Speech.
          console.error(`[OwnVoice:TTS] ${e.data.phase ?? "synthesis"} error: ${e.data.message}`);
        }
      }
    };

    mgr.setWorker("tts", ttsWorker);
    ttsWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.tts });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create TTS worker:", err);
  }
}

/** Internal: boot the LLM worker (LFM2.5-1.2B-Instruct). */
function bootLLM(mgr: ReturnType<typeof getModelManager>): void {
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
          gpuWorker.postMessage({ type: "warmup" });
        } else if (e.data.type === "warm") {
          mgr.markWarm("stt");
        } else if (e.data.type === "error") {
          if (!mgr.isReady("stt")) {
            // Init failure on GPU — fall back to WASM, which has its own
            // setError on init failure.
            console.warn("[OwnVoice] STT GPU error:", e.data.message);
            bootSTTWasm(mgr);
          } else if (e.data.phase === "warmup") {
            // Init succeeded but warmup failed. Don't fall back — the
            // model was readyable, the GPU just couldn't run inference
            // for some reason. Mark as errored so the UI surfaces a
            // recovery action.
            mgr.setError("stt", e.data.message);
          }
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

/**
 * Boot-time integrity pass over OPFS. Cheap (reads first 2 bytes per ONNX
 * file), runs in parallel, populates offlineStore.verified so Settings can
 * indicate which models need the "Prepare for offline" primer rerun.
 *
 * Does not block worker boot — runs fire-and-forget alongside bootModels().
 */
export async function verifyAllOnBoot(): Promise<void> {
  const mgr = getModelManager();
  const manifest = await loadManifest();
  const setModelVerified = useOfflineStore.getState().setModelVerified;
  const ids = Object.keys(manifest.models) as ModelId[];
  await Promise.all(
    ids.map(async (id) => {
      const report = await mgr.verifyOPFSCache(id, manifest.models[id]);
      if (report.ok) {
        setModelVerified(id, "verified");
      } else {
        // Distinguish "user hasn't primed yet" from "primed but something is broken".
        // If every failure reason looks like "file missing / not found," the model
        // has simply never been downloaded to OPFS — that's a neutral state, not
        // an error. If any file is present but fails size/magic checks, something
        // was interrupted or corrupted — needs retry.
        const allMissing = report.files.every(
          (f) => !f.ok && /missing|not found/i.test(f.reason ?? ""),
        );
        setModelVerified(id, allMissing ? "not-primed" : "needs-retry");
      }
    }),
  );
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
        sttWorker.postMessage({ type: "warmup" });
      } else if (e.data.type === "warm") {
        mgr.markWarm("stt");
      } else if (e.data.type === "error") {
        mgr.setError("stt", e.data.message);
      }
    };

    sttWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.stt });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create STT WASM worker:", err);
  }
}
