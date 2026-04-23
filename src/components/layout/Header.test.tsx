import { render, screen, fireEvent } from "@testing-library/preact";
import { Header } from "./Header";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import type { AppSettings } from "../../types";

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
  const onSettings = vi.fn();
  const onSwitchPatient = vi.fn();
  const onEndStaffSession = vi.fn();

  beforeEach(() => {
    onSettings.mockReset();
    onSwitchPatient.mockReset();
    onEndStaffSession.mockReset();
    useUIStore.setState({
      builderOpen: false,
      wishesOpen: false,
      providerOpen: false,
      listenOpen: false,
      settingsOpen: false,
      pinEntryOpen: false,
      switchSheetOpen: false,
      staffAuthed: false,
      staffAuthedAt: null,
    });
  });

  function renderHeader(overrides?: { patient?: Record<string, unknown>; cfg?: Partial<AppSettings> }) {
    const cfg = makeCfg(overrides);
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
    return render(
      <Header
        cfg={cfg}
        onSettings={onSettings}
        onSwitchPatient={onSwitchPatient}
        staffAuthed={false}
        onEndStaffSession={onEndStaffSession}
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
    const heartBtn = screen.getByText("❤️");
    fireEvent.click(heartBtn);
    expect(useUIStore.getState().wishesOpen).toBe(true);
  });

  it("listen overlay button calls openOverlay on UI store", () => {
    renderHeader();
    const listenBtn = screen.getByText("👂");
    fireEvent.click(listenBtn);
    expect(useUIStore.getState().listenOpen).toBe(true);
  });

  it("provider overlay button calls openOverlay on UI store", () => {
    renderHeader();
    const providerBtn = screen.getByText("👩‍⚕️");
    fireEvent.click(providerBtn);
    expect(useUIStore.getState().providerOpen).toBe(true);
  });

  it("settings button calls onSettings callback", () => {
    renderHeader({ cfg: { pin: "1234" } });
    const settingsBtn = screen.getByText("⚙️");
    fireEvent.click(settingsBtn);
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it("switch patient button calls onSwitchPatient callback", () => {
    renderHeader();
    const switchBtn = screen.getByText("🔄");
    fireEvent.click(switchBtn);
    expect(onSwitchPatient).toHaveBeenCalledTimes(1);
  });
});
