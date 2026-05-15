/**
 * Tests for denoiserClient.ts — the main-thread singleton that owns the
 * worker lifecycle and the request/response protocol around it.
 *
 * Strategy: replace global `Worker` with a controllable stub that records
 * messages and lets the test post replies back. No real worker spawned.
 */

import { vi, beforeEach, describe, expect, it } from "vitest";
import { denoise, __test__reset } from "./denoiserClient";

// ─── Worker stub ───────────────────────────────────────────────────

type Listener = (e: { data: unknown }) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];
  postedMessages: unknown[] = [];
  private listeners: Listener[] = [];
  /** When true, throw from the constructor — simulates `new Worker(badUrl)` failing. */
  static throwOnConstruct = false;

  constructor() {
    if (FakeWorker.throwOnConstruct) throw new Error("worker construct failed");
    FakeWorker.instances.push(this);
  }
  addEventListener(_type: "message", fn: Listener) {
    this.listeners.push(fn);
  }
  removeEventListener(_type: "message", fn: Listener) {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }
  postMessage(msg: unknown) {
    this.postedMessages.push(msg);
  }
  /** Test-side helper: deliver a message to every registered listener. */
  emit(data: unknown) {
    for (const fn of [...this.listeners]) fn({ data });
  }
}

beforeEach(() => {
  FakeWorker.instances.length = 0;
  FakeWorker.throwOnConstruct = false;
  vi.stubGlobal("Worker", FakeWorker as unknown as typeof Worker);
  __test__reset();
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("denoiserClient.denoise — happy path", () => {
  it("constructs the worker on first call and reuses it on subsequent calls", async () => {
    const audio = new Float32Array(48).fill(0.1);

    const p1 = denoise(audio, 48_000);
    // The worker is created synchronously inside ensureWorker; emit ready
    // immediately, then the denoised reply.
    await Promise.resolve();
    expect(FakeWorker.instances.length).toBe(1);
    const w = FakeWorker.instances[0];
    w.emit({ type: "ready" });
    await Promise.resolve();
    const cleaned = new Float32Array(48).fill(0.05);
    w.emit({ type: "denoised", audio: cleaned, sampleRate: 48_000 });
    const out1 = await p1;
    expect(out1).toBe(cleaned);

    // Second call — same worker, no new construction.
    const p2 = denoise(audio, 48_000);
    await Promise.resolve();
    expect(FakeWorker.instances.length).toBe(1);
    w.emit({ type: "denoised", audio: cleaned, sampleRate: 48_000 });
    await p2;
  });

  it("posts an init message with the manifest-derived URL", async () => {
    const p = denoise(new Float32Array(48), 48_000);
    await Promise.resolve();
    const w = FakeWorker.instances[0];
    const init = w.postedMessages[0] as { type: string; modelUrl: string };
    expect(init.type).toBe("init");
    // baseUrl shape — versioned models path + filename. The exact release
    // is irrelevant; we just want to confirm the URL is wired through.
    expect(init.modelUrl).toMatch(/^\/models\/[^/]+\/denoiser\/denoiser_model\.onnx$/);
    // Drain the promise: ready unblocks ensureWorker → denoise() attaches
    // its own listener on the next microtask, THEN we can deliver denoised.
    w.emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    w.emit({ type: "denoised", audio: new Float32Array(48), sampleRate: 48_000 });
    await p;
  });

  it("forwards the input audio and sample rate to the worker", async () => {
    const audio = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const p = denoise(audio, 24_000);
    await Promise.resolve();
    const w = FakeWorker.instances[0];
    w.emit({ type: "ready" });
    await Promise.resolve();
    const denoiseMsg = w.postedMessages[1] as {
      type: string;
      audio: Float32Array;
      sampleRate: number;
    };
    expect(denoiseMsg.type).toBe("denoise");
    expect(denoiseMsg.audio).toBe(audio);
    expect(denoiseMsg.sampleRate).toBe(24_000);
    w.emit({ type: "denoised", audio: new Float32Array(4), sampleRate: 24_000 });
    await p;
  });
});

describe("denoiserClient.denoise — best-effort failure modes", () => {
  it("returns the input unchanged when worker construction throws", async () => {
    FakeWorker.throwOnConstruct = true;
    const audio = new Float32Array([0.1, 0.2, 0.3]);
    const out = await denoise(audio, 48_000);
    expect(out).toBe(audio);
    expect(FakeWorker.instances.length).toBe(0);
  });

  it("returns the input unchanged when worker init emits 'error'", async () => {
    const audio = new Float32Array([0.1, 0.2, 0.3]);
    const p = denoise(audio, 48_000);
    await Promise.resolve();
    const w = FakeWorker.instances[0];
    w.emit({ type: "error", message: "init failed" });
    const out = await p;
    expect(out).toBe(audio);
  });

  it("retries worker construction after a failed init", async () => {
    // First denoise call: init fails. Second call: should attempt a new
    // worker rather than caching the bad one forever.
    const audio = new Float32Array([0.1]);
    const p1 = denoise(audio, 48_000);
    await Promise.resolve();
    FakeWorker.instances[0].emit({ type: "error", message: "boom" });
    expect(await p1).toBe(audio); // best-effort: passes through

    const p2 = denoise(audio, 48_000);
    await Promise.resolve();
    expect(FakeWorker.instances.length).toBe(2);
    // Drain
    FakeWorker.instances[1].emit({ type: "ready" });
    await Promise.resolve();
    await Promise.resolve();
    FakeWorker.instances[1].emit({
      type: "denoised",
      audio: new Float32Array(1),
      sampleRate: 48_000,
    });
    await p2;
  });

  it("returns the input unchanged when worker emits 'error' during run", async () => {
    const audio = new Float32Array([0.1, 0.2, 0.3]);
    const p = denoise(audio, 48_000);
    await Promise.resolve();
    const w = FakeWorker.instances[0];
    w.emit({ type: "ready" });
    await Promise.resolve();
    w.emit({ type: "error", message: "run failed" });
    const out = await p;
    expect(out).toBe(audio);
  });
});
