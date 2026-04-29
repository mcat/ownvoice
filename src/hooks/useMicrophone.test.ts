import { renderHook, act } from "@testing-library/preact";
import { useMicrophone } from "./useMicrophone";

// Mock getModelManager
const mockWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockModelManager = {
  isReady: vi.fn(), isWarm: vi.fn(),
  getWorker: vi.fn(),
};

vi.mock("../models/modelManager", () => ({
  getModelManager: vi.fn(() => mockModelManager),
}));

// Mock the settings store — the hook reads caregiverLang from it at send time.
// Default to English; individual tests can override via mockSettingsState.
let mockCaregiverLang: string = "en";
vi.mock("../stores/settingsStore", () => ({
  useSettingsStore: {
    getState: () => ({ cfg: { caregiverLang: mockCaregiverLang } }),
  },
}));

// Helper: create a mock MediaStream
function createMockStream(): MediaStream {
  const track = { stop: vi.fn(), kind: "audio" } as unknown as MediaStreamTrack;
  return {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    active: true,
    id: "mock-stream",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onaddtrack: null,
    onremovetrack: null,
  } as unknown as MediaStream;
}

// Helper: set up AudioContext + AudioWorkletNode mocks. The hook now
// uses an AudioWorklet (replacing the deprecated ScriptProcessorNode);
// the mock exposes a `simulateSamples(arr)` helper so tests can drive
// the same path the worklet's `port.postMessage` would.
function setupAudioContextMock() {
  const mockProcessor: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    port: {
      onmessage: null | ((e: MessageEvent) => void);
      postMessage: ReturnType<typeof vi.fn>;
    };
    simulateSamples: (samples: Float32Array) => void;
  } = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    port: {
      onmessage: null,
      postMessage: vi.fn(),
    },
    simulateSamples(samples: Float32Array) {
      this.port.onmessage?.({
        data: { type: "samples", samples },
      } as MessageEvent);
    },
  };
  const mockSource = {
    connect: vi.fn(),
  };
  const mockCtx = {
    createMediaStreamSource: vi.fn(() => mockSource),
    audioWorklet: { addModule: vi.fn(() => Promise.resolve()) },
    destination: {},
    sampleRate: 44100,
    state: "running" as AudioContextState,
    close: vi.fn(() => Promise.resolve()),
    resume: vi.fn(),
  };

  globalThis.AudioContext = class {
    createMediaStreamSource = mockCtx.createMediaStreamSource;
    audioWorklet = mockCtx.audioWorklet;
    destination = mockCtx.destination;
    sampleRate = mockCtx.sampleRate;
    state = mockCtx.state;
    close = mockCtx.close;
    resume = mockCtx.resume;
  } as unknown as typeof AudioContext;

  globalThis.AudioWorkletNode = class {
    port = mockProcessor.port;
    connect = mockProcessor.connect;
    disconnect = mockProcessor.disconnect;
    constructor() { /* matches AudioWorkletNode signature */ }
  } as unknown as typeof AudioWorkletNode;

  return { mockCtx, mockProcessor, mockSource };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockModelManager.isWarm.mockReturnValue(false);
  mockModelManager.getWorker.mockReturnValue(null);
  mockCaregiverLang = "en";
});

