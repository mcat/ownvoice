/**
 * End-to-end tests for the ttsEngine main-thread orchestration layer.
 *
 * The source-level tests for `public/tts-gpu-worker.js` and
 * `public/tts-decoder-worker.js` verify each worker's internal message
 * contract in isolation. This file fills the remaining gap: the
 * *interaction* between them mediated by ttsEngine.ts — initGPU
 * spawning both workers, synthesizeGPU driving the LM → decoder
 * postMessage dance, id correlation across two workers, and the
 * post-init crash path that rejects in-flight synths fast.
 *
 * The real workers can't run in jsdom (no ORT, no WebGPU, no Metal), so
 * we install a fake `globalThis.Worker` per test. Each constructed
 * MockWorker is captured into a module-local array so the test can
 * drive it — posting fake responses, firing onerror for crash
 * scenarios. `vi.resetModules` between tests gives us a fresh copy of
 * ttsEngine with clean module-level state (nextSynthId, pendingSynths,
 * etc.) so ordering across tests is deterministic.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

interface SpeakerDataLike {
  condEmb: number[];
  condEmbShape: number[];
  promptToken: number[];
  promptTokenShape: number[];
  speakerEmbeddings: number[];
  speakerEmbeddingsShape: number[];
  speakerFeatures: number[];
  speakerFeaturesShape: number[];
}

const SPEAKER: SpeakerDataLike = {
  condEmb: [0, 0, 0, 0],
  condEmbShape: [1, 1, 4],
  promptToken: [0],
  promptTokenShape: [1, 1],
  speakerEmbeddings: Array.from({ length: 192 }, () => 0),
  speakerEmbeddingsShape: [1, 192],
  speakerFeatures: Array.from({ length: 32 * 80 }, () => 0),
  speakerFeaturesShape: [1, 32, 80],
};

/**
 * Fake Worker implementation. Captures postMessage calls, tracks
 * addEventListener/removeEventListener, and exposes __post / __error
 * helpers so tests can simulate worker responses. jsdom doesn't provide
 * a Worker global, so we install this as `globalThis.Worker` per test.
 */
class MockWorker {
  url: string;
  postMessage = vi.fn();
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private listeners = new Set<(e: MessageEvent) => void>();
  terminate = vi.fn();

  constructor(url: string | URL) {
    this.url = String(url);
  }

  addEventListener(event: string, handler: (e: MessageEvent) => void) {
    if (event === "message") this.listeners.add(handler);
  }
  removeEventListener(event: string, handler: (e: MessageEvent) => void) {
    if (event === "message") this.listeners.delete(handler);
  }

  /** Simulate an inbound message from the worker. */
  __post(data: unknown) {
    const event = { data } as MessageEvent;
    if (this.onmessage) this.onmessage(event);
    for (const h of [...this.listeners]) h(event);
  }

  /** Simulate an onerror event from the worker. */
  __error(message: string) {
    const event = { message } as ErrorEvent;
    if (this.onerror) this.onerror(event);
  }
}

/**
 * Freshly import ttsEngine with Worker mock installed and module cache
 * cleared so each test starts with nextSynthId = 0, ready = false, etc.
 */
async function loadEngineWithMocks(): Promise<{
  workers: MockWorker[];
  initGPU: (url: string) => Promise<boolean>;
  synthesizeGPU: (
    text: string,
    data: SpeakerDataLike,
    opts?: { timeoutMs?: number },
  ) => Promise<{ data: Float32Array; sampleRate: number }>;
  isGPUReady: () => boolean;
  __testPendingSynthsSize: () => number;
}> {
  vi.resetModules();
  const workers: MockWorker[] = [];
  (globalThis as unknown as { Worker: typeof MockWorker }).Worker = class extends MockWorker {
    constructor(url: string | URL) {
      super(url);
      workers.push(this);
    }
  } as unknown as typeof MockWorker;
  // initGPU guards on `"gpu" in navigator`.
  Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
  const mod = await import("./ttsEngine");
  return {
    workers,
    initGPU: mod.initGPU,
    synthesizeGPU: mod.synthesizeGPU,
    isGPUReady: mod.isGPUReady,
    __testPendingSynthsSize: mod.__testPendingSynthsSize,
  };
}

