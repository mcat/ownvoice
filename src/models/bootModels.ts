import { getModelManager } from "./modelManager";
import { MODEL_URLS } from "./types";
import { loadManifest, type ModelId } from "./modelsManifest";
import { useOfflineStore } from "../stores/offlineStore";
import { spawnBlobWorker } from "./blobWorker";
// `?worker&url` imports get the URL of the bundled worker without
// invoking Vite's `new Worker(new URL(...))` transform, so we can fetch
// the bytes ourselves and feed them through spawnBlobWorker. Without
// this import shape, `new URL("./sttWorker.ts", import.meta.url)`
// resolves to the raw `.ts` source path because Vite only applies the
// worker-bundling transform when the URL is passed directly to
// `new Worker(...)`.
import sttWorkerUrl from "./sttWorker.ts?worker&url";
import ttsWorkerUrl from "./ttsWorker.ts?worker&url";

/**
 * Boot all on-device models.
 *
 * Preserved as a single entry point for tests and any caller that wants a
 * "boot everything" handle.
 */
export async function bootModels(): Promise<void> {
  // Parallel boot: STT begins downloading immediately, in parallel with
  // TTS shader compile. An earlier shape that chained STT behind
  // initGPU() meant STT could not even start downloading until TTS
  // shader compile finished (minutes on cold load). v2 preserves the
  // parallel pattern (see #233 re-implementation hints).
  await Promise.all([bootTTSWasm(), bootSTT()]);
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
export async function bootSTT(): Promise<void> {
  const mgr = getModelManager();
  await mgr.init();

  if ("gpu" in navigator) {
    try {
      const gpuWorker = await spawnBlobWorker("/stt-gpu-worker.js", {
        type: "module",
      });

      gpuWorker.onmessage = (e) => {
        if (e.data.type === "ready") {
          mgr.setWorker("stt", gpuWorker);
          mgr.setReady("stt");
          // The GPU STT worker (public/stt-gpu-worker.js) already runs
          // shader compilation + encoder/decoder warmup as part of its
          // own init sequence before emitting `ready`. By the time we
          // see `ready`, it can run inference — so flip warm directly
          // without posting an extra `warmup` message (which the GPU
          // worker doesn't handle and would log as "Unknown message type").
          mgr.markWarm("stt");
          console.log("[OwnVoice] STT: WebGPU ready");
        } else if (e.data.type === "error") {
          if (!mgr.isReady("stt")) {
            // Init failure on GPU — fall back to WASM, which has its own
            // setError on init failure.
            console.warn("[OwnVoice] STT GPU error:", e.data.message);
            bootSTTWasm();
          }
        }
      };

      gpuWorker.onerror = (e) => {
        console.warn("[OwnVoice] STT GPU worker error:", e.message);
        if (!mgr.isReady("stt")) bootSTTWasm();
      };

      gpuWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.stt });
      return;
    } catch (err) {
      console.warn("[OwnVoice] STT GPU failed:", err);
    }
  }

  bootSTTWasm();
}

/** Start the WASM STT worker (Vite-bundled, onnxruntime-web base package). */
async function bootSTTWasm(): Promise<void> {
  const mgr = getModelManager();
  console.log("[OwnVoice] STT: using WASM fallback");
  try {
    const sttWorker = await spawnBlobWorker(sttWorkerUrl, {
      type: "module",
    });

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
    const ttsWorker = await spawnBlobWorker(ttsWorkerUrl, {
      type: "module",
    });

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
    // `?bench=true` flag is set on globalThis by main-app.tsx — propagate
    // to the worker so it can log per-step timings (encoder + LM + decode).
    const bench = (globalThis as { __OV_BENCH__?: boolean }).__OV_BENCH__ === true;
    ttsWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.tts, bench });
  } catch (err) {
    console.warn("[OwnVoice] Failed to create TTS worker:", err);
  }
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
