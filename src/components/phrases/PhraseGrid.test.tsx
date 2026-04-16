import { render, screen, fireEvent } from "@testing-library/preact";
import { PhraseGrid } from "./PhraseGrid";
import { light } from "../../theme/tokens";
import type { Phrase } from "../../types";

const phrases: Phrase[] = [
  { text: "I need water", icon: "💧" },
  { text: "I am cold", icon: "🥶" },
  { text: "Help me", icon: "🆘" },
];

describe("PhraseGrid", () => {
  it("renders the correct number of buttons for given phrases", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders labels for every phrase", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} />);
    expect(screen.getByText("I need water")).toBeInTheDocument();
    expect(screen.getByText("I am cold")).toBeInTheDocument();
    expect(screen.getByText("Help me")).toBeInTheDocument();
  });

  it("renders icons for every phrase", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} />);
    expect(screen.getByText("💧")).toBeInTheDocument();
    expect(screen.getByText("🥶")).toBeInTheDocument();
    expect(screen.getByText("🆘")).toBeInTheDocument();
  });

  it("calls onTap with the correct phrase text when each button is clicked", () => {
    const onTap = vi.fn();
    render(<PhraseGrid phrases={phrases} onTap={onTap} t={light} />);

    fireEvent.click(screen.getByRole("button", { name: "I need water" }));
    expect(onTap).toHaveBeenCalledWith("I need water");

    // Btn has 300ms debounce, so advance timers for second click
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "I am cold" }));
    expect(onTap).toHaveBeenCalledWith("I am cold");
    vi.useRealTimers();
  });

  it("renders nothing when phrases is empty", () => {
    const { container } = render(
      <PhraseGrid phrases={[]} onTap={vi.fn()} t={light} />,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // Grid container still renders
    expect(container.firstChild).toBeInTheDocument();
  });
});
