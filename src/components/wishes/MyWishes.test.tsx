import { render, screen, fireEvent } from "@testing-library/preact";
import { MyWishes } from "./MyWishes";
import { light } from "../../theme/tokens";
import { getWishTopics, t } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

const SICG_TOPICS = getWishTopics();

const baseProps = {
  onSpeak: vi.fn(),
  onAddToThread: vi.fn(),
  onClose: vi.fn(),
  t: light,
  theme: "light" as const,
  patientName: "Maria",
};

describe("MyWishes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      cfg: makeTestCfg({ patient: { name: "Maria" } }),
      _hasHydrated: true,
    });
  });

  it("renders the first topic's question and hides the label on the active step", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByText("My Wishes")).toBeInTheDocument();
    expect(screen.getByText(t(SICG_TOPICS[0].questionKey, "en"))).toBeInTheDocument();
    // The label (e.g., "My Goals") appears only on the completion screen's
    // summary cards, not on the active-step header.
    expect(screen.queryByText(t(SICG_TOPICS[0].labelKey, "en"))).not.toBeInTheDocument();
  });

  it("renders all response options for the first topic", () => {
    render(<MyWishes {...baseProps} />);
    for (const rk of SICG_TOPICS[0].responseKeys) {
      expect(screen.getByText(t(rk, "en"))).toBeInTheDocument();
    }
  });

  it("has Share and Skip buttons", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  it("toggling a response marks it as selected", () => {
    render(<MyWishes {...baseProps} />);
    const firstResponse = t(SICG_TOPICS[0].responseKeys[0], "en"); // "Being with my family"
    expect(
      screen.getByText(firstResponse).closest("button"),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByText(firstResponse));
    expect(
      screen.getByText(firstResponse).closest("button"),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("tapping Share calls onSpeak with composed sentence and onAddToThread", () => {
    const onSpeak = vi.fn();
    const onAddToThread = vi.fn();
    render(
      <MyWishes {...baseProps} onSpeak={onSpeak} onAddToThread={onAddToThread} />,
    );

    // Select a response
    fireEvent.click(screen.getByText(t(SICG_TOPICS[0].responseKeys[0], "en")));

    // Tap Share
    fireEvent.click(screen.getByText("Share"));

    expect(onAddToThread).toHaveBeenCalledWith(
      t(SICG_TOPICS[0].questionKey, "en"),
      "provider",
      "My Wishes",
      undefined, // gloss — same locale, so undefined
    );
    expect(onSpeak).toHaveBeenCalledWith(
      expect.stringContaining("being with my family"),
      { gloss: undefined }, // same locale → no gloss
    );
  });

  it("tapping Skip advances to the next topic", () => {
    render(<MyWishes {...baseProps} />);
    fireEvent.click(screen.getByText("Skip"));
    // Now on topic 2 — My Worries. Assert via the question (not the label,
    // which no longer renders on the active step).
    expect(screen.getByText(t(SICG_TOPICS[1].questionKey, "en"))).toBeInTheDocument();
  });

  it("shows Close button on the overlay", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls onClose when close button is tapped (after exit transition)", () => {
    const onClose = vi.fn();
    render(<MyWishes {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("skipping all topics shows completion screen", () => {
    vi.useFakeTimers();
    render(<MyWishes {...baseProps} />);
    // Skip all 7 topics — need to advance past Btn debounce each time
    for (let i = 0; i < SICG_TOPICS.length; i++) {
      fireEvent.click(screen.getByText("Skip"));
      vi.advanceTimersByTime(300);
    }
    // Completion screen shows patient name
    expect(screen.getByText("Maria's Wishes")).toBeInTheDocument();
    expect(screen.getByText("No wishes were shared.")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("completion screen with answers shows summary and close button", () => {
    vi.useFakeTimers();
    render(<MyWishes {...baseProps} />);
    // Answer first topic
    fireEvent.click(screen.getByText(t(SICG_TOPICS[0].responseKeys[0], "en")));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Share"));
    vi.advanceTimersByTime(300);
    // Skip the rest
    for (let i = 1; i < SICG_TOPICS.length; i++) {
      fireEvent.click(screen.getByText("Skip"));
      vi.advanceTimersByTime(300);
    }
    // Summary shows topic label and Close button
    expect(screen.getByText("Maria's Wishes")).toBeInTheDocument();
    expect(screen.getByText(/My Goals/)).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("completion screen 'Share all wishes again' calls onSpeak for each answered topic", () => {
    vi.useFakeTimers();
    const onSpeak = vi.fn();
    render(<MyWishes {...baseProps} onSpeak={onSpeak} />);
    // Answer first topic
    fireEvent.click(screen.getByText(t(SICG_TOPICS[0].responseKeys[0], "en")));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Share"));
    vi.advanceTimersByTime(300);

    // Answer second topic
    fireEvent.click(screen.getByText(t(SICG_TOPICS[1].responseKeys[0], "en")));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Share"));
    vi.advanceTimersByTime(300);

    // Skip the rest
    for (let i = 2; i < SICG_TOPICS.length; i++) {
      fireEvent.click(screen.getByText("Skip"));
      vi.advanceTimersByTime(300);
    }

    // Clear calls from Share taps
    onSpeak.mockClear();

    // Click "Share all wishes again"
    fireEvent.click(screen.getByText("Share all wishes again"));
    vi.advanceTimersByTime(300);

    // Should have been called for both answered topics
    expect(onSpeak).toHaveBeenCalledTimes(2);
    expect(onSpeak).toHaveBeenCalledWith(
      expect.stringContaining("being with my family"),
      { gloss: undefined }, // same locale → no gloss
    );
    vi.useRealTimers();
  });

  it("tapping a selected response deselects it", () => {
    vi.useFakeTimers();
    render(<MyWishes {...baseProps} />);
    const firstResponse = t(SICG_TOPICS[0].responseKeys[0], "en");
    // Select
    fireEvent.click(screen.getByText(firstResponse));
    expect(
      screen.getByText(firstResponse).closest("button"),
    ).toHaveAttribute("aria-pressed", "true");
    // Advance past the Btn 300ms debounce
    vi.advanceTimersByTime(300);
    // Deselect by tapping again
    fireEvent.click(screen.getByText(firstResponse));
    expect(
      screen.getByText(firstResponse).closest("button"),
    ).toHaveAttribute("aria-pressed", "false");
    vi.useRealTimers();
  });

  it("Share with no selections does nothing", () => {
    const onSpeak = vi.fn();
    const onAddToThread = vi.fn();
    render(
      <MyWishes {...baseProps} onSpeak={onSpeak} onAddToThread={onAddToThread} />,
    );

    // Click Share without selecting any responses
    fireEvent.click(screen.getByText("Share"));

    // Nothing should be called
    expect(onSpeak).not.toHaveBeenCalled();
    expect(onAddToThread).not.toHaveBeenCalled();
    // Should still be on topic 0 (not advanced)
    expect(screen.getByText(t(SICG_TOPICS[0].questionKey, "en"))).toBeInTheDocument();
  });

  it("completion screen Close button calls onClose", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<MyWishes {...baseProps} onClose={onClose} />);
    // Skip all topics
    for (let i = 0; i < SICG_TOPICS.length; i++) {
      fireEvent.click(screen.getByText("Skip"));
      vi.advanceTimersByTime(300);
    }
    // Click Close on completion screen. BottomSheet plays an exit animation
    // before calling caller onClose.
    fireEvent.click(screen.getByText("Close"));
    vi.advanceTimersByTime(300);
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
