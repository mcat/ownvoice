import { render, screen, fireEvent } from "@testing-library/preact";
import { MyWishes } from "./MyWishes";
import { light } from "../../theme/tokens";
import { getWishTopics } from "../../data/phraseRegistry";

const SICG_TOPICS = getWishTopics("en");

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
  });

  it("renders the first topic (My Goals)", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByText("My Wishes")).toBeInTheDocument();
    expect(screen.getByText(SICG_TOPICS[0].label)).toBeInTheDocument();
    expect(screen.getByText(SICG_TOPICS[0].question)).toBeInTheDocument();
  });

  it("renders all response options for the first topic", () => {
    render(<MyWishes {...baseProps} />);
    for (const response of SICG_TOPICS[0].responses) {
      expect(screen.getByText(response)).toBeInTheDocument();
    }
  });

  it("has Share and Skip buttons", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  it("toggling a response selects it and shows a preview", () => {
    render(<MyWishes {...baseProps} />);
    const firstResponse = SICG_TOPICS[0].responses[0]; // "Being with my family"
    fireEvent.click(screen.getByText(firstResponse));
    // Preview should contain a composed sentence
    expect(
      screen.getByText(/what matters most to me is being with my family/i),
    ).toBeInTheDocument();
  });

  it("tapping Share calls onSpeak with composed sentence and onAddToThread", () => {
    const onSpeak = vi.fn();
    const onAddToThread = vi.fn();
    render(
      <MyWishes {...baseProps} onSpeak={onSpeak} onAddToThread={onAddToThread} />,
    );

    // Select a response
    fireEvent.click(screen.getByText(SICG_TOPICS[0].responses[0]));

    // Tap Share
    fireEvent.click(screen.getByText("Share"));

    expect(onAddToThread).toHaveBeenCalledWith(
      SICG_TOPICS[0].question,
      "provider",
      "My Wishes",
    );
    expect(onSpeak).toHaveBeenCalledWith(
      expect.stringContaining("being with my family"),
    );
  });

  it("tapping Skip advances to the next topic", () => {
    render(<MyWishes {...baseProps} />);
    fireEvent.click(screen.getByText("Skip"));
    // Now on topic 2 — My Worries
    expect(screen.getByText(SICG_TOPICS[1].label)).toBeInTheDocument();
    expect(screen.getByText(SICG_TOPICS[1].question)).toBeInTheDocument();
  });

  it("shows Close button on the overlay", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls onClose when close button is tapped", () => {
    const onClose = vi.fn();
    render(<MyWishes {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
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
    fireEvent.click(screen.getByText(SICG_TOPICS[0].responses[0]));
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
    fireEvent.click(screen.getByText(SICG_TOPICS[0].responses[0]));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Share"));
    vi.advanceTimersByTime(300);

    // Answer second topic
    fireEvent.click(screen.getByText(SICG_TOPICS[1].responses[0]));
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
    );
    vi.useRealTimers();
  });

  it("tapping a selected response deselects it", () => {
    render(<MyWishes {...baseProps} />);
    const firstResponse = SICG_TOPICS[0].responses[0];
    // Select
    fireEvent.click(screen.getByText(firstResponse));
    expect(
      screen.getByText(/what matters most to me is being with my family/i),
    ).toBeInTheDocument();
    // Deselect by tapping again
    fireEvent.click(screen.getByText(firstResponse));
    // Preview should disappear (no selections)
    expect(
      screen.queryByText(/what matters most to me is being with my family/i),
    ).not.toBeInTheDocument();
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
    expect(screen.getByText(SICG_TOPICS[0].label)).toBeInTheDocument();
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
    // Click Close on completion screen
    fireEvent.click(screen.getByText("Close"));
    vi.advanceTimersByTime(300);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