describe("ttsEngine — initGPU", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("spawns both workers and resolves true once both post ready", async () => {
    const { workers, initGPU, isGPUReady } = await loadEngineWithMocks();

    const initPromise = initGPU("/models");
    // Both workers must exist synchronously after initGPU is called and
    // must have received their init messages before we simulate responses.
    expect(workers).toHaveLength(2);
    expect(workers[0].url).toContain("tts-gpu-worker");
    expect(workers[1].url).toContain("tts-decoder-worker");
    expect(workers[0].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: "/models",
    });
    expect(workers[1].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: "/models",
    });
    expect(isGPUReady()).toBe(false);

    // Only one worker ready → engine still not ready.
    workers[0].__post({ type: "ready" });
    expect(isGPUReady()).toBe(false);

    workers[1].__post({ type: "ready" });
    const ok = await initPromise;
    expect(ok).toBe(true);
    expect(isGPUReady()).toBe(true);
  });

  it("resolves false if the LM worker posts an init-path error", async () => {
    const { workers, initGPU, isGPUReady } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    // Init-path error has no `id` — distinguished from a per-synth error.
    workers[0].__post({ type: "error", message: "LM model load failed" });
    const ok = await initPromise;
    expect(ok).toBe(false);
    expect(isGPUReady()).toBe(false);
  });

  it("resolves false if the decoder worker posts an init-path error", async () => {
    const { workers, initGPU, isGPUReady } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[1].__post({ type: "error", message: "decoder model load failed" });
    const ok = await initPromise;
    expect(ok).toBe(false);
    expect(isGPUReady()).toBe(false);
  });

  it("resolves false and does not spawn workers when WebGPU is unavailable", async () => {
    vi.resetModules();
    const workers: MockWorker[] = [];
    (globalThis as unknown as { Worker: typeof MockWorker }).Worker = class extends MockWorker {
      constructor(url: string | URL) {
        super(url);
        workers.push(this);
      }
    } as unknown as typeof MockWorker;
    // initGPU guards on `"gpu" in navigator`. defineProperty with
    // value:undefined leaves the key present (so `in` returns true);
    // delete is what actually makes the predicate false.
    delete (navigator as unknown as { gpu?: unknown }).gpu;

    const mod = await import("./ttsEngine");
    const ok = await mod.initGPU("/models");
    expect(ok).toBe(false);
    expect(workers).toHaveLength(0);
    expect(mod.isGPUReady()).toBe(false);
  });
});

