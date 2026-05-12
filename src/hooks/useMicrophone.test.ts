import { renderHook, act } from "@testing-library/preact";
import { useMicrophone } from "./useMicrophone";

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

// Helper: set up AudioContext + AudioWorkletNode mocks. The hook uses
// an AudioWorklet; the mock exposes `simulateSamples(arr)` so tests can
// drive the same path the worklet's `port.postMessage` would.
function setupAudioContextMock(sampleRate = 44100) {
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
    sampleRate,
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
    constructor() {
      /* matches AudioWorkletNode signature */
    }
  } as unknown as typeof AudioWorkletNode;

  return { mockCtx, mockProcessor, mockSource };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMicrophone", () => {
  describe("initial state", () => {
    it("starts with recording=false, level=0, elapsedMs=0", () => {
      const { result } = renderHook(() => useMicrophone());

      expect(result.current.recording).toBe(false);
      expect(result.current.level).toBe(0);
      expect(result.current.elapsedMs).toBe(0);
    });
  });

  describe("start", () => {
    it("rejects when microphone permission is denied", async () => {
      setupAudioContextMock();
      const domError = new DOMException("Permission denied", "NotAllowedError");
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(domError);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await expect(result.current.start()).rejects.toBe(domError);
      });

      expect(result.current.recording).toBe(false);
    });

    it("calls getUserMedia and sets recording=true on success", async () => {
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result.current.recording).toBe(true);
    });
  });

  describe("stop", () => {
    it("sets recording=false", async () => {
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });
      expect(result.current.recording).toBe(true);

      await act(async () => {
        await result.current.stop();
      });
      expect(result.current.recording).toBe(false);
    });

    it("stops media stream tracks", async () => {
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await result.current.stop();
      });

      const tracks = mockStream.getTracks();
      for (const track of tracks) {
        expect(track.stop).toHaveBeenCalled();
      }
    });

    it("disconnects the AudioWorkletNode and closes AudioContext", async () => {
      const { mockCtx, mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await result.current.stop();
      });

      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("returns accumulated mono PCM (no resample when ctx is already 16 kHz)", async () => {
      const { mockProcessor } = setupAudioContextMock(16000);

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      const chunkA = new Float32Array(128).fill(0.1);
      const chunkB = new Float32Array(256).fill(0.2);
      act(() => {
        mockProcessor.simulateSamples(chunkA);
        mockProcessor.simulateSamples(chunkB);
      });

      let combined: Float32Array | undefined;
      await act(async () => {
        combined = await result.current.stop();
      });

      expect(combined).toBeInstanceOf(Float32Array);
      expect(combined!.length).toBe(chunkA.length + chunkB.length);
      expect(combined![0]).toBeCloseTo(0.1);
      expect(combined![chunkA.length]).toBeCloseTo(0.2);
    });

    it("resamples 48 kHz capture down to 16 kHz before returning", async () => {
      const { mockProcessor } = setupAudioContextMock(48000);

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      // 3000 samples @ 48k = 62.5ms → should produce ~1000 samples @ 16k
      const samples = new Float32Array(3000).fill(0.25);
      act(() => {
        mockProcessor.simulateSamples(samples);
      });

      let combined: Float32Array | undefined;
      await act(async () => {
        combined = await result.current.stop();
      });

      expect(combined).toBeInstanceOf(Float32Array);
      // Linear interpolation: output_len = floor(input_len / ratio) where ratio=3
      expect(combined!.length).toBe(1000);
      // Amplitude preserved (constant input → constant output)
      expect(combined![0]).toBeCloseTo(0.25, 5);
      expect(combined![500]).toBeCloseTo(0.25, 5);
    });

    it("resamples 44.1 kHz capture down to 16 kHz", async () => {
      const { mockProcessor } = setupAudioContextMock(44100);

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      const samples = new Float32Array(44100).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(samples);
      });

      let combined: Float32Array | undefined;
      await act(async () => {
        combined = await result.current.stop();
      });

      // 44100 samples @ 44.1k = 1s → 16000 samples @ 16k
      expect(combined!.length).toBe(16000);
    });

    it("returns an empty Float32Array when no audio was captured", async () => {
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      let combined: Float32Array | undefined;
      await act(async () => {
        combined = await result.current.stop();
      });

      expect(combined).toBeInstanceOf(Float32Array);
      expect(combined!.length).toBe(0);
    });
  });

  describe("level updates", () => {
    it("updates level state from RMS of incoming samples", async () => {
      vi.useFakeTimers();

      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      // Loud audio — RMS ~0.5, clamped to 1 by /0.15 scaling.
      const loud = new Float32Array(4096).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(loud);
      });

      // Advance past the ~66ms throttle to flush a level update
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });

      expect(result.current.level).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it("decays level to 0 after stop", async () => {
      vi.useFakeTimers();

      const { mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      const loud = new Float32Array(4096).fill(0.5);
      act(() => {
        mockProcessor.simulateSamples(loud);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250);
      });
      expect(result.current.level).toBeGreaterThan(0);

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.level).toBe(0);

      vi.useRealTimers();
    });
  });

  describe("elapsedMs", () => {
    it("ticks elapsedMs while recording", async () => {
      vi.useFakeTimers();

      setupAudioContextMock();
      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(result.current.elapsedMs).toBeGreaterThanOrEqual(400);

      vi.useRealTimers();
    });
  });

  describe("unmount cleanup", () => {
    it("releases the media stream when the hook unmounts mid-capture", async () => {
      setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      // User closes the panel without tapping Stop — component unmounts.
      unmount();

      for (const track of mockStream.getTracks()) {
        expect(track.stop).toHaveBeenCalled();
      }
    });

    it("closes the AudioContext and disconnects the processor on unmount", async () => {
      const { mockCtx, mockProcessor } = setupAudioContextMock();

      const mockStream = createMockStream();
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useMicrophone());

      await act(async () => {
        await result.current.start();
      });

      unmount();

      expect(mockProcessor.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
