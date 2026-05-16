import { getModelManager } from "./modelManager";
import { MODEL_URLS } from "./types";
import { loadManifest, type ModelId } from "./modelsManifest";
import { useOfflineStore } from "../stores/offlineStore";
import { useSettingsStore } from "../stores/settingsStore";
import { recordStage } from "../diagnostics/crashTombstone";
import { baseLocale } from "../data/chatterboxLocales";

/**
 * True iff any locale in this session (caregiverLang or any patient's
 * patientLang) is `zh`. The Cangjie5 lookup table is ~1.9 MB JSON that
 * builds two Maps (~several MB) in worker heap; non-zh sessions never
 * touch it, so we skip the load. If settings haven't hydrated yet we
 * default to true so a fresh device or pre-hydration call preserves
 * the prior eager-load behavior.
 */
export function sessionNeedsCangjie(): boolean {
  const state = useSettingsStore.getState();
  if (!state._hasHydrated || !state.cfg) return true;
  const langs: (string | undefined)[] = [state.cfg.caregiverLang];
  for (const p of state.cfg.patients) langs.push(p.patientLang);
  return langs.some((l) => !!l && baseLocale(l) === "zh");
}

/**
 * Resolve once the given model has reached a settled state (ready/warm/error).
 * Used by the boot sequencer to serialize STT → GPU TTS → verify/primer so
 * concurrent downloads don't double the peak memory window on cold boot.
 *
 * Returns early if the model is already settled. The timeout is a safety net
 * — long enough not to fire under normal cold-boot conditions, short enough
 * that a stuck worker doesn't pin the rest of boot indefinitely.
 */
export function waitForModelSettled(
  id: ModelId,
  timeoutMs = 120_000,
): Promise<void> {
  const mgr = getModelManager();
  const settled = (s: string) => s === "ready" || s === "warm" || s === "error";
  const current = mgr.getProgress().find((p) => p.model === id);
  if (current && settled(current.status)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsub = mgr.onProgress((progress) => {
      const m = progress.find((p) => p.model === id);
      if (m && settled(m.status)) {
        unsub();
        clearTimeout(timer);
        resolve();
      }
    });
    const timer = setTimeout(() => {
      unsub();
      resolve();
    }, timeoutMs);
  });
}

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
  recordStage("boot:stt-init");
  await mgr.init();

  if ("gpu" in navigator) {
    try {
      const gpuWorker = new Worker("/stt-gpu-worker.js", { type: "module" });

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
          recordStage("boot:stt-gpu-warm");
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
function bootSTTWasm(): void {
  const mgr = getModelManager();
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
        recordStage("boot:stt-wasm-ready");
        sttWorker.postMessage({ type: "warmup" });
      } else if (e.data.type === "warm") {
        mgr.markWarm("stt");
        recordStage("boot:stt-wasm-warm");
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
  recordStage("boot:tts-wasm-init");
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
        recordStage("boot:tts-wasm-ready");
        // Skip the eager encoder warmup when every patient already has
        // a speakerData embedding. The warmup loads ~291 MB of speech
        // encoder weights solely to make the *first* enrollment fast;
        // on a returning device with no pending enrollment, that's pure
        // boot-time memory pressure that Safari/iPad can't absorb on
        // top of GPU TTS shader compile + STT init. handleEmbed loads
        // the encoder on demand (same code path) when a real
        // enrollment is needed, so first enrollment for a *new* patient
        // pays a few extra seconds (already-OPFS-cached weights → fast)
        // but the steady-state boot path drops a ~291 MB peak.
        // Fall through to warmup when state is uncertain — !hydrated or
        // cfg null preserves the prior eager-warmup behavior.
        const state = useSettingsStore.getState();
        const cfg = state.cfg;
        const allEnrolled =
          state._hasHydrated &&
          !!cfg &&
          cfg.patients.length > 0 &&
          cfg.patients.every((p) => !!p.speakerData);
        if (allEnrolled) {
          recordStage("boot:tts-wasm-warmup-skipped");
          console.log(
            "[OwnVoice:TTS] Warmup skipped — every patient already has a voice clone, encoder will load on next enrollment.",
          );
        } else {
          // Eager warmup: download + run a one-shot encoder inference so
          // the user's first cloning attempt isn't gated on a 591 MB fetch.
          ttsWorker.postMessage({ type: "warmup" });
        }
      } else if (e.data.type === "warm") {
        mgr.markWarm("tts");
        recordStage("boot:tts-wasm-warm");
      } else if (e.data.type === "stage" && typeof e.data.label === "string") {
        // Worker-emitted memdiag stage label (currently from handleEmbed's
        // enrollment substeps; recordStage is a no-op when memdiag is off).
        recordStage(e.data.label);
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
    const loadCangjie = sessionNeedsCangjie();
    ttsWorker.postMessage({ type: "init", modelUrl: MODEL_URLS.tts, bench, loadCangjie });
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
