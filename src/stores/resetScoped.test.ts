import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetPatients, resetCareTeam } from "./resetScoped";
import { useSettingsStore } from "./settingsStore";
import { useAudioCacheStore } from "./audioCacheStore";
import { makeTestCfg } from "../test/makeCfg";

vi.mock("./patientIndex", () => ({
  getAllPatientHashes: vi.fn(async () => new Set(["h1", "h2"])),
  clearIndex: vi.fn(async () => {}),
}));

vi.mock("../models/audioCache", () => ({
  clearAudioByHashes: vi.fn(async () => {}),
  clearAudioExcept: vi.fn(async () => {}),
}));

vi.mock("../models/audioCacheRunner", () => ({
  abort: vi.fn(),
}));

import { clearAudioByHashes, clearAudioExcept } from "../models/audioCache";
import { getAllPatientHashes, clearIndex } from "./patientIndex";
import * as audioCacheRunner from "../models/audioCacheRunner";

function seed() {
  const cfg = makeTestCfg({
    patient: { name: "Maria", patientLang: "en", hasVoice: true },
    cfg: {
      providers: [
        { name: "Dr. Smith", hasVoice: true, emoji: "👩‍⚕️" },
        { name: "Nurse Jay", hasVoice: false, emoji: "🧑‍⚕️" },
      ],
    },
  });
  useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
  useAudioCacheStore.setState({ runs: { "patient:p1": { status: "running", current: 1, total: 5 } } as never, activeKey: "patient:p1" as never });
  return cfg;
}

describe("resetScoped", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    useSettingsStore.setState({ cfg: null, speakerData: null, _hasHydrated: false });
    useAudioCacheStore.setState({ runs: {}, activeKey: null });
  });

  describe("resetPatients", () => {
    it("clears patients and activePatientId but keeps providers", async () => {
      seed();
      await resetPatients();
      const cfg = useSettingsStore.getState().cfg;
      expect(cfg?.patients).toEqual([]);
      expect(cfg?.activePatientId).toBeNull();
      expect(cfg?.providers).toHaveLength(2);
    });

    it("removes patient-tracked audio entries by hash and clears the index", async () => {
      seed();
      await resetPatients();
      expect(getAllPatientHashes).toHaveBeenCalled();
      expect(clearAudioByHashes).toHaveBeenCalledWith(new Set(["h1", "h2"]));
      expect(clearIndex).toHaveBeenCalled();
    });

    it("aborts any in-flight pre-generation", async () => {
      seed();
      await resetPatients();
      expect(audioCacheRunner.abort).toHaveBeenCalled();
    });
  });

  describe("resetCareTeam", () => {
    it("clears providers but keeps patients", async () => {
      const original = seed();
      await resetCareTeam();
      const cfg = useSettingsStore.getState().cfg;
      expect(cfg?.providers).toEqual([]);
      expect(cfg?.patients).toEqual(original.patients);
      expect(cfg?.activePatientId).toBe(original.activePatientId);
    });

    it("removes audio entries NOT in the patient hash set", async () => {
      seed();
      await resetCareTeam();
      expect(clearAudioExcept).toHaveBeenCalledWith(new Set(["h1", "h2"]));
    });

    it("does NOT touch the patient hash index", async () => {
      seed();
      await resetCareTeam();
      expect(clearIndex).not.toHaveBeenCalled();
    });
  });
});
