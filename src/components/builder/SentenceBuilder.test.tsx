import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { SentenceBuilder } from "./SentenceBuilder";
import { light } from "../../theme/tokens";
import type { SuggestionItem } from "../../data/phraseRegistry";

// ── Mocks ───────────────────────────────────────────────────────

const mockGetKeyed = vi.fn(
  (..._args: unknown[]) =>
    Promise.resolve([
      { text: "I am", key: "suggest.start.i_am" },
      { text: "I feel", key: "suggest.start.i_feel" },
      { text: "I want", key: "suggest.start.i_want" },
      { text: "I need", key: "suggest.start.i_need" },
      { text: "Please", key: "suggest.start.please" },
    ] as SuggestionItem[]),
);
vi.mock("../../data/suggestion-trees", () => ({
  getKeyedContextualSuggestions: (...args: unknown[]) => mockGetKeyed(...args),
}));

vi.mock("../../stores/settingsStore", () => ({
  useActivePatient: () => ({ patientLang: "en", name: "Patient" }),
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ cfg: { caregiverLang: "en" } }),
}));

const baseProps = {
  onSend: vi.fn(),
  t: light,
  theme: "light" as const,
  messages: [],
};

// ── Basic rendering ─────────────────────────────────────────────

describe("SentenceBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "I am", key: "suggest.start.i_am" },
        { text: "I feel", key: "suggest.start.i_feel" },
        { text: "I want", key: "suggest.start.i_want" },
        { text: "I need", key: "suggest.start.i_need" },
        { text: "Please", key: "suggest.start.please" },
      ] as SuggestionItem[]),
    );
  });

  it("shows an editable input with placeholder", async () => {
    render(<SentenceBuilder {...baseProps} />);
    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Tap words below or type...");
  });

  it("shows suggestion pills after loading", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
      expect(screen.getByText("I feel")).toBeInTheDocument();
    });
  });

  it("tapping a suggestion appends a key token and shows the text", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    const pill = screen.getAllByText("I am").find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pill);

    // Token display should show the resolved text
    const display = screen.getByTestId("token-display");
    expect(display.textContent).toContain("I am");
    expect(screen.getByRole("button", { name: "Undo last word" })).toBeInTheDocument();
  });

  it("Speak button polishes the text and calls onSend with the result", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));

    fireEvent.click(screen.getByText("Speak"));
    // polishSentence adds a terminal period to declarative sentences.
    expect(onSend).toHaveBeenCalledWith("I am.", undefined);
  });

  it("Speak polishes manually typed text (capitalizes and adds punctuation)", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);

    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "hello team" } });
    // "hello team" contains no emoji-keyword match, so opts stays undefined.
    fireEvent.click(screen.getByText("Speak"));
    expect(onSend).toHaveBeenCalledWith("Hello team.", undefined);
  });

  it("undo pops the last token when pendingFree is empty", async () => {
    vi.useFakeTimers();
    render(<SentenceBuilder {...baseProps} />);
    await vi.advanceTimersByTimeAsync(10);

    const pill1 = screen.getAllByText("I am").find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pill1);
    vi.advanceTimersByTime(300);
    await vi.advanceTimersByTimeAsync(10);

    const pill2 = screen.getAllByText("I feel").find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pill2);
    vi.advanceTimersByTime(300);
    await vi.advanceTimersByTimeAsync(10);

    // Should show both tokens
    const display = screen.getByTestId("token-display");
    expect(display.textContent).toContain("I am");
    expect(display.textContent).toContain("I feel");

    // Undo removes the last token
    fireEvent.click(screen.getByRole("button", { name: "Undo last word" }));
    await vi.advanceTimersByTimeAsync(10);
    expect(display.textContent).toContain("I am");
    expect(display.textContent).not.toContain("I feel");

    vi.useRealTimers();
  });

  it("undo trims pendingFree before popping tokens", async () => {
    render(<SentenceBuilder {...baseProps} />);

    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "hello nurse" } });

    // Undo should trim the last word from pendingFree
    fireEvent.click(screen.getByRole("button", { name: "Undo last word" }));
    expect(input).toHaveValue("hello");
  });

  it("clear empties tokens and pendingFree", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));

    fireEvent.click(screen.getByRole("button", { name: "Clear message" }));
    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("");
    expect(screen.queryByTestId("token-display")).not.toBeInTheDocument();
  });

  it("Speak clears tokens and input after sending", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));
    fireEvent.click(screen.getByText("Speak"));

    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("");
    expect(screen.queryByTestId("token-display")).not.toBeInTheDocument();
  });

  it("Speak button is disabled when input is empty", async () => {
    render(<SentenceBuilder {...baseProps} />);
    const speakBtn = screen.getByText("Speak");
    expect(speakBtn).toBeDisabled();
  });
});

// ── Token-specific tests ────────────────────────────────────────

