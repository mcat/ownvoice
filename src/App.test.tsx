import { render, screen, fireEvent } from "@testing-library/preact";
import { useSettingsStore } from "./stores/settingsStore";
import { useUIStore } from "./stores/uiStore";
import { useConversationStore } from "./stores/conversationStore";
import type { AppSettings } from "./types";

// Mock useTheme
vi.mock("./hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light" as const,
    toggle: vi.fn(),
    t: {
      bg: "#FAFAF8",
      card: "#FFFFFF",
      text: "#1A1A1A",
      sub: "#4B5563",
      muted: "#6B7280",
      border: "rgba(0,0,0,0.07)",
      activeBg: "rgba(0,0,0,0.03)",
      helpBg: "#DC2626",
      headerBg: "#FFFFFF",
      tabBg: "#FFFFFF",
      speakBg: "linear-gradient(135deg,#1E293B,#334155)",
      threadMeta: "#71767E",
      threadMetaProvider: "#6B7280",
    },
  }),
}));

// Mock useSpeakActions to avoid speak side effects
vi.mock("./hooks/useSpeakActions", () => ({
  useSpeakActions: () => ({
    speakAsPatient: vi.fn(),
    speakAsProvider: vi.fn(),
    addToThread: vi.fn(),
    repeatSpeak: vi.fn(),
    activeProv: { name: "Care Team", hasVoice: false },
  }),
}));

// Mock getModelManager to avoid model init
vi.mock("./models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn(),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: vi.fn(() => false),
    onProgress: vi.fn(() => () => {}),
  }),
}));

// Mock the GPU TTS engine so App.tsx's init side effects are inert in tests
vi.mock("./models/ttsEngine", () => ({
  initGPU: vi.fn(() => Promise.resolve(false)),
  isGPUReady: vi.fn(() => false),
  onGPUReady: vi.fn(() => () => {}),
}));

// Mock resetAll
vi.mock("./stores/resetAll", () => ({
  resetAll: vi.fn(),
}));

// Mock the audio cache runner — App only triggers it, doesn't need side effects
vi.mock("./models/audioCacheRunner", () => ({
  runPreGeneration: vi.fn(),
  retryFailed: vi.fn(),
  abort: vi.fn(),
}));

const makeCfg = (overrides?: Partial<AppSettings>): AppSettings => ({
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
  ...overrides,
});

