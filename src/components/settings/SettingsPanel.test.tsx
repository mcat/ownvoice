import { render, screen, fireEvent } from "@testing-library/preact";
import { SettingsPanel } from "./SettingsPanel";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

// CareTeamSection reads providers directly from the settings store. Tests
// that render provider rows or mutate them must seed the store to match.
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

  // Per-patient inputs (Name, Bed, Patient language, Voice, Backup voice)
  // moved out of Settings — those are now exercised in PatientEditSheet.test
  // and PatientInfoSection.test. Settings is device + care-team scoped here.

  it("does NOT render the patient's name input (per-patient editing has moved out)", () => {
    renderPanel();
    expect(screen.queryByDisplayValue("Maria")).toBeNull();
    expect(screen.queryByDisplayValue("4A")).toBeNull();
  });

  it("renders a Patients nav row that pushes into PatientsScreen (the roster lives there, not inline)", () => {
    renderPanel();
    // The row uses "Patients" as its label — the roster (kebab menus, Add
    // Patient card, voice badges) is NOT rendered inline. Tapping the row
    // opens the "switch" overlay.
    const patientsButton = screen.getByRole("button", { name: /Patients/ });
    expect(patientsButton).toBeInTheDocument();
    // The kebab "⋯" buttons (rendered per-patient inside PatientsScreen)
    // must NOT appear inline.
    expect(screen.queryByRole("button", { name: /Actions for/i })).toBeNull();
  });

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

  it("displays OwnVoice version in About section", () => {
    renderPanel();
    expect(screen.getByText("OwnVoice v0.1")).toBeInTheDocument();
  });

  /* ---------- Care Team (the surviving in-Settings provider section) ---------- */
  describe("Care Team", () => {
    it("shows provider list when providers are configured", () => {
      renderPanel({}, {
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
          { name: "Nurse Jay", hasVoice: true, emoji: "🧑‍⚕️" },
        ],
      });
      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
      expect(screen.getByText("Nurse Jay")).toBeInTheDocument();
    });

    it("shows 'No providers added yet' when list is empty", () => {
      renderPanel({}, { providers: [] });
      expect(
        screen.getByText(/No providers added yet/),
      ).toBeInTheDocument();
    });

    it("typing a name and clicking Add commits to the store and renders the provider", () => {
      renderPanel({}, { providers: [] });

      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. New" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);

      expect(screen.getByText("Dr. New")).toBeInTheDocument();
      const stored = useSettingsStore.getState().cfg?.providers ?? [];
      expect(stored.map((p) => p.name)).toEqual(["Dr. New"]);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("clicking remove wipes the provider from the store without needing Save", () => {
      renderPanel({}, {
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
        ],
      });

      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
      fireEvent.click(screen.getByText("✕"));

      expect(screen.queryByText("Dr. Smith")).not.toBeInTheDocument();
      expect(useSettingsStore.getState().cfg?.providers).toEqual([]);
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
