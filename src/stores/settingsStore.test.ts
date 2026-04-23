import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";
import type { AppSettings } from "../types";

const DEFAULT_CFG: AppSettings = {
  patientName: "Test Patient",
  bed: "A-101",
  patientLang: "en",
  caregiverLang: "en",
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

describe("settingsStore persist migration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  /** Seed IDB with a raw persisted-state blob, then dynamically import
   *  the store so `persist` middleware hydrates from that seeded data. */
  async function seedAndImport(blob: unknown) {
    const { createIDBStorage: freshIDB } = await import("./idbStorage");
    await freshIDB().setItem("ov-settings", JSON.stringify(blob));

    const { useSettingsStore: store } = await import("./settingsStore");
    // Wait for async hydration to complete
    await vi.waitFor(() => {
      if (!store.getState()._hasHydrated) throw new Error("not yet");
    });
    return store;
  }

  it("fills in caregiverLang='en' for a stored config missing the field", async () => {
    const store = await seedAndImport({
      state: {
        cfg: {
          patientName: "Maria",
          bed: "4B-12",
          patientLang: "es",
          patientVoice: true,
          pin: "",
          providers: [],
        },
        speakerData: null,
      },
      version: 0,
    });

    const cfg = store.getState().cfg!;
    expect(cfg.caregiverLang).toBe("en");
    expect(cfg.patientLang).toBe("es");
    expect(cfg.patientName).toBe("Maria");
  });

  it("leaves caregiverLang alone when already present", async () => {
    const store = await seedAndImport({
      state: {
        cfg: {
          patientName: "Jean",
          bed: "",
          patientLang: "fr",
          caregiverLang: "de",
          patientVoice: false,
          pin: "",
          providers: [],
        },
        speakerData: null,
      },
      version: 0,
    });

    expect(store.getState().cfg!.caregiverLang).toBe("de");
    expect(store.getState().cfg!.patientLang).toBe("fr");
    expect(store.getState().cfg!.patientName).toBe("Jean");
  });

  it("handles null persisted state (first launch)", async () => {
    // Explicitly clear IDB so no seeded data leaks from prior tests
    const { createIDBStorage: freshIDB } = await import("./idbStorage");
    await freshIDB().removeItem("ov-settings");

    vi.resetModules();
    const { useSettingsStore } = await import("./settingsStore");
    await vi.waitFor(
      () => {
        if (!useSettingsStore.getState()._hasHydrated) throw new Error("not yet");
      },
      { timeout: 2000 },
    );
    expect(useSettingsStore.getState().cfg).toBeNull();
  });
});
