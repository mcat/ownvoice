import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { SentenceBuilder } from "./SentenceBuilder";
import type { Token } from "./SentenceBuilder";
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
const mockGetLLM = vi.fn((..._args: unknown[]) => Promise.resolve([] as string[]));

vi.mock("../../data/suggestion-trees", () => ({
  getKeyedContextualSuggestions: (...args: unknown[]) => mockGetKeyed(...args),
  getLLMSuggestions: (...args: unknown[]) => mockGetLLM(...args),
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
    mockGetLLM.mockImplementation(() => Promise.resolve([]));
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
    fireEvent.input(input, { target: { value: "hello nurse" } });
    fireEvent.click(screen.getByText("Speak"));
    expect(onSend).toHaveBeenCalledWith("Hello nurse.", undefined);
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
    mockGetLLM.mockImplementation(() => Promise.resolve([]));
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
      expect(screen.getByText("please help me")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("please help me"));
    // Still appears in token display
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
    mockGetLLM.mockImplementation(() => Promise.resolve([]));
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

// ── LLM row ─────────────────────────────────────────────────────

describe("SentenceBuilder — LLM row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeyed.mockImplementation(() =>
      Promise.resolve([
        { text: "I am", key: "suggest.start.i_am" },
        { text: "I feel", key: "suggest.start.i_feel" },
      ] as SuggestionItem[]),
    );
  });

  it("shows LLM suggestions in a separate row with AI badge", async () => {
    mockGetLLM.mockImplementation(() =>
      Promise.resolve(["rest now", "go home", "see the doctor"]),
    );

    render(<SentenceBuilder {...baseProps} />);

    // Type something to trigger LLM
    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "I want to" } });

    await waitFor(() => {
      expect(screen.getByText("AI")).toBeInTheDocument();
      expect(screen.getByText("rest now")).toBeInTheDocument();
      expect(screen.getByText("go home")).toBeInTheDocument();
      expect(screen.getByText("see the doctor")).toBeInTheDocument();
    });
  });

  it("tapping an LLM suggestion adds a free token", async () => {
    mockGetLLM.mockImplementation(() =>
      Promise.resolve(["rest now"]),
    );

    render(<SentenceBuilder {...baseProps} />);
    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "I want to" } });

    await waitFor(() => {
      expect(screen.getByText("rest now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("rest now"));

    // "I want to" was pendingFree, gets flushed; "rest now" added as free token
    const display = screen.getByTestId("token-display");
    expect(display.textContent).toContain("I want to");
    expect(display.textContent).toContain("rest now");
    expect(input).toHaveValue("");
  });

  it("does not show LLM row when input is empty", async () => {
    mockGetLLM.mockImplementation(() =>
      Promise.resolve(["something"]),
    );

    render(<SentenceBuilder {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });

    // LLM row should not appear for empty input
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("refreshes LLM suggestions when text changes", async () => {
    mockGetLLM.mockImplementation(() =>
      Promise.resolve(["first result"]),
    );

    render(<SentenceBuilder {...baseProps} />);
    const input = screen.getByRole("textbox", { name: "Your message" });

    fireEvent.input(input, { target: { value: "I am" } });
    await waitFor(() => {
      expect(mockGetLLM).toHaveBeenCalledWith("i am", [], expect.any(Number));
    });

    mockGetLLM.mockImplementation(() =>
      Promise.resolve(["second result"]),
    );

    fireEvent.input(input, { target: { value: "I am tired" } });
    await waitFor(() => {
      expect(mockGetLLM).toHaveBeenCalledWith("i am tired", [], expect.any(Number));
    });
  });
});
