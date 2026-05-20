import { useEffect } from "preact/hooks";
import {
  bootTTSWasm,
  bootSTT,
  verifyAllOnBoot,
  waitForModelSettled,
  everyPatientIsResolved,
} from "../models/bootModels";
import { drivePrimer } from "../models/drivePrimer";
import { resumePendingOnVisible } from "../models/offlineResume";
import { backoffPregenOnHidden } from "../models/pregenVisibility";
import { useOfflineStore } from "../stores/offlineStore";
import { initGPU, isGPUReady } from "../models/ttsEngine";
import { MODEL_URLS } from "../models/types";
import { primeSpeechSynthesis } from "../speak";
import { recordStage } from "../diagnostics/crashTombstone";

/**
 * Boot the TTS + STT workers and arm the resume/backoff listeners.
 *
 * Serializes cold boot to keep the peak memory window narrow:
 *   STT → GPU TTS → WASM TTS fallback → verify/primer
 * Pre-#297, all four ran in parallel, doubling the boot-window peak.
 * STT is small (~30s download) and the Listen pill needs it first;
 * GPU TTS shader-compile + decoder weights are the heavyweights and
 * wait until STT settles. The primer can write hundreds of MB to
 * OPFS, so it waits until both workers are out of init.
 *
 * WASM TTS is not eagerly booted in parallel here — it is a fallback
 * (synth) and a cloning-time dependency (speech_encoder). VoiceCapture
 * mounts during the Voice step of Setup and triggers bootTTSWasm()
 * itself (idempotent), and voiceProcessor.ts kicks it when there's
 * a pending blob. So the WASM TTS warmup happens at the time the user
 * actually navigates to Voice — usually well before GPU TTS finishes
 * its 150-190s decoder compile.
 */
export function useModelBoot(): void {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await bootSTT();
      await waitForModelSettled("stt");
      if (cancelled) return;

      try {
        const ok = await initGPU(MODEL_URLS.tts);
        console.log("[OwnVoice] GPU TTS:", ok ? "ready" : "unavailable");
      } catch (err) {
        console.warn("[OwnVoice] GPU TTS error:", err);
      }
      if (cancelled) return;

      // Lazy WASM TTS: skip the worker when GPU TTS is healthy and every
      // patient is resolved (either declined voice cloning, or has a
      // finalized speakerData embedding with no pending blob).
      // handleEmbed — the only steady-state WASM TTS consumer — is
      // gated on a real enrollment, so VoiceCapture kicks bootTTSWasm()
      // on demand when it mounts with hasVoice=true. A failed/unavail
      // GPU still triggers eager WASM boot so synth has a path.
      if (isGPUReady() && everyPatientIsResolved()) {
        recordStage("boot:tts-wasm-skipped");
        console.log(
          "[OwnVoice] WASM TTS deferred — GPU TTS ready and every patient is resolved.",
        );
      } else {
        bootTTSWasm();
        await waitForModelSettled("tts");
        if (cancelled) return;
      }

      // Run OPFS integrity check after workers settle, then auto-prime
      // if needed. Without priming, the app still works on first boot
      // (workers fetch via the SW → network), but the bytes don't
      // persist in a way that survives storage-pressure eviction.
      try {
        await verifyAllOnBoot();
        if (cancelled) return;
        const verified = useOfflineStore.getState().verified;
        const needsPriming = Object.values(verified).some(
          (s) => s !== "verified",
        );
        if (needsPriming) {
          drivePrimer().catch((err) =>
            console.warn("[OwnVoice] auto-prime failed:", err),
          );
        }
      } catch (err) {
        console.warn("[OwnVoice] boot verify failed:", err);
      }
    })();
    // Resume any interrupted model downloads — fires on boot if partials
    // exist, and again whenever the tab returns to the foreground.
    const unsubResume = resumePendingOnVisible();
    // Soft-pause pre-gen whenever the tab is hidden so background work
    // doesn't compete with the foreground app for GPU/CPU on iPad.
    const unsubBackoff = backoffPregenOnHidden();
    primeSpeechSynthesis();
    return () => {
      cancelled = true;
      unsubResume();
      unsubBackoff();
    };
  }, []);
}
