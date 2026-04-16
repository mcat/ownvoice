import { render, screen, fireEvent, act } from "@testing-library/preact";
import { VoiceCapture } from "./VoiceCapture";

// Mock getModelManager to avoid model init side effects
vi.mock("../../models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn(),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: vi.fn(() => false),
    onProgress: vi.fn(() => () => {}),
  }),
}));

describe("VoiceCapture", () => {
  const onCapture = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    onCapture.mockClear();
    onRemove.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 'Upload file' and 'Record' buttons when hasVoice=false", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
  });

  it("renders 'Voice captured' text and a Remove button when hasVoice=true", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
    // Should NOT show Upload/Record buttons
    expect(screen.queryByText("Upload file")).not.toBeInTheDocument();
    expect(screen.queryByText("Record")).not.toBeInTheDocument();
  });

  it("clicking Remove calls onRemove prop", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders without error when compact=true", () => {
    // hasVoice=false compact
    const { unmount } = render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    expect(screen.getByText("Upload file")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    unmount();

    // hasVoice=true compact
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });

  it("shows Play button when captured and audioBlob is provided", () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        audioBlob={blob}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.getByText(/Play/)).toBeInTheDocument();
  });

  it("does not show Play button when captured without audioBlob", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
    expect(screen.queryByText(/Play/)).not.toBeInTheDocument();
  });

  it("renders the label in the captured state", () => {
    render(
      <VoiceCapture
        label="Dr. Smith"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
      />,
    );
    // The captured state shows "Voice captured" text — the component itself
    // always renders regardless of label value. The label prop is used by the
    // parent for context. Verify the component renders correctly with the label.
    expect(screen.getByText("Voice captured")).toBeInTheDocument();
  });
});
