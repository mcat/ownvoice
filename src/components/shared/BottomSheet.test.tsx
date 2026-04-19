import { render, screen, fireEvent } from "@testing-library/preact";
import { BottomSheet } from "./BottomSheet";
import { light } from "../../theme/tokens";

describe("BottomSheet root", () => {
  it("renders children inside a dialog", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <p>Body content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("dialog has aria-modal=true", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        content
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("fires onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fires onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not fire onClose when clicking inside the card", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        <button>inside</button>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "inside" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
