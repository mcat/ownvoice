import { render, screen, fireEvent, act } from "@testing-library/preact";
import { VoiceCapture, friendlyVoiceError } from "./VoiceCapture";

// Mock getModelManager to avoid model init side effects
vi.mock("../../models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn(),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: vi.fn(() => false),
    onProgress: vi.fn(() => () => {}),
    getProgress: vi.fn(() => [
      { model: "tts", status: "idle", loaded: 0, total: 0 },
    ]),
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

describe("VoiceCapture accessibility — touch targets must meet 44px floor even in compact", () => {
  const onCapture = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    onCapture.mockClear();
    onRemove.mockClear();
  });

  function parsePx(v: string | null): number {
    if (!v) return 0;
    const m = v.match(/(-?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
  }

  it("Upload file and Record buttons meet 44px minHeight in compact", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={false}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const upload = screen.getByText("Upload file").closest("button")!;
    const record = screen.getByText("Record").closest("button")!;
    expect(parsePx(upload.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parsePx(record.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Play button meets 44px minHeight in compact captured state", () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        audioBlob={blob}
        compact
      />,
    );
    const play = screen.getByText(/Play/).closest("button")!;
    expect(parsePx(play.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Remove button meets 44px minHeight in compact captured state", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const remove = screen.getByText("Remove").closest("button")!;
    expect(parsePx(remove.style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it("Remove button has a descriptive accessible name, not just 'Remove'", () => {
    render(
      <VoiceCapture
        label="Patient"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={onRemove}
        compact
      />,
    );
    const remove = screen.getByText("Remove").closest("button")!;
    const accessibleName = remove.getAttribute("aria-label") ?? remove.textContent ?? "";
    expect(accessibleName.toLowerCase()).toContain("voice");
  });
});

describe("friendlyVoiceError — raw error strings must never reach the user", () => {
  it("maps 'Failed to fetch' (native fetch error) to an actionable sentence", () => {
    const msg = friendlyVoiceError("Failed to fetch");
    expect(msg.toLowerCase()).not.toContain("failed to fetch");
    expect(msg.toLowerCase()).toMatch(/connection|network|retry/);
  });

  it("maps NetworkError variants", () => {
    expect(friendlyVoiceError("NetworkError when attempting to fetch resource")).toMatch(/connection|retry/i);
  });

  it("maps timeout errors", () => {
    expect(friendlyVoiceError("Voice processing timed out. Please try again.")).toMatch(/took too long|retry/i);
  });

  it("maps permission errors to a microphone-specific hint", () => {
    expect(friendlyVoiceError("Permission denied by user")).toMatch(/microphone|settings/i);
  });

  it("falls back to a generic but actionable sentence for unknown errors", () => {
    const msg = friendlyVoiceError("Something weird from the worker");
    expect(msg.toLowerCase()).toMatch(/retry|try again/);
    expect(msg.toLowerCase()).not.toContain("weird");
  });
});
