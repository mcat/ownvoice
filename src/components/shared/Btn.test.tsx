import { render, screen, fireEvent } from "@testing-library/preact";
import { Btn } from "./Btn";

describe("Btn", () => {
  it("renders children", () => {
    render(<Btn>Hello</Btn>);
    expect(screen.getByRole("button")).toHaveTextContent("Hello");
  });

  it("onClick fires on click", () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Click me</Btn>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick} disabled>Nope</Btn>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("rapid double-click only fires once", () => {
      const onClick = vi.fn();
      render(<Btn onClick={onClick}>Tap</Btn>);
      const btn = screen.getByRole("button");

      fireEvent.click(btn);
      fireEvent.click(btn); // within 300ms lockout

      expect(onClick).toHaveBeenCalledOnce();
    });

    it("fires again after 300ms lockout expires", () => {
      const onClick = vi.fn();
      render(<Btn onClick={onClick}>Tap</Btn>);
      const btn = screen.getByRole("button");

      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);

      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(2);
    });
  });

  it("passes extra props through (role, aria-label)", () => {
    render(
      <Btn role="menuitem" aria-label="Save">
        Save
      </Btn>,
    );
    const btn = screen.getByRole("menuitem");
    expect(btn).toHaveAttribute("aria-label", "Save");
  });

  it("passes data attributes through", () => {
    render(<Btn data-testid="custom-btn">Test</Btn>);
    expect(screen.getByTestId("custom-btn")).toBeInTheDocument();
  });
});