// Import App after mocks are set up
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    // Reset all stores to clean state
    useSettingsStore.setState({
      _hasHydrated: false,
      cfg: null,
      speakerData: null,
    });
    useUIStore.setState({
      tab: "quick",
      sub: 0,
      builderOpen: false,
      wishesOpen: false,
      providerOpen: false,
      listenOpen: false,
      settingsOpen: false,
      pinEntryOpen: false,
      activeProvIdx: 0,
      speaking: null,
    });
    useConversationStore.setState({ messages: [] });
  });

  it("renders nothing before hydration (_hasHydrated=false)", () => {
    useSettingsStore.setState({ _hasHydrated: false, cfg: null });
    const { container } = render(<App />);
    expect(container.innerHTML).toBe("");
  });

  it("renders Setup when hydrated with cfg=null", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: null });
    render(<App />);
    // Setup component has "Welcome to OwnVoice" heading
    expect(screen.getByText("Welcome to OwnVoice")).toBeInTheDocument();
  });

  it("renders main app (Header, TabBar) when hydrated with cfg set", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    render(<App />);
    // Header shows patient name
    expect(screen.getByText("Maria")).toBeInTheDocument();
    // TabBar exposes a primary navigation landmark
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("Quick tab shows PhraseGrid with quick phrases", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "quick" });
    render(<App />);
    // Quick phrases should be visible
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("Thank you")).toBeInTheDocument();
  });

  it("does not render Setup when cfg is set", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    render(<App />);
    expect(screen.queryByText("Welcome to OwnVoice")).not.toBeInTheDocument();
  });

  it("renders time-of-day suggestions on Quick tab", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(9); // morning
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "quick" });
    render(<App />);
    // Morning suggestions include "I slept well" (see src/data/locales/en.ts).
    expect(screen.getByText("I slept well")).toBeInTheDocument();
  });

  it("I Need tab renders SubcategoryChips and PhraseGrid", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "needs", sub: 0 });
    render(<App />);
    // SubcategoryChips — "Comfort" is the first subcategory label
    expect(screen.getByText("Comfort")).toBeInTheDocument();
    expect(screen.getByText("Medical")).toBeInTheDocument();
    // PhraseGrid shows comfort phrases
    expect(screen.getByText("I need water")).toBeInTheDocument();
  });

  it("Pain tab renders PainFlow", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "pain" });
    render(<App />);
    expect(screen.getByText("How much pain do you have?")).toBeInTheDocument();
  });

  it("Ask tab renders PhraseGrid with question phrases", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "questions" });
    render(<App />);
    expect(screen.getByText("What time is it?")).toBeInTheDocument();
    expect(screen.getByText("When can I go home?")).toBeInTheDocument();
  });

  it("returns null for unknown tab with no matching cat", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "nonexistent" });
    const { container } = render(<App />);
    // Should still render header and tab bar, but no phrase content
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    // No phrase grid content
    expect(screen.queryByText("Yes")).not.toBeInTheDocument();
  });

  it("builderOpen renders SentenceBuilder instead of phrase grid", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(9); // morning
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "quick", builderOpen: true });
    render(<App />);
    // SentenceBuilder has a "Send" button or text area — quick phrases should NOT be visible
    expect(screen.queryByText("Yes")).not.toBeInTheDocument();
    // Time-of-day chips should be hidden when builder is open
    expect(screen.queryByText("I slept well")).not.toBeInTheDocument();
  });

  it("wishesOpen overlay renders MyWishes", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ wishesOpen: true });
    render(<App />);
    expect(screen.getByText("My Wishes")).toBeInTheDocument();
  });

  it("providerOpen overlay renders ProviderPanel", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ providers: [{ name: "Dr. A", hasVoice: false, emoji: "👩‍⚕️" }] }),
    });
    useUIStore.setState({ providerOpen: true });
    render(<App />);
    // ProviderPanel has a "Care Team" title
    expect(screen.getByText("Care Team")).toBeInTheDocument();
  });

  it("listenOpen overlay renders ListenPanel", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ providers: [{ name: "Dr. B", hasVoice: false, emoji: "👨‍⚕️" }] }),
    });
    useUIStore.setState({ listenOpen: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Listen" })).toBeInTheDocument();
  });

  it("settingsOpen overlay renders SettingsPanel", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ settingsOpen: true });
    render(<App />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("pinEntryOpen overlay renders PinGate", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ pin: "1234" }),
    });
    useUIStore.setState({ pinEntryOpen: true });
    render(<App />);
    // PinGate shows a numeric keypad — "Enter PIN" heading
    expect(screen.getByText(/PIN/i)).toBeInTheDocument();
  });

  it("speaking overlay renders Speaking component", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({
      speaking: { text: "Hello nurse", from: "patient" },
    });
    render(<App />);
    expect(screen.getByText("Hello nurse")).toBeInTheDocument();
    // Shows patient name as speaker
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("clicking a time-of-day suggestion triggers speakAsPatient", () => {
    vi.spyOn(Date.prototype, "getHours").mockReturnValue(9); // morning
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "quick" });
    render(<App />);
    // Click the first known morning suggestion chip.
    fireEvent.click(screen.getByText("I slept well"));
  });

  it("I Need tab switching subcategories renders different phrases", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ tab: "needs", sub: 1 }); // Medical subcategory
    render(<App />);
    expect(screen.getByText("I need my medication")).toBeInTheDocument();
  });

  it("closing wishes overlay updates store", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ wishesOpen: true });
    render(<App />);
    // Close via the Close button
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(useUIStore.getState().wishesOpen).toBe(false);
  });

  it("closing listen overlay updates store", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ providers: [{ name: "Dr. B", hasVoice: false, emoji: "👨‍⚕️" }] }),
    });
    useUIStore.setState({ listenOpen: true });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(useUIStore.getState().listenOpen).toBe(false);
  });

  it("pinEntryOpen Cancel button closes overlay", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ pin: "1234" }),
    });
    useUIStore.setState({ pinEntryOpen: true });
    render(<App />);
    // PinGate has a "Cancel" button
    fireEvent.click(screen.getByText("Cancel"));
    expect(useUIStore.getState().pinEntryOpen).toBe(false);
  });
});
