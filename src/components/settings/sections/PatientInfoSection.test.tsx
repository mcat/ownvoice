import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientInfoSection } from "./PatientInfoSection";
import { light } from "../../../theme/tokens";
import { useSettingsStore } from "../../../stores/settingsStore";
import { makeTestCfg } from "../../../test/makeCfg";

const cfg = makeTestCfg({
  patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: true },
  cfg: { pin: "1234" },
});

const baseProps = {
  cfg,
  updateCfg: vi.fn(),
  t: light,
  theme: "light" as const,
};

describe("PatientInfoSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
  });

  it("renders the name input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
  });

  it("renders the bed input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Bed / Room")).toHaveValue("4A");
  });

  it("calls updateActivePatient with the new name on name edit (auto-save)", () => {
    render(<PatientInfoSection {...baseProps} />);
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    // Writes go to the store action, not the prop
    const active = useSettingsStore.getState().cfg?.patients.find(
      (p) => p.id === useSettingsStore.getState().cfg?.activePatientId,
    );
    expect(active?.name).toBe("Alex");
  });

  it("calls updateActivePatient with the new bed on bed edit (auto-save)", () => {
    render(<PatientInfoSection {...baseProps} />);
    fireEvent.input(screen.getByLabelText("Bed / Room"), { target: { value: "5B" } });
    const active = useSettingsStore.getState().cfg?.patients.find(
      (p) => p.id === useSettingsStore.getState().cfg?.activePatientId,
    );
    expect(active?.bed).toBe("5B");
  });

  it("does not render a Save button — persistence is automatic", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });
});
