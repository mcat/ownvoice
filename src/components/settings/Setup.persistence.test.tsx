import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup, act } from "@testing-library/preact";
import { Setup } from "./Setup";
import { useSettingsStore } from "../../stores/settingsStore";

// Capture VoiceCapture's onCapture so the test can drive it directly. The real
// component opens a MediaRecorder pipeline that is too heavy for unit tests.
let capturedOnCapture: ((blob: Blob, embedding?: unknown) => void | Promise<void>) | null = null;

vi.mock("../shared/VoiceCapture", () => ({
  VoiceCapture: (props: {
    onCapture: (b: Blob, e?: unknown) => void | Promise<void>;
  }) => {
    capturedOnCapture = props.onCapture;
    return <div data-testid="voice-capture-mock" />;
  },
}));

vi.mock("../../models/audioCacheRunner", () => ({
  pauseAll: vi.fn(),
  runPreGeneration: vi.fn(),
  retryFailed: vi.fn(),
  abort: vi.fn(),
}));

vi.mock("../../models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: () => false,
    isWarm: () => false,
    onProgress: () => () => {},
    getProgress: () => [{ model: "tts", status: "idle", loaded: 0, total: 0 }],
  }),
}));

describe("Setup — voice capture persistence (Bug 5)", () => {
  beforeEach(() => {
    capturedOnCapture = null;
    useSettingsStore.setState({ cfg: null, speakerData: null, _hasHydrated: true });
    vi.useFakeTimers();
    cleanup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes pendingVoiceBlob on the patient when finish runs", async () => {
    const onFirstRunDone = vi.fn();
    render(<Setup mode="first-run" onFirstRunDone={onFirstRunDone} />);

    // Step 0: fill in patient name.
    const nameInput = screen.getByPlaceholderText("First name or preferred name");
    fireEvent.input(nameInput, { target: { value: "Alex" } });

    // Step 0 → 1 (Voice). Btn has a 300ms tremor-protection lockout that
    // swallows subsequent clicks until the timer fires.
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);

    // VoiceCapture is mocked — its onCapture is captured for direct invocation.
    expect(capturedOnCapture).toBeTruthy();
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
    // Switch to real timers around the FileReader-driven blobToBase64 helper:
    // FileReader's onloadend is microtask-driven and does not flush under
    // vi's fake timers.
    vi.useRealTimers();
    await act(async () => {
      await capturedOnCapture!(blob);
    });
    vi.useFakeTimers();

    // Step 1 → 2 (Care Team)
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    // Step 2 → 3 (Confirm)
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    // Step 3: Start OwnVoice
    fireEvent.click(screen.getByText("Start OwnVoice"));
    vi.advanceTimersByTime(300);

    expect(onFirstRunDone).toHaveBeenCalled();
    const cfg = onFirstRunDone.mock.calls[0][0];
    expect(cfg.patients[0].pendingVoiceBlob).toBeTruthy();
    expect(typeof cfg.patients[0].pendingVoiceBlob).toBe("string");
    // No model warm → no embedding extracted.
    expect(cfg.patients[0].speakerData).toBeFalsy();
  });
});
