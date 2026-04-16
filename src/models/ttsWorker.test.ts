// Mark as module so top-level consts don't leak into global scope and collide
// with identical names in other worker test files.
export {};

/**
 * Tests for ttsWorker.ts message protocol.
 *
 * Strategy: mock onnxruntime-web, mock self.postMessage, capture the
 * addEventListener("message", ...) handler, then invoke it with test data.
 */

// Capture the worker's message listener (worker uses addEventListener,
// not self.onmessage, because ONNX Runtime WASM overwrites self.onmessage).
let capturedMessageHandler: ((e: MessageEvent) => Promise<void> | void) | null = null;
const realAddEventListener = globalThis.addEventListener.bind(globalThis) as (
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
) => void;
vi.stubGlobal(
  "addEventListener",
  vi.fn((type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === "message" && typeof handler === "function") {
      capturedMessageHandler = handler as (e: MessageEvent) => Promise<void> | void;
      return;
    }
    return realAddEventListener(type, handler, options);
  }),
);
const getMessageHandler = () => {
  if (!capturedMessageHandler) throw new Error("Worker did not register a message handler");
  return capturedMessageHandler;
};

// --- Mock onnxruntime-web ---
const mockSessionRun = vi.fn();
const mockSessionRelease = vi.fn();
const mockSessionCreate = vi.fn();

vi.mock("onnxruntime-web", () => {
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
});

// --- Mock fetch ---
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- Mock self.postMessage ---
const mockPostMessage = vi.fn();
vi.stubGlobal("postMessage", mockPostMessage);
(globalThis as unknown as Record<string, unknown>).postMessage = mockPostMessage;

// Helper: wait for all pending microtasks/async handlers
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

// Helper: make a mock ONNX session
function makeMockSession(runResult: Record<string, { data: unknown; dims: number[] }> = {}) {
  return {
    run: mockSessionRun.mockResolvedValue(
      Object.fromEntries(
        Object.entries(runResult).map(([k, v]) => [
          k,
          { data: v.data, dims: v.dims },
        ]),
      ),
    ),
    release: mockSessionRelease,
    inputNames: [],
    outputNames: [],
  };
}

// Helper: mock fetch to return tokenizer json and model files
function setupFetchMocks() {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("tokenizer.json")) {
      return {
        ok: true,
        json: async () => ({
          model: { vocab: { "<s>": 1, a: 2, b: 3, c: 4 }, merges: [] },
          added_tokens: [{ content: "<s>", id: 1 }],
        }),
      };
    }
    // For ONNX model URLs, return an object with arrayBuffer()
    // (createSession fetches the .onnx file as ArrayBuffer)
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    };
  });
}

beforeEach(() => {
  // Clear the captured handler so a test that forgets to re-import the worker
  // module gets a clean "handler not registered" error instead of silently
  // invoking the previous test's stale handler.
  capturedMessageHandler = null;
  vi.clearAllMocks();
  mockPostMessage.mockClear();
  mockSessionCreate.mockReset();
  mockSessionRun.mockReset();
  mockSessionRelease.mockReset();
  mockFetch.mockReset();
});

