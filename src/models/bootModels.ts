import { getModelManager } from "./modelManager";
import { MODEL_URLS } from "./types";
import { loadManifest, type ModelId } from "./modelsManifest";
import { useOfflineStore } from "../stores/offlineStore";

/**
 * Boot all on-device models.
 *
 * Currently TTS only; preserved as a single entry point for tests and
 * any caller that wants a "boot everything" handle.
 */
export async function bootModels(): Promise<void> {
  await bootTTSWasm();
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
