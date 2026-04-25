import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsStore } from "./settingsStore";
import { makeTestCfg } from "../test/makeCfg";
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

  it("updatePatient patches a non-active patient by id", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "1", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "2", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    // Patch B even though A is active — proves edit-non-active works.
    useSettingsStore.getState().updatePatient("b", { name: "B-Updated", bed: "9C" });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients[1].name).toBe("B-Updated");
    expect(cfg.patients[1].bed).toBe("9C");
    // Active patient A is untouched.
    expect(cfg.patients[0].name).toBe("A");
    expect(cfg.patients[0].bed).toBe("1");
    // activePatientId is also untouched.
    expect(cfg.activePatientId).toBe("a");
  });

  it("updatePatient with unknown id is a no-op (no throw, no mutation)", () => {
    const a: Patient = { id: "a", name: "A", bed: "1", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a], activePatientId: "a" },
    });
    const before = useSettingsStore.getState().cfg;
    useSettingsStore.getState().updatePatient("nonexistent", { name: "X" });
    expect(useSettingsStore.getState().cfg).toBe(before);
  });

  it("switchPatient to unknown id is a no-op", () => {
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a], activePatientId: "a" },
    });
    const before = useSettingsStore.getState().cfg;
    useSettingsStore.getState().switchPatient("nonexistent-id");
    // State reference should be unchanged (no shallow copy created)
    expect(useSettingsStore.getState().cfg).toBe(before);
    expect(useSettingsStore.getState().cfg!.activePatientId).toBe("a");
  });

  it("addPatient returns a Patient with a valid UUID and timestamps", () => {
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    });
    const before = Date.now();
    const p = useSettingsStore.getState().addPatient({
      name: "X", bed: "A-1", patientLang: "en",
      hasVoice: false, speakerData: null, fallbackVoice: null,
    });
    const after = Date.now();
    // UUID v4 shape: 8-4-4-4-12 hex chars with version nibble = 4
    expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(p.addedAt).toBeGreaterThanOrEqual(before);
    expect(p.addedAt).toBeLessThanOrEqual(after);
    expect(p.lastActiveAt).toBe(p.addedAt);
  });

  it("add → switch → add → remove multi-step sequence produces exact shape", () => {
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    });
    const p1 = useSettingsStore.getState().addPatient({
      name: "Alice", bed: "1", patientLang: "en",
      hasVoice: false, speakerData: null, fallbackVoice: null,
    });
    const p2 = useSettingsStore.getState().addPatient({
      name: "Bob", bed: "2", patientLang: "es",
      hasVoice: true, speakerData: { x: 1 }, fallbackVoice: null,
    });
    // After two adds, active is p2 (addPatient always sets the new patient active)
    expect(useSettingsStore.getState().cfg!.activePatientId).toBe(p2.id);
    // Switch back to p1
    useSettingsStore.getState().switchPatient(p1.id);
    expect(useSettingsStore.getState().cfg!.activePatientId).toBe(p1.id);
    // Remove p2 (not active, so succeeds)
    useSettingsStore.getState().removePatient(p2.id);
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients).toHaveLength(1);
    expect(cfg.patients[0].id).toBe(p1.id);
    expect(cfg.activePatientId).toBe(p1.id);
  });

  it("updateActivePatient is a no-op when no active patient is set", () => {
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    });
    const before = useSettingsStore.getState().cfg;
    useSettingsStore.getState().updateActivePatient({ name: "should-not-apply" });
    // State reference unchanged
    expect(useSettingsStore.getState().cfg).toBe(before);
  });

  it("reset() clears cfg and speakerData to null", () => {
    useSettingsStore.setState({
      cfg: makeTestCfg(),
      speakerData: { foo: 1 },
    });
    useSettingsStore.getState().reset();
    expect(useSettingsStore.getState().cfg).toBeNull();
    expect(useSettingsStore.getState().speakerData).toBeNull();
  });
});

