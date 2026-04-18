import { render, screen, fireEvent } from "@testing-library/preact";
import { ListenPanel } from "./ListenPanel";
import { light } from "../../theme/tokens";
import type { Provider } from "../../types";
import type { MicrophoneState } from "../../hooks/useMicrophone";

const makeMicState = (overrides: Partial<MicrophoneState> = {}): MicrophoneState => ({
  isListening: false,
  transcript: "",
  error: null,
  audioLevel: 0,
  transcribing: false,
  startCapture: vi.fn(),
  stopCapture: vi.fn(),
  clearTranscript: vi.fn(),
  ...overrides,
});

vi.mock("../../hooks/useMicrophone", () => ({
  useMicrophone: vi.fn(),
}));

import { useMicrophone } from "../../hooks/useMicrophone";
const mockUseMicrophone = vi.mocked(useMicrophone);

const providers: Provider[] = [
  { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
  { name: "Nurse Lee", hasVoice: false, emoji: "🧑‍⚕️" },
];

const baseProps = {
  onAddMessage: vi.fn(),
  onClose: vi.fn(),
  t: light,
  theme: "light" as const,
  providers,
  activeProvIdx: 0,
  onSelectProvider: vi.fn(),
};

describe("ListenPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMicrophone.mockReturnValue(makeMicState());
  });

  it("renders the Listen title", () => {
    render(<ListenPanel {...baseProps} />);
    expect(screen.getByText("Listen")).toBeInTheDocument();
  });

  it("renders Close button and calls onClose", () => {
    const onClose = vi.fn();
    render(<ListenPanel {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has a textarea for the transcript", () => {
    render(<ListenPanel {...baseProps} />);
    expect(
      screen.getByRole("textbox", { name: "Transcript" }),
    ).toBeInTheDocument();
  });

  it("has a mic button with correct label when not listening", () => {
    render(<ListenPanel {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "Tap to start listening" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tap to start listening")).toBeInTheDocument();
  });

  it("shows 'Listening...' hint when mic is active", () => {
    mockUseMicrophone.mockReturnValue(makeMicState({ isListening: true }));
    render(<ListenPanel {...baseProps} />);
    expect(screen.getByText("Listening...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop listening" }),
    ).toBeInTheDocument();
  });

  it("typing into textarea and submitting calls onAddMessage", () => {
    const onAddMessage = vi.fn();
    render(<ListenPanel {...baseProps} onAddMessage={onAddMessage} />);

    const textarea = screen.getByRole("textbox", { name: "Transcript" });
    fireEvent.input(textarea, { target: { value: "The patient is resting" } });

    // Submit
    fireEvent.click(
      screen.getByRole("button", {
        name: /Add to conversation as.*Dr\. Smith/,
      }),
    );
    expect(onAddMessage).toHaveBeenCalledWith(
      "The patient is resting",
      "👩‍⚕️ Dr. Smith",
    );
  });

  it("submit button shows the current provider label", () => {
    render(<ListenPanel {...baseProps} />);
    expect(
      screen.getByText(/Add to conversation as.*Dr\. Smith/),
    ).toBeInTheDocument();
  });

  it("renders provider selector chips when multiple providers exist", () => {
    render(<ListenPanel {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "Select Dr. Smith" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Nurse Lee" }),
    ).toBeInTheDocument();
  });

  it("calls onSelectProvider when a provider chip is clicked", () => {
    const onSelectProvider = vi.fn();
    render(
      <ListenPanel {...baseProps} onSelectProvider={onSelectProvider} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select Nurse Lee" }));
    expect(onSelectProvider).toHaveBeenCalledWith(1);
  });

  it("calls onClose when overlay background is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<ListenPanel {...baseProps} onClose={onClose} />);
    // Backdrop is the outermost div and is the click target; the inner
    // role=dialog card stops click propagation so only backdrop clicks close.
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("displays mic error when present", () => {
    mockUseMicrophone.mockReturnValue(
      makeMicState({ error: "Microphone access denied" }),
    );
    render(<ListenPanel {...baseProps} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Microphone access denied",
    );
  });

  it("submit with empty text does not call onAddMessage", () => {
    const onAddMessage = vi.fn();
    render(<ListenPanel {...baseProps} onAddMessage={onAddMessage} />);

    // Try to submit with empty textarea
    fireEvent.click(
      screen.getByRole("button", {
        name: /Add to conversation as/,
      }),
    );
    expect(onAddMessage).not.toHaveBeenCalled();
  });

  it("submit with only whitespace does not call onAddMessage", () => {
    const onAddMessage = vi.fn();
    render(<ListenPanel {...baseProps} onAddMessage={onAddMessage} />);

    const textarea = screen.getByRole("textbox", { name: "Transcript" });
    fireEvent.input(textarea, { target: { value: "   " } });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Add to conversation as/,
      }),
    );
    expect(onAddMessage).not.toHaveBeenCalled();
  });

  it("clicking mic button calls startCapture when not listening", () => {
    const startCapture = vi.fn();
    mockUseMicrophone.mockReturnValue(makeMicState({ startCapture }));
    render(<ListenPanel {...baseProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Tap to start listening" }),
    );
    expect(startCapture).toHaveBeenCalledOnce();
  });

  it("clicking mic button calls stopCapture when already listening", () => {
    const stopCapture = vi.fn();
    mockUseMicrophone.mockReturnValue(
      makeMicState({ isListening: true, transcript: "some text", stopCapture }),
    );
    render(<ListenPanel {...baseProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Stop listening" }),
    );
    expect(stopCapture).toHaveBeenCalledOnce();
  });

  it("shows single provider label when only one provider exists", () => {
    const singleProvider: Provider[] = [
      { name: "Dr. Solo", hasVoice: false, emoji: "🧑‍⚕️" },
    ];
    render(<ListenPanel {...baseProps} providers={singleProvider} />);
    // Should show provider name as static text (not chip button)
    // "Dr. Solo" appears in both the provider label and submit button, so use getAllByText
    expect(screen.getAllByText(/Dr\. Solo/).length).toBeGreaterThanOrEqual(1);
    // Should NOT have chip selector buttons
    expect(
      screen.queryByRole("button", { name: "Select Dr. Solo" }),
    ).not.toBeInTheDocument();
  });
});
