/**
 * End-to-end tests for the ttsEngine main-thread orchestration layer.
 *
 * Source-level tests on `public/tts-gpu-worker.js` verify the worker's
 * internal message contract in isolation. This file fills the other
 * gap: the main-thread orchestration — initGPU lifecycle, synthesizeGPU
 * postMessage dance, id correlation across concurrent synths, and the
 * post-init crash path that rejects in-flight synths fast rather than
 * making callers wait out their 300s pre-gen timeout.
 *
 * The real worker can't run in jsdom (no ORT, no WebGPU, no Metal), so
 * we install a fake `globalThis.Worker` per test. Each constructed
 * MockWorker is captured into a module-local array so the test can
 * drive it — posting fake responses, firing onerror for crash
 * scenarios. `vi.resetModules` between tests gives us a fresh copy of
 * ttsEngine with clean module-level state (nextSynthId, pendingSynths,
 * etc.).
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
    languageId: string,
    opts?: { timeoutMs?: number; exaggeration?: number },
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

  it("spawns the worker and resolves true once it posts ready", async () => {
    const { workers, initGPU, isGPUReady } = await loadEngineWithMocks();

    const initPromise = initGPU("/models");
    expect(workers).toHaveLength(1);
    expect(workers[0].url).toContain("tts-gpu-worker");
    expect(workers[0].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: "/models",
      bench: false,
      // sessionNeedsCangjie defaults to true on an unhydrated/empty
      // store — preserves the prior eager-load behavior in tests.
      loadCangjie: true,
    });
    expect(isGPUReady()).toBe(false);

    workers[0].__post({ type: "ready" });
    const ok = await initPromise;
    expect(ok).toBe(true);
    expect(isGPUReady()).toBe(true);
  });

  it("resolves false if the worker posts an init-path error", async () => {
    const { workers, initGPU, isGPUReady } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    // Init-path errors have no `id` — distinguished from per-synth errors.
    workers[0].__post({ type: "error", message: "model load failed" });
    const ok = await initPromise;
    expect(ok).toBe(false);
    expect(isGPUReady()).toBe(false);
  });

  it("resolves false and does not spawn a worker when WebGPU is unavailable", async () => {
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

describe("ttsEngine — synthesizeGPU", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("posts synthesize with id, resolves on matching audio response", async () => {
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const worker = workers[0];
    worker.postMessage.mockClear();

    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 5000 });

    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const call = worker.postMessage.mock.calls[0][0];
    expect(call.type).toBe("synthesize");
    expect(call.text).toBe("hello");
    expect(call.id).toBe(1);
    expect(call.speakerData).toBe(SPEAKER);
    expect(call.languageId).toBe("en");
    expect(call.exaggeration).toBe(0.5);

    const audio = new Float32Array([0.1, 0.2, 0.3]);
    worker.__post({
      type: "audio",
      data: audio,
      sampleRate: 24000,
      id: call.id,
    });

    const result = await synthPromise;
    expect(result.data).toBe(audio);
    expect(result.sampleRate).toBe(24000);
  });

  it("preserves per-synth id correlation across concurrent calls", async () => {
    // Why echoed ids matter: without per-id dispatch, phrase N's
    // listener could swallow phrase M's audio response. Post two
    // synths concurrently, return their audio in REVERSE order, and
    // confirm each promise resolves with the correct audio.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const worker = workers[0];
    worker.postMessage.mockClear();

    const p0 = synthesizeGPU("alpha", SPEAKER, "en", { timeoutMs: 5000 });
    const p1 = synthesizeGPU("beta", SPEAKER, "en", { timeoutMs: 5000 });

    const id0 = worker.postMessage.mock.calls[0][0].id;
    const id1 = worker.postMessage.mock.calls[1][0].id;
    expect(id0).not.toBe(id1);

    // Reverse order audio delivery.
    const audio0 = new Float32Array([0.1]);
    const audio1 = new Float32Array([0.2]);
    worker.__post({ type: "audio", data: audio1, sampleRate: 24000, id: id1 });
    worker.__post({ type: "audio", data: audio0, sampleRate: 24000, id: id0 });

    const [r0, r1] = await Promise.all([p0, p1]);
    expect(r0.data).toBe(audio0);
    expect(r1.data).toBe(audio1);
  });

  it("ignores audio responses with mismatched id", async () => {
    // Pre-id-echo there was a real bug where a timed-out synth's late
    // audio resolved whichever listener was currently attached,
    // caching wrong bytes for the in-flight phrase. This test confirms
    // the main-thread side of the id-echo contract.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const worker = workers[0];
    worker.postMessage.mockClear();
    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 5000 });
    const id = worker.postMessage.mock.calls[0][0].id;

    // Decoy audio with wrong id — should be ignored.
    worker.__post({
      type: "audio",
      data: new Float32Array([0.99]),
      sampleRate: 24000,
      id: id + 999,
    });

    const realAudio = new Float32Array([0.1]);
    worker.__post({
      type: "audio",
      data: realAudio,
      sampleRate: 24000,
      id,
    });

    const result = await synthPromise;
    expect(result.data).toBe(realAudio);
  });

  it("rejects when worker posts a per-id error", async () => {
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const worker = workers[0];
    worker.postMessage.mockClear();
    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 5000 });
    const id = worker.postMessage.mock.calls[0][0].id;
    worker.__post({ type: "error", message: "synth failed", id });

    await expect(synthPromise).rejects.toThrow("synth failed");
  });

  it("times out the whole synth if no response arrives within timeoutMs", async () => {
    vi.useFakeTimers();
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 100 });
    const rejectSpy = vi.fn();
    synthPromise.catch(rejectSpy);

    vi.advanceTimersByTime(150);
    await vi.runAllTicks();

    await expect(synthPromise).rejects.toThrow(/timeout/);
  });

  it("uses the 2s default timeout when opts.timeoutMs is omitted", async () => {
    // Mutation guard: every other test passes an explicit timeoutMs,
    // so a mutant like `opts?.timeoutMs ?? 0` or `?? 1` would not fail
    // any existing assertion even though it'd break every live tap
    // in production. Exercise the default path by omitting opts.
    vi.useFakeTimers();
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const synthPromise = synthesizeGPU("hello", SPEAKER, "en");
    const rejectSpy = vi.fn();
    synthPromise.catch(rejectSpy);

    vi.advanceTimersByTime(1999);
    await vi.runAllTicks();
    expect(rejectSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    await expect(synthPromise).rejects.toThrow(/2000ms/);
  });

  it("drains pendingSynths on normal resolve (no silent leak)", async () => {
    // Mutation guard: `pendingSynths.delete(id)` inside finalize()
    // isn't catchable via external side effects — reject on a settled
    // promise is a no-op and removeEventListener on an absent handler
    // is idempotent, so a no-op mutant would grow memory indefinitely
    // without failing any promise assertion. Use the test accessor
    // to assert the invariant directly.
    const { workers, initGPU, synthesizeGPU, __testPendingSynthsSize } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    expect(__testPendingSynthsSize()).toBe(0);

    const worker = workers[0];
    worker.postMessage.mockClear();
    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 5000 });

    // Mid-synth: entry is registered.
    expect(__testPendingSynthsSize()).toBe(1);

    const id = worker.postMessage.mock.calls[0][0].id;
    worker.__post({
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
    const { workers, initGPU, synthesizeGPU, __testPendingSynthsSize } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const worker = workers[0];
    worker.postMessage.mockClear();
    const p = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 5000 });
    expect(__testPendingSynthsSize()).toBe(1);

    const id = worker.postMessage.mock.calls[0][0].id;
    worker.__post({ type: "error", message: "boom", id });

    await expect(p).rejects.toThrow("boom");
    expect(__testPendingSynthsSize()).toBe(0);
  });
});

describe("ttsEngine — post-init worker crash rejects in-flight synths fast", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("rejects in-flight synth immediately when worker crashes post-init", async () => {
    // Without this handling the caller would wait its full timeoutMs
    // (up to 300s for pre-gen) before noticing a worker crash. The
    // pendingSynths registry + onerror fan-out rejects immediately.
    const { workers, initGPU, synthesizeGPU, isGPUReady } =
      await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;
    expect(isGPUReady()).toBe(true);

    // Long timeout — we want to prove the crash wakes up the promise
    // before the timeout would.
    const synthPromise = synthesizeGPU("hello", SPEAKER, "en", { timeoutMs: 300_000 });

    workers[0].__error("out of memory");

    await expect(synthPromise).rejects.toThrow(/worker crashed.*out of memory/);
    // Subsequent calls should fail fast — engine is no longer ready.
    expect(isGPUReady()).toBe(false);
    await expect(synthesizeGPU("follow-up", SPEAKER, "en")).rejects.toThrow(
      "GPU TTS not ready",
    );
  });

  it("rejects all concurrent in-flight synths on a single crash", async () => {
    // A single crash must drain the pendingSynths map fully; if it
    // only rejected the most-recent entry, older synths would still
    // wait out their timeouts.
    const { workers, initGPU, synthesizeGPU } = await loadEngineWithMocks();
    const initPromise = initGPU("/models");
    workers[0].__post({ type: "ready" });
    await initPromise;

    const p0 = synthesizeGPU("alpha", SPEAKER, "en", { timeoutMs: 300_000 });
    const p1 = synthesizeGPU("beta", SPEAKER, "en", { timeoutMs: 300_000 });
    const p2 = synthesizeGPU("gamma", SPEAKER, "en", { timeoutMs: 300_000 });

    workers[0].__error("worker terminated");

    const settled = await Promise.allSettled([p0, p1, p2]);
    expect(settled.every((s) => s.status === "rejected")).toBe(true);
    for (const s of settled) {
      if (s.status === "rejected") {
        expect(String(s.reason)).toMatch(/worker crashed/);
      }
    }
  });
});
