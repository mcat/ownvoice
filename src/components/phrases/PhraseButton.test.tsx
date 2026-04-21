import { render, screen, fireEvent } from "@testing-library/preact";
import { PhraseButton } from "./PhraseButton";
import { light } from "../../theme/tokens";
import type { Phrase } from "../../types";

const phrase: Phrase = { text: "I need water", icon: "💧" };

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
