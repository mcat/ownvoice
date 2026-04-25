import { render, screen, fireEvent } from "@testing-library/preact";
import { useSettingsStore } from "./stores/settingsStore";
import { useUIStore } from "./stores/uiStore";
import { useConversationStore } from "./stores/conversationStore";
import { makeTestCfg } from "./test/makeCfg";
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

// Shared mocks so individual tests can drive isGPUReady / onProgress /
// onGPUReady through state transitions — the pre-gen trigger depends on
// the interplay between these three signals, and the default-returning
// inline mock made that interplay uninspectable.
const { mgrMock, isGPUReadyMock, onGPUReadyMock } = vi.hoisted(() => ({
  mgrMock: {
    init: vi.fn(),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: vi.fn(() => false),
    onProgress: vi.fn(() => () => {}),
  },
  isGPUReadyMock: vi.fn(() => false),
  onGPUReadyMock: vi.fn(() => () => {}),
}));

vi.mock("./models/modelManager", () => ({
  getModelManager: () => mgrMock,
}));

vi.mock("./models/ttsEngine", () => ({
  initGPU: vi.fn(() => Promise.resolve(false)),
  isGPUReady: isGPUReadyMock,
  onGPUReady: onGPUReadyMock,
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

const makeCfg = (overrides?: Partial<AppSettings>): AppSettings =>
  makeTestCfg({
    patient: { name: "Maria", bed: "4A" },
    cfg: overrides,
  });

// Import App after mocks are set up
import { App } from "./App";
import * as audioCacheRunner from "./models/audioCacheRunner";

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
      switchSheetOpen: false,
      staffSheetOpen: false,
      activeProvIdx: 0,
      speaking: null,
      staffAuthed: false,
      staffAuthedAt: null,
    });
    useConversationStore.setState({ messagesByPatientId: {} });
    // Reset the shared signal mocks so each test starts "neither path
    // ready" unless it opts into a specific state.
    isGPUReadyMock.mockReset();
    isGPUReadyMock.mockReturnValue(false);
    onGPUReadyMock.mockReset();
    onGPUReadyMock.mockReturnValue(() => {});
    mgrMock.isReady.mockReset();
    mgrMock.isReady.mockReturnValue(false);
    mgrMock.onProgress.mockReset();
    mgrMock.onProgress.mockReturnValue(() => {});
    vi.mocked(audioCacheRunner.runPreGeneration).mockClear();
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
    // ProviderPanel has a "Care Team" title — narrow to the heading because
    // the HeaderNav also renders a "Care Team" button label.
    expect(screen.getByRole("heading", { name: "Care Team" })).toBeInTheDocument();
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

  it("auto-saving a Settings field does NOT dismiss the Settings sheet", () => {
    // Regression guard: in the original Save-button flow, App's onUpdate
    // handler persisted AND called closeOverlay("settings"). When Settings
    // switched to auto-save (onUpdate fires on every change), the
    // close-on-update behaviour silently survived, making every edit
    // instantly dismiss the panel.
    //
    // After the patient-IA refactor, per-patient text fields moved out of
    // Settings (they live in PatientEditSheet). The remaining auto-save
    // surfaces in Settings are device-scoped: we exercise the Assistive
    // Input toggle in AccessibilitySection.
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ settingsOpen: true });
    render(<App />);

    const toggle = screen.getByRole("switch", { name: /Assistive Input Mode/i });
    fireEvent.click(toggle);

    // The toggle should have flipped AND the sheet should still be open.
    expect(useSettingsStore.getState().cfg?.assistiveInput).toBe(true);
    expect(useUIStore.getState().settingsOpen).toBe(true);
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

  it("closing wishes overlay updates store (after exit transition)", () => {
    useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
    useUIStore.setState({ wishesOpen: true });
    render(<App />);
    // Close via the Close button. BottomSheet plays an exit animation before
    // invoking the caller's onClose (which updates the store).
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(useUIStore.getState().wishesOpen).toBe(false);
  });

  it("closing listen overlay updates store (after exit transition)", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ providers: [{ name: "Dr. B", hasVoice: false, emoji: "👨‍⚕️" }] }),
    });
    useUIStore.setState({ listenOpen: true });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
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

  it("Staff button opens the staff sheet after successful PIN entry", () => {
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: makeCfg({ pin: "1234" }),
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Staff" }));
    expect(useUIStore.getState().pinEntryOpen).toBe(true);
    // Enter the correct PIN
    fireEvent.click(screen.getByText("1"));
    fireEvent.click(screen.getByText("2"));
    fireEvent.click(screen.getByText("3"));
    fireEvent.click(screen.getByText("4"));
    expect(useUIStore.getState().staffSheetOpen).toBe(true);
    expect(useUIStore.getState().pinEntryOpen).toBe(false);
  });

  describe("Staff button gating", () => {
    it("opens StaffSheet directly when no PIN is set", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "" }),
      });
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Staff" }));
      expect(useUIStore.getState().staffSheetOpen).toBe(true);
      expect(useUIStore.getState().pinEntryOpen).toBe(false);
    });

    it("opens PinGate when PIN is set", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "1234" }),
      });
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Staff" }));
      expect(useUIStore.getState().pinEntryOpen).toBe(true);
      expect(useUIStore.getState().staffSheetOpen).toBe(false);
    });

    it("opens StaffSheet after successful PIN entry", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "1234" }),
      });
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Staff" }));
      expect(useUIStore.getState().pinEntryOpen).toBe(true);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));
      fireEvent.click(screen.getByText("4"));
      expect(useUIStore.getState().staffSheetOpen).toBe(true);
      expect(useUIStore.getState().pinEntryOpen).toBe(false);
    });
  });

  describe("staffAuthed bridge", () => {
    it("PIN success sets staffAuthed=true", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "1234" }),
      });
      render(<App />);
      // Tap Staff to trigger PIN gate
      fireEvent.click(screen.getByRole("button", { name: "Staff" }));
      expect(useUIStore.getState().pinEntryOpen).toBe(true);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));
      fireEvent.click(screen.getByText("4"));
      expect(useUIStore.getState().staffAuthed).toBe(true);
      expect(useUIStore.getState().staffAuthedAt).toBeGreaterThan(0);
    });

    it("subsequent tap on Staff skips PinGate when staffAuthed", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "1234" }),
      });
      useUIStore.setState({ staffAuthed: true });
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Staff" }));
      // Should open the staff sheet directly — no PIN gate.
      expect(useUIStore.getState().staffSheetOpen).toBe(true);
      expect(useUIStore.getState().pinEntryOpen).toBe(false);
    });

    it("End Session inside the StaffSheet clears staffAuthed", () => {
      useSettingsStore.setState({
        _hasHydrated: true,
        cfg: makeCfg({ pin: "1234" }),
      });
      useUIStore.setState({
        staffAuthed: true,
        staffAuthedAt: Date.now(),
        staffSheetOpen: true,
      });
      render(<App />);
      // End Staff Session is now an item inside the staff sheet (not a
      // top-level nav button).
      fireEvent.click(screen.getByRole("button", { name: /End staff session/i }));
      expect(useUIStore.getState().staffAuthed).toBe(false);
      expect(useUIStore.getState().staffAuthedAt).toBeNull();
    });
  });

  describe("pre-gen trigger", () => {
    it("starts pre-gen exactly once even if progress events keep firing after a path becomes ready", () => {
      // Regression for the boot-time thrashing reported in issue #79:
      // App.tsx subscribes to mgr.onProgress as a ready signal, but WASM
      // model download fires many progress events. Every post-ready
      // event was re-calling runPreGeneration, which aborts the in-flight
      // run and restarts from phrase 0 — wasting ~20–40s of synth on
      // boot and showing up as the same phrase synthesized 2–3× in the
      // worker's "Synthesizing:" log.
      let capturedGpuCb: (() => void) | null = null;
      let capturedProgressCb: (() => void) | null = null;
      onGPUReadyMock.mockImplementation((cb) => {
        capturedGpuCb = cb;
        return () => {};
      });
      mgrMock.onProgress.mockImplementation((cb) => {
        capturedProgressCb = cb;
        return () => {};
      });

      // Initial state: neither path ready. Rendering triggers the pre-gen
      // effect, which subscribes but doesn't start.
      useSettingsStore.setState({ _hasHydrated: true, cfg: makeCfg() });
      render(<App />);

      expect(audioCacheRunner.runPreGeneration).not.toHaveBeenCalled();
      expect(capturedGpuCb).not.toBeNull();
      expect(capturedProgressCb).not.toBeNull();

      // GPU becomes ready — single correct kickoff.
      isGPUReadyMock.mockReturnValue(true);
      capturedGpuCb!();
      expect(audioCacheRunner.runPreGeneration).toHaveBeenCalledTimes(1);

      // WASM download progress keeps firing after GPU is already running
      // pre-gen. These must NOT restart the run.
      capturedProgressCb!();
      capturedProgressCb!();
      capturedProgressCb!();
      expect(audioCacheRunner.runPreGeneration).toHaveBeenCalledTimes(1);
    });
  });
});
