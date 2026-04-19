import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientInfoSection } from "./PatientInfoSection";
import { light } from "../../../theme/tokens";
import type { AppSettings, FallbackVoice } from "../../../types";

const cfg: AppSettings = {
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: true,
  pin: "1234",
  providers: [],
};

const baseProps = {
  cfg,
  name: "Maria",
  bed: "4A",
  patientVoice: true,
  fallbackVoice: null as FallbackVoice | null,
  hasChanges: false,
  onNameChange: vi.fn(),
  onBedChange: vi.fn(),
  onPatientVoiceChange: vi.fn(),
  onFallbackVoiceChange: vi.fn(),
  onSave: vi.fn(),
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

  it("fires onNameChange when name is edited", () => {
    const onNameChange = vi.fn();
    render(<PatientInfoSection {...baseProps} onNameChange={onNameChange} />);
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    expect(onNameChange).toHaveBeenCalledWith("Alex");
  });

  it("shows the Save button only when hasChanges is true", () => {
    const { rerender } = render(<PatientInfoSection {...baseProps} />);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    rerender(<PatientInfoSection {...baseProps} hasChanges />);
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });
});
