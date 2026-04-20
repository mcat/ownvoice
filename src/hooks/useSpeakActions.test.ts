import { renderHook, act } from "@testing-library/preact";
import { useSpeakActions } from "./useSpeakActions";
import { useSettingsStore } from "../stores/settingsStore";
import { useConversationStore } from "../stores/conversationStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import type { AppSettings } from "../types";

vi.mock("../speak", () => ({
  speak: vi.fn(),
}));

const DEFAULT_CFG: AppSettings = {
  patientName: "Alice",
  bed: "B-102",
  patientLang: "en",
  patientVoice: true,
  pin: "0000",
  providers: [
    { name: "Dr. Jones", hasVoice: false },
    { name: "Nurse Lee", hasVoice: true },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(speak).mockClear();
  useSettingsStore.setState({
    cfg: null,
    speakerData: null,
    _hasHydrated: false,
  });
  useConversationStore.setState({ messages: [] });
  useUIStore.setState({
    speaking: null,
    activeProvIdx: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSpeakActions", () => {
  describe("when cfg is null (no-ops)", () => {
    it("speakAsPatient does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("Hello");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(useConversationStore.getState().messages).toHaveLength(0);
    });

    it("speakAsProvider does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Hello");
      });

      expect(speak).not.toHaveBeenCalled();
      expect(useConversationStore.getState().messages).toHaveLength(0);
    });

    it("addToThread does nothing", () => {
      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.addToThread("Hello", "patient");
      });

      expect(useConversationStore.getState().messages).toHaveLength(0);
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
    it("adds message to conversation and calls speak", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG, speakerData: null });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsPatient("I need water");
      });

      // Check conversation message was added
      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("I need water");
      expect(messages[0].from).toBe("patient");
      expect(messages[0].label).toBe("Alice");

      // Check speak was called with patient speaker
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
      useSettingsStore.setState({ cfg: DEFAULT_CFG, speakerData });

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
    it("adds message to conversation and calls speak with provider speaker", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Can you rate your pain?");
      });

      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Can you rate your pain?");
      expect(messages[0].from).toBe("provider");
      expect(messages[0].label).toBe("Dr. Jones");

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

      const messages = useConversationStore.getState().messages;
      expect(messages[0].label).toBe("Nurse Lee");

      expect(speak).toHaveBeenCalledWith("Take deep breaths", {
        name: "Nurse Lee",
        type: "provider",
        embedding: undefined,
        lang: "en",
      });
    });

    it("passes the active provider's embedding through to speak", () => {
      const providerEmbedding = { token: "prov-embed" };
      const cfgWithProviderEmbedding: AppSettings = {
        ...DEFAULT_CFG,
        providers: [
          { name: "Dr. Jones", hasVoice: true, embedding: providerEmbedding },
          { name: "Nurse Lee", hasVoice: true },
        ],
      };
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
      const cfgNoName: AppSettings = {
        ...DEFAULT_CFG,
        providers: [{ name: "", hasVoice: false }],
      };
      useSettingsStore.setState({ cfg: cfgNoName });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.speakAsProvider("Hello");
      });

      const messages = useConversationStore.getState().messages;
      expect(messages[0].label).toBe("Care Team");
    });
  });

  describe("addToThread", () => {
    it("adds message without calling speak", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.addToThread("Note from nurse", "provider", "Nurse Lee");
      });

      const messages = useConversationStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Note from nurse");
      expect(messages[0].from).toBe("provider");
      expect(messages[0].label).toBe("Nurse Lee");

      expect(speak).not.toHaveBeenCalled();
    });

    it("uses patient name as label for patient messages", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.addToThread("I'm thirsty", "patient");
      });

      const messages = useConversationStore.getState().messages;
      expect(messages[0].label).toBe("Alice");
    });

    it("falls back to 'Care Team' for provider messages without label", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.addToThread("Noted", "provider");
      });

      const messages = useConversationStore.getState().messages;
      expect(messages[0].label).toBe("Care Team");
    });
  });

  describe("repeatSpeak", () => {
    it("calls speak without adding a message to conversation", () => {
      useSettingsStore.setState({ cfg: DEFAULT_CFG });

      const { result } = renderHook(() => useSpeakActions());

      act(() => {
        result.current.repeatSpeak("I need help", "patient");
      });

      // Should NOT add to conversation
      expect(useConversationStore.getState().messages).toHaveLength(0);

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
      const cfgNoProviders: AppSettings = {
        ...DEFAULT_CFG,
        providers: [],
      };
      useSettingsStore.setState({ cfg: cfgNoProviders });

      const { result } = renderHook(() => useSpeakActions());

      expect(result.current.activeProv).toEqual({
        name: "Care Team",
        hasVoice: false,
      });
    });
  });
});
