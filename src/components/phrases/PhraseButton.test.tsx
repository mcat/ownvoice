import { render, screen, fireEvent } from "@testing-library/preact";
import { PhraseButton } from "./PhraseButton";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import type { Phrase } from "../../types";

const phrase: Phrase = { text: "I need water", icon: "💧" };

const baseCfg = makeTestCfg();

beforeEach(() => {
  useSettingsStore.setState({ cfg: baseCfg });
});

describe("PhraseButton", () => {
  it("renders icon and label", () => {
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    expect(screen.getByText("💧")).toBeInTheDocument();
    expect(screen.getByText("I need water")).toBeInTheDocument();
  });

  it("has an aria-label matching the phrase text", () => {
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    expect(screen.getByRole("button", { name: "I need water" })).toBeInTheDocument();
  });

  it("calls onTap with phrase text on click", () => {
    const onTap = vi.fn();
    render(<PhraseButton phrase={phrase} onTap={onTap} t={light} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith("I need water");
  });

  it("forwards the phrase.key so the speak path can resolve caregiverLang", () => {
    // Voice-direction model: without the key, speak() falls back to the
    // display-locale text and the Spanish patient hears Spanish. With the
    // key, the hook re-resolves in caregiverLang.
    const onTap = vi.fn();
    const keyed: Phrase = { text: "Sí", icon: "👍", key: "quick.yes" };
    render(<PhraseButton phrase={keyed} onTap={onTap} t={light} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith("Sí", { key: "quick.yes" });
  });

  it("mouse hover tints border; leaving clears it", () => {
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const btn = screen.getByRole("button");
    const baseBorder = btn.style.border;

    fireEvent.pointerEnter(btn, { pointerType: "mouse" });
    expect(btn.style.border).not.toBe(baseBorder);

    fireEvent.pointerLeave(btn, { pointerType: "mouse" });
    expect(btn.style.border).toBe(baseBorder);
  });

  it("touch pointer does not trigger hover styling", () => {
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const btn = screen.getByRole("button");
    const baseBorder = btn.style.border;

    fireEvent.pointerEnter(btn, { pointerType: "touch" });
    expect(btn.style.border).toBe(baseBorder);
  });

  it("assistive mode renders stronger hover border than default", () => {
    // Default mode hover border
    const { unmount } = render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const defaultBtn = screen.getByRole("button");
    fireEvent.pointerEnter(defaultBtn, { pointerType: "mouse" });
    const defaultHoverBorder = defaultBtn.style.border;
    unmount();

    // Assistive mode hover border
    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const assistiveBtn = screen.getByRole("button");
    fireEvent.pointerEnter(assistiveBtn, { pointerType: "mouse" });
    expect(assistiveBtn.style.border).not.toBe(defaultHoverBorder);
  });

  it("assistive mode extends lit highlight to 1000ms", async () => {
    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    vi.useFakeTimers();
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    expect(btn.style.color).toBe("rgb(255, 255, 255)");

    // Default 500ms lit-timeout — still lit in assistive mode
    await vi.advanceTimersByTimeAsync(600);
    expect(btn.style.color).toBe("rgb(255, 255, 255)");

    // Past assistive 1000ms — now reverted
    await vi.advanceTimersByTimeAsync(500);
    expect(btn.style.color).not.toBe("rgb(255, 255, 255)");

    vi.useRealTimers();
  });

  it("forwards role and tabIndex props to the underlying button", () => {
    const { container } = render(
      <PhraseButton phrase={phrase} onTap={vi.fn()} t={light} role="gridcell" tabIndex={-1} />
    );
    const cell = container.querySelector('[role="gridcell"]');
    expect(cell).not.toBeNull();
    expect(cell?.getAttribute("tabindex")).toBe("-1");
  });

  it("applies lit highlight after click, then reverts", async () => {
    vi.useFakeTimers();
    render(<PhraseButton phrase={phrase} onTap={vi.fn()} t={light} />);
    const btn = screen.getByRole("button");

    // Before click — not in lit state
    expect(btn.style.color).not.toBe("rgb(255, 255, 255)");

    fireEvent.click(btn);
    // After click — lit state: white text on blue
    expect(btn.style.color).toBe("rgb(255, 255, 255)");

    // Advance past the 500ms lit timeout and flush pending state updates
    await vi.advanceTimersByTimeAsync(600);
    // After 500ms — reverts: text color matches theme (rgb(26, 26, 26))
    expect(btn.style.color).toBe("rgb(26, 26, 26)");

    vi.useRealTimers();
  });
});