describe("settingsStore persist middleware wiring", () => {
  it("partialize returns only { cfg, speakerData } — not internal flags", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeTestCfg({ patient: { name: "Maria" } }),
      speakerData: { sampleData: true },
    });
    // Access the persist options via the runtime API
    // (partialize is stored on the persist middleware's option object)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persist = (useSettingsStore as any).persist;
    expect(persist).toBeDefined();
    const partialized = persist.getOptions().partialize(
      useSettingsStore.getState(),
    );
    // Strong assertion: partialize must export cfg + speakerData ONLY
    expect(Object.keys(partialized).sort()).toEqual(["cfg", "speakerData"]);
    expect(partialized.cfg.patients[0].name).toBe("Maria");
    expect(partialized.speakerData).toEqual({ sampleData: true });
    // Introspection: must NOT include _hasHydrated or action functions
    expect("_hasHydrated" in partialized).toBe(false);
    expect("addPatient" in partialized).toBe(false);
  });

  it("store exposes a non-null persist name 'ov-settings'", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const persist = (useSettingsStore as any).persist;
    expect(persist.getOptions().name).toBe("ov-settings");
    expect(persist.getOptions().version).toBe(2);
  });
});

describe("settingsStore action branch coverage (mutation-targeted)", () => {
  beforeEach(() => {
    useSettingsStore.setState({ cfg: null, speakerData: null, _hasHydrated: false });
  });

  it("switchPatient is a no-op when cfg is null (null-guard)", () => {
    useSettingsStore.setState({ cfg: null });
    expect(() => useSettingsStore.getState().switchPatient("any-id")).not.toThrow();
    expect(useSettingsStore.getState().cfg).toBeNull();
  });

  it("switchPatient logs a warning with the specific id when patient not found", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [
        { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
      ], activePatientId: "a" },
    });
    useSettingsStore.getState().switchPatient("unknown-xyz");
    expect(warn).toHaveBeenCalled();
    const firstCallArg = warn.mock.calls[0]?.[0];
    // StringLiteral mutation on the warning message would lose "unknown-xyz"
    // or the "[settingsStore]" prefix
    expect(firstCallArg).toContain("unknown-xyz");
    expect(firstCallArg).toContain("settingsStore");
    expect(firstCallArg).toContain("switchPatient");
    expect(useSettingsStore.getState().cfg!.activePatientId).toBe("a");
    warn.mockRestore();
  });

  it("switchPatient bumps lastActiveAt ONLY on the target patient, not others", () => {
    const now0 = 1000;
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: now0 };
    const b: Patient = { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: now0 };
    const c: Patient = { id: "c", name: "C", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: now0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b, c], activePatientId: "a" },
    });
    const before = Date.now();
    useSettingsStore.getState().switchPatient("b");
    const after = Date.now();
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients[0].lastActiveAt).toBe(now0);
    expect(cfg.patients[1].lastActiveAt).toBeGreaterThanOrEqual(before);
    expect(cfg.patients[1].lastActiveAt).toBeLessThanOrEqual(after);
    expect(cfg.patients[2].lastActiveAt).toBe(now0);
  });

  it("removePatient is a no-op when cfg is null", () => {
    useSettingsStore.setState({ cfg: null });
    expect(() => useSettingsStore.getState().removePatient("any")).not.toThrow();
    expect(useSettingsStore.getState().cfg).toBeNull();
  });

  it("addPatient sets activePatientId to the new patient's id even when a previous active existed", () => {
    const existing: Patient = { id: "existing", name: "Old", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [existing], activePatientId: "existing" },
    });
    const p = useSettingsStore.getState().addPatient({
      name: "New", bed: "", patientLang: "en",
      hasVoice: false, speakerData: null, fallbackVoice: null,
    });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.activePatientId).toBe(p.id);
    expect(cfg.activePatientId).not.toBe("existing");
    expect(cfg.patients).toHaveLength(2);
  });

  it("updateCfg merges partial fields without wiping existing ones", () => {
    const before: Patient = { id: "a", name: "A", bed: "1", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "1234", caregiverLang: "en", providers: [{ name: "Dr. X", hasVoice: false }], patients: [before], activePatientId: "a" },
    });
    useSettingsStore.getState().updateCfg({ caregiverLang: "es" });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.caregiverLang).toBe("es");
    expect(cfg.pin).toBe("1234");
    expect(cfg.providers).toHaveLength(1);
    expect(cfg.patients[0].id).toBe("a");
    expect(cfg.activePatientId).toBe("a");
  });
});
