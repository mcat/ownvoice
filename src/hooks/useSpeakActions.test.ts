import { renderHook, act } from "@testing-library/preact";
import { useSpeakActions } from "./useSpeakActions";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import * as logger from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import { makeTestCfg } from "../test/makeCfg";

vi.mock("../speak", () => ({
  speak: vi.fn(),
}));

const DEFAULT_CFG = makeTestCfg({
  patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
  cfg: {
    pin: "0000",
    providers: [
      { name: "Dr. Jones", hasVoice: false },
      { name: "Nurse Lee", hasVoice: true },
    ],
  },
});

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(speak).mockClear();
  // Spy on the audit logger and silence its real implementation for the
  // duration of the unit. The logger no-ops without an initialised DB
  // anyway, but spying lets us assert call shapes.
  logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});
  useSettingsStore.setState({
    cfg: null,
    speakerData: null,
    _hasHydrated: false,
  });
  useUIStore.setState({
    speaking: null,
    activeProvIdx: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
  logSpy.mockRestore();
});

describe("useSpeakActions", () => {
  describe("when cfg is null (no-ops)", () => {
    it("speakAsPatient does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Hello");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("speakAsProvider does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Hello");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("composeThread does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.composeThread("Hello");
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it("transcribeThread does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.transcribeThread("Hello", "Dr. Jones");
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it("repeatSpeak does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("Hello", "patient");
      });

      expect(speak).not.toHaveBeenCalled();
    });
  });

  describe("speakAsPatient", () => {
    it("emits a SPEAK_TAP audit event with patient actor and calls speak", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("I need water");
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.name).toBe(EVENT.SPEAK_TAP);
      expect(event.attributes).toMatchObject({
        [ATTR.SPEECH_TEXT]: "I need water",
        [ATTR.ACTOR]: "patient",
        [ATTR.SPEECH_LANG]: "en",
      });

      expect(speak).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenCalledWith("I need water", {
        name: "Alice",
        type: "patient",
        embedding: undefined,
        lang: "en",
      });
    });

    it("passes speakerData as embedding when available", () => {
      const speakerData = { embedding: [1, 2, 3] };
      const cfgWithSpeaker = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true, speakerData },
        cfg: {
          pin: "0000",
          providers: [
            { name: "Dr. Jones", hasVoice: false },
            { name: "Nurse Lee", hasVoice: true },
          ],
        },
      });
      useSettingsStore.setState({ cfg: cfgWithSpeaker });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Hello");
      });

      expect(speak).toHaveBeenCalledWith("Hello", {
        name: "Alice",
        type: "patient",
        embedding: speakerData,
        lang: "en",
      });
    });

    it("sets speaking overlay and leaves lifecycle to the Speaking component", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Hi");
      });

      expect(useUIStore.getState().speaking).toEqual({
        text: "Hi",
        from: "patient",
      });

      // No external timer queued anymore — advancing time must NOT clear
      // speaking. The Speaking component's onDone callback is the sole
      // authority for transitioning back to null. Preserves the overlay
      // across rapid successive taps.
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(useUIStore.getState().speaking).toEqual({
        text: "Hi",
        from: "patient",
      });
    });
  });

  describe("speakAsProvider", () => {
    it("emits a SPEAK_TAP audit event with provider actor + provider name", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Can you rate your pain?");
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.name).toBe(EVENT.SPEAK_TAP);
      expect(event.attributes).toMatchObject({
        [ATTR.SPEECH_TEXT]: "Can you rate your pain?",
        [ATTR.ACTOR]: "provider",
        [ATTR.PROVIDER_NAME]: "Dr. Jones",
        [ATTR.SPEECH_LANG]: "en",
      });

      expect(speak).toHaveBeenCalledWith("Can you rate your pain?", {
        name: "Dr. Jones",
        type: "provider",
        embedding: undefined,
        lang: "en",
      });
    });

    it("uses activeProvIdx to pick provider name", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });
      useUIStore.setState({ activeProvIdx: 1 });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Take deep breaths");
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.PROVIDER_NAME]).toBe("Nurse Lee");

      expect(speak).toHaveBeenCalledWith("Take deep breaths", {
        name: "Nurse Lee",
        type: "provider",
        embedding: undefined,
        lang: "en",
      });
    });

    it("passes the active provider's embedding through to speak", () => {
      const providerEmbedding = { token: "prov-embed" };
      const cfgWithProviderEmbedding = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
        cfg: {
          pin: "0000",
          providers: [
            { name: "Dr. Jones", hasVoice: true, embedding: providerEmbedding },
            { name: "Nurse Lee", hasVoice: true },
          ],
        },
      });
      useSettingsStore.setState({ cfg: cfgWithProviderEmbedding });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Please rest");
      });

      expect(speak).toHaveBeenCalledWith("Please rest", {
        name: "Dr. Jones",
        type: "provider",
        embedding: providerEmbedding,
        lang: "en",
      });
    });

    it("falls back to 'Care Team' when provider name is empty", () => {
      const cfgNoName = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
        cfg: {
          pin: "0000",
          providers: [{ name: "", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg: cfgNoName });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Hello");
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.PROVIDER_NAME]).toBe("Care Team");
    });
  });

  describe("composeThread", () => {
    it("emits THREAD_COMPOSE with patient actor and no speak call", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.composeThread("I'm thirsty");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.name).toBe(EVENT.THREAD_COMPOSE);
      expect(event.attributes).toMatchObject({
        [ATTR.SPEECH_TEXT]: "I'm thirsty",
        [ATTR.ACTOR]: "patient",
        [ATTR.SPEECH_GLOSS]: "",
      });
    });

    it("includes gloss when provided", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.composeThread("Tengo sed", { gloss: "I am thirsty" });
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe("I am thirsty");
    });

    it("emits provider actor + provider name when from='provider' is passed (SICG question stems)", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.composeThread("What matters most to you?", {
          from: "provider",
          providerLabel: "Dr. Lee",
        });
      });

      expect(speak).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.name).toBe(EVENT.THREAD_COMPOSE);
      expect(event.attributes).toMatchObject({
        [ATTR.SPEECH_TEXT]: "What matters most to you?",
        [ATTR.ACTOR]: "provider",
        [ATTR.PROVIDER_NAME]: "Dr. Lee",
      });
    });

    it("defaults provider name to 'Care Team' when from='provider' but no providerLabel", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.composeThread("What matters most to you?", { from: "provider" });
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes).toMatchObject({
        [ATTR.ACTOR]: "provider",
        [ATTR.PROVIDER_NAME]: "Care Team",
      });
    });
  });

  describe("transcribeThread", () => {
    it("emits THREAD_TRANSCRIBED with provider actor + label and no speak call", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.transcribeThread("Note from nurse", "Nurse Lee");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.name).toBe(EVENT.THREAD_TRANSCRIBED);
      expect(event.attributes).toMatchObject({
        [ATTR.SPEECH_TEXT]: "Note from nurse",
        [ATTR.ACTOR]: "provider",
        [ATTR.PROVIDER_NAME]: "Nurse Lee",
      });
    });
  });

  describe("repeatSpeak", () => {
    it("calls speak without emitting any audit event", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("I need help", "patient");
      });

      // Should NOT log a thread event (the original utterance already did)
      expect(logSpy).not.toHaveBeenCalled();

      // Should call speak
      expect(speak).toHaveBeenCalledWith("I need help", {
        name: "Alice",
        type: "patient",
        embedding: undefined,
        lang: "en",
      });
    });

    it("sets speaking overlay for provider repeats", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("Please rest", "provider");
      });

      expect(useUIStore.getState().speaking).toEqual({
        text: "Please rest",
        from: "provider",
      });

      expect(speak).toHaveBeenCalledWith("Please rest", {
        name: "Dr. Jones",
        type: "provider",
        embedding: undefined,
        lang: "en",
      });
    });
  });

  describe("activeProv", () => {
    it("exposes the active provider from cfg", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      expect(result.current.activeProv).toEqual({
        name: "Dr. Jones",
        hasVoice: false,
      });
    });

    it("falls back to Care Team when providers array is empty", () => {
      const cfgNoProviders = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
        cfg: {
          pin: "0000",
          providers: [],
        },
      });
      useSettingsStore.setState({ cfg: cfgNoProviders });

      const { result } = renderHook(() => useSpeakActions());

      expect(result.current.activeProv).toEqual({
        name: "Care Team",
        hasVoice: false,
      });
    });
  });

  // ── Gloss population (PR 4) ──────────────────────────────────────

  describe("gloss population", () => {
    it("speakAsPatient with key resolves gloss in caregiverLang", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Yes", { key: "quick.yes" });
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      // Same locale → gloss resolves to the same value as text
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe("Yes");
      expect(event.attributes?.[ATTR.SPEECH_PHRASE_KEY]).toBe("quick.yes");
    });

    it("speakAsPatient with explicit gloss uses the provided gloss", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Tengo dolor agudo en mi cabeza, nivel 8 de 10", {
          gloss: "I have sharp pain in my Head, level 8 out of 10",
        });
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe(
        "I have sharp pain in my Head, level 8 out of 10",
      );
    });

    it("speakAsPatient without opts records empty gloss/key (free-text)", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("please help me breathe");
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe("");
      expect(event.attributes?.[ATTR.SPEECH_PHRASE_KEY]).toBe("");
    });

    it("speakAsProvider with key resolves gloss in patientLang", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "en", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("How are you feeling?", { key: "provider.questions.feeling" });
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe("How are you feeling?");
    });

    it("speakAsProvider without opts records empty gloss", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Take deep breaths");
      });

      const [event] = logSpy.mock.calls[0] as [logger.AuditEvent];
      expect(event.attributes?.[ATTR.SPEECH_GLOSS]).toBe("");
    });
  });

  // ── Speaker.lang threading (PR 4) ────────────────────────────────

  describe("speaker lang threading", () => {
    it("speakAsPatient sets speaker.lang to caregiverLang (patient voice speaks caregiver's language)", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("I need water");
      });

      expect(speak).toHaveBeenCalledWith("I need water", expect.objectContaining({
        lang: "en",
        type: "patient",
      }));
    });

    it("speakAsPatient with key speaks the caregiverLang-resolved text, not the patientLang display text", () => {
      // Voice-direction: patient sees Spanish, care team + voice clone speak English.
      // Regression guard for the bug where the display text leaked into the
      // speech path (Spanish-accented Spanish instead of Spanish-accented English).
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        // "Sí" is the patientLang display text for `quick.yes` in Spanish.
        result.current.speakAsPatient("Sí", { key: "quick.yes" });
      });

      // Speech must be in caregiverLang (English "Yes"), regardless of
      // what the UI rendered.
      expect(speak).toHaveBeenCalledWith("Yes", expect.objectContaining({
        lang: "en",
        type: "patient",
      }));
    });

    it("speakAsProvider with key speaks the patientLang-resolved text, not the caregiverLang UI text", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Yes", { key: "quick.yes" });
      });

      expect(speak).toHaveBeenCalledWith("Sí", expect.objectContaining({
        lang: "es",
        type: "provider",
      }));
    });

    it("speakAsPatient with explicit gloss speaks the gloss (already caregiverLang)", () => {
      // Composed-sentence path (PainFlow, MyWishes, SentenceBuilder) pre-
      // resolves the caregiverLang sentence as gloss and it must be what
      // gets spoken.
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Tengo dolor agudo en mi cabeza, nivel 8 de 10", {
          gloss: "I have sharp pain in my Head, level 8 out of 10",
        });
      });

      expect(speak).toHaveBeenCalledWith(
        "I have sharp pain in my Head, level 8 out of 10",
        expect.objectContaining({ lang: "en", type: "patient" }),
      );
    });

    it("speakAsProvider sets speaker.lang to patientLang (provider voice speaks patient's language)", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("How are you feeling?");
      });

      expect(speak).toHaveBeenCalledWith("How are you feeling?", expect.objectContaining({
        lang: "es",
        type: "provider",
      }));
    });

    it("repeatSpeak sets speaker.lang to caregiverLang for patient repeats", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("I need water", "patient");
      });

      expect(speak).toHaveBeenCalledWith("I need water", expect.objectContaining({
        lang: "en",
        type: "patient",
      }));
    });

    it("repeatSpeak sets speaker.lang to patientLang for provider repeats", () => {
      const cfg = makeTestCfg({
        patient: { name: "Alice", bed: "B-102", patientLang: "es", hasVoice: true },
        cfg: {
          pin: "0000",
          caregiverLang: "en",
          providers: [{ name: "Dr. Jones", hasVoice: false }],
        },
      });
      useSettingsStore.setState({ cfg });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("How are you feeling?", "provider");
      });

      expect(speak).toHaveBeenCalledWith("How are you feeling?", expect.objectContaining({
        lang: "es",
        type: "provider",
      }));
    });
  });
});
