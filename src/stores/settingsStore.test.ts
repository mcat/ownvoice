import { useSettingsStore } from "./settingsStore";
import type { AppSettings } from "../types";

const DEFAULT_CFG: AppSettings = {
  patientName: "Test Patient",
  bed: "A-101",
  patientLang: "en",
  patientVoice: false,
  pin: "1234",
  providers: [{ name: "Dr. Smith", hasVoice: false }],
};

// Reset store to a clean state before each test
beforeEach(() => {
  useSettingsStore.setState({
    cfg: null,
    speakerData: null,
    _hasHydrated: false,
  });
});

describe("useSettingsStore", () => {
  describe("initial state", () => {
    it("has cfg=null", () => {
      expect(useSettingsStore.getState().cfg).toBeNull();
    });

    it("has speakerData=null", () => {
      expect(useSettingsStore.getState().speakerData).toBeNull();
    });
  });

  describe("setCfg", () => {
    it("sets the config", () => {
      useSettingsStore.getState().setCfg(DEFAULT_CFG);
      expect(useSettingsStore.getState().cfg).toEqual(DEFAULT_CFG);
    });
  });

  describe("updateCfg", () => {
    it("merges a partial update into existing config", () => {
      useSettingsStore.getState().setCfg(DEFAULT_CFG);
      useSettingsStore.getState().updateCfg({ patientName: "New Name", bed: "B-202" });
      const cfg = useSettingsStore.getState().cfg!;
      expect(cfg.patientName).toBe("New Name");
      expect(cfg.bed).toBe("B-202");
      // Other fields preserved
      expect(cfg.patientLang).toBe("en");
      expect(cfg.pin).toBe("1234");
    });

    it("no-ops when cfg is null", () => {
      // cfg starts null
      useSettingsStore.getState().updateCfg({ patientName: "Ignored" });
      expect(useSettingsStore.getState().cfg).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears both cfg and speakerData", () => {
      useSettingsStore.getState().setCfg(DEFAULT_CFG);
      useSettingsStore.getState().setSpeakerData({ some: "data" });

      useSettingsStore.getState().reset();

      expect(useSettingsStore.getState().cfg).toBeNull();
      expect(useSettingsStore.getState().speakerData).toBeNull();
    });
  });

  describe("setSpeakerData", () => {
    it("stores arbitrary speaker data", () => {
      const data = { embedding: [1, 2, 3], name: "voice" };
      useSettingsStore.getState().setSpeakerData(data);
      expect(useSettingsStore.getState().speakerData).toEqual(data);
    });

    it("can store null", () => {
      useSettingsStore.getState().setSpeakerData({ x: 1 });
      useSettingsStore.getState().setSpeakerData(null);
      expect(useSettingsStore.getState().speakerData).toBeNull();
    });
  });

  describe("setHasHydrated", () => {
    it("sets the hydration flag", () => {
      useSettingsStore.getState().setHasHydrated(true);
      expect(useSettingsStore.getState()._hasHydrated).toBe(true);
    });
  });
});
