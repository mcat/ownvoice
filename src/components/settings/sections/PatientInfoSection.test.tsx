import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientInfoSection } from "./PatientInfoSection";
import { light } from "../../../theme/tokens";
import type { AppSettings } from "../../../types";

const cfg: AppSettings = {
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  caregiverLang: "en",
  patientVoice: true,
  pin: "1234",
  providers: [],
};

const baseProps = {
  cfg,
  updateCfg: vi.fn(),
  t: light,
  theme: "light" as const,
};

describe("PatientInfoSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the name input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
  });

  it("renders the bed input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Bed / Room")).toHaveValue("4A");
  });

  it("calls updateCfg with the new patientName on name edit (auto-save)", () => {
    const updateCfg = vi.fn();
    render(<PatientInfoSection {...baseProps} updateCfg={updateCfg} />);
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    expect(updateCfg).toHaveBeenCalledWith({ patientName: "Alex" });
  });

  it("calls updateCfg with the new bed on bed edit (auto-save)", () => {
    const updateCfg = vi.fn();
    render(<PatientInfoSection {...baseProps} updateCfg={updateCfg} />);
    fireEvent.input(screen.getByLabelText("Bed / Room"), { target: { value: "5B" } });
    expect(updateCfg).toHaveBeenCalledWith({ bed: "5B" });
  });

  it("does not render a Save button — persistence is automatic", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
  });
});
