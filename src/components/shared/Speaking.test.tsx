import { render, screen } from "@testing-library/preact";
import { Speaking } from "./Speaking";
import { light } from "../../theme/tokens";

const baseProps = {
  text: "I need water",
  speaker: "Maria",
  isVoice: true,
  isProvider: false,
  onDone: vi.fn(),
  t: light,
};

describe("Speaking", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame to drive the progress loop
    let rafId = 0;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
      rafId += 1;
      // Schedule the callback as a setTimeout(0) so advanceTimersByTime drives it
      setTimeout(() => cb(Date.now()), 0);
      return rafId;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders speaker name and text", () => {
    render(<Speaking {...baseProps} />);
    expect(screen.getByText("I need water")).toBeInTheDocument();
  });

  it("shows 'Speaking as {speaker}' label when isVoice is true", () => {
    render(<Speaking {...baseProps} />);
    expect(screen.getByText("Speaking as Maria")).toBeInTheDocument();
  });

  it("shows 'Care Team' label when isProvider is true", () => {
    render(<Speaking {...baseProps} isVoice={false} isProvider={true} />);
    expect(screen.getByText("Care Team")).toBeInTheDocument();
  });

  it("shows generic 'Speaking' label when isVoice is false and not provider", () => {
    render(<Speaking {...baseProps} isVoice={false} isProvider={false} />);
    expect(screen.getByText("Speaking")).toBeInTheDocument();
  });

  it("has role=status and aria-live=polite", () => {
    render(<Speaking {...baseProps} />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveAttribute("aria-label", "Speaking: I need water");
  });

  it("calls onDone after animation duration", () => {
    const onDone = vi.fn();
    const text = "I need water";
    // Duration = Math.max(1400, text.length * 55) = 1400 for 12 chars
    // After progress completes, there's a 400ms setTimeout before onDone
    render(<Speaking {...baseProps} text={text} onDone={onDone} />);

    // Drive the rAF loop past the duration
    vi.advanceTimersByTime(1400 + 100);
    expect(onDone).not.toHaveBeenCalled();

    // The 400ms delay after progress reaches 1.0
    vi.advanceTimersByTime(400);
    expect(onDone).toHaveBeenCalledOnce();
  });
});
