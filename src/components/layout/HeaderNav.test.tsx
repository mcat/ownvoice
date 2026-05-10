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
  const onOpenSettings = vi.fn();

  beforeEach(() => {
    onOpenSettings.mockReset();
    const cfg = makeTestCfg({ patient: { name: "Test" }, cfg: { pin: "" } });
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
    useUIStore.getState().resetUI();
  });

  function renderNav() {
    return render(<HeaderNav onOpenSettings={onOpenSettings} />);
  }

  it("renders the Settings (PIN-gated) button — single staff entry point", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("fires onOpenSettings when the Settings button is clicked", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("does NOT render Patients or End Staff Session buttons in the nav (those moved into the flat Settings panel)", () => {
    renderNav();
    expect(screen.queryByRole("button", { name: "Patients" })).toBeNull();
    expect(screen.queryByRole("button", { name: "End staff session" })).toBeNull();
  });

  it("renders the patient-facing overlay buttons (Wishes, Care Team)", () => {
    renderNav();
    expect(screen.getByRole("button", { name: "Wishes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Care Team" })).toBeInTheDocument();
  });

  it("renders a theme toggle button", () => {
    renderNav();
    // Theme button uses an aria-label of the form "Theme: <label>"; assert
    // by prefix so this stays decoupled from the active theme/locale text.
    const themeBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.startsWith("Theme:"));
    expect(themeBtn).toBeTruthy();
  });
});
