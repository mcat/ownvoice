import { render, screen, fireEvent } from "@testing-library/preact";
import { HeaderNav } from "./HeaderNav";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light" as const,
    toggle: vi.fn(),
    isAuto: false,
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

describe("HeaderNav", () => {
  const onSettings = vi.fn();
  const onSwitchPatient = vi.fn();
  const onEndStaffSession = vi.fn();

  beforeEach(() => {
    onSettings.mockReset();
    onSwitchPatient.mockReset();
    onEndStaffSession.mockReset();
    const cfg = makeTestCfg({ patient: { name: "Test" }, cfg: { pin: "" } });
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
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

  function renderNav(staffAuthed = false) {
    return render(
      <HeaderNav
        onSettings={onSettings}
        onSwitchPatient={onSwitchPatient}
        staffAuthed={staffAuthed}
        onEndStaffSession={onEndStaffSession}
      />,
    );
  }

  it("renders the Patients button", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Patients" })).toBeInTheDocument();
  });

  it("fires onSwitchPatient when Patients button is clicked", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Patients" }));
    expect(onSwitchPatient).toHaveBeenCalledTimes(1);
  });

  it("fires onSettings when Settings button is clicked", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onSettings).toHaveBeenCalledTimes(1);
  });

  it("renders overlay buttons (Wishes, Listen, Care Team)", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Wishes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Care Team" })).toBeInTheDocument();
  });

  it("hides End Staff Session button when staffAuthed is false", () => {
    renderNav(false);
    expect(screen.queryByRole("button", { name: "End staff session" })).not.toBeInTheDocument();
  });

  it("shows End Staff Session button when staffAuthed is true", () => {
    renderNav(true);
    expect(screen.getByRole("button", { name: "End staff session" })).toBeInTheDocument();
  });

  it("fires onEndStaffSession when End Staff Session button is clicked", () => {
    renderNav(true);
    fireEvent.click(screen.getByRole("button", { name: "End staff session" }));
    expect(onEndStaffSession).toHaveBeenCalledTimes(1);
  });
});
