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
});