describe("useMicrophone", () => {
  describe("initial state", () => {
    it("starts with isListening=false, empty transcript, no error", () => {
      const { result } = renderHook(() => useMicrophone());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe("");
      expect(result.current.error).toBeNull();
    });
  });

  describe("startCapture", () => {
    it("sets error when STT model is not ready", async () => {
      mockModelManager.isWarm.mockReturnValue(false);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.error).toBe("Listening isn't ready yet. Try again in a moment.");
      expect(result.current.isListening).toBe(false);
    });

    it("sets error when STT worker is not available", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(null);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.error).toBe("Listening isn't ready yet. Try again in a moment.");
      expect(result.current.isListening).toBe(false);
    });

    it("sets error when microphone permission is denied", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);

      const domError = new DOMException("Permission denied", "NotAllowedError");
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(domError);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Friendly mapping (friendlyVoiceError) translates the raw
      // permission-denied DOMException into plain language.
      expect(result.current.error).toBe(
        "Microphone access is blocked. Enable it in your browser settings or upload a file instead.",
      );
      expect(result.current.isListening).toBe(false);
      // Should clean up worker listener
      expect(mockWorker.removeEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });

    it("sets error with generic message for non-permission errors", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error("Device not found"),
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Generic raw error → friendlyVoiceError fallback "err_generic".
      expect(result.current.error).toBe(
        "We couldn't finish preparing your voice. Tap Retry to try again.",
      );
    });

    it("calls getUserMedia and sets isListening on success", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result.current.isListening).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("registers a worker message listener", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      renderHook(() => useMicrophone());

      await act(async () => {
        // Need to get result from hook and call startCapture
      });

      const { result } = renderHook(() => useMicrophone());
      await act(async () => {
        await result.current.startCapture();
      });

      expect(mockWorker.addEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });
  });

  describe("clearTranscript", () => {
    it("resets transcript to empty string", () => {
      const { result } = renderHook(() => useMicrophone());

      act(() => {
        result.current.clearTranscript();
      });

      expect(result.current.transcript).toBe("");
    });
  });

  describe("stopCapture", () => {
    it("sets isListening to false", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });
      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopCapture();
      });
      expect(result.current.isListening).toBe(false);
    });

    it("stops media stream tracks", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        result.current.stopCapture();
      });

      const tracks = mockStream.getTracks();
      for (const track of tracks) {
        expect(track.stop).toHaveBeenCalled();
      }
    });

    it("disconnects the ScriptProcessorNode and closes AudioContext", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockCtx, mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        result.current.stopCapture();
      });

      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("removes the worker message listener on stop", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      act(() => {
        result.current.stopCapture();
      });

      expect(mockWorker.removeEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });

    it("is safe to call stopCapture when not listening", () => {
      const { result } = renderHook(() => useMicrophone());

      // stopCapture should not throw when nothing is active
      act(() => {
        result.current.stopCapture();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe("unmount cleanup", () => {
    it("releases the media stream when the hook unmounts mid-capture", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // User closes the panel without tapping the Stop button — component unmounts.
      unmount();

      for (const track of mockStream.getTracks()) {
        expect(track.stop).toHaveBeenCalled();
      }
    });

    it("closes the AudioContext and disconnects the processor on unmount", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockCtx, mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      unmount();

      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("removes the worker message listener on unmount", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      unmount();

      expect(mockWorker.removeEventListener).toHaveBeenCalledWith(
        "message",
        expect.any(Function),
      );
    });
  });

  describe("audio processing", () => {
    it("does not transcribe while listening — only on stopCapture", async () => {
      // Earlier versions of this hook ran a 5-second "snapshot" interval that
      // re-transcribed the growing audio buffer. That caused visible
      // transcript flicker (each greedy decode produced different output).
      // The hook now waits for stopCapture before sending anything.
      vi.useFakeTimers();

      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      const samples = new Float32Array(4096).fill(0.05);
      act(() => {
        mockProcessor.simulateSamples(samples);
      });

      // Advance well past any historical streaming interval — no transcribe call should happen.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });

      const transcribeCalls = mockWorker.postMessage.mock.calls.filter(
        (c: unknown[]) => (c[0] as { type: string }).type === "transcribe",
      );
      expect(transcribeCalls).toHaveLength(0);

      vi.useRealTimers();
    });

    it("passes caregiverLang from the settings store on transcribe", async () => {
      mockCaregiverLang = "es";
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      const samples = new Float32Array(4096).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(samples);
      });

      act(() => {
        result.current.stopCapture();
      });

      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "transcribe", language: "es" }),
        expect.anything(),
      );
    });

    it("flushes remaining audio on stopCapture", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Simulate loud audio (accumulate a chunk)
      const loudSamples = new Float32Array(4096).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(loudSamples);
      });

      // Stop capture should flush remaining audio
      act(() => {
        result.current.stopCapture();
      });

      expect(mockWorker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "transcribe" }),
        expect.anything(),
      );
    });
  });

  describe("STT worker message handling", () => {
    it("updates transcript when worker sends transcript message", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      // Capture the message handler that gets registered with the worker
      let capturedHandler: ((e: MessageEvent) => void) | null = null;
      mockWorker.addEventListener.mockImplementation(
        (event: string, handler: (e: MessageEvent) => void) => {
          if (event === "message") capturedHandler = handler;
        },
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(capturedHandler).not.toBeNull();

      // Simulate worker sending transcript
      await act(async () => {
        capturedHandler!({ data: { type: "transcript", text: "Hello world" } } as MessageEvent);
      });

      expect(result.current.transcript).toBe("Hello world");
    });

    it("replaces transcript on each transcript message", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      let capturedHandler: ((e: MessageEvent) => void) | null = null;
      mockWorker.addEventListener.mockImplementation(
        (event: string, handler: (e: MessageEvent) => void) => {
          if (event === "message") capturedHandler = handler;
        },
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Each worker message contains the full transcript so far — the hook
      // replaces instead of concatenating (see useMicrophone.ts:167-178).
      await act(async () => {
        capturedHandler!({ data: { type: "transcript", text: "Hello" } } as MessageEvent);
      });
      expect(result.current.transcript).toBe("Hello");

      await act(async () => {
        capturedHandler!({ data: { type: "transcript", text: "Hello world" } } as MessageEvent);
      });
      expect(result.current.transcript).toBe("Hello world");
    });

    it("ignores empty transcript text", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      let capturedHandler: ((e: MessageEvent) => void) | null = null;
      mockWorker.addEventListener.mockImplementation(
        (event: string, handler: (e: MessageEvent) => void) => {
          if (event === "message") capturedHandler = handler;
        },
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      await act(async () => {
        capturedHandler!({ data: { type: "transcript", text: "   " } } as MessageEvent);
      });

      expect(result.current.transcript).toBe("");
    });

    it("sets error when worker sends error message", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      let capturedHandler: ((e: MessageEvent) => void) | null = null;
      mockWorker.addEventListener.mockImplementation(
        (event: string, handler: (e: MessageEvent) => void) => {
          if (event === "message") capturedHandler = handler;
        },
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      await act(async () => {
        capturedHandler!({ data: { type: "error", message: "Transcription failed" } } as MessageEvent);
      });

      // Worker error string → friendlyVoiceError fallback.
      expect(result.current.error).toBe(
        "We couldn't finish preparing your voice. Tap Retry to try again.",
      );
    });
  });

  describe("flushAudio edge cases", () => {
    it("sets error when worker is null during flush", async () => {
      // Start with a worker, then make it disappear before flush
      const transientWorker = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // First call: isReady=true, getWorker=transientWorker
      // During flush: getWorker returns null
      let getWorkerCallCount = 0;
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockImplementation(() => {
        getWorkerCallCount++;
        // First call (startCapture worker check) returns the worker
        // After that (flush, cleanup), return null
        return getWorkerCallCount <= 1 ? transientWorker : null;
      });

      const { mockProcessor } = setupAudioContextMock();
      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Accumulate some audio
      const samples = new Float32Array(4096).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(samples);
      });

      // Stop capture — flush will try to use the worker but it's gone
      act(() => {
        result.current.stopCapture();
      });

      expect(result.current.error).toBe("Speech-to-text model not loaded");
    });
  });

  describe("stopCapture with active silence timer", () => {
    it("clears an active silence timer when stopping", async () => {
      vi.useFakeTimers();

      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);
      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      // Trigger silent audio to start the silence timer
      const silentSamples = new Float32Array(4096).fill(0.001);
      act(() => {
        mockProcessor.simulateSamples(silentSamples);
      });

      // Don't wait for the timer — stop immediately
      act(() => {
        result.current.stopCapture();
      });

      // Advance timers to prove the silence timer was cleared (no double flush)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(result.current.isListening).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("startCapture — non-Error, non-DOMException getUserMedia rejection", () => {
    it("sets generic error message for non-Error getUserMedia rejection", async () => {
      mockModelManager.isWarm.mockReturnValue(true);
      mockModelManager.getWorker.mockReturnValue(mockWorker);

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        "unknown rejection",
      );

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.startCapture();
      });

      expect(result.current.error).toBe(
        "We couldn't finish preparing your voice. Tap Retry to try again.",
      );
    });
  });
});