describe("ttsWorker — message protocol", () => {
  it("responds with 'ready' after successful init", async () => {
    setupFetchMocks();

    // createSession is called 3 times during init (embed_tokens, language_model, conditional_decoder)
    mockSessionCreate.mockResolvedValue(makeMockSession());

    // Import the worker module — this installs self.onmessage
    vi.resetModules();
    const mod = await import("./ttsWorker");
    // Ensure nothing leaked
    void mod;

    // self.onmessage should now be set
    const handler = getMessageHandler();
    expect(handler).toBeDefined();

    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);

    // Should post a "ready" message
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("responds with 'error' when init fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    mockSessionCreate.mockRejectedValue(new Error("Session create failed"));

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("responds with 'embedding' on embed message", async () => {
    setupFetchMocks();

    // The embed handler loads speech_encoder, runs it, then releases
    const embeddingResult = {
      audio_features: { data: new Float32Array([1, 2]), dims: [1, 1, 2] },
      audio_tokens: {
        data: new BigInt64Array([1n, 2n]),
        dims: [1, 2],
      },
      speaker_embeddings: {
        data: new Float32Array([0.5]),
        dims: [1, 1],
      },
      speaker_features: {
        data: new Float32Array([0.3]),
        dims: [1, 1],
      },
    };

    mockSessionCreate.mockResolvedValue(makeMockSession());

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();

    // First: init
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    // Now set up the speech encoder session mock for embed
    const embedSession = {
      run: vi.fn().mockResolvedValue(embeddingResult),
      release: mockSessionRelease,
    };
    mockSessionCreate.mockResolvedValue(embedSession);

    await handler({
      data: {
        type: "embed",
        audio: new Float32Array([0.1, 0.2]),
        sampleRate: 24000,
      },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "embedding" }),
    );
    // Speech encoder session should be released
    expect(mockSessionRelease).toHaveBeenCalled();
  });

  it("responds with 'audio' on synthesize message", async () => {
    setupFetchMocks();

    // We need embed_tokens, language_model, conditional_decoder sessions
    const embedTokensRun = vi.fn().mockResolvedValue({
      inputs_embeds: {
        data: new Float32Array(4),
        dims: [1, 2, 2],
      },
    });

    // Language model: return stop token immediately
    const STOP_SPEECH_TOKEN = 6562;
    const languageModelRun = vi.fn().mockResolvedValue({
      logits: {
        data: (() => {
          // Create logits where the stop token has the highest value
          const data = new Float32Array(7000);
          data[STOP_SPEECH_TOKEN] = 100.0;
          return data;
        })(),
        dims: [1, 1, 7000],
      },
    });

    const conditionalDecoderRun = vi.fn().mockResolvedValue({
      wav: {
        data: new Float32Array([0.1, -0.1, 0.2, -0.2]),
        dims: [1, 4],
      },
    });

    let createCallIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      const idx = createCallIdx++;
      if (idx === 0) {
        // embed_tokens
        return { run: embedTokensRun, release: vi.fn() };
      }
      if (idx === 1) {
        // language_model
        return { run: languageModelRun, release: vi.fn() };
      }
      // conditional_decoder
      return { run: conditionalDecoderRun, release: vi.fn() };
    });

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();

    // Init
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    const speakerData = {
      condEmb: new Float32Array([0.5, 0.5]),
      condEmbShape: [1, 1, 2],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello", speakerData },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "audio", sampleRate: 24000 }),
      expect.anything(), // transfer
    );
  });

  it("responds with 'error' for unknown message types", async () => {
    vi.resetModules();
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue(makeMockSession());
    await import("./ttsWorker");

    const handler = getMessageHandler();

    // Unknown type — should not throw or post error (just warns)
    await handler({ data: { type: "unknown_type" } } as MessageEvent);

    // No error posted for unknown types, it just warns
    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("generates multiple speech tokens before stop in synthesis", async () => {
    setupFetchMocks();

    const STOP_SPEECH_TOKEN = 6562;

    const embedTokensRun = vi.fn().mockResolvedValue({
      inputs_embeds: {
        data: new Float32Array(4),
        dims: [1, 2, 2],
      },
    });

    // Language model: generate a few tokens (100, 200, 300) then stop token
    let lmCallCount = 0;
    const languageModelRun = vi.fn().mockImplementation(async () => {
      lmCallCount++;
      const data = new Float32Array(7000);
      if (lmCallCount === 1) {
        data[100] = 100.0; // first speech token
      } else if (lmCallCount === 2) {
        data[200] = 100.0; // second speech token
      } else if (lmCallCount === 3) {
        data[300] = 100.0; // third speech token
      } else {
        data[STOP_SPEECH_TOKEN] = 100.0; // stop
      }
      return {
        logits: { data, dims: [1, 1, 7000] },
        // Include KV cache entries for the cache-passing path
        present_key_values_0_key: { data: new Float32Array(4), dims: [1, 1, 1, 4] },
        present_key_values_0_value: { data: new Float32Array(4), dims: [1, 1, 1, 4] },
      };
    });

    const conditionalDecoderRun = vi.fn().mockResolvedValue({
      wav: {
        data: new Float32Array([0.1, -0.1, 0.2, -0.2, 0.3, -0.3]),
        dims: [1, 6],
      },
    });

    let createCallIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      const idx = createCallIdx++;
      if (idx === 0) return { run: embedTokensRun, release: vi.fn() };
      if (idx === 1) return { run: languageModelRun, release: vi.fn() };
      return { run: conditionalDecoderRun, release: vi.fn() };
    });

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();
    lmCallCount = 0;

    const speakerData = {
      condEmb: new Float32Array([0.5, 0.5]),
      condEmbShape: [1, 1, 2],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello world", speakerData },
    } as unknown as MessageEvent);

    // Should have generated audio after multiple tokens
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "audio", sampleRate: 24000 }),
      expect.anything(),
    );
    // The worker masks STOP until MIN_NEW_TOKENS=10, so STOP actually fires
    // at step 10 → total 11 LM calls.
    expect(lmCallCount).toBe(11);
    // embedTokens runs once per LM step (text prefill on step 0, single-token embed on steps 1+).
    expect(embedTokensRun).toHaveBeenCalledTimes(11);
    // Conditional decoder was called once with all speech tokens
    expect(conditionalDecoderRun).toHaveBeenCalledTimes(1);
  });

  it("responds with error when synthesize is called before init", async () => {
    vi.resetModules();
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue(makeMockSession());
    await import("./ttsWorker");

    const handler = getMessageHandler();

    // Call synthesize WITHOUT init first
    const speakerData = {
      condEmb: new Float32Array([0.5]),
      condEmbShape: [1, 1, 1],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello", speakerData },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("responds with error when embed_tokens returns no inputs_embeds", async () => {
    setupFetchMocks();

    // Set up sessions: embed_tokens fails to return inputs_embeds
    const badEmbedTokensRun = vi.fn().mockResolvedValue({
      // Missing inputs_embeds
      something_else: { data: new Float32Array(4), dims: [1, 2, 2] },
    });

    const languageModelRun = vi.fn();
    const conditionalDecoderRun = vi.fn();

    let createCallIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      const idx = createCallIdx++;
      if (idx === 0) return { run: badEmbedTokensRun, release: vi.fn() };
      if (idx === 1) return { run: languageModelRun, release: vi.fn() };
      return { run: conditionalDecoderRun, release: vi.fn() };
    });

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    const speakerData = {
      condEmb: new Float32Array([0.5, 0.5]),
      condEmbShape: [1, 1, 2],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello", speakerData },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: expect.stringContaining("embed_tokens failed") }),
    );
  });

  it("responds with error when language model returns no logits", async () => {
    setupFetchMocks();

    const embedTokensRun = vi.fn().mockResolvedValue({
      inputs_embeds: { data: new Float32Array(4), dims: [1, 2, 2] },
    });

    // Language model returns no logits
    const languageModelRun = vi.fn().mockResolvedValue({
      some_other_output: { data: new Float32Array(4), dims: [1, 1, 4] },
    });

    const conditionalDecoderRun = vi.fn();

    let createCallIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      const idx = createCallIdx++;
      if (idx === 0) return { run: embedTokensRun, release: vi.fn() };
      if (idx === 1) return { run: languageModelRun, release: vi.fn() };
      return { run: conditionalDecoderRun, release: vi.fn() };
    });

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    const speakerData = {
      condEmb: new Float32Array([0.5, 0.5]),
      condEmbShape: [1, 1, 2],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello", speakerData },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: expect.stringContaining("Language model missing logits") }),
    );
  });

  it("responds with error when conditional decoder returns no wav", async () => {
    setupFetchMocks();

    const STOP_SPEECH_TOKEN = 6562;

    const embedTokensRun = vi.fn().mockResolvedValue({
      inputs_embeds: { data: new Float32Array(4), dims: [1, 2, 2] },
    });

    const languageModelRun = vi.fn().mockResolvedValue({
      logits: {
        data: (() => {
          const data = new Float32Array(7000);
          data[STOP_SPEECH_TOKEN] = 100.0;
          return data;
        })(),
        dims: [1, 1, 7000],
      },
    });

    // Conditional decoder returns no wav
    const conditionalDecoderRun = vi.fn().mockResolvedValue({
      something_else: { data: new Float32Array(4), dims: [1, 4] },
    });

    let createCallIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      const idx = createCallIdx++;
      if (idx === 0) return { run: embedTokensRun, release: vi.fn() };
      if (idx === 1) return { run: languageModelRun, release: vi.fn() };
      return { run: conditionalDecoderRun, release: vi.fn() };
    });

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    const speakerData = {
      condEmb: new Float32Array([0.5, 0.5]),
      condEmbShape: [1, 1, 2],
      promptToken: [1],
      promptTokenShape: [1, 1],
      speakerEmbeddings: new Float32Array([0.3]),
      speakerEmbeddingsShape: [1, 1],
      speakerFeatures: new Float32Array([0.2]),
      speakerFeaturesShape: [1, 1],
    };

    await handler({
      data: { type: "synthesize", text: "Hello", speakerData },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: expect.stringContaining("Conditional decoder missing output") }),
    );
  });

  it("responds with error when embed handler fails due to missing outputs", async () => {
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue(makeMockSession());

    vi.resetModules();
    await import("./ttsWorker");

    const handler = getMessageHandler();

    // Init first
    await handler({ data: { type: "init", modelUrl: "/models/tts/" } } as MessageEvent);
    mockPostMessage.mockClear();

    // Set up speech encoder with missing outputs
    const badSession = {
      run: vi.fn().mockResolvedValue({
        // Missing required outputs
        audio_features: { data: new Float32Array([1, 2]), dims: [1, 1, 2] },
        // audio_tokens is missing
      }),
      release: mockSessionRelease,
    };
    mockSessionCreate.mockResolvedValue(badSession);

    await handler({
      data: {
        type: "embed",
        audio: new Float32Array([0.1, 0.2]),
        sampleRate: 24000,
      },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});
