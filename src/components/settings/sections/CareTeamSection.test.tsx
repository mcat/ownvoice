import { render, screen, fireEvent } from "@testing-library/preact";
import { CareTeamSection } from "./CareTeamSection";
import { light } from "../../../theme/tokens";
import type { AppSettings, Provider } from "../../../types";

const cfg: AppSettings = {
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: true,
  pin: "1234",
  providers: [{ name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" }],
};

const baseProps = {
  cfg,
  providers: cfg.providers,
  onProvidersChange: vi.fn<(p: Provider[]) => void>(),
  t: light,
  theme: "light" as const,
};

describe("CareTeamSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders existing providers", () => {
    render(<CareTeamSection {...baseProps} />);
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });

  it("adds a provider when the Add button is clicked", () => {
    const onProvidersChange = vi.fn();
    render(<CareTeamSection {...baseProps} onProvidersChange={onProvidersChange} />);
    fireEvent.input(screen.getByLabelText("Name"), {
      target: { value: "Nurse Lee" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onProvidersChange).toHaveBeenCalledOnce();
    const next = onProvidersChange.mock.calls[0]![0] as Provider[];
    expect(next.map((p) => p.name)).toEqual(["Dr. Smith", "Nurse Lee"]);
  });
});
