import { render, screen, fireEvent } from "@testing-library/preact";
import { HelpButton } from "./HelpButton";
import { light } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";

describe("HelpButton", () => {
  const onTap = vi.fn();

  beforeEach(() => {
    onTap.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderButton(patientLang = "en") {
    return render(<HelpButton onTap={onTap} patientLang={patientLang} t={light} />);
  }

  it("renders the localized help label", () => {
    renderButton();
    expect(
      screen.getByRole("button", { name: /help/i }),
    ).toBeInTheDocument();
  });

  it("meets the 80x80 critical-action target floor (DESIGN_GUIDELINES §3.1)", () => {
    renderButton();
    const btn = screen.getByTestId("help-button");
    const style = btn.style;
    expect(parseInt(style.minWidth, 10)).toBeGreaterThanOrEqual(80);
    expect(parseInt(style.minHeight, 10)).toBeGreaterThanOrEqual(80);
  });

  it("uses the reserved helpBg token", () => {
    renderButton();
    const btn = screen.getByTestId("help-button");
    expect(btn.style.background).toBe("rgb(220, 38, 38)"); // #DC2626
  });

  it("speaks the 'I need help right now' phrase on tap", () => {
    renderButton();
    fireEvent.click(screen.getByTestId("help-button"));
    expect(onTap).toHaveBeenCalledWith(
      resolvePhrase("needs.medical.call_light", "en"),
      expect.objectContaining({ key: "needs.medical.call_light" }),
    );
  });

  it("resolves both label and phrase in the patient's language", () => {
    renderButton("es");
    fireEvent.click(screen.getByTestId("help-button"));
    expect(onTap).toHaveBeenCalledWith(
      resolvePhrase("needs.medical.call_light", "es"),
      expect.objectContaining({ key: "needs.medical.call_light" }),
    );
  });
});
