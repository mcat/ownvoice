// Mark as module so top-level consts don't leak into global scope and collide
// with identical names in other worker test files.
export {};

/**
 * Tests for llmWorker.ts message protocol.
 *
 * Strategy: mock onnxruntime-web and fetch, import the worker module
 * (which installs self.onmessage), then exercise the message protocol.
 */

// --- Mock onnxruntime-web ---
const mockSessionRun = vi.fn();
const mockSessionCreate = vi.fn();

// vi.mock is hoisted — define the factory via vi.hoisted so both paths share it.
// llmWorker imports "onnxruntime-web/webgpu"; bare "onnxruntime-web" is mocked
// too so any future import works under test.
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

/** Gemma special tokens */
const TOKEN_EOS = 1;

function setupFetchMocks() {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("tokenizer.json")) {
      return {
        ok: true,
        json: async () => ({
          model: {
            type: "BPE",
            vocab: {
              "\u2581hello": 100,
              "\u2581world": 101,
              a: 10,
              b: 11,
            },
            merges: [],
          },
          added_tokens: [
            { id: 0, content: "<pad>", special: true },
            { id: 1, content: "<eos>", special: true },
            { id: 2, content: "<bos>", special: true },
            { id: 3, content: "<unk>", special: true },
            { id: 106, content: "<start_of_turn>", special: true },
            { id: 107, content: "<end_of_turn>", special: true },
          ],
        }),
      };
    }
    // For ONNX model URL: return an object with arrayBuffer()
    // (handleInit fetches model_q4.onnx as ArrayBuffer)
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    };
  });
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
    expect(handler).toBeDefined();

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

    // The handleInit catches errors and posts an error message
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("responds with 'completions' on complete message", async () => {
    setupFetchMocks();

    // The model generates tokens autoregressively. We return EOS immediately.
    const vocabSize = 256000; // Gemma vocab size
    mockSessionRun.mockImplementation(async () => {
      const logitsData = new Float32Array(vocabSize);
      // Return EOS token (1) as the highest logit
      logitsData[TOKEN_EOS] = 100.0;
      return {
        logits: {
          data: logitsData,
          dims: [1, 1, vocabSize],
        },
      };
    });

    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: ["input_ids", "attention_mask"],
      outputNames: ["logits"],
    });

    vi.resetModules();
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    // Init first
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();

    // Send complete request
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
    const completionsCall = mockPostMessage.mock.calls.find(
      (c: unknown[]) => (c[0] as { type: string }).type === "completions",
    );
    expect(completionsCall).toBeDefined();
    expect(Array.isArray((completionsCall![0] as { data: string[] }).data)).toBe(
      true,
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

    // Do NOT init; call complete directly
    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("generates multi-token completions when model produces text tokens", async () => {
    setupFetchMocks();

    const vocabSize = 256000;
    let callIdx = 0;
    mockSessionRun.mockImplementation(async () => {
      callIdx++;

      // First call is the prefill (prompt), then autoregressive steps
      const logitsData = new Float32Array(vocabSize);

      if (callIdx === 1) {
        // Prefill: return token 100 ("hello")
        // The prompt has N tokens, logits shape is [1, N, vocab_size]
        // sampleToken takes seqLen from currentIds.length
        logitsData[100] = 100.0;
        return {
          logits: { data: logitsData, dims: [1, 1, vocabSize] },
        };
      }

      if (callIdx === 2) {
        // Second step: generate newline (token 10 = "a" in our mock)
        logitsData[10] = 100.0;
        return {
          logits: { data: logitsData, dims: [1, 1, vocabSize] },
        };
      }

      // Step 3+: EOS to stop
      logitsData[TOKEN_EOS] = 100.0;
      return {
        logits: { data: logitsData, dims: [1, 1, vocabSize] },
      };
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
    mockPostMessage.mockClear();
    callIdx = 0;

    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 10 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
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

  it("uses KV cache when model has past_key_values inputs", async () => {
    setupFetchMocks();

    const vocabSize = 256000;
    let callIdx = 0;

    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      callIdx++;

      // Use the input_ids dims to determine the sequence length for proper logit sizing
      const seqLen = feeds.input_ids?.dims?.[1] ?? 1;
      const totalLogits = seqLen * vocabSize;
      const logitsData = new Float32Array(totalLogits);

      if (callIdx === 1) {
        // Prefill: return token 100 at the last position
        const offset = (seqLen - 1) * vocabSize;
        logitsData[offset + 100] = 100.0;
        return {
          logits: { data: logitsData, dims: [1, seqLen, vocabSize] },
          // Return KV cache entries
          "present.0.key": { data: new Float32Array(256), dims: [1, 4, seqLen, 64] },
          "present.0.value": { data: new Float32Array(256), dims: [1, 4, seqLen, 64] },
        };
      }

      // Subsequent calls: EOS
      logitsData[TOKEN_EOS] = 100.0;
      return {
        logits: { data: logitsData, dims: [1, 1, vocabSize] },
        "present.0.key": { data: new Float32Array(512), dims: [1, 4, 2, 64] },
        "present.0.value": { data: new Float32Array(512), dims: [1, 4, 2, 64] },
      };
    });

    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      // Include past_key_values in input names to trigger KV cache path
      inputNames: [
        "input_ids",
        "attention_mask",
        "past_key_values.0.key",
        "past_key_values.0.value",
      ],
      outputNames: ["logits", "present.0.key", "present.0.value"],
    });

    vi.resetModules();
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);
    mockPostMessage.mockClear();
    callIdx = 0;

    await handler({
      data: { type: "complete", prompt: "I need", maxTokens: 10 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
    // Model run was called at least twice (prefill + EOS)
    expect(callIdx).toBeGreaterThanOrEqual(2);
  });

  it("stops generation on end_of_turn token", async () => {
    setupFetchMocks();

    const vocabSize = 256000;
    const END_OF_TURN_ID = 107; // from our mock tokenizer added_tokens

    let callIdx = 0;
    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      callIdx++;

      const seqLen = feeds.input_ids?.dims?.[1] ?? 1;
      const totalLogits = seqLen * vocabSize;
      const logitsData = new Float32Array(totalLogits);
      const offset = (seqLen - 1) * vocabSize;

      if (callIdx === 1) {
        // Prefill: generate a text token at the last position
        logitsData[offset + 100] = 100.0;
        return { logits: { data: logitsData, dims: [1, seqLen, vocabSize] } };
      }

      // Second step: emit end_of_turn at the last position
      logitsData[offset + END_OF_TURN_ID] = 100.0;
      return { logits: { data: logitsData, dims: [1, seqLen, vocabSize] } };
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
    mockPostMessage.mockClear();
    callIdx = 0;

    await handler({
      data: { type: "complete", prompt: "I feel", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
    // Should have stopped at step 2 (end_of_turn)
    expect(callIdx).toBe(2);
  });

  it("stops generation on PAD token (0)", async () => {
    setupFetchMocks();

    const vocabSize = 256000;

    mockSessionRun.mockImplementation(async (feeds: Record<string, { dims: number[] }>) => {
      const seqLen = feeds.input_ids?.dims?.[1] ?? 1;
      const totalLogits = seqLen * vocabSize;
      const logitsData = new Float32Array(totalLogits);
      // PAD token (0) has highest logit at the last position
      // Float32Array is initialized to 0, and 0 is TOKEN_PAD,
      // so index 0 at the last position will be the default argmax
      // (all values are 0, so bestId=0=TOKEN_PAD)
      return { logits: { data: logitsData, dims: [1, seqLen, vocabSize] } };
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
    mockPostMessage.mockClear();

    await handler({
      data: { type: "complete", prompt: "test", maxTokens: 50 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "completions" }),
    );
  });

  it("responds with 'error' when init tokenizer fetch fails", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) {
        return { ok: false, status: 404 };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(10),
      };
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

  it("responds with error when model returns no logits during generation", async () => {
    setupFetchMocks();

    mockSessionRun.mockImplementation(async () => {
      // Return result without logits
      return { some_other_key: { data: new Float32Array(4), dims: [1, 1, 4] } };
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

  it("falls back to vocab lookup when chat template tokens missing from added_tokens", async () => {
    // Provide a tokenizer that has chat tokens in vocab but NOT in added_tokens
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) {
        return {
          ok: true,
          json: async () => ({
            model: {
              type: "BPE",
              vocab: {
                "<start_of_turn>": 106,
                "<end_of_turn>": 107,
                a: 10,
              },
              merges: [],
            },
            added_tokens: [
              // Notably missing <start_of_turn> and <end_of_turn>
              { id: 0, content: "<pad>", special: true },
              { id: 1, content: "<eos>", special: true },
              { id: 2, content: "<bos>", special: true },
              { id: 3, content: "<unk>", special: true },
            ],
          }),
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(10),
      };
    });

    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: ["input_ids", "attention_mask"],
      outputNames: ["logits"],
    });

    vi.resetModules();
    await import("./llmWorker");

    const handler = (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

    // Init should succeed — the tokenizer falls back to vocab lookup
    await handler({ data: { type: "init", modelUrl: "/models/llm/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("uses WebGPU EP when navigator.gpu is available", async () => {
    setupFetchMocks();

    // Temporarily add gpu to self.navigator
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

    // Verify that InferenceSession.create was called with an ArrayBuffer and webgpu as the first EP
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        executionProviders: expect.arrayContaining(["webgpu"]),
      }),
    );

    // Cleanup: remove gpu
    const nav = self.navigator as unknown as Record<string, unknown>;
    delete nav.gpu;
  });

  it("handles model run failure during completion", async () => {
    setupFetchMocks();

    mockSessionRun.mockRejectedValue(new Error("ONNX run failed"));

    mockSessionCreate.mockResolvedValue({
      run: mockSessionRun,
      inputNames: ["input_ids", "attention_mask"],
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
      expect.objectContaining({ type: "error" }),
    );
  });
});
