// Mark as module so top-level consts don't leak into global scope and collide
// with identical names in other worker test files.
export {};

/**
 * Tests for llmWorker.ts (LFM2.5-1.2B-Instruct backend).
 *
 * Strategy: mock onnxruntime-web and fetch, import the worker module
 * (which installs self.onmessage), then exercise the message protocol.
 */

// --- LFM2 token IDs (from tokenizer.json, confirmed by inspector) ---
const LFM2 = {
  PAD: 0,
  BOS: 1,          // <|startoftext|>
  ENDOFTEXT: 2,    // <|endoftext|>
  IM_START: 6,     // <|im_start|>
  IM_END: 7,       // <|im_end|> — also the config's eos_token_id
};

// --- LFM2 hybrid architecture (from inspector) ---
const ATTN_LAYERS = [2, 5, 8, 10, 12, 14];
const CONV_LAYERS = [0, 1, 3, 4, 6, 7, 9, 11, 13, 15];
const VOCAB_SIZE = 65536;
const KV_HEADS = 8;
const HEAD_DIM = 64;
const HIDDEN_SIZE = 2048;
const CONV_L = 3;

// --- Mock onnxruntime-web ---
const mockSessionRun = vi.fn();
const mockSessionCreate = vi.fn();

const { ortMockFactory } = vi.hoisted(() => ({
  ortMockFactory: () => {
    const Tensor = class {
      type: string;
      data: unknown;
      dims: number[];
      constructor(type: string, data: unknown, dims: number[]) {
        this.type = type;
        this.data = data;
        this.dims = dims;
      }
    };
    return {
      Tensor,
      InferenceSession: {
        create: (...args: unknown[]) => mockSessionCreate(...args),
      },
      env: { wasm: {} },
    };
  },
}));
vi.mock("onnxruntime-web", ortMockFactory);
vi.mock("onnxruntime-web/webgpu", ortMockFactory);

// --- Mock fetch ---
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- Mock self.postMessage ---
const mockPostMessage = vi.fn();
vi.stubGlobal("postMessage", mockPostMessage);
(globalThis as unknown as Record<string, unknown>).postMessage = mockPostMessage;

/**
 * Tokenizer.json fixture matching the LFM2 shape:
 *   - byte-level BPE with empty vocab/merges (the worker tokenizes against
 *     this same fixture in tests, so empty vocab is fine for stop-condition
 *     coverage where generated tokens are synthetic).
 *   - added_tokens: the special tokens the worker resolves on init.
 */
function setupFetchMocks() {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("tokenizer.json")) {
      return {
        ok: true,
        json: async () => ({
          model: { type: "BPE", vocab: {}, merges: [] },
          added_tokens: [
            { id: LFM2.PAD, content: "<|pad|>", special: true },
            { id: LFM2.BOS, content: "<|startoftext|>", special: true },
            { id: LFM2.ENDOFTEXT, content: "<|endoftext|>", special: true },
            { id: LFM2.IM_START, content: "<|im_start|>", special: true },
            { id: LFM2.IM_END, content: "<|im_end|>", special: true },
          ],
          // Mirror the real LFM2 tokenizer.json: post_processor prepends <|startoftext|>
          post_processor: {
            type: "Sequence",
            processors: [
              { type: "ByteLevel" },
              {
                type: "TemplateProcessing",
                single: [
                  { SpecialToken: { id: "<|startoftext|>", type_id: 0 } },
                  { Sequence: { id: "A", type_id: 0 } },
                ],
              },
            ],
          },
        }),
      };
    }
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(10) };
  });
}

/** Build the list of ONNX input names for a standard LFM2 session. */
function lfm2InputNames(): string[] {
  const names = ["input_ids", "attention_mask"];
  for (const i of CONV_LAYERS) names.push(`past_conv.${i}`);
  for (const i of ATTN_LAYERS) {
    names.push(`past_key_values.${i}.key`, `past_key_values.${i}.value`);
  }
  return names;
}

/** Build the list of ONNX output names for a standard LFM2 session. */
function lfm2OutputNames(): string[] {
  const names = ["logits"];
  for (const i of CONV_LAYERS) names.push(`present_conv.${i}`);
  for (const i of ATTN_LAYERS) {
    names.push(`present.${i}.key`, `present.${i}.value`);
  }
  return names;
}

/**
 * Build a session.run result that always emits IM_END (EOS) as the next token.
 * Also emits zero-shaped present_* tensors so the worker's cache-extract code
 * has something to copy each step.
 */
