import { useSettingsStore } from "../stores/settingsStore";
import { getModelManager } from "./modelManager";
import { decodeAudioFromBase64 } from "./audioDecode";

type ExtractResult =
  | { kind: "ok"; data: unknown }
  | { kind: "fail"; reason: string };

interface ProcessorOptions {
  /** Inject a custom extractor for testing. Receives the patient's
   *  base64-encoded audio blob and returns either the extracted speaker
   *  data or a failure reason. The default extractor (used in production)
   *  decodes the audio and runs it through the TTS worker — so injecting
   *  here means the test doesn't need to mock the audio decoder or worker. */
  extract?: (base64: string) => Promise<ExtractResult>;
}

/** Start the background processor. Returns a stop function.
 *  Subscribes to ModelManager warm events and the settings store, runs
 *  extraction on any patient with `pendingVoiceBlob` once TTS is warm.
 *  Idempotent — multiple calls are OK; each returned `stop` unsubscribes
 *  its own subscriptions. */
export function startVoiceProcessor(opts: ProcessorOptions = {}): () => void {
  const extract = opts.extract ?? defaultExtract;
  const inFlight = new Set<string>();

  async function tick() {
    const mgr = getModelManager();
    if (!mgr.isWarm("tts")) return;
    const cfg = useSettingsStore.getState().cfg;
    if (!cfg) return;

    for (const p of cfg.patients) {
      if (!p.pendingVoiceBlob || inFlight.has(p.id)) continue;
      if (p.speakerData) continue; // already processed elsewhere

      inFlight.add(p.id);
      try {
        const result = await extract(p.pendingVoiceBlob);
        if (result.kind === "ok") {
          useSettingsStore.setState((s) => {
            if (!s.cfg) return s;
            const patients = s.cfg.patients.map((pp) =>
              pp.id === p.id
                ? { ...pp, speakerData: result.data, pendingVoiceBlob: null }
                : pp,
            );
            return { ...s, cfg: { ...s.cfg, patients } };
          });
        } else {
          console.warn(
            `[OwnVoice:VoiceProcessor] Extraction failed for ${p.id}: ${result.reason}`,
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

/** Default production extractor — decodes the base64 audio blob and runs
 *  it through the TTS worker's embed call. */
async function defaultExtract(base64: string): Promise<ExtractResult> {
  try {
    const audio = await decodeAudioFromBase64(base64);
    // Imported lazily to break a potential circular import.
    const { runEmbedOnWorker } = await import("./voiceProcessorImpl");
    const data = await runEmbedOnWorker(audio);
    return { kind: "ok", data };
  } catch (err) {
    return {
      kind: "fail",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
