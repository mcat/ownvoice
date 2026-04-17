import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { SentenceBuilder } from "./SentenceBuilder";
import { light } from "../../theme/tokens";

const mockGetContextual = vi.fn((..._args: unknown[]) =>
  Promise.resolve(["I am", "I feel", "I want", "I need", "Please"]),
);
const mockGetLLM = vi.fn((..._args: unknown[]) => Promise.resolve([] as string[]));

vi.mock("../../data/suggestion-trees", () => ({
  getContextualSuggestions: (...args: unknown[]) => mockGetContextual(...args),
  getLLMSuggestions: (...args: unknown[]) => mockGetLLM(...args),
}));

const baseProps = {
  onSend: vi.fn(),
  t: light,
  theme: "light" as const,
  messages: [],
};

describe("SentenceBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContextual.mockImplementation(() =>
      Promise.resolve(["I am", "I feel", "I want", "I need", "Please"]),
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

  it("tapping a suggestion appends the word to the input", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    const pill = screen.getAllByText("I am").find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(pill);

    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("I am");
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
    expect(onSend).toHaveBeenCalledWith("I am.");
  });

  it("Speak polishes manually typed text (capitalizes and adds punctuation)", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);

    const input = screen.getByRole("textbox", { name: "Your message" });
    fireEvent.input(input, { target: { value: "hello nurse" } });
    fireEvent.click(screen.getByText("Speak"));
    expect(onSend).toHaveBeenCalledWith("Hello nurse.");
  });

  it("undo removes the last word", async () => {
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

    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("I am I feel");

    fireEvent.click(screen.getByRole("button", { name: "Undo last word" }));
    await vi.advanceTimersByTimeAsync(10);
    expect(input).toHaveValue("I am I");

    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByRole("button", { name: "Undo last word" }));
    await vi.advanceTimersByTimeAsync(10);
    expect(input).toHaveValue("I am");

    vi.useRealTimers();
  });

  it("clear empties the input", async () => {
    render(<SentenceBuilder {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));

    fireEvent.click(screen.getByRole("button", { name: "Clear message" }));
    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("");
  });

  it("Speak clears the input after sending", async () => {
    const onSend = vi.fn();
    render(<SentenceBuilder {...baseProps} onSend={onSend} />);
    await waitFor(() => {
      expect(screen.getByText("I am")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("I am"));
    fireEvent.click(screen.getByText("Speak"));

    const input = screen.getByRole("textbox", { name: "Your message" });
    expect(input).toHaveValue("");
  });

  it("Speak button is disabled when input is empty", async () => {
    render(<SentenceBuilder {...baseProps} />);
    const speakBtn = screen.getByText("Speak");
    expect(speakBtn).toBeDisabled();
  });
});

describe("SentenceBuilder — LLM row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContextual.mockImplementation(() =>
      Promise.resolve(["I am", "I feel"]),
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

  it("tapping an LLM suggestion appends it to the input", async () => {
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
    expect(input).toHaveValue("I want to rest now");
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