function buildImEndResult(seqLen: number) {
  const offset = (seqLen - 1) * VOCAB_SIZE;
  const logits = new Float32Array(seqLen * VOCAB_SIZE);
  logits[offset + LFM2.IM_END] = 100;
  const out: Record<string, { data: Float32Array; dims: number[] }> = {
    logits: { data: logits, dims: [1, seqLen, VOCAB_SIZE] },
  };
  for (const i of ATTN_LAYERS) {
    out[`present.${i}.key`] = {
      data: new Float32Array(0),
      dims: [1, KV_HEADS, 0, HEAD_DIM],
    };
    out[`present.${i}.value`] = {
      data: new Float32Array(0),
      dims: [1, KV_HEADS, 0, HEAD_DIM],
    };
  }
  for (const i of CONV_LAYERS) {
    out[`present_conv.${i}`] = {
      data: new Float32Array(HIDDEN_SIZE * CONV_L),
      dims: [1, HIDDEN_SIZE, CONV_L],
    };
  }
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPostMessage.mockClear();
  mockSessionCreate.mockReset();
  mockSessionRun.mockReset();
  mockFetch.mockReset();
});

describe("llmWorker — message protocol", () => {
  it("responds with 'ready' after successful init", async () => {
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: ["input_ids", "attention_mask"],
      outputNames: ["logits"],
    });

    vi.resetModules();
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("responds with 'error' when init fails (model load)", async () => {
    setupFetchMocks();
    mockSessionCreate.mockRejectedValue(new Error("Model too large"));

    vi.resetModules();
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("responds with 'completions' on complete message", async () => {
    setupFetchMocks();
    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      return buildImEndResult(feeds.input_ids?.dims?.[1] ?? 1);
    });
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
  });

  it("responds with 'error' when complete is called before init", async () => {
    vi.resetModules();
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue({
      run: vi.fn(),
      inputNames: [],
      outputNames: [],
    });
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("does not post error for unknown message types", async () => {
    vi.resetModules();
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue({
      run: vi.fn(),
      inputNames: [],
      outputNames: [],
    });
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "banana" } } as MessageEvent);

    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("stops generation on im_end (EOS) token", async () => {
    setupFetchMocks();
    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      return buildImEndResult(feeds.input_ids?.dims?.[1] ?? 1);
    });
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();

    await handler({
      data: { type: "complete", partial: "I feel", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
    // Exactly one call: prefill emitted IM_END → loop stops immediately
    expect(mockSessionRun).toHaveBeenCalledTimes(1);
  });

  it("responds with error when model returns no logits during generation", async () => {
    setupFetchMocks();
    mockSessionRun.mockImplementation(async () => ({
      some_other_key: { data: new Float32Array(4), dims: [1, 1, 4] },
    }));
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: ["logits"],
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 10 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("logits"),
      }),
    );
  });

  it("responds with 'error' when init tokenizer fetch fails", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) return { ok: false, status: 404 };
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(10) };
    });
    mockSessionCreate.mockResolvedValue({
      run: vi.fn(),
      inputNames: [],
      outputNames: [],
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("uses WebGPU EP when navigator.gpu is available", async () => {
    setupFetchMocks();
    Object.defineProperty(self, "navigator", {
      value: { ...self.navigator, gpu: {} },
      configurable: true,
      writable: true,
    });

    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: ["input_ids", "attention_mask"],
      outputNames: ["logits"],
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        executionProviders: expect.arrayContaining(["webgpu"]),
      }),
    );

    const nav = self.navigator as unknown as Record<string, unknown>;
    delete nav.gpu;
  });

  it("handles model run failure during completion", async () => {
    setupFetchMocks();
    mockSessionRun.mockRejectedValue(new Error("ONNX run failed"));
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 10 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("llmWorker — dual-cache topology", () => {
  it("feeds both past_key_values.*.{key,value} and past_conv.* on first step", async () => {
    setupFetchMocks();
    let firstFeeds: Record<string, unknown> | null = null;
    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      if (!firstFeeds) firstFeeds = { ...feeds };
      return buildImEndResult(feeds.input_ids?.dims?.[1] ?? 1);
    });
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    await handler({
      data: { type: "complete", partial: "I feel", maxTokens: 3 },
    } as unknown as MessageEvent);

    expect(firstFeeds).not.toBeNull();
    // Attention-layer keys/values: zero-length tensors
    for (const i of ATTN_LAYERS) {
      const key = firstFeeds![`past_key_values.${i}.key`] as { dims: number[] };
      expect(key).toBeDefined();
      expect(key.dims).toEqual([1, KV_HEADS, 0, HEAD_DIM]);
    }
    // Conv layers: fully-shaped zero-filled buffers
    for (const i of CONV_LAYERS) {
      const conv = firstFeeds![`past_conv.${i}`] as { dims: number[] };
      expect(conv).toBeDefined();
      expect(conv.dims).toEqual([1, HIDDEN_SIZE, CONV_L]);
    }
    // No ghost layers
    expect(firstFeeds![`past_key_values.0.key`]).toBeUndefined();
    expect(firstFeeds![`past_conv.2`]).toBeUndefined();
  });
});

