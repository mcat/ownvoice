import { useSettingsStore } from "../stores/settingsStore";
import { getModelManager } from "./modelManager";
import { decodeAudioFromBase64 } from "./audioDecode";
import { ov } from "../audit/workflow";
import { enrollVoice } from "../audit/workflows/voiceEnrollment";
import { patientIdHash } from "../audit/hash";

type ExtractResult =
  | { kind: "ok"; data: unknown }
  | { kind: "fail"; reason: string };

interface ProcessorOptions {
  /** Inject a custom extractor for testing. Receives the patient's
   *  base64-encoded audio blob and returns either the extracted speaker
   *  data or a failure reason. The default extractor (used in production)
   *  decodes the audio and runs it through the TTS worker — so injecting
   *  here means the test doesn't need to mock the audio decoder or worker.
   *  When provided, the durable workflow journal is bypassed so tests
   *  don't need to mock the audit DB. */
  extract?: (base64: string) => Promise<ExtractResult>;
}

/** Start the background processor. Returns a stop function.
 *  Subscribes to ModelManager warm events and the settings store, runs
 *  extraction on any patient with `pendingVoiceBlob` once TTS is warm.
 *  Idempotent — multiple calls are OK; each returned `stop` unsubscribes
 *  its own subscriptions. */
export function startVoiceProcessor(opts: ProcessorOptions = {}): () => void {
  const inFlight = new Set<string>();

  function persistSpeakerData(patientId: string, data: unknown) {
    useSettingsStore.setState((s) => {
      if (!s.cfg) return s;
      const patients = s.cfg.patients.map((pp) =>
        pp.id === patientId
          ? { ...pp, speakerData: data, pendingVoiceBlob: null }
          : pp,
      );
      return { ...s, cfg: { ...s.cfg, patients } };
    });
  }

  async function tick() {
    const mgr = getModelManager();
    const cfg = useSettingsStore.getState().cfg;
    if (!cfg) return;
    const hasPending = cfg.patients.some(
      (p) => p.pendingVoiceBlob && !p.speakerData,
    );
    // Wake the lazy WASM TTS worker so the warm signal we're waiting on
    // actually fires. bootTTSWasm is idempotent.
    if (hasPending) {
      const { bootTTSWasm } = await import("./bootModels");
      bootTTSWasm();
    }
    if (!mgr.isWarm("tts")) return;

    for (const p of cfg.patients) {
      if (!p.pendingVoiceBlob || inFlight.has(p.id)) continue;
      if (p.speakerData) continue; // already processed elsewhere

      inFlight.add(p.id);
      try {
        if (opts.extract) {
          // Test path: bypass the durable workflow so tests don't need
          // to mock the audit DB.
          const result = await opts.extract(p.pendingVoiceBlob);
          if (result.kind === "ok") {
            persistSpeakerData(p.id, result.data);
          } else {
            console.warn(
              `[OwnVoice:VoiceProcessor] Extraction failed for ${p.id}: ${result.reason}`,
            );
          }
        } else {
          // Production path: durable workflow journals decode → extract → persist.
          const hash = await patientIdHash(p.id);
          const base64 = p.pendingVoiceBlob;
          const patientId = p.id;
          await ov.workflow(
            "voice_enrollment",
            (ctx) =>
              enrollVoice(ctx, {
                base64,
                patientId,
                decode: decodeAudioFromBase64,
                extract: async (audio) => {
                  const { runEmbedOnWorker } = await import(
                    "./voiceProcessorImpl"
                  );
                  return runEmbedOnWorker(audio);
                },
                persist: async (pid, data) => {
                  persistSpeakerData(pid, data);
                },
              }),
            { patientIdHash: hash, recoveryMode: "prompt" },
          );
        }
      } catch (err) {
        console.error("[OwnVoice:VoiceProcessor] tick error", err);
      } finally {
        inFlight.delete(p.id);
      }
    }
  }

  const unsubModel = getModelManager().onProgress(() => {
    void tick();
  });
  const unsubStore = useSettingsStore.subscribe(() => {
    void tick();
  });

  void tick();

  return () => {
    unsubModel();
    unsubStore();
  };
}
