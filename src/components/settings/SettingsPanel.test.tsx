import { render, screen, fireEvent } from "@testing-library/preact";
import { SettingsPanel } from "./SettingsPanel";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { makeTestCfg } from "../../test/makeCfg";

function seedStore(cfg: ReturnType<typeof makeTestCfg>) {
  useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
}

describe("SettingsPanel", () => {
  const onUpdate = vi.fn();
  const onReset = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    onUpdate.mockClear();
    onReset.mockClear();
    onClose.mockClear();
    useUIStore.getState().resetUI();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderPanel(patientOverrides?: Record<string, unknown>, cfgOverrides?: Record<string, unknown>) {
    const cfg = makeTestCfg({
      patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: false, ...patientOverrides },
      cfg: { pin: "", ...cfgOverrides },
    });
    seedStore(cfg);
    return render(
      <SettingsPanel
        cfg={cfg}
        onUpdate={onUpdate}
        onReset={onReset}
        onClose={onClose}
        t={light}
        theme="light"
      />,
    );
  }

  /* ---------- Flat nav-row layout ---------- */

  it("renders a Patients nav row that pushes into PatientsScreen", () => {
    renderPanel();
    useUIStore.setState({ settingsOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /Patients/ }));
    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().switchSheetOpen).toBe(true);
  });

  it("renders a Care Team nav row that pushes into the Care Team sub-panel", () => {
    renderPanel();
    useUIStore.setState({ settingsOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /Care Team/ }));
    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().careTeamOpen).toBe(true);
  });

  it("renders an Accessibility nav row that pushes into the Accessibility sub-panel", () => {
    renderPanel();
    useUIStore.setState({ settingsOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /Accessibility/ }));
    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().accessibilityOpen).toBe(true);
  });

  it("renders an Offline readiness nav row that pushes into the Diagnostics sub-panel", () => {
    renderPanel();
    useUIStore.setState({ settingsOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /Offline readiness/ }));
    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().diagnosticsOpen).toBe(true);
  });

  it("renders an About nav row that pushes into the About sub-panel", () => {
    renderPanel();
    useUIStore.setState({ settingsOpen: true });
    fireEvent.click(screen.getByRole("button", { name: /^About/ }));
    expect(useUIStore.getState().settingsOpen).toBe(false);
    expect(useUIStore.getState().aboutOpen).toBe(true);
  });

  it("does NOT render inline Care Team management UI (provider list, Add button)", () => {
    renderPanel({}, {
      providers: [{ name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" }],
    });
    expect(screen.queryByText("Dr. Smith")).toBeNull();
    expect(screen.queryByPlaceholderText("Dr. Smith, Nurse Jay...")).toBeNull();
  });

  it("does NOT render the patient's name input (per-patient editing is in PatientEditSheet)", () => {
    renderPanel();
    expect(screen.queryByDisplayValue("Maria")).toBeNull();
    expect(screen.queryByDisplayValue("4A")).toBeNull();
  });

  /* ---------- Reset (inline destructive footer) ---------- */

  it("'Reset app' shows confirmation, and confirm calls onReset", () => {
    renderPanel();
    fireEvent.click(screen.getByText("Reset app for new patient"));
    vi.advanceTimersByTime(300);

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText(/This will erase all patient data/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reset everything"));
    vi.advanceTimersByTime(300);

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("'Cancel' in reset confirmation hides the confirmation", () => {
    renderPanel();
    fireEvent.click(screen.getByText("Reset app for new patient"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    vi.advanceTimersByTime(300);
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
    expect(screen.getByText("Reset app for new patient")).toBeInTheDocument();
  });

  /* ---------- Sheet chrome ---------- */

  it("'Done' button calls onClose (after exit transition)", () => {
    renderPanel();
    fireEvent.click(screen.getByText("Done"));
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("backdrop click calls onClose (after exit transition)", () => {
    const { container } = renderPanel();
    const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
