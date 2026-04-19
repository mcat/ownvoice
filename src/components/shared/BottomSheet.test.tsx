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

describe("BottomSheet.Title", () => {
  it("renders as h2 and wires aria-labelledby", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>Hello</BottomSheet.Title>
        </BottomSheet.Header>
      </BottomSheet>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Hello" });
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
  });
});

describe("BottomSheet.CloseButton", () => {
  it("calls onClose when tapped", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>T</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
        </BottomSheet.Header>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has a minimum 64x64 touch target", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.CloseButton aria-label="Close" />
        </BottomSheet.Header>
      </BottomSheet>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    const style = btn.getAttribute("style") ?? "";
    expect(style).toMatch(/min-width:\s*64px/);
    expect(style).toMatch(/min-height:\s*64px/);
  });
});

describe("BottomSheet.Header custom children", () => {
  it("renders arbitrary children alongside Title and CloseButton", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>T</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
          <div data-testid="custom">progress</div>
        </BottomSheet.Header>
      </BottomSheet>,
    );
    expect(screen.getByTestId("custom")).toHaveTextContent("progress");
  });
});

describe("BottomSheet subcomponent misuse", () => {
  it("throws when Title is rendered outside BottomSheet", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BottomSheet.Title>T</BottomSheet.Title>)).toThrow(
      /must be rendered inside <BottomSheet>/,
    );
    spy.mockRestore();
  });
});

describe("BottomSheet.Body", () => {
  it("renders children", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Body>
          <p>body paragraph</p>
        </BottomSheet.Body>
      </BottomSheet>,
    );
    expect(screen.getByText("body paragraph")).toBeInTheDocument();
  });

  it("sets overflow-y auto and flex:1 for scroll containment", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Body>
          <p data-testid="inner">body</p>
        </BottomSheet.Body>
      </BottomSheet>,
    );
    const body = screen.getByTestId("inner").parentElement as HTMLElement;
    const style = body.getAttribute("style") ?? "";
    expect(style).toMatch(/overflow-y:\s*auto/);
    expect(style).toMatch(/flex:\s*1/);
    expect(style).toMatch(/min-height:\s*0/);
  });
});

describe("BottomSheet.Actions", () => {
  it("renders children inside a pinned footer", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Actions>
          <button>Submit</button>
        </BottomSheet.Actions>
      </BottomSheet>,
    );
    const btn = screen.getByRole("button", { name: "Submit" });
    const actions = btn.parentElement as HTMLElement;
    const style = actions.getAttribute("style") ?? "";
    expect(style).toMatch(/flex-shrink:\s*0/);
    expect(style).toMatch(/border-top/);
  });
});
