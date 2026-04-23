import { render, screen, fireEvent } from "@testing-library/preact";
import { Thread } from "./Thread";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
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

  describe("gloss rendering (dual-locale)", () => {
    beforeEach(() => {
      useSettingsStore.setState({
        cfg: makeTestCfg({
          patient: { name: "Maria", patientLang: "es" },
          cfg: { caregiverLang: "en" },
        }),
        _hasHydrated: true,
      });
    });

    it("renders gloss line when msg.gloss is defined and differs from text", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "Necesito agua",
          gloss: "I need water",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      expect(screen.getByText("Necesito agua")).toBeInTheDocument();
      expect(screen.getByText("I need water")).toBeInTheDocument();
    });

    it("renders plain text when msg.gloss is undefined", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "please help me breathe",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      const { container } = render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      expect(screen.getByText("please help me breathe")).toBeInTheDocument();
      // No DualLocaleText rendered — no gloss element
      expect(container.querySelector("[data-dual-gloss]")).toBeNull();
      expect(container.querySelector("[data-dual-primary]")).toBeNull();
    });

    it("renders plain text when msg.gloss equals msg.text", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "I need water",
          gloss: "I need water",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(1);
      // No DualLocaleText rendered (no data-dual-primary attribute)
      expect(buttons[0].querySelector("[data-dual-primary]")).toBeNull();
    });

    it("renders DualLocaleText with correct primary/gloss for provider messages", () => {
      const msgs: Message[] = [
        {
          from: "provider",
          text: "How are you feeling?",
          gloss: "Como te sientes?",
          time: "2:31 PM",
          label: "Dr. Smith",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
      expect(screen.getByText("Como te sientes?")).toBeInTheDocument();
    });

    it("gloss element has aria-hidden=true for transcript variant", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "Necesito agua",
          gloss: "I need water",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      const glossEl = screen.getByText("I need water");
      expect(glossEl.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
