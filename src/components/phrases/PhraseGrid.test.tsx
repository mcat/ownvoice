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
  it("renders one gridcell per phrase", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} ariaLabel="Test" />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(3);
  });

  it("renders labels for every phrase", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} ariaLabel="Test" />);
    expect(screen.getByText("I need water")).toBeInTheDocument();
    expect(screen.getByText("I am cold")).toBeInTheDocument();
    expect(screen.getByText("Help me")).toBeInTheDocument();
  });

  it("renders icons for every phrase", () => {
    render(<PhraseGrid phrases={phrases} onTap={vi.fn()} t={light} ariaLabel="Test" />);
    expect(screen.getByText("💧")).toBeInTheDocument();
    expect(screen.getByText("🥶")).toBeInTheDocument();
    expect(screen.getByText("🆘")).toBeInTheDocument();
  });

  it("calls onTap with the correct phrase text when each cell is clicked", () => {
    const onTap = vi.fn();
    render(<PhraseGrid phrases={phrases} onTap={onTap} t={light} ariaLabel="Test" />);

    fireEvent.click(screen.getByRole("gridcell", { name: "I need water" }));
    expect(onTap).toHaveBeenCalledWith("I need water");

    // Btn has 300ms debounce, so advance timers for second click
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("gridcell", { name: "I am cold" }));
    expect(onTap).toHaveBeenCalledWith("I am cold");
    vi.useRealTimers();
  });

  it("renders nothing when phrases is empty", () => {
    const { container } = render(
      <PhraseGrid phrases={[]} onTap={vi.fn()} t={light} ariaLabel="Test" />,
    );
    expect(screen.queryAllByRole("gridcell")).toHaveLength(0);
    // Grid container still renders
    expect(container.firstChild).toBeInTheDocument();
  });
});
