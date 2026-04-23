import { render, screen, fireEvent } from "@testing-library/preact";
import { SettingsPanel } from "./SettingsPanel";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import type { Patient } from "../../types";

// CareTeamSection reads providers directly from the settings store (so
// voice-capture can commit without waiting on a Save click). Tests that
// render provider rows or mutate them must seed the store to match.
function seedStore(cfg: ReturnType<typeof makeTestCfg>) {
  useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
}

/** Helper: get the active patient from the store. */
function getActivePatient(): Patient | undefined {
  const state = useSettingsStore.getState();
  const id = state.cfg?.activePatientId;
  return state.cfg?.patients.find((p) => p.id === id);
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

  it("renders patient name and bed in inputs", () => {
    renderPanel();
    const nameInput = screen.getByDisplayValue("Maria");
    const bedInput = screen.getByDisplayValue("4A");
    expect(nameInput).toBeInTheDocument();
    expect(bedInput).toBeInTheDocument();
  });

  it("editing name updates the active patient in the store — no Save button", () => {
    renderPanel();

    // No save button — persistence is automatic.
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Maria");
    fireEvent.input(nameInput, { target: { value: "Ana" } });

    // Patient writes go directly to the store via updateActivePatient
    expect(getActivePatient()?.name).toBe("Ana");
    // Still no Save button after the edit.
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });

  it("editing bed updates the active patient in the store — no Save button", () => {
    renderPanel();

    const bedInput = screen.getByDisplayValue("4A");
    fireEvent.input(bedInput, { target: { value: "6B" } });

    expect(getActivePatient()?.bed).toBe("6B");
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });

  it("'Reset app' shows confirmation, and confirm calls onReset", () => {
    renderPanel();

    // Click "Reset app for new patient"
    const resetBtn = screen.getByText("Reset app for new patient");
    fireEvent.click(resetBtn);
    vi.advanceTimersByTime(300);

    // Confirmation dialog should appear
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText(/This will erase all patient data/),
    ).toBeInTheDocument();

    // Click "Reset everything"
    const confirmBtn = screen.getByText("Reset everything");
    fireEvent.click(confirmBtn);
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

  it("shows voice status as 'Voice captured' when hasVoice is true", () => {
    renderPanel({ hasVoice: true });
    // PatientsSection also renders "Voice captured" chips — use getAllByText
    const matches = screen.getAllByText("Voice captured");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Upload/Record buttons when hasVoice is false", () => {
    renderPanel({ hasVoice: false });
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("shows language display from cfg", () => {
    renderPanel({ patientLang: "es" });
    // PatientsSection also shows the locale flag+label — use getAllByText
    const matches = screen.getAllByText(/Español/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

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

  it("displays OwnVoice version in About section", () => {
    renderPanel();
    expect(screen.getByText("OwnVoice v0.1")).toBeInTheDocument();
  });

  /* ---------- Patient voice management ---------- */
  describe("Patient voice management", () => {
    it("when hasVoice is true, shows VoiceCapture with 'Voice captured'", () => {
      renderPanel({ hasVoice: true });
      // PatientsSection also renders "Voice captured" chips and "Remove" buttons
      const captured = screen.getAllByText("Voice captured");
      expect(captured.length).toBeGreaterThanOrEqual(1);
      const removeBtns = screen.getAllByText("Remove");
      expect(removeBtns.length).toBeGreaterThanOrEqual(1);
    });

    it("clicking Remove updates hasVoice to false on the active patient (auto-save)", () => {
      renderPanel({ hasVoice: true });

      // The VoiceCapture "Remove" has aria-label "Remove voice sample".
      // PatientsSection "Remove" buttons have different aria context.
      const voiceRemove = screen.getByRole("button", { name: /Remove voice sample/i });
      fireEvent.click(voiceRemove);

      // No Save button — update is immediate.
      expect(screen.queryByText("Save changes")).not.toBeInTheDocument();

      // Patient voice state is updated directly in the store
      expect(getActivePatient()?.hasVoice).toBe(false);
    });
  });

  /* ---------- Provider add ---------- */
  describe("Provider add", () => {
    it("typing a name and clicking Add commits to the store and renders the provider", () => {
      renderPanel({}, { providers: [] });

      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. New" } });

      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);

      expect(screen.getByText("Dr. New")).toBeInTheDocument();
      // Provider writes are live — no Save click required.
      const stored = useSettingsStore.getState().cfg?.providers ?? [];
      expect(stored.map((p) => p.name)).toEqual(["Dr. New"]);
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  /* ---------- Provider remove ---------- */
  describe("Provider remove", () => {
    it("clicking remove wipes the provider from the store without needing Save", () => {
      renderPanel({}, {
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
        ],
      });

      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();

      fireEvent.click(screen.getByText("✕"));

      expect(screen.queryByText("Dr. Smith")).not.toBeInTheDocument();
      // No Save-changes gate for provider mutations — they commit live.
      expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
      expect(useSettingsStore.getState().cfg?.providers).toEqual([]);
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  /* ---------- Provider voice ---------- */
  describe("Provider voice", () => {
    it("each provider in the list has a VoiceCapture widget", () => {
      renderPanel({}, {
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
          { name: "Nurse Jay", hasVoice: true, emoji: "🧑‍⚕️" },
        ],
      });

      // Both providers should be in the list
      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
      expect(screen.getByText("Nurse Jay")).toBeInTheDocument();

      // Dr. Smith has no voice — Upload/Record buttons appear for that provider
      // (plus the patient VoiceCapture which also has no voice), so use getAllByText
      const uploadBtns = screen.getAllByText("Upload file");
      const recordBtns = screen.getAllByText("Record");
      expect(uploadBtns.length).toBeGreaterThanOrEqual(1);
      expect(recordBtns.length).toBeGreaterThanOrEqual(1);

      // Nurse Jay has a voice — should show "Voice captured" text
      expect(screen.getByText("Voice captured")).toBeInTheDocument();
    });
  });
});
