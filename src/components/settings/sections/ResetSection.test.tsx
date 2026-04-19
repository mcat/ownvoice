import { render, screen, fireEvent } from "@testing-library/preact";
import { ResetSection } from "./ResetSection";
import { light } from "../../../theme/tokens";

describe("ResetSection", () => {
  it("shows the reset trigger initially", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    expect(
      screen.getByRole("button", { name: /reset app for new patient/i }),
    ).toBeInTheDocument();
  });

  it("shows a confirmation prompt after the trigger is tapped", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    fireEvent.click(
      screen.getByRole("button", { name: /reset app for new patient/i }),
    );
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset everything/i }),
    ).toBeInTheDocument();
  });

  it("calls onReset only after confirmation", () => {
    const onReset = vi.fn();
    render(<ResetSection onReset={onReset} t={light} theme="light" />);
    fireEvent.click(
      screen.getByRole("button", { name: /reset app for new patient/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /reset everything/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("Cancel returns to the trigger state", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    fireEvent.click(
      screen.getByRole("button", { name: /reset app for new patient/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.getByRole("button", { name: /reset app for new patient/i }),
    ).toBeInTheDocument();
  });
});
