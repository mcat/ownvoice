import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";
import type { AppSettings, Patient } from "../types";

const DEFAULT_CFG: AppSettings = {
  pin: "1234",
  caregiverLang: "en",
  providers: [{ name: "Dr. Smith", hasVoice: false }],
  patients: [],
  activePatientId: null,
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
      useSettingsStore.getState().updateCfg({ pin: "5678", caregiverLang: "fr" });
      const cfg = useSettingsStore.getState().cfg!;
      expect(cfg.pin).toBe("5678");
      expect(cfg.caregiverLang).toBe("fr");
      // Other fields preserved
      expect(cfg.providers).toHaveLength(1);
      expect(cfg.patients).toEqual([]);
    });

    it("no-ops when cfg is null", () => {
      // cfg starts null
      useSettingsStore.getState().updateCfg({ pin: "Ignored" });
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

  it("fills in caregiverLang='en' for a stored config missing the field (v0→v2)", async () => {
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
    // v0→v1 adds caregiverLang, then v1→v2 migrates to multi-patient
    expect(cfg.caregiverLang).toBe("en");
    // Patient fields now live on the patient record
    expect(cfg.patients).toHaveLength(1);
    expect(cfg.patients[0].patientLang).toBe("es");
    expect(cfg.patients[0].name).toBe("Maria");
  });

  it("leaves caregiverLang alone when already present (v0→v2)", async () => {
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

    const cfg = store.getState().cfg!;
    expect(cfg.caregiverLang).toBe("de");
    // Patient fields now live on the patient record
    expect(cfg.patients).toHaveLength(1);
    expect(cfg.patients[0].patientLang).toBe("fr");
    expect(cfg.patients[0].name).toBe("Jean");
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

  it("migrates v1 single-patient cfg to v2 multi-patient shape", async () => {
    const v1 = {
      state: {
        cfg: {
          patientName: "Maria",
          bed: "4B-12",
          patientLang: "es",
          caregiverLang: "en",
          patientVoice: true,
          pin: "1234",
          providers: [{ name: "Dr. Smith", hasVoice: true, emoji: "\u{1F468}‍⚕️", embedding: { foo: 1 } }],
          fallbackVoice: { voiceURI: "com.apple.speech.synthesis.voice.Maria", name: "Maria" },
        },
        speakerData: { id: "maria-voice-data" },
      },
      version: 1,
    };
    const store = await seedAndImport(v1);
    const cfg = store.getState().cfg!;

    expect(cfg.patients).toHaveLength(1);
    const p = cfg.patients[0];
    expect(p.name).toBe("Maria");
    expect(p.bed).toBe("4B-12");
    expect(p.patientLang).toBe("es");
    expect(p.hasVoice).toBe(true);
    expect(p.speakerData).toEqual({ id: "maria-voice-data" });
    expect(p.fallbackVoice).toEqual({ voiceURI: "com.apple.speech.synthesis.voice.Maria", name: "Maria" });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/i);  // UUID
    expect(typeof p.addedAt).toBe("number");
    expect(typeof p.lastActiveAt).toBe("number");

    expect(cfg.activePatientId).toBe(p.id);
    expect(cfg.pin).toBe("1234");
    expect(cfg.caregiverLang).toBe("en");
    expect(cfg.providers).toHaveLength(1);

    // Old top-level fields are gone
    expect((cfg as Record<string, unknown>).patientName).toBeUndefined();
    expect((cfg as Record<string, unknown>).speakerData).toBeUndefined();
    // Store-top-level speakerData is cleared (moved into Patient)
    expect(store.getState().speakerData).toBeNull();
  });

  it("leaves already-v2 configs alone", async () => {
    const v2 = {
      state: {
        cfg: {
          pin: "9999",
          caregiverLang: "de",
          providers: [],
          patients: [{
            id: "abc-123",
            name: "Jean",
            bed: "",
            patientLang: "fr",
            hasVoice: false,
            speakerData: null,
            addedAt: 1_000_000,
            lastActiveAt: 1_000_000,
          }],
          activePatientId: "abc-123",
        },
        speakerData: null,
      },
      version: 2,
    };
    const store = await seedAndImport(v2);
    const cfg = store.getState().cfg!;
    expect(cfg.patients[0].id).toBe("abc-123");
    expect(cfg.activePatientId).toBe("abc-123");
    expect(cfg.pin).toBe("9999");
  });
});

describe("multi-patient actions", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("keyval-store");
    vi.resetModules();
  });

  it("addPatient appends to list and sets active", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [], activePatientId: null,
      },
    });
    const p = useSettingsStore.getState().addPatient({
      name: "X", bed: "A-1", patientLang: "en",
      hasVoice: false, speakerData: null, fallbackVoice: null,
    });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients).toHaveLength(1);
    expect(cfg.activePatientId).toBe(p.id);
  });

  it("switchPatient updates activePatientId + bumps lastActiveAt", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    useSettingsStore.getState().switchPatient("b");
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.activePatientId).toBe("b");
    expect(cfg.patients[1].lastActiveAt).toBeGreaterThan(0);
  });

  it("removePatient throws if target is active", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a], activePatientId: "a" },
    });
    expect(() => useSettingsStore.getState().removePatient("a")).toThrow(/active/);
  });

  it("removePatient removes non-active patients", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    useSettingsStore.getState().removePatient("b");
    expect(useSettingsStore.getState().cfg!.patients).toEqual([a]);
  });

  it("updateActivePatient patches the active patient only", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "1", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "2", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    useSettingsStore.getState().updateActivePatient({ name: "A-Updated", bed: "1-NEW" });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients[0].name).toBe("A-Updated");
    expect(cfg.patients[0].bed).toBe("1-NEW");
    // Patient B is untouched
    expect(cfg.patients[1].name).toBe("B");
    expect(cfg.patients[1].bed).toBe("2");
  });
});
