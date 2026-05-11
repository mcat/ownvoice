import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useListenSession, type ListenState } from "./useListenSession";

// Mock the microphone hook to avoid touching Web Audio in unit tests.
vi.mock("./useMicrophone", () => ({
  useMicrophone: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(new Float32Array(16000 * 5)), // 5s
    level: 0.3,
    elapsedMs: 0,
    recording: false,
  })),
}));

// Mock the model manager so getWorker("stt") returns a fake.
const fakeWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  terminate: vi.fn(),
};

vi.mock("../models/modelManager", () => ({
  getModelManager: () => ({
    getWorker: () => fakeWorker,
    isReady: () => true,
    isWarm: () => true,
  }),
}));

beforeEach(() => {
  fakeWorker.postMessage.mockReset();
  fakeWorker.addEventListener.mockReset();
  fakeWorker.removeEventListener.mockReset();
});

describe("useListenSession", () => {
  it("starts in 'idle' phase", () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    expect(result.current.state.phase).toBe("idle");
  });

  it("transitions to 'recording' on start()", async () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state.phase).toBe("recording");
  });

  it("on stop(), enters 'draft' and dispatches one chunk for ≤30s audio", async () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });
    expect(result.current.state.phase).toBe("draft");
    expect(fakeWorker.postMessage).toHaveBeenCalledTimes(1);
    const call = fakeWorker.postMessage.mock.calls[0][0];
    expect(call.type).toBe("transcribe");
    expect(call.chunkId).toBe(0);
    expect(call.language).toBe("en");
  });

  it("on stop() with 75s audio, dispatches three 30s chunks", async () => {
    const { useMicrophone } = await import("./useMicrophone");
    vi.mocked(useMicrophone).mockReturnValueOnce({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Float32Array(16000 * 75)),
      level: 0,
      elapsedMs: 0,
      recording: false,
    });

    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });
    expect(fakeWorker.postMessage).toHaveBeenCalledTimes(3);
    expect(fakeWorker.postMessage.mock.calls[0][0].chunkId).toBe(0);
    expect(fakeWorker.postMessage.mock.calls[1][0].chunkId).toBe(1);
    expect(fakeWorker.postMessage.mock.calls[2][0].chunkId).toBe(2);
  });

  it("editSentence updates text in place", async () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });
    await act(async () => {
      const onMessage = fakeWorker.addEventListener.mock.calls.find(
        (c) => c[0] === "message",
      )?.[1] as (e: MessageEvent) => void;
      onMessage(
        new MessageEvent("message", {
          data: { type: "transcript", text: "Hello." },
        }),
      );
    });
    expect(result.current.state.phase).toBe("draft");
    const s = (
      result.current.state as Extract<ListenState, { phase: "draft" }>
    ).sentences[0];
    act(() => result.current.editSentence(s.id, "Hello, world."));
    const after = result.current.state as Extract<
      ListenState,
      { phase: "draft" }
    >;
    expect(after.sentences[0].text).toBe("Hello, world.");
  });

  it("discardSentence removes the sentence", async () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });
    await act(async () => {
      const onMessage = fakeWorker.addEventListener.mock.calls.find(
        (c) => c[0] === "message",
      )?.[1] as (e: MessageEvent) => void;
      onMessage(
        new MessageEvent("message", {
          data: { type: "transcript", text: "First. Second." },
        }),
      );
    });
    const before = result.current.state as Extract<
      ListenState,
      { phase: "draft" }
    >;
    expect(before.sentences).toHaveLength(2);
    act(() => result.current.discardSentence(before.sentences[0].id));
    const after = result.current.state as Extract<
      ListenState,
      { phase: "draft" }
    >;
    expect(after.sentences).toHaveLength(1);
    expect(after.sentences[0].text).toBe("Second.");
  });

  it("reset() returns state to idle", async () => {
    const { result } = renderHook(() => useListenSession({ language: "en" }));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.state.phase).toBe("recording");
    act(() => result.current.reset());
    expect(result.current.state.phase).toBe("idle");
  });

  it("dispatches transcribe with audio (Float32Array) and sampleRate 16000", async () => {
    const { result } = renderHook(() => useListenSession({ language: "es" }));
    await act(async () => {
      await result.current.start();
      await result.current.stop();
    });
    const call = fakeWorker.postMessage.mock.calls[0][0];
    expect(call.audio).toBeInstanceOf(Float32Array);
    expect(call.sampleRate).toBe(16000);
    expect(call.language).toBe("es");
  });
});