describe("ttsEngine — synthesizeGPU orchestration", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("posts synthesizeLM to LM worker, then decode to decoder worker with returned tokens", async () => {
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;
    // mockClear so we can assert just the synth path, not init.
    lmWorker.postMessage.mockClear();
    decoderWorker.postMessage.mockClear();

    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 5000 });

    // Stage 1: synthesizeLM lands on the LM worker with an id.
    expect(lmWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(decoderWorker.postMessage).toHaveBeenCalledTimes(0);
    const lmCall = lmWorker.postMessage.mock.calls[0][0];
    expect(lmCall.type).toBe("synthesizeLM");
    expect(lmCall.text).toBe("hello");
    expect(lmCall.id).toBe(1);

    // Simulate LM completion. After this, engine should post decode.
    const DECODER_TOKENS = [1, 2, 3, 4299];
    lmWorker.__post({
      type: "lmResult",
      decoderTokens: DECODER_TOKENS,
      lmT0: 0,
      id: lmCall.id,
    });

    expect(decoderWorker.postMessage).toHaveBeenCalledTimes(1);
    const decCall = decoderWorker.postMessage.mock.calls[0][0];
    expect(decCall.type).toBe("decode");
    expect(decCall.decoderTokens).toEqual(DECODER_TOKENS);
    expect(decCall.id).toBe(lmCall.id);
    expect(decCall.speakerData).toBe(SPEAKER);

    // Simulate decoder audio response.
    const audio = new Float32Array([0.1, 0.2, 0.3]);
    decoderWorker.__post({
      type: "audio",
      data: audio,
      sampleRate: 24000,
      id: decCall.id,
    });

    const result = await synthPromise;
    expect(result.data).toBe(audio);
    expect(result.sampleRate).toBe(24000);
  });

  it("preserves per-synth id correlation across two concurrent calls", async () => {
    // The main reason for echoed ids: without per-id dispatch, phrase
    // N's decoder listener could swallow phrase M's audio response. We
    // post two synths simultaneously, return their LM results in REVERSE
    // order, then their audio in order, and confirm each promise
    // resolves with the correct audio.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;
    lmWorker.postMessage.mockClear();
    decoderWorker.postMessage.mockClear();

    const p0 = synthesizeGPU("alpha", SPEAKER, { timeoutMs: 5000 });
    const p1 = synthesizeGPU("beta", SPEAKER, { timeoutMs: 5000 });

    const id0 = lmWorker.postMessage.mock.calls[0][0].id;
    const id1 = lmWorker.postMessage.mock.calls[1][0].id;
    expect(id0).not.toBe(id1);

    // LM results come back in reverse order.
    lmWorker.__post({ type: "lmResult", decoderTokens: [11], lmT0: 0, id: id1 });
    lmWorker.__post({ type: "lmResult", decoderTokens: [10], lmT0: 0, id: id0 });

    // The decoder worker should see both decode messages, each tagged
    // with the ORIGINATING id.
    const decCalls = decoderWorker.postMessage.mock.calls.map((c: unknown[]) => c[0] as { id: number; decoderTokens: number[] });
    expect(decCalls).toHaveLength(2);
    const decById = new Map(decCalls.map((c) => [c.id, c]));
    expect(decById.get(id0)?.decoderTokens).toEqual([10]);
    expect(decById.get(id1)?.decoderTokens).toEqual([11]);

    // Audio responses: also arrive in reverse order.
    const audio0 = new Float32Array([0.1]);
    const audio1 = new Float32Array([0.2]);
    decoderWorker.__post({ type: "audio", data: audio1, sampleRate: 24000, id: id1 });
    decoderWorker.__post({ type: "audio", data: audio0, sampleRate: 24000, id: id0 });

    const [r0, r1] = await Promise.all([p0, p1]);
    expect(r0.data).toBe(audio0);
    expect(r1.data).toBe(audio1);
  });

  it("ignores audio responses with mismatched id (late responses don't cross-contaminate)", async () => {
    // Pre-pipeline there was a real bug where a timed-out synth's late
    // audio would resolve the currently-attached listener. The id echo
    // is what prevents it. This test confirms the main-thread side of
    // that contract: posting an audio message with a wrong id must not
    // resolve the current synth.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;
    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 5000 });
    const lmCall = lmWorker.postMessage.mock.calls.find(
      (c: unknown[]) => (c[0] as { type: string }).type === "synthesizeLM",
    )![0] as { id: number };
    const id = lmCall.id;

    lmWorker.__post({ type: "lmResult", decoderTokens: [1], lmT0: 0, id });

    // Post a decoy audio with a wrong id first — should be ignored.
    const decoyAudio = new Float32Array([0.99]);
    decoderWorker.__post({
      type: "audio",
      data: decoyAudio,
      sampleRate: 24000,
      id: id + 999,
    });

    // Now the real audio with the matching id.
    const realAudio = new Float32Array([0.1]);
    decoderWorker.__post({
      type: "audio",
      data: realAudio,
      sampleRate: 24000,
      id,
    });

    const result = await synthPromise;
    expect(result.data).toBe(realAudio);
  });

  it("rejects when LM worker posts a per-id error (never reaches decoder stage)", async () => {
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;
    lmWorker.postMessage.mockClear();
    decoderWorker.postMessage.mockClear();

    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 5000 });
    const id = lmWorker.postMessage.mock.calls[0][0].id;
    lmWorker.__post({ type: "error", message: "LM ran out of tokens", id });

    await expect(synthPromise).rejects.toThrow("LM ran out of tokens");
    // Decoder worker must NOT receive a decode message if LM rejected.
    expect(decoderWorker.postMessage).not.toHaveBeenCalled();
  });

  it("rejects when decoder worker posts a per-id error", async () => {
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;

    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 5000 });
    const id = lmWorker.postMessage.mock.calls.find(
      (c: unknown[]) => (c[0] as { type: string }).type === "synthesizeLM",
    )![0].id;
    lmWorker.__post({ type: "lmResult", decoderTokens: [1], lmT0: 0, id });
    decoderWorker.__post({ type: "error", message: "decoder failed", id });

    await expect(synthPromise).rejects.toThrow("decoder failed");
  });

  it("times out the whole synth if no response arrives within timeoutMs", async () => {
    vi.useFakeTimers();
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 100 });
    // `.catch` attached before we advance fake time so the rejection
    // doesn't trip an unhandled-rejection warning.
    const rejectSpy = vi.fn();
    synthPromise.catch(rejectSpy);

    vi.advanceTimersByTime(150);
    await vi.runAllTicks();

    await expect(synthPromise).rejects.toThrow(/timeout/);
  });

  it("uses the 2s default timeout when opts.timeoutMs is omitted", async () => {
    // Mutation guard: every OTHER test in this file passes an explicit
    // timeoutMs, so a mutant like `opts?.timeoutMs ?? 0` or `?? 1` would
    // not fail any existing assertion even though it'd break every live
    // tap in production. Exercise the default path by omitting opts and
    // verifying both halves of the boundary: no rejection before 2s,
    // timeout exactly at 2s.
    vi.useFakeTimers();
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const synthPromise = synthesizeGPU("hello", SPEAKER);
    const rejectSpy = vi.fn();
    synthPromise.catch(rejectSpy);

    // At 1999ms, no timeout yet. Flush any pending microtasks so the
    // rejection — if it were happening early — would have landed.
    vi.advanceTimersByTime(1999);
    await vi.runAllTicks();
    expect(rejectSpy).not.toHaveBeenCalled();

    // Cross the 2000ms boundary; timeout fires.
    vi.advanceTimersByTime(2);
    await expect(synthPromise).rejects.toThrow(/2000ms/);
  });

  it("drains pendingSynths on normal resolve (no silent leak)", async () => {
    // Mutation guard: `pendingSynths.delete(id)` in the finalize helper
    // isn't catchable via external side effects — reject on a settled
    // promise is a no-op and removeEventListener on an absent handler
    // is idempotent, so a no-op mutant would grow memory indefinitely
    // without failing any promise assertion. Use the __testPendingSynths
    // accessor to assert the invariant directly.
    const { workers, initGPU, synthesizeGPU, __testPendingSynthsSize } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    expect(__testPendingSynthsSize()).toBe(0);

    const [lmWorker, decoderWorker] = workers;
    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 5000 });

    // Mid-synth: entry is registered.
    expect(__testPendingSynthsSize()).toBe(1);

    const id = lmWorker.postMessage.mock.calls.find(
      (c: unknown[]) => (c[0] as { type: string }).type === "synthesizeLM",
    )![0].id;
    lmWorker.__post({ type: "lmResult", decoderTokens: [1], lmT0: 0, id });
    decoderWorker.__post({
      type: "audio",
      data: new Float32Array([0.1]),
      sampleRate: 24000,
      id,
    });
    await synthPromise;

    // After normal resolve: entry drained.
    expect(__testPendingSynthsSize()).toBe(0);
  });

  it("drains pendingSynths on per-id error responses", async () => {
    // Same mutation guard as the normal-resolve case, but through the
    // error exit paths (both LM and decoder). Each error path calls
    // finalize(); a selective mutant that only removed the delete from
    // the happy path would still be caught by the check above, but
    // mirrored coverage here prevents regressions in either error arm.
    const { workers, initGPU, synthesizeGPU, __testPendingSynthsSize } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const [lmWorker, decoderWorker] = workers;

    // LM error path
    const p1 = synthesizeGPU("a", SPEAKER, { timeoutMs: 5000 });
    const id1 = lmWorker.postMessage.mock.calls[
      lmWorker.postMessage.mock.calls.length - 1
    ][0].id;
    lmWorker.__post({ type: "error", message: "boom", id: id1 });
    await expect(p1).rejects.toThrow("boom");
    expect(__testPendingSynthsSize()).toBe(0);

    // Decoder error path
    const p2 = synthesizeGPU("b", SPEAKER, { timeoutMs: 5000 });
    const id2 = lmWorker.postMessage.mock.calls[
      lmWorker.postMessage.mock.calls.length - 1
    ][0].id;
    lmWorker.__post({ type: "lmResult", decoderTokens: [1], lmT0: 0, id: id2 });
    decoderWorker.__post({ type: "error", message: "dec boom", id: id2 });
    await expect(p2).rejects.toThrow("dec boom");
    expect(__testPendingSynthsSize()).toBe(0);
  });
});

