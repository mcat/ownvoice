import { render, screen, fireEvent } from "@testing-library/preact";
import { SettingsSubPanel } from "./SettingsSubPanel";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { makeTestCfg } from "../../test/makeCfg";

function seed() {
  useSettingsStore.setState({
    cfg: makeTestCfg({
      patient: { name: "Maria", patientLang: "en", hasVoice: false },
      cfg: { caregiverLang: "en" },
    }),
    speakerData: null,
    _hasHydrated: true,
  });
}

describe("SettingsSubPanel", () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    seed();
  });

  function renderPanel() {
    return render(
      <SettingsSubPanel title="Care Team" overlay="careTeam" t={light}>
        <div data-testid="child">child content</div>
      </SettingsSubPanel>,
    );
  }

  it("renders the title and child content", () => {
    renderPanel();
    expect(screen.getByText("Care Team")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders an iPadOS-style 'Back to Settings' button", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /Back to Settings/ })).toBeInTheDocument();
  });

  it("Back closes its own overlay and re-opens settings", () => {
    useUIStore.setState({ careTeamOpen: true, settingsOpen: false });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Back to Settings/ }));
    expect(useUIStore.getState().careTeamOpen).toBe(false);
    expect(useUIStore.getState().settingsOpen).toBe(true);
  });

  it("Done dismisses self only — the parent settings panel stays closed", () => {
    useUIStore.setState({ careTeamOpen: true, settingsOpen: false });
    const { container } = renderPanel();
    fireEvent.click(screen.getByText("Done"));
    // BottomSheet animates out via transitionend before firing onClose.
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    container.querySelector("[role='dialog']")?.dispatchEvent(evt);
    expect(useUIStore.getState().careTeamOpen).toBe(false);
    expect(useUIStore.getState().settingsOpen).toBe(false);
  });
});
