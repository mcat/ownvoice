import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { PatientInfoSection } from "./PatientInfoSection";
import { ConfirmDialogHost } from "../../shared/ConfirmDialog";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import { makeTestCfg } from "../../../test/makeCfg";

// Stub GPU as not ready (WASM path) — avoids importing the real WebGPU stack
vi.mock("../../../models/ttsEngine", () => ({
  isGPUReady: () => false,
}));

const cfg = makeTestCfg({
  patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: true },
  cfg: {
    pin: "1234",
    providers: [
      { name: "Dr. Smith", hasVoice: true, emoji: "👩‍⚕️" },
    ],
  },
});

const baseProps = {
  cfg,
  updateCfg: vi.fn(),
  t: light,
  theme: "light" as const,
};

/** Wrap component with ConfirmDialogHost so confirm() promises resolve. */
function renderWithHost(props = baseProps) {
  return render(
    <>
      <PatientInfoSection {...props} />
      <ConfirmDialogHost />
    </>,
  );
}

describe("PatientInfoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
  });

  it("renders the name input with the current value", () => {
    renderWithHost();
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
  });

  it("renders the bed input with the current value", () => {
    renderWithHost();
    expect(screen.getByLabelText("Bed / Room")).toHaveValue("4A");
  });

  it("calls updateActivePatient with the new name on name edit (auto-save)", () => {
    renderWithHost();
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    const active = useSettingsStore.getState().cfg?.patients.find(
      (p) => p.id === useSettingsStore.getState().cfg?.activePatientId,
    );
    expect(active?.name).toBe("Alex");
  });

  it("calls updateActivePatient with the new bed on bed edit (auto-save)", () => {
    renderWithHost();
    fireEvent.input(screen.getByLabelText("Bed / Room"), { target: { value: "5B" } });
    const active = useSettingsStore.getState().cfg?.patients.find(
      (p) => p.id === useSettingsStore.getState().cfg?.activePatientId,
    );
    expect(active?.bed).toBe("5B");
  });

  it("does not render a Save button — persistence is automatic", () => {
    renderWithHost();
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });

  // ── Patient language picker ────────────────────────────────────

  it("renders patient language chip grid with all 13 languages", () => {
    renderWithHost();
    const group = screen.getAllByRole("radiogroup")[0];
    const radios = group.querySelectorAll("[role=radio]");
    expect(radios.length).toBe(13);
  });

  it("tapping the current patient-language chip is a no-op (no confirm dialog)", () => {
    renderWithHost();
    // English is already selected
    const enChip = screen.getAllByRole("radio", { checked: true })[0];
    fireEvent.click(enChip);
    // No dialog should appear
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tapping a different patient-language chip opens ConfirmDialog", async () => {
    renderWithHost();
    // Two "Español" buttons exist (patient grid + caregiver grid); first is patient
    const esChips = screen.getAllByText("Español").map((el) => el.closest("button")!);
    fireEvent.click(esChips[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    // Title should contain the destination language name
    expect(screen.getByText(/Change patient language to Español/)).toBeTruthy();
  });

  it("confirming patient-language dialog calls updateActivePatient with new lang", async () => {
    renderWithHost();
    const esChips = screen.getAllByText("Español").map((el) => el.closest("button")!);
    fireEvent.click(esChips[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    // Click the confirm button (labeled "Change language")
    fireEvent.click(screen.getByText("Change language"));

    await waitFor(() => {
      const active = useSettingsStore.getState().cfg?.patients.find(
        (p) => p.id === useSettingsStore.getState().cfg?.activePatientId,
      );
      expect(active?.patientLang).toBe("es");
    });
  });

  // ── Caregiver language picker ──────────────────────────────────

  it("renders caregiver language chip grid", () => {
    renderWithHost();
    const groups = screen.getAllByRole("radiogroup");
    expect(groups.length).toBe(2);
    const caregiverGroup = groups[1];
    const radios = caregiverGroup.querySelectorAll("[role=radio]");
    expect(radios.length).toBe(13);
  });

  it("tapping a different caregiver-language chip opens ConfirmDialog with caregiver copy", async () => {
    renderWithHost();
    // Both chip grids have a Français button; pick the one in the caregiver grid
    const frButtons = screen.getAllByText("Français").map((el) => el.closest("button")!);
    // The second one is in the caregiver radiogroup
    fireEvent.click(frButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    expect(screen.getByText(/Change care team language to Français/)).toBeTruthy();
  });

  it("confirming caregiver-language dialog calls updateCfg with new caregiverLang", async () => {
    renderWithHost();
    const frButtons = screen.getAllByText("Français").map((el) => el.closest("button")!);
    fireEvent.click(frButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Change language"));

    await waitFor(() => {
      expect(useSettingsStore.getState().cfg?.caregiverLang).toBe("fr");
    });
  });

  // ── Unsupported locale variant ─────────────────────────────────

  it("uses unsupported-locale body when tapping an unsupported Chatterbox locale (vi)", async () => {
    renderWithHost();
    // Vietnamese is not in CHATTERBOX_LOCALES — tap in patient grid
    const viChip = screen.getAllByText("Tiếng Việt").map((el) => el.closest("button")!)[0];
    fireEvent.click(viChip);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    // The unsupported body mentions "system voice will be used instead"
    expect(screen.getByText(/system voice will be used instead/)).toBeTruthy();
  });
});
