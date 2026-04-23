import { act, render, screen } from "@testing-library/preact";
import { Speaking } from "./Speaking";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";

const baseProps = {
  text: "I need water",
  isProvider: false,
  onDone: vi.fn(),
  t: light,
};

beforeEach(() => {
  useSettingsStore.setState({
    cfg: {
      patientName: "Patient",
      bed: "1",
      patientLang: "en",
      caregiverLang: "en",
      providers: [{ name: "Dr. Lee", emoji: "👩‍⚕️", hasVoice: false }],
    } as import("../../types").AppSettings,
    _hasHydrated: true,
  });
});

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

  it("shows 'Your voice' sub-label for patient speech", () => {
    render(<Speaking {...baseProps} />);
    expect(screen.getByText("Your voice")).toBeInTheDocument();
  });

  it("shows active provider name + emoji when isProvider is true", () => {
    render(<Speaking {...baseProps} isProvider={true} />);
    // Provider name + emoji from the settings store
    expect(screen.getByText(/Dr\. Lee/)).toBeInTheDocument();
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

  it("switches to the slideUp animation when the phrase finishes", () => {
    render(<Speaking {...baseProps} text="I need water" />);
    // Before completion: slideDown entrance
    expect(
      (screen.getByRole("status") as HTMLElement).style.animation,
    ).toMatch(/slideDown/);

    // Let the rAF loop cross the 1400ms duration threshold. Wrap in act
    // so Preact flushes the state update that flips `exiting` to true.
    act(() => {
      vi.advanceTimersByTime(1400 + 100);
    });

    // Entry animation is replaced with slideUp exit — overlay stays mounted
    // for the ~400ms exit before onDone is called.
    expect(
      (screen.getByRole("status") as HTMLElement).style.animation,
    ).toMatch(/slideUp/);
  });
});
