// Mark as module so top-level consts don't leak into global scope and collide
// with identical names in other worker test files.
export {};

/**
 * Tests for denoiserWorker.ts message protocol and DSP invariants.
 *
 * Strategy: mock onnxruntime-web (so we can capture the feeds passed
 * to session.run and synthesize plausible state outputs) and fetch
 * (so init resolves without a real ONNX file). Import the worker
 * module — its top-level side effect installs `self.onmessage`. Then
 * drive the protocol and assert on captured calls.
 */

import { vi, beforeEach, describe, expect, it } from "vitest";

const getHandler = () =>
  (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

// ─── Mock onnxruntime-web ─────────────────────────────────────────

const mockSessionRun = vi.fn();
const mockSessionRelease = vi.fn();
const mockSessionCreate = vi.fn();

/** Records every Tensor constructed inside the worker so we can inspect
 *  state-init values and frame-feed shapes. */
const constructedTensors: Array<{ type: string; data: Float32Array; dims: number[] }> = [];

vi.mock("onnxruntime-web", () => {
  const Tensor = class {
    type: string;
    data: Float32Array;
    dims: number[];
    constructor(type: string, data: Float32Array, dims: number[]) {
      this.type = type;
      this.data = data;
      this.dims = dims;
      constructedTensors.push({ type, data, dims });
    }
  };

  return {
    Tensor,
    InferenceSession: {
      create: (...args: unknown[]) => mockSessionCreate(...args),
    },
    env: { wasm: {} },
  };
});

// ─── Mock postMessage / fetch ─────────────────────────────────────

const mockPostMessage = vi.fn();
vi.stubGlobal("postMessage", mockPostMessage);
(globalThis as unknown as Record<string, unknown>).postMessage = mockPostMessage;

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── State / output naming (must match the worker's STATE_SPECS) ──

const STATE_NAMES = [
  "erb_norm_state",
  "band_unit_norm_state",
  "analysis_mem",
  "synthesis_mem",
  "rolling_erb_buf",
  "rolling_feat_spec_buf",
  "rolling_c0_buf",
  "rolling_spec_buf_x",
  "rolling_spec_buf_y",
  "enc_hidden",
  "erb_dec_hidden",
  "df_dec_hidden",
] as const;

const STATE_DIMS: Record<string, number[]> = {
  erb_norm_state: [32],
  band_unit_norm_state: [1, 96, 1],
  analysis_mem: [480],
  synthesis_mem: [480],
  rolling_erb_buf: [1, 1, 3, 32],
  rolling_feat_spec_buf: [1, 2, 3, 96],
  rolling_c0_buf: [1, 64, 5, 96],
  rolling_spec_buf_x: [5, 481, 2],
  rolling_spec_buf_y: [7, 481, 2],
  enc_hidden: [1, 1, 256],
  erb_dec_hidden: [2, 1, 256],
  df_dec_hidden: [2, 1, 256],
};

/** Build a stubbed `session.run` that returns a constant-non-zero
 *  enhanced frame and pass-through state tensors. */
function makeRunStub() {
  return vi.fn(async (feeds: Record<string, { data: Float32Array; dims: number[] }>) => {
    const out: Record<string, unknown> = {
      // Mark the output so the test can distinguish denoised from input.
      enhanced_audio_frame: { data: new Float32Array(480).fill(0.5), dims: [480] },
    };
    for (const name of STATE_NAMES) {
      const size = STATE_DIMS[name].reduce((a, b) => a * b, 1);
      // Copy the input state through (so we can verify rotation).
      out[`new_${name}`] = {
        data: feeds[name]?.data ?? new Float32Array(size),
        dims: STATE_DIMS[name],
      };
    }
    return out;
  });
}

/** Mock fetch that streams a tiny "model" payload. */
function setupFetchOk() {
  mockFetch.mockImplementation(async () => ({
    ok: true,
    headers: { get: () => "8" },
    body: {
      getReader: () => ({
        read: vi
          .fn()
          .mockResolvedValueOnce({ done: false, value: new Uint8Array(8) })
          .mockResolvedValueOnce({ done: true }),
      }),
    },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPostMessage.mockClear();
  mockSessionCreate.mockReset();
  mockSessionRun.mockReset();
  mockSessionRelease.mockReset();
  mockFetch.mockReset();
  constructedTensors.length = 0;
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("denoiserWorker — init", () => {
  it("posts 'ready' after a successful init", async () => {
    setupFetchOk();
    mockSessionCreate.mockResolvedValue({
      run: makeRunStub(),
      release: mockSessionRelease,
      inputNames: ["input_frame", ...STATE_NAMES],
      outputNames: ["enhanced_audio_frame", ...STATE_NAMES.map((n) => `new_${n}`)],
    });

    vi.resetModules();
    await import("./denoiserWorker");

    await getHandler()({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("posts 'error' when the model download fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 502, statusText: "Bad Gateway" });

    vi.resetModules();
    await import("./denoiserWorker");

    await getHandler()({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("posts 'error' when denoise is called before init", async () => {
    vi.resetModules();
    await import("./denoiserWorker");

    await getHandler()({
      data: { type: "denoise", audio: new Float32Array(1000), sampleRate: 48_000 },
    } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("denoiserWorker — state init invariants", () => {
  it("primes erb_norm_state and band_unit_norm_state with non-zero values", async () => {
    setupFetchOk();
    const runStub = makeRunStub();
    mockSessionCreate.mockResolvedValue({
      run: runStub,
      release: mockSessionRelease,
      inputNames: ["input_frame", ...STATE_NAMES],
      outputNames: ["enhanced_audio_frame", ...STATE_NAMES.map((n) => `new_${n}`)],
    });

    vi.resetModules();
    await import("./denoiserWorker");

    const handler = getHandler();
    await handler({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    // 480-sample input @ 48 kHz = 10 ms → one frame plus 3 lookahead drain frames.
    await handler({
      data: { type: "denoise", audio: new Float32Array(480), sampleRate: 48_000 },
    } as MessageEvent);

    // First call's feeds carry the seed state. The model.run mock receives
    // the feeds dictionary; assert the divide-by-sqrt(0) trap tensors are
    // non-zero.
    const firstCallFeeds = runStub.mock.calls[0][0] as Record<
      string,
      { data: Float32Array }
    >;
    const erb = firstCallFeeds.erb_norm_state.data;
    expect(erb.length).toBe(32);
    // Endpoints from the linspace(-60, -90) recipe.
    expect(erb[0]).toBeCloseTo(-60, 5);
    expect(erb[31]).toBeCloseTo(-90, 5);

    const band = firstCallFeeds.band_unit_norm_state.data;
    expect(band.length).toBe(96);
    expect(band[0]).toBeCloseTo(0.001, 6);
    expect(band[95]).toBeCloseTo(0.0001, 6);
    // No zero anywhere — that would re-introduce the NaN trap.
    for (const v of band) expect(v).toBeGreaterThan(0);
  });
});

describe("denoiserWorker — frame loop + lookahead trim", () => {
  it("returns audio with the same length as the input (lookahead trimmed)", async () => {
    setupFetchOk();
    mockSessionCreate.mockResolvedValue({
      run: makeRunStub(),
      release: mockSessionRelease,
      inputNames: ["input_frame", ...STATE_NAMES],
      outputNames: ["enhanced_audio_frame", ...STATE_NAMES.map((n) => `new_${n}`)],
    });

    vi.resetModules();
    await import("./denoiserWorker");

    const handler = getHandler();
    await handler({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    const inLength = 24_000; // 0.5 s @ 48 kHz
    await handler({
      data: { type: "denoise", audio: new Float32Array(inLength), sampleRate: 48_000 },
    } as MessageEvent);

    const denoisedCall = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type: string }).type === "denoised",
    );
    expect(denoisedCall).toBeDefined();
    const { audio, sampleRate } = denoisedCall![0] as {
      audio: Float32Array;
      sampleRate: number;
    };
    expect(audio).toBeInstanceOf(Float32Array);
    expect(audio.length).toBe(inLength);
    expect(sampleRate).toBe(48_000);
  });

  it("runs (inputFrames + 3 lookahead) session.run calls per denoise", async () => {
    setupFetchOk();
    const runStub = makeRunStub();
    mockSessionCreate.mockResolvedValue({
      run: runStub,
      release: mockSessionRelease,
      inputNames: ["input_frame", ...STATE_NAMES],
      outputNames: ["enhanced_audio_frame", ...STATE_NAMES.map((n) => `new_${n}`)],
    });

    vi.resetModules();
    await import("./denoiserWorker");

    const handler = getHandler();
    await handler({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    // 1440 samples = 3 frames; with 3 lookahead drain, expect 6 run() calls.
    await handler({
      data: { type: "denoise", audio: new Float32Array(1440), sampleRate: 48_000 },
    } as MessageEvent);

    expect(runStub).toHaveBeenCalledTimes(6);
  });

  it("rotates new_<name> outputs back into <name> inputs on subsequent frames", async () => {
    setupFetchOk();
    // Each call advances erb_norm_state[0] by 1 so we can verify the
    // worker plumbs new_* → next-frame * correctly.
    let counter = 0;
    const runStub = vi.fn(async (feeds: Record<string, { data: Float32Array; dims: number[] }>) => {
      const out: Record<string, unknown> = {
        enhanced_audio_frame: { data: new Float32Array(480), dims: [480] },
      };
      for (const name of STATE_NAMES) {
        const size = STATE_DIMS[name].reduce((a, b) => a * b, 1);
        const data = new Float32Array(size);
        if (name === "erb_norm_state") {
          counter++;
          data[0] = counter;
        } else {
          data.set(feeds[name]?.data ?? new Float32Array(size));
        }
        out[`new_${name}`] = { data, dims: STATE_DIMS[name] };
      }
      return out;
    });
    mockSessionCreate.mockResolvedValue({
      run: runStub,
      release: mockSessionRelease,
      inputNames: ["input_frame", ...STATE_NAMES],
      outputNames: ["enhanced_audio_frame", ...STATE_NAMES.map((n) => `new_${n}`)],
    });

    vi.resetModules();
    await import("./denoiserWorker");

    const handler = getHandler();
    await handler({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);

    await handler({
      data: { type: "denoise", audio: new Float32Array(1440), sampleRate: 48_000 },
    } as MessageEvent);

    // Call N's feeds.erb_norm_state.data[0] should equal N (from call N-1's
    // counter increment). First call's seed value is -60; second call should
    // see 1, third 2, etc.
    const calls = runStub.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(
      (calls[1][0] as Record<string, { data: Float32Array }>).erb_norm_state.data[0],
    ).toBe(1);
    expect(
      (calls[2][0] as Record<string, { data: Float32Array }>).erb_norm_state.data[0],
    ).toBe(2);
  });
});

describe("denoiserWorker — shutdown", () => {
  it("releases the session and closes self", async () => {
    setupFetchOk();
    mockSessionCreate.mockResolvedValue({
      run: makeRunStub(),
      release: mockSessionRelease,
      inputNames: [],
      outputNames: [],
    });
    const mockClose = vi.fn();
    vi.stubGlobal("close", mockClose);
    (globalThis as unknown as Record<string, unknown>).close = mockClose;

    vi.resetModules();
    await import("./denoiserWorker");

    const handler = getHandler();
    await handler({
      data: { type: "init", modelUrl: "/models/denoiser/denoiser_model.onnx" },
    } as MessageEvent);
    await handler({ data: { type: "shutdown" } } as MessageEvent);

    expect(mockSessionRelease).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
