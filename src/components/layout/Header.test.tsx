import { render, screen, fireEvent } from "@testing-library/preact";
import { Header } from "./Header";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import type { AppSettings } from "../../types";

const mockUseModels = {
  isWarm: vi.fn().mockReturnValue(false),
  isReady: vi.fn().mockReturnValue(false),
  isLoading: vi.fn().mockReturnValue(false),
  getError: vi.fn().mockReturnValue(undefined),
  humanCountdown: vi.fn().mockReturnValue("45s"),
  secondsLeft: vi.fn().mockReturnValue(undefined),
  progress: [],
  initialized: true,
  totalProgress: () => ({ loaded: 0, total: 0 }),
};

vi.mock("../../hooks/useModels", () => ({
  useModels: () => mockUseModels,
}));

vi.mock("../../models/modelManager", () => ({
  getModelManager: () => ({
    isWarm: vi.fn().mockReturnValue(false),
    getProgress: vi.fn().mockReturnValue([]),
    onProgress: vi.fn().mockReturnValue(() => {}),
    init: vi.fn().mockResolvedValue(undefined),
    getWorker: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("../../hooks/useTheme", () => ({
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

const makeCfg = (overrides?: { patient?: Record<string, unknown>; cfg?: Partial<AppSettings> }): AppSettings =>
  makeTestCfg({
    patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: false, ...overrides?.patient },
    cfg: { pin: "", ...overrides?.cfg },
  });

describe("Header", () => {
  const onOpenSettings = vi.fn();
  const onEditPatient = vi.fn();

  beforeEach(() => {
    onOpenSettings.mockReset();
    onEditPatient.mockReset();
    useUIStore.getState().resetUI();
  });

  function renderHeader(overrides?: { patient?: Record<string, unknown>; cfg?: Partial<AppSettings> }) {
    const cfg = makeCfg(overrides);
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
    return render(
      <Header
        cfg={cfg}
        onOpenSettings={onOpenSettings}
        onEditPatient={onEditPatient}
      />,
    );
  }

  it("shows patient name from cfg prop", () => {
    renderHeader();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("shows bed number when provided", () => {
    renderHeader({ patient: { bed: "4A" } });
    expect(screen.getByText(/Bed 4A/)).toBeInTheDocument();
  });

  it("hides bed label when bed is empty", () => {
    renderHeader({ patient: { bed: "" } });
    expect(screen.queryByText(/Bed/)).not.toBeInTheDocument();
  });

  it("wishes overlay button calls openOverlay on UI store", () => {
    renderHeader();
    fireEvent.click(screen.getByText("❤️"));
    expect(useUIStore.getState().wishesOpen).toBe(true);
  });

  it("listen overlay button calls openOverlay on UI store", () => {
    renderHeader();
    fireEvent.click(screen.getByText("👂"));
    expect(useUIStore.getState().listenOpen).toBe(true);
  });

  it("provider overlay button calls openOverlay on UI store", () => {
    renderHeader();
    fireEvent.click(screen.getByText("👩‍⚕️"));
    expect(useUIStore.getState().providerOpen).toBe(true);
  });

  it("settings (PIN-gated) button calls onOpenSettings callback", () => {
    renderHeader({ cfg: { pin: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("tapping the patient pill calls onEditPatient", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: /Edit patient: Maria/ }));
    expect(onEditPatient).toHaveBeenCalledTimes(1);
  });
});

describe("Header — PatientVoiceStatus integration", () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    mockUseModels.isWarm.mockReturnValue(false);
    mockUseModels.getError.mockReturnValue(undefined);
    mockUseModels.humanCountdown.mockReturnValue("45s");
  });

  it("renders PatientVoiceStatus next to PatientPill when active patient needs clone", () => {
    const cfg = makeTestCfg({
      patient: {
        name: "Maria",
        bed: "4A",
        patientLang: "en",
        hasVoice: true,
        speakerData: null,
      },
      cfg: { pin: "" },
    });
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });

    render(
      <Header
        cfg={cfg}
        onOpenSettings={vi.fn()}
        onEditPatient={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Using a temporary voice while yours gets ready/i),
    ).toBeInTheDocument();
  });
});
