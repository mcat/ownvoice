import { describe, it, expect, vi, beforeEach } from "vitest";
import { startVoiceProcessor } from "./voiceProcessor";
import { useSettingsStore } from "../stores/settingsStore";
import { getModelManager } from "./modelManager";

describe("voiceProcessor", () => {
  beforeEach(async () => {
    // Merge-mode reset: clears cfg/speakerData but preserves the action
    // methods on the store. (Plan used `, true` replace mode, which wiped
    // the actions — small fix to the test scaffolding.)
    useSettingsStore.setState({ cfg: null, speakerData: null });
    // Clear prior model state — the ModelManager singleton persists across
    // tests, so warm/ready flags from a previous test would leak.
    await getModelManager().clearAll();
  });

  it("processes a patient with pendingVoiceBlob when TTS is warm", async () => {
    const store = useSettingsStore.getState();
    store.setCfg({
      pin: "0000",
      caregiverLang: "en",
      providers: [],
      patients: [],
      activePatientId: null,
    });
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn().mockResolvedValue({ kind: "ok", data: { foo: 1 } });
    const stop = startVoiceProcessor({ extract: extractor });

    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    await new Promise((r) => setTimeout(r, 30));

    expect(extractor).toHaveBeenCalled();
    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.speakerData).toEqual({ foo: 1 });
    expect(updated?.pendingVoiceBlob).toBeFalsy();
    stop();
  });

  it("does not run while TTS is not warm", async () => {
    const store = useSettingsStore.getState();
    store.setCfg({
      pin: "0000",
      caregiverLang: "en",
      providers: [],
      patients: [],
      activePatientId: null,
    });
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn();
    const stop = startVoiceProcessor({ extract: extractor });
    await new Promise((r) => setTimeout(r, 20));
    expect(extractor).not.toHaveBeenCalled();
    stop();
  });

  it("keeps pendingVoiceBlob on extraction failure", async () => {
    const store = useSettingsStore.getState();
    store.setCfg({
      pin: "0000",
      caregiverLang: "en",
      providers: [],
      patients: [],
      activePatientId: null,
    });
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn().mockResolvedValue({ kind: "fail", reason: "noisy" });
    const stop = startVoiceProcessor({ extract: extractor });
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    await new Promise((r) => setTimeout(r, 30));

    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.pendingVoiceBlob).toBeTruthy();
    expect(updated?.speakerData).toBeFalsy();
    stop();
  });
});
