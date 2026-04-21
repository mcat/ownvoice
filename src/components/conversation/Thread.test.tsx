import { render, screen, fireEvent } from "@testing-library/preact";
import { Thread } from "./Thread";
import { light } from "../../theme/tokens";
import type { Message } from "../../types";

const messages: Message[] = [
  { from: "patient", text: "I need water", time: "2:30 PM", label: "Maria" },
  { from: "provider", text: "I will get that for you.", time: "2:31 PM", label: "Dr. Smith" },
];

/** Install a matchMedia stub for the reduced-motion query only. */
function mockReducedMotion(reduced: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: reduced && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
    writable: true,
  });
}

// jsdom doesn't implement scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  mockReducedMotion(false);
});

describe("Thread", () => {
  it("returns null when messages array is empty", () => {
    const { container } = render(
      <Thread messages={[]} t={light} onRepeat={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders message text for each message", () => {
    render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
    expect(screen.getByText("I need water")).toBeInTheDocument();
    expect(screen.getByText("I will get that for you.")).toBeInTheDocument();
  });

  it("calls onRepeat with text and from when a bubble is tapped", () => {
    const onRepeat = vi.fn();
    render(<Thread messages={messages} t={light} onRepeat={onRepeat} />);
    fireEvent.click(screen.getByRole("button", { name: /Repeat: I need water/ }));
    expect(onRepeat).toHaveBeenCalledWith("I need water", "patient");
  });

  it("calls onRepeat with provider info when a provider bubble is tapped", () => {
    const onRepeat = vi.fn();
    render(<Thread messages={messages} t={light} onRepeat={onRepeat} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Repeat: I will get that for you/ }),
    );
    expect(onRepeat).toHaveBeenCalledWith("I will get that for you.", "provider");
  });

  it("single message renders correctly", () => {
    render(
      <Thread
        messages={[messages[0]]}
        t={light}
        onRepeat={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("I need water")).toBeInTheDocument();
  });

  describe("auto-scroll respects reduced-motion preference", () => {
    it("scrolls smoothly when motion is unrestricted", () => {
      mockReducedMotion(false);
      const spy = vi.fn();
      Element.prototype.scrollIntoView = spy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      expect(spy).toHaveBeenCalledWith({ behavior: "smooth" });
    });

    it("scrolls without animation when prefers-reduced-motion is set", () => {
      mockReducedMotion(true);
      const spy = vi.fn();
      Element.prototype.scrollIntoView = spy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      expect(spy).toHaveBeenCalledWith({ behavior: "auto" });
    });
  });
});
