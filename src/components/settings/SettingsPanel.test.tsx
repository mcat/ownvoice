import { render, screen, fireEvent } from "@testing-library/preact";
import { SettingsPanel } from "./SettingsPanel";
import type { AppSettings } from "../../types";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";

const makeCfg = (overrides?: Partial<AppSettings>): AppSettings => ({
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
  ...overrides,
});

// CareTeamSection reads providers directly from the settings store (so
// voice-capture can commit without waiting on a Save click). Tests that
// render provider rows or mutate them must seed the store to match.
function seedStore(cfg: AppSettings) {
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

  function renderPanel(cfgOverrides?: Partial<AppSettings>) {
    const cfg = makeCfg(cfgOverrides);
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

  it("editing name shows 'Save changes' and calls onUpdate on save", () => {
    renderPanel();

    // Save button should not be visible initially
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();

    // Edit the name
    const nameInput = screen.getByDisplayValue("Maria");
    fireEvent.input(nameInput, { target: { value: "Ana" } });

    // Save button should appear
    const saveBtn = screen.getByText("Save changes");
    expect(saveBtn).toBeInTheDocument();

    // Click save
    fireEvent.click(saveBtn);
    vi.advanceTimersByTime(300); // Btn debounce

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: "Ana",
        bed: "4A",
      }),
    );
  });

  it("editing bed shows 'Save changes' and calls onUpdate on save", () => {
    renderPanel();

    const bedInput = screen.getByDisplayValue("4A");
    fireEvent.input(bedInput, { target: { value: "6B" } });

    const saveBtn = screen.getByText("Save changes");
    fireEvent.click(saveBtn);
    vi.advanceTimersByTime(300);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: "Maria",
        bed: "6B",
      }),
    );
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

  it("shows voice status as 'Voice captured' when patientVoice is true", () => {
    renderPanel({ patientVoice: true });
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
  });

  it("shows Upload/Record buttons when patientVoice is false", () => {
    renderPanel({ patientVoice: false });
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("shows language display from cfg", () => {
    renderPanel({ patientLang: "es" });
    expect(screen.getByText(/Español/)).toBeInTheDocument();
  });

  it("shows provider list when providers are configured", () => {
    renderPanel({
      providers: [
        { name: "Dr. Smith", hasVoice: false, emoji: "\uD83D\uDC69\u200D\u2695\uFE0F" },
        { name: "Nurse Jay", hasVoice: true, emoji: "\uD83E\uDDD1\u200D\u2695\uFE0F" },
      ],
    });
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Nurse Jay")).toBeInTheDocument();
  });

  it("shows 'No providers added yet' when list is empty", () => {
    renderPanel({ providers: [] });
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
    it("when patientVoice is true, shows VoiceCapture with 'Voice captured'", () => {
      renderPanel({ patientVoice: true });
      expect(screen.getByText("Voice captured")).toBeInTheDocument();
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("clicking Remove and saving updates patientVoice to false", () => {
      renderPanel({ patientVoice: true });

      // Click Remove on the voice capture widget
      fireEvent.click(screen.getByText("Remove"));

      // Save button should appear (patientVoice changed from true to false)
      const saveBtn = screen.getByText("Save changes");
      expect(saveBtn).toBeInTheDocument();

      // Click save
      fireEvent.click(saveBtn);
      vi.advanceTimersByTime(300); // Btn debounce

      expect(onUpdate).toHaveBeenCalledOnce();
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          patientVoice: false,
        }),
      );
    });
  });

  /* ---------- Provider add ---------- */
  describe("Provider add", () => {
    it("typing a name and clicking Add commits to the store and renders the provider", () => {
      renderPanel({ providers: [] });

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
      renderPanel({
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "\uD83D\uDC69\u200D\u2695\uFE0F" },
        ],
      });

      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();

      fireEvent.click(screen.getByText("\u2715"));

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
      renderPanel({
        providers: [
          { name: "Dr. Smith", hasVoice: false, emoji: "\uD83D\uDC69\u200D\u2695\uFE0F" },
          { name: "Nurse Jay", hasVoice: true, emoji: "\uD83E\uDDD1\u200D\u2695\uFE0F" },
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
