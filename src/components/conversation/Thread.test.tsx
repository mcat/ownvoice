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
    // 1 bubble button + 2 scroll arrows. Filter out the chrome buttons
    // (identified by aria-controls pointing at the log) so the assertion
    // remains "one message bubble" regardless of locale or chrome count.
    const bubbles = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-controls") !== "ov-thread-log");
    expect(bubbles).toHaveLength(1);
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
      const bubbles = screen
        .getAllByRole("button")
        .filter((b) => b.getAttribute("aria-controls") !== "ov-thread-log");
      expect(bubbles).toHaveLength(1);
      // No DualLocaleText rendered (no data-dual-primary attribute)
      expect(bubbles[0].querySelector("[data-dual-primary]")).toBeNull();
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

    it("renders msg.icon in the bubble when present, marked decorative", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "I need water",
          icon: "💧",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      const iconEl = screen.getByText("💧");
      expect(iconEl).toBeInTheDocument();
      // Decorative — AT should ignore it, the button's aria-label has the text.
      expect(iconEl.getAttribute("aria-hidden")).toBe("true");
    });

    it("does not render an icon element when msg.icon is absent", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "I need water",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      // Only the bubble button; no nested decorative icon span.
      expect(screen.queryByText("💧")).toBeNull();
    });

    it("renders icon alongside dual-locale gloss without breaking layout", () => {
      const msgs: Message[] = [
        {
          from: "patient",
          text: "Necesito agua",
          gloss: "I need water",
          icon: "💧",
          time: "2:30 PM",
          label: "Maria",
        },
      ];
      render(<Thread messages={msgs} t={light} onRepeat={vi.fn()} />);
      expect(screen.getByText("💧")).toBeInTheDocument();
      expect(screen.getByText("Necesito agua")).toBeInTheDocument();
      expect(screen.getByText("I need water")).toBeInTheDocument();
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

  describe("scroll arrow buttons", () => {
    // Earlier describe sets patientLang: "es" and never restores it. Reset
    // to English here so the locale-resolved aria-labels match these
    // assertions regardless of test-execution order.
    beforeEach(() => {
      useSettingsStore.setState({
        cfg: makeTestCfg({
          patient: { name: "Maria", patientLang: "en" },
          cfg: { caregiverLang: "en" },
        }),
        _hasHydrated: true,
      });
    });

    /** Force jsdom to report a scrollable region we can drive. */
    function makeOverflowing(scrollTop = 0, scrollHeight = 800, clientHeight = 200) {
      const log = document.getElementById("ov-thread-log") as HTMLDivElement;
      Object.defineProperty(log, "scrollHeight", {
        configurable: true,
        get: () => scrollHeight,
      });
      Object.defineProperty(log, "clientHeight", {
        configurable: true,
        get: () => clientHeight,
      });
      Object.defineProperty(log, "scrollTop", {
        configurable: true,
        writable: true,
        value: scrollTop,
      });
      // fireEvent wraps dispatch in act(), flushing Preact state before we
      // assert. A bare element.dispatchEvent leaves the re-render pending.
      fireEvent.scroll(log);
      return log;
    }

    it("renders Up and Down scroll buttons with WCAG-style labels", () => {
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      expect(
        screen.getByRole("button", { name: /scroll conversation up/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /scroll conversation down/i }),
      ).toBeInTheDocument();
    });

    it("buttons reference the log via aria-controls (matching id)", () => {
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      const log = document.getElementById("ov-thread-log");
      expect(log).not.toBeNull();
      const up = screen.getByRole("button", { name: /scroll conversation up/i });
      const down = screen.getByRole("button", { name: /scroll conversation down/i });
      expect(up.getAttribute("aria-controls")).toBe("ov-thread-log");
      expect(down.getAttribute("aria-controls")).toBe("ov-thread-log");
    });

    it("buttons report aria-disabled when there is nothing to scroll (jsdom default)", () => {
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      const up = screen.getByRole("button", { name: /scroll conversation up/i });
      const down = screen.getByRole("button", { name: /scroll conversation down/i });
      // jsdom: clientHeight = scrollHeight = 0, so both bounds are true.
      expect(up.getAttribute("aria-disabled")).toBe("true");
      expect(down.getAttribute("aria-disabled")).toBe("true");
    });

    it("disabled-state click is a no-op (does not call scrollBy)", () => {
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /scroll conversation up/i }));
      fireEvent.click(screen.getByRole("button", { name: /scroll conversation down/i }));
      expect(scrollBy).not.toHaveBeenCalled();
    });

    it("Down button calls scrollBy with positive delta when overflow exists", () => {
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      makeOverflowing(0, 800, 200); // scrollable, currently at top
      const down = screen.getByRole("button", { name: /scroll conversation down/i });
      expect(down.getAttribute("aria-disabled")).toBe("false");
      fireEvent.click(down);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      const arg = scrollBy.mock.calls[0][0];
      expect(arg.top).toBeGreaterThan(0);
      expect(arg.behavior).toBe("smooth");
    });

    it("Up button calls scrollBy with negative delta when there is room above", () => {
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      makeOverflowing(400, 800, 200); // scrolled mid-way
      const up = screen.getByRole("button", { name: /scroll conversation up/i });
      expect(up.getAttribute("aria-disabled")).toBe("false");
      fireEvent.click(up);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0][0].top).toBeLessThan(0);
    });

    it("uses behavior:auto when prefers-reduced-motion is set (WCAG 2.3.3 AAA)", () => {
      mockReducedMotion(true);
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      makeOverflowing(0, 800, 200);
      fireEvent.click(screen.getByRole("button", { name: /scroll conversation down/i }));
      expect(scrollBy.mock.calls[0][0].behavior).toBe("auto");
    });

    it("scroll buttons use real <button> elements (focusable for switch scanning)", () => {
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      const up = screen.getByRole("button", { name: /scroll conversation up/i });
      const down = screen.getByRole("button", { name: /scroll conversation down/i });
      expect(up.tagName).toBe("BUTTON");
      expect(down.tagName).toBe("BUTTON");
      // Native <button> is focusable by default — switch scanners pick it up
      // with no extra tabindex needed. aria-disabled (not the disabled attr)
      // keeps the boundary state in scan order.
      expect(up.hasAttribute("disabled")).toBe(false);
      expect(down.hasAttribute("disabled")).toBe(false);
    });

    it("does not flash Down arrow active during message-arrival auto-scroll", () => {
      // Regression: tapping a phrase appended a new message, which fired a
      // smooth scrollIntoView. The intermediate scroll events flipped
      // atBottom false→true mid-animation, and the Down arrow visibly
      // flashed on every phrase tap. Now: when messages.length grows, we
      // suppress bound updates for the duration of the smooth scroll.
      const { rerender } = render(
        <Thread messages={messages} t={light} onRepeat={vi.fn()} />,
      );
      // Pretend the user scrolled the log into a state where Down would be
      // active (overflow exists, but we're at top), then a new message
      // arrives. Without suppression, the intermediate scroll events would
      // setState atBottom=false. With suppression, the state is held.
      const log = document.getElementById("ov-thread-log") as HTMLDivElement;
      Object.defineProperty(log, "scrollHeight", { configurable: true, get: () => 800 });
      Object.defineProperty(log, "clientHeight", { configurable: true, get: () => 200 });
      Object.defineProperty(log, "scrollTop", { configurable: true, writable: true, value: 0 });
      // Append a new message — this triggers the suppression path.
      const more: Message[] = [
        ...messages,
        { from: "patient", text: "I need help", time: "2:32 PM", label: "Maria" },
      ];
      rerender(<Thread messages={more} t={light} onRepeat={vi.fn()} />);
      // Mid-animation a scroll event fires. With the suppression in place,
      // it must NOT cause the Down arrow to flip to active.
      fireEvent.scroll(log);
      const down = screen.getByRole("button", { name: /scroll conversation down/i });
      expect(down.getAttribute("aria-disabled")).toBe("true");
    });

    it("DOM order is up → down → bubbles (switch scan: scroll first)", () => {
      // Critical for switch users: with N messages, scanning bubbles-first
      // would force them to step through every message before reaching
      // scroll. Arrows-first means Up → Down is always 1–2 stops away.
      // Visual layout (log left, arrows right) is preserved by
      // `flex-direction: row-reverse` on the wrapper.
      render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
      const allBtns = screen.getAllByRole("button");
      const labels = allBtns.map((b) => b.getAttribute("aria-label") ?? "");
      const upIdx = labels.findIndex((l) => /scroll conversation up/i.test(l));
      const downIdx = labels.findIndex((l) => /scroll conversation down/i.test(l));
      const firstBubbleIdx = labels.findIndex((l) => /^Repeat:/.test(l));
      expect(upIdx).toBeLessThan(downIdx);
      expect(downIdx).toBeLessThan(firstBubbleIdx);
    });
  });
});