describe("SentenceBuilder — token state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "I am", key: "suggest.start.i_am" },
        { text: "I feel", key: "suggest.start.i_feel" },
      ] as SuggestionItem[]),
    );
  });

  it("curated chip tap produces a key token (not free)", async () => {
    // This is verified structurally: tapping "I am" (which has a key)
    // adds to the token display. The token display only shows if
    // tokens.length > 0, and the display text resolves from the key.
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getAllByText("I am").find((el) => el.tagName === "BUTTON")!,
    );
    // Token display appears (proves tokens array is non-empty)
    expect(screen.getByTestId("token-display")).toBeInTheDocument();
    // Input stays empty (proves it went to tokens, not pendingFree)
    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("");
  });

  it("keyless suggestion chip produces a free token", async () => {
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "please help me" }, // no key — keyword/generic suggestion
      ] as SuggestionItem[]),
    );
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      // Trailing 🆘 from the keyword scan ("help" → tier-20 SOS).
      expect(screen.getByText("please help me 🆘")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("please help me 🆘"));
    // Token display shows just the resolved phrase text without the chip's
    // trailing emoji decoration (the emoji rides on Token.emoji, not text).
    expect(screen.getByTestId("token-display").textContent).toContain(
      "please help me",
    );
  });

  it("typing in input keeps text in pendingFree (not tokens)", async () => {
    render(<SentenceBuilder {...baseProps} />);
    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "help" } });
    expect(input).toHaveValue("help");
    // No token display yet
    expect(screen.queryByTestId("token-display")).not.toBeInTheDocument();
  });

  it("blur flushes pendingFree into a free token", async () => {
    render(<SentenceBuilder {...baseProps} />);
    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "help me" } });
    fireEvent.blur(input);

    // Now a token display should appear
    expect(screen.getByTestId("token-display").textContent).toContain("help me");
    // Input should be empty (flushed)
    expect(input).toHaveValue("");
  });

  it("chip tap flushes pendingFree before adding the chip token", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });

    // Type something
    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "hello" } });

    // Tap a chip — should flush "hello" then add "I am"
    fireEvent.click(
      screen.getAllByText("I am").find((el) => el.tagName === "BUTTON")!,
    );

    const display = screen.getByTestId("token-display");
    expect(display.textContent).toContain("hello");
    expect(display.textContent).toContain("I am");
    expect(input).toHaveValue("");
  });
});

// ── Bilingual speak ─────────────────────────────────────────────

describe("SentenceBuilder — bilingual speak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "I am", key: "suggest.start.i_am" },
      ] as SuggestionItem[]),
    );
  });

  it("calls onSend with gloss undefined when patientLang === caregiverLang", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));
    fireEvent.click(screen.getByText("Speak"));

    // Both locales are "en", so display and spoken are the same → no gloss
    expect(onSend).toHaveBeenCalledWith("I am.", undefined);
  });
});

// ── Expressive emoji ───────────────────────────────────────────

describe("SentenceBuilder — expressive emoji", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Chip labels render via t(item.key, patientLang); en.ts has
    //   suggest.i_need.water   → "water"
    //   suggest.i_need.blanket → "a blanket"
    //   suggest.start.i_am     → "I am"
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "water", key: "suggest.i_need.water" },
        { text: "I am", key: "suggest.start.i_am" },
        { text: "a blanket", key: "suggest.i_need.blanket" },
      ] as SuggestionItem[]),
    );
  });

  it("renders trailing emoji on a curated chip whose text has a keyword match", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      // tier-30 💧 from the "water" keyword
      expect(screen.getByText("water 💧")).toBeInTheDocument();
    });
  });

  it("renders bare text on a curated chip whose text has no keyword match", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      // "I am" matches nothing in the map (grammatical), no trailing emoji
      const pill = screen.getAllByText("I am").find((el) => el.tagName === "BUTTON");
      expect(pill).toBeInTheDocument();
    });
  });

  it("handleSpeak forwards the highest-weighted icon across composed tokens", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);
    await waitFor(() => {
      expect(screen.getByText("water 💧")).toBeInTheDocument();
    });

    // Tap the water chip — the tier-30 💧 wins on the bubble.
    const pill = screen.getAllByText("water 💧")
      .find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pill);
    fireEvent.click(screen.getByText("Speak"));

    expect(onSend).toHaveBeenCalledTimes(1);
    const [, opts] = onSend.mock.calls[0];
    expect(opts).toEqual({ icon: "💧" });
  });

  it("handleSpeak passes no icon when nothing in the sentence matches", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);

    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "hello team" } });
    fireEvent.click(screen.getByText("Speak"));

    expect(onSend).toHaveBeenCalledWith("Hello team.", undefined);
  });

  it("handleSpeak picks up an icon from unflushed pendingFree input", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);

    const input = screen.getByRole("textbox", { name: "Your message" });
    // Type then immediately Speak — pendingFree never blurs/flushes,
    // but its emoji should still reach the bubble.
    fireEvent.input(input, { target: { value: "I need a blanket" } });
    fireEvent.click(screen.getByText("Speak"));

    const [, opts] = onSend.mock.calls[0];
    expect(opts?.icon).toBe("🛏️");
  });
});
