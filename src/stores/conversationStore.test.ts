import { describe, it, expect, beforeEach, vi } from "vitest";

describe("conversationStore — multi-patient partitioning", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("messages scope to activePatientId when added", async () => {
    // Set activePatientId via settingsStore
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
          { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });

    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.getState().addMessage("hello from A", "patient", "A");
    useSettingsStore.getState().switchPatient("b");
    useConversationStore.getState().addMessage("hello from B", "patient", "B");

    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["a"]).toHaveLength(1);
    expect(state.messagesByPatientId["a"][0].text).toBe("hello from A");
    expect(state.messagesByPatientId["b"]).toHaveLength(1);
    expect(state.messagesByPatientId["b"][0].text).toBe("hello from B");
  });

  it("clearForPatient deletes that patient's thread only", async () => {
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "a-msg", time: "", label: "" }],
        b: [{ from: "patient", text: "b-msg", time: "", label: "" }],
      },
    });
    useConversationStore.getState().clearForPatient("a");
    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["a"]).toBeUndefined();
    expect(state.messagesByPatientId["b"]).toHaveLength(1);
  });

  it("addMessage is a no-op if no active patient", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    });
    const { useConversationStore } = await import("./conversationStore");
    const before = useConversationStore.getState().messagesByPatientId;
    useConversationStore.getState().addMessage("orphan", "patient", "X");
    expect(useConversationStore.getState().messagesByPatientId).toEqual(before);
  });

  it("clear() only affects the active patient's thread", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
          { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });

    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "a-msg", time: "", label: "" }],
        b: [{ from: "patient", text: "b-msg", time: "", label: "" }],
      },
    });

    useConversationStore.getState().clear();
    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["a"]).toBeUndefined();
    expect(state.messagesByPatientId["b"]).toHaveLength(1);
    expect(state.messagesByPatientId["b"][0].text).toBe("b-msg");
  });

  it("v1 messages migrate to the active patient's bucket", async () => {
    // First, seed settingsStore so there's an active patient during migration
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "migrated-patient", name: "M", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "migrated-patient",
      },
    });

    // Seed IDB with v1-shaped conversation data (flat messages array, no version)
    const { createIDBStorage } = await import("./idbStorage");
    const v1Data = {
      state: {
        messages: [
          { from: "patient", text: "legacy msg 1", time: "10:00 AM", label: "Greeting" },
          { from: "provider", text: "legacy msg 2", time: "10:01 AM", label: "Response" },
        ],
      },
      version: 0,
    };
    await createIDBStorage().setItem("ov-conversation", JSON.stringify(v1Data));

    // Dynamically import the conversation store — triggers hydration + migration
    const { useConversationStore } = await import("./conversationStore");

    // Wait for the persist middleware to hydrate from IDB
    await vi.waitFor(() => {
      const mbp = useConversationStore.getState().messagesByPatientId;
      if (!mbp["migrated-patient"] || mbp["migrated-patient"].length === 0) {
        throw new Error("not yet hydrated");
      }
    });

    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["migrated-patient"]).toHaveLength(2);
    expect(state.messagesByPatientId["migrated-patient"][0].text).toBe("legacy msg 1");
    expect(state.messagesByPatientId["migrated-patient"][1].text).toBe("legacy msg 2");
  });

  it("clear() is a no-op when no active patient", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ cfg: null });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "hi from a", time: "10:00", label: "A" }],
      },
    });
    useConversationStore.getState().clear();
    // No active patient → clear is no-op; other patients' threads untouched
    expect(useConversationStore.getState().messagesByPatientId["a"]).toHaveLength(1);
  });

  it("clearForPatient is a no-op for unknown patient id", async () => {
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "hi", time: "10:00", label: "A" }],
      },
    });
    const before = useConversationStore.getState().messagesByPatientId;
    useConversationStore.getState().clearForPatient("nonexistent");
    // Other entries preserved
    expect(useConversationStore.getState().messagesByPatientId["a"]).toHaveLength(1);
    // Strong assertion: no side effect on the unrelated thread
    expect(useConversationStore.getState().messagesByPatientId).not.toBe(before);
  });

  it("addMessage populates a formatted time string (hh:mm pattern)", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "",
        caregiverLang: "en",
        providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({ messagesByPatientId: {} });
    useConversationStore.getState().addMessage("hello", "patient", "X");
    const msg = useConversationStore.getState().messagesByPatientId["a"][0];
    // toLocaleTimeString with hour+minute → matches "HH:MM" or "H:MM AM/PM"
    expect(msg.time).toMatch(/\d{1,2}:\d{2}/);
    expect(msg.text).toBe("hello");
    expect(msg.from).toBe("patient");
    expect(msg.label).toBe("X");
  });

  it("addMessage preserves existing messages for the same patient (append, don't replace)", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "",
        caregiverLang: "en",
        providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "first", time: "10:00", label: "A" }],
      },
    });
    useConversationStore.getState().addMessage("second", "provider", "Dr.");
    const thread = useConversationStore.getState().messagesByPatientId["a"];
    expect(thread).toHaveLength(2);
    expect(thread[0].text).toBe("first");
    expect(thread[1].text).toBe("second");
    expect(thread[1].from).toBe("provider");
  });

  it("addMessage passes through the optional gloss field", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "",
        caregiverLang: "en",
        providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({ messagesByPatientId: {} });
    useConversationStore.getState().addMessage("hello", "patient", "X", "hola");
    expect(useConversationStore.getState().messagesByPatientId["a"][0].gloss).toBe("hola");
  });

  it("v1 orphan messages are dropped when no active patient is available", async () => {
    vi.resetModules();
    indexedDB.deleteDatabase("keyval-store");
    // Seed a v1 blob with messages but DON'T set up a settingsStore cfg first
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({ cfg: null });
    const v1Blob = {
      state: {
        messages: [{ from: "patient", text: "orphan", time: "10:00", label: "X" }],
      },
      version: 1,
    };
    const { createDebouncedIDBStorage } = await import("./idbStorage");
    await createDebouncedIDBStorage(0).setItem("ov-conversation", JSON.stringify(v1Blob));

    const { useConversationStore } = await import("./conversationStore");
    await vi.waitFor(() => {
      const state = useConversationStore.getState();
      // After rehydration+migration, with no active patient, orphan messages drop
      expect(state.messagesByPatientId).toEqual({});
    }, { timeout: 2000 });
  });

  // --- Mutation-killing tests (targeted at specific survivors) ---

  it("addMessage does not throw when cfg is null (OptionalChaining survivor)", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    // cfg is null — cfg?.activePatientId must gracefully short-circuit
    useSettingsStore.setState({ cfg: null });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({ messagesByPatientId: {} });
    // Without the optional chain, this throws. With it, it's a no-op.
    expect(() => {
      useConversationStore.getState().addMessage("x", "patient", "L");
    }).not.toThrow();
    expect(useConversationStore.getState().messagesByPatientId).toEqual({});
  });

  it("addMessage time field uses hour:minute format with 2-digit minutes", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({ messagesByPatientId: {} });
    // Spy on Date.prototype.toLocaleTimeString so we can assert the options are real
    const spy = vi.spyOn(Date.prototype, "toLocaleTimeString");
    useConversationStore.getState().addMessage("hello", "patient", "X");
    expect(spy).toHaveBeenCalledWith([], {
      hour: "numeric", minute: "2-digit",
    });
    // The actual formatted time has 2-digit minutes (e.g., "3:05 AM", not "3:5 AM")
    const msg = useConversationStore.getState().messagesByPatientId["a"][0];
    expect(msg.time).toMatch(/:\d{2}/);
    spy.mockRestore();
  });

  it("clear() has distinct observable effects for active vs. non-active-patient paths", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const { useConversationStore } = await import("./conversationStore");

    // Branch A: with active patient — clear MUST delete the active patient's thread
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "pre-clear", time: "10:00", label: "A" }],
        b: [{ from: "patient", text: "keep-b", time: "10:00", label: "B" }],
      },
    });
    useConversationStore.getState().clear();
    const afterActive = useConversationStore.getState().messagesByPatientId;
    expect(afterActive["a"]).toBeUndefined();
    expect(afterActive["b"]).toHaveLength(1); // b unaffected

    // Branch B: no active patient — clear MUST be a no-op
    useSettingsStore.setState({ cfg: null });
    useConversationStore.setState({
      messagesByPatientId: {
        c: [{ from: "patient", text: "should-survive", time: "10:00", label: "C" }],
      },
    });
    useConversationStore.getState().clear();
    expect(useConversationStore.getState().messagesByPatientId["c"]).toHaveLength(1);
    expect(useConversationStore.getState().messagesByPatientId["c"][0].text).toBe("should-survive");
  });

  it("migrate returns { messagesByPatientId: {} } when persisted state is null (null guard)", async () => {
    vi.resetModules();
    indexedDB.deleteDatabase("keyval-store");
    // Don't seed anything — persisted will be null
    const { useConversationStore } = await import("./conversationStore");
    await vi.waitFor(() => {
      expect(useConversationStore.getState().messagesByPatientId).toEqual({});
    }, { timeout: 2000 });
  });

  it("migrate from v2 (not v1) preserves existing messagesByPatientId (LogicalOperator/EqualityOperator survivor)", async () => {
    vi.resetModules();
    indexedDB.deleteDatabase("keyval-store");
    // A v2-shape blob that already has messagesByPatientId — migrate must not rewrite it
    const v2Blob = {
      state: {
        messagesByPatientId: {
          "existing-patient-id": [
            { from: "patient", text: "preserved", time: "10:00", label: "P" },
          ],
        },
      },
      version: 2,
    };
    const { createDebouncedIDBStorage } = await import("./idbStorage");
    await createDebouncedIDBStorage(0).setItem("ov-conversation", JSON.stringify(v2Blob));
    const { useConversationStore } = await import("./conversationStore");
    await vi.waitFor(() => {
      const state = useConversationStore.getState();
      // If migrate mutated `fromVersion < 2` boolean, v2 data would be lost
      expect(state.messagesByPatientId["existing-patient-id"]).toBeDefined();
      expect(state.messagesByPatientId["existing-patient-id"]).toHaveLength(1);
      expect(state.messagesByPatientId["existing-patient-id"][0].text).toBe("preserved");
    }, { timeout: 2000 });
  });

  it("migrate from v1 with ALREADY-PARTITIONED messagesByPatientId takes the v2-pass-through branch", async () => {
    vi.resetModules();
    indexedDB.deleteDatabase("keyval-store");
    // Inconsistent v1 blob: has BOTH messages AND messagesByPatientId. Migration's
    // `!typed.messagesByPatientId` branch must take the pass-through path, not the
    // v1-reattach path.
    const v1MixedBlob = {
      state: {
        messages: [{ from: "patient", text: "should be ignored", time: "10:00", label: "X" }],
        messagesByPatientId: {
          "foo": [{ from: "patient", text: "take this", time: "10:00", label: "Y" }],
        },
      },
      version: 1,
    };
    const { createDebouncedIDBStorage } = await import("./idbStorage");
    await createDebouncedIDBStorage(0).setItem("ov-conversation", JSON.stringify(v1MixedBlob));
    const { useConversationStore } = await import("./conversationStore");
    await vi.waitFor(() => {
      const state = useConversationStore.getState();
      // messagesByPatientId present → skip the v1-reattach branch → preserve as-is
      expect(state.messagesByPatientId["foo"]).toHaveLength(1);
      expect(state.messagesByPatientId["foo"][0].text).toBe("take this");
    }, { timeout: 2000 });
  });
});