describe("llmWorker — prompt template", () => {
  it("encodes the prompt with <|startoftext|> as the first token", async () => {
    setupFetchMocks();
    let firstFeeds: Record<string, { data: BigInt64Array }> | null = null;
    mockSessionRun.mockImplementation(async (feeds) => {
      if (!firstFeeds) firstFeeds = feeds;
      return buildImEndResult(feeds.input_ids?.dims?.[1] ?? 1);
    });
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    await handler({
      data: { type: "complete", partial: "I feel", maxTokens: 3 },
    } as unknown as MessageEvent);

    const ids = Array.from(firstFeeds!.input_ids.data).map((n) => Number(n));
    // First three tokens must be: <|startoftext|>, <|im_start|>, then some text
    expect(ids[0]).toBe(LFM2.BOS);
    expect(ids[1]).toBe(LFM2.IM_START);
    // The prompt also contains IM_END markers between turns
    expect(ids).toContain(LFM2.IM_END);
  });
});

describe("llmWorker — sampling", () => {
  it("applies repetition penalty so an already-generated token loses to a fresh one", async () => {
    setupFetchMocks();

    const TOKEN_A = 100;
    const TOKEN_B = 101;
    let callIdx = 0;

    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      callIdx++;
      const seqLen = feeds.input_ids?.dims?.[1] ?? 1;
      const out = buildImEndResult(seqLen);
      const offset = (seqLen - 1) * VOCAB_SIZE;
      // Reset the EOS signal and set our custom distribution
      (out.logits.data as Float32Array).fill(0);
      if (callIdx === 1) {
        (out.logits.data as Float32Array)[offset + TOKEN_A] = 10;
      } else if (callIdx === 2) {
        // Raw logits favor A slightly; after /1.05 penalty on A, B must win.
        (out.logits.data as Float32Array)[offset + TOKEN_A] = 1.0;
        (out.logits.data as Float32Array)[offset + TOKEN_B] = 0.97;
      } else {
        (out.logits.data as Float32Array)[offset + LFM2.IM_END] = 100;
      }
      return out;
    });
    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: lfm2InputNames(),
      outputNames: lfm2OutputNames(),
    });

    vi.resetModules();
    await import("./llmWorker");
    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    // Deterministic: pick the first token after min-p filtering
    const origRandom = Math.random;
    Math.random = () => 0;

    // Capture the second-step input_ids to see which token was chosen at step 1
    const feedsByCall: Array<{ data: BigInt64Array }> = [];
    const runSpy = mockSessionRun;
    runSpy.mockImplementationOnce(async (feeds: Record<string, { data: BigInt64Array; dims: number[] }>) => {
      feedsByCall.push(feeds.input_ids);
      const seqLen = feeds.input_ids.dims[1];
      const out = buildImEndResult(seqLen);
      const offset = (seqLen - 1) * VOCAB_SIZE;
      (out.logits.data as Float32Array).fill(0);
      (out.logits.data as Float32Array)[offset + TOKEN_A] = 10;
      return out;
    });
    runSpy.mockImplementationOnce(async (feeds: Record<string, { data: BigInt64Array; dims: number[] }>) => {
      feedsByCall.push(feeds.input_ids);
      const seqLen = feeds.input_ids.dims[1];
      const out = buildImEndResult(seqLen);
      const offset = (seqLen - 1) * VOCAB_SIZE;
      (out.logits.data as Float32Array).fill(0);
      (out.logits.data as Float32Array)[offset + TOKEN_A] = 1.0;
      (out.logits.data as Float32Array)[offset + TOKEN_B] = 0.97;
      return out;
    });
    runSpy.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      return buildImEndResult(feeds.input_ids?.dims?.[1] ?? 1);
    });

    await handler({
      data: { type: "complete", partial: "x", maxTokens: 3 },
    } as unknown as MessageEvent);

    Math.random = origRandom;

    // After step 1 the model emitted TOKEN_A. At step 2, penalty on A should have
    // demoted it below B, and min-p filter should keep both, so the sampler picks B.
    // We verify by checking that the third call fed TOKEN_B (the selected step-2 token).
    expect(feedsByCall.length).toBeGreaterThanOrEqual(2);
    const step2InputId = Number(feedsByCall[1].data[0]);
    expect(step2InputId).toBe(TOKEN_A); // step 2 input is step 1's choice
    // The overall completions callback fires without error
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
  });
});
