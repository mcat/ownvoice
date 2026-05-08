import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { useSettingsStore } from "../stores/settingsStore";
import { PinPromptDialog } from "./pinPrompt";

function setPin(p: string) {
  useSettingsStore.setState((s) => ({
    cfg: s.cfg
      ? { ...s.cfg, pin: p }
      : { pin: p, caregiverLang: "en", providers: [], patients: [], activePatientId: null },
  }));
}

describe("PinPromptDialog", () => {
  beforeEach(() => useSettingsStore.setState({ cfg: null }));

  it("calls onConfirm when correct PIN entered", () => {
    setPin("1234");
    let confirmed = false;
    render(<PinPromptDialog warning="raw export" onConfirm={() => { confirmed = true; }} onCancel={() => {}} />);
    fireEvent.input(screen.getByLabelText(/PIN/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmed).toBe(true);
  });

  it("rejects wrong PIN", () => {
    setPin("1234");
    let confirmed = false;
    render(<PinPromptDialog warning="raw export" onConfirm={() => { confirmed = true; }} onCancel={() => {}} />);
    fireEvent.input(screen.getByLabelText(/PIN/i), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(confirmed).toBe(false);
    expect(screen.getByText(/incorrect/i)).toBeTruthy();
  });

  it("shows warning copy", () => {
    setPin("1234");
    render(<PinPromptDialog warning="This export contains raw spoken phrases." onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/raw spoken phrases/)).toBeTruthy();
  });
});