describe("ttsEngine — post-init worker crash rejects in-flight synths fast", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("rejects in-flight synth immediately when LM worker crashes post-init", async () => {
    // Without this handling, the caller would wait its full timeoutMs
    // (up to 300s for pre-gen) before noticing a worker crash. The
    // pendingSynths registry + onerror fan-out rejects immediately.
    const { workers, initGPU, synthesizeGPU, isGPUReady } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;
    expect(isGPUReady()).toBe(true);

    // Long timeout — we want to prove the crash wakes up the promise
    // before the timeout would.
    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 300_000 });

    // Simulate worker crash.
    workers[0].__error("out of memory");

    await expect(synthPromise).rejects.toThrow(/LM worker crashed.*out of memory/);
    // Subsequent calls should fail fast — engine is no longer ready.
    expect(isGPUReady()).toBe(false);
    await expect(synthesizeGPU("follow-up", SPEAKER)).rejects.toThrow(
      "GPU TTS not ready",
    );
  });

  it("rejects in-flight synth immediately when decoder worker crashes post-init", async () => {
    const { workers, initGPU, synthesizeGPU, isGPUReady } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const synthPromise = synthesizeGPU("hello", SPEAKER, { timeoutMs: 300_000 });

    workers[1].__error("GPU context lost");

    await expect(synthPromise).rejects.toThrow(/Dec worker crashed.*GPU context lost/);
    expect(isGPUReady()).toBe(false);
  });

  it("rejects all concurrent in-flight synths on a single crash", async () => {
    // A single crash must drain the pendingSynths map fully; if it
    // only rejected the most-recent entry, older synths would still
    // wait out their timeouts.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    workers[1].__post({ type: "ready" });
    await initPromise;

    const p0 = synthesizeGPU("alpha", SPEAKER, { timeoutMs: 300_000 });
    const p1 = synthesizeGPU("beta", SPEAKER, { timeoutMs: 300_000 });
    const p2 = synthesizeGPU("gamma", SPEAKER, { timeoutMs: 300_000 });

    workers[0].__error("worker terminated");

    const settled = await Promise.allSettled([p0, p1, p2]);
    expect(settled.every((s) => s.status === "rejected")).toBe(true);
    for (const s of settled) {
      if (s.status === "rejected") {
        expect(String(s.reason)).toMatch(/LM worker crashed/);
      }
    }
  });
});
