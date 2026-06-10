// Mark as module so top-level consts don't leak into global scope and collide
// with identical names in other worker test files.
export {};

/**
 * Tests for sttWorker.ts message protocol.
 *
 * Strategy: mock onnxruntime-web and fetch, import the worker module
 * (which installs self.onmessage), then exercise the message protocol.
 */

const getHandler = () =>
  (globalThis as unknown as { onmessage: (e: MessageEvent) => Promise<void> }).onmessage;

// --- Mock onnxruntime-web ---
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

/** Token constants from sttWorker.ts */
const TOKEN_EOT = 50257;

function setupFetchMocks() {
  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("tokenizer.json")) {
      return {
        ok: true,
        json: async () => ({
          model: {
            vocab: { hello: 100, world: 101 },
          },
          added_tokens: [
            { id: TOKEN_EOT, content: "<|endoftext|>", special: true },
            { id: 50258, content: "<|startoftranscript|>", special: true },
            { id: 50259, content: "<|en|>", special: true },
            { id: 50359, content: "<|transcribe|>", special: true },
            { id: 50363, content: "<|notimestamps|>", special: true },
          ],
        }),
      };
    }
    // Model binary data
    return {
      ok: true,
      headers: { get: () => "100" },
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              // First byte 0x08 — the worker validates the ONNX magic
              // before handing bytes to InferenceSession.create.
              value: new Uint8Array([0x08, 2, 3]),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPostMessage.mockClear();
  mockSessionCreate.mockReset();
  mockFetch.mockReset();
});

describe("sttWorker — message protocol", () => {
  it("responds with 'ready' after successful init", async () => {
    setupFetchMocks();

    mockSessionCreate.mockResolvedValue({
      run: vi.fn(),
      inputNames: ["input_features"],
      outputNames: ["last_hidden_state"],
    });

    vi.resetModules();
    await import("./sttWorker");

    const handler = getHandler();
    expect(handler).toBeDefined();

    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("responds with 'error' when init fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    vi.resetModules();
    await import("./sttWorker");

    const handler = getHandler();
    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("responds with 'transcript' on transcribe message", async () => {
    // The STT worker computes a real mel spectrogram (~241M float ops) so this
    // test needs a generous timeout even with mocked ONNX sessions.
    setupFetchMocks();

    // Build run fns that the sessions will use for both init and transcribe.
    const vocabSize = 51865;

    const encoderRun = vi.fn().mockResolvedValue({
      last_hidden_state: {
        data: new Float32Array(1500 * 768),
        dims: [1, 1500, 768],
      },
    });

    let decoderCallIdx = 0;
    const decoderRun = vi.fn().mockImplementation(async () => {
      decoderCallIdx++;

      if (decoderCallIdx === 1) {
        // First step: 4 initial tokens
        const seqLen = 4;
        const fullLogits = new Float32Array(seqLen * vocabSize);
        // Token 100 ("hello") wins at last position
        fullLogits[(seqLen - 1) * vocabSize + 100] = 100.0;

        const result: Record<string, unknown> = {
          logits: { data: fullLogits, dims: [1, seqLen, vocabSize] },
        };
        // KV cache outputs
        for (let i = 0; i < 12; i++) {
          for (const at of ["decoder", "encoder"]) {
            for (const kv of ["key", "value"]) {
              result[`present.${i}.${at}.${kv}`] = {
                data: new Float32Array(12 * 64),
                dims: [1, 12, 1, 64],
              };
            }
          }
        }
        return result;
      }

      // Second step onwards: EOT to stop
      const logitsData = new Float32Array(vocabSize);
      logitsData[TOKEN_EOT] = 100.0;
      const result: Record<string, unknown> = {
        logits: { data: logitsData, dims: [1, 1, vocabSize] },
      };
      for (let i = 0; i < 12; i++) {
        for (const at of ["decoder", "encoder"]) {
          for (const kv of ["key", "value"]) {
            result[`present.${i}.${at}.${kv}`] = {
              data: new Float32Array(12 * 64),
              dims: [1, 12, 1, 64],
            };
          }
        }
      }
      return result;
    });

    let createIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      createIdx++;
      if (createIdx === 1) {
        // Encoder session
        return {
          run: encoderRun,
          inputNames: ["input_features"],
          outputNames: ["last_hidden_state"],
        };
      }
      // Decoder session
      return {
        run: decoderRun,
        inputNames: [
          "input_ids",
          "encoder_hidden_states",
          "use_cache_branch",
        ],
        outputNames: ["logits"],
      };
    });

    vi.resetModules();
    await import("./sttWorker");

    const handler = getHandler();

    // Init first
    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);
    mockPostMessage.mockClear();

    // Now transcribe
    const audio = new Float32Array(16000); // 1 second at 16kHz
    await handler({
      data: { type: "transcribe", audio, sampleRate: 16000 },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "transcript" }),
    );
    const transcriptCall = mockPostMessage.mock.calls.find(
      (c: unknown[]) => (c[0] as { type: string }).type === "transcript",
    );
    expect(transcriptCall).toBeDefined();
    expect(typeof (transcriptCall![0] as { text: string }).text).toBe("string");
  }, 30_000);

  it("responds with 'error' when transcribe is called before init", async () => {
    vi.resetModules();
    setupFetchMocks();
    mockSessionCreate.mockResolvedValue({
      run: vi.fn(),
      inputNames: [],
      outputNames: [],
    });
    await import("./sttWorker");

    const handler = getHandler();

    await handler({
      data: {
        type: "transcribe",
        audio: new Float32Array(16000),
        sampleRate: 16000,
      },
    } as unknown as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: "Model not initialized" }),
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
    await import("./sttWorker");

    const handler = getHandler();

    await handler({ data: { type: "foobar" } } as MessageEvent);

    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("returns empty transcript when no-speech probability exceeds threshold", async () => {
    // Tokenizer mock includes <|nospeech|>=50362 so the worker reads no-speech logit.
    // Fixture: vocab tokens 100 ("hello"), 101 ("world"); special tokens at 50256+;
    // we put the no-speech token at 50361 so it's distinct from EOT/SOT/EN/etc.
    const TOKEN_NO_SPEECH = 50361;
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) {
        return {
          ok: true,
          json: async () => ({
            model: { vocab: { hello: 100, world: 101 } },
            added_tokens: [
              { id: TOKEN_EOT, content: "<|endoftext|>", special: true },
              { id: 50258, content: "<|startoftranscript|>", special: true },
              { id: 50259, content: "<|en|>", special: true },
              { id: 50359, content: "<|transcribe|>", special: true },
              { id: TOKEN_NO_SPEECH, content: "<|nospeech|>", special: true },
              { id: 50363, content: "<|notimestamps|>", special: true },
            ],
          }),
        };
      }
      return {
        ok: true,
        headers: { get: () => "100" },
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({ done: false, value: new Uint8Array([0x08, 2, 3]) })
              .mockResolvedValueOnce({ done: true }),
          }),
        },
      };
    });

    const vocabSize = 51865;

    const encoderRun = vi.fn().mockResolvedValue({
      last_hidden_state: { data: new Float32Array(1500 * 768), dims: [1, 1500, 768] },
    });

    // First decoder call: dominant logit on no_speech at SOT position (row 0).
    // The check reads softmax(logits[0])[no_speech]; setting it ~30 logits above
    // everything else gives a probability near 1.0, well above threshold 0.6.
    const decoderRun = vi.fn().mockImplementation(async () => {
      const seqLen = 4;
      const fullLogits = new Float32Array(seqLen * vocabSize);
      fullLogits[TOKEN_NO_SPEECH] = 30.0; // position 0, no-speech token
      const result: Record<string, unknown> = {
        logits: { data: fullLogits, dims: [1, seqLen, vocabSize] },
      };
      for (let i = 0; i < 12; i++) {
        for (const at of ["decoder", "encoder"]) {
          for (const kv of ["key", "value"]) {
            result[`present.${i}.${at}.${kv}`] = {
              data: new Float32Array(12 * 64),
              dims: [1, 12, 1, 64],
            };
          }
        }
      }
      return result;
    });

    let createIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      createIdx++;
      if (createIdx === 1) {
        return { run: encoderRun, inputNames: ["input_features"], outputNames: ["last_hidden_state"] };
      }
      return {
        run: decoderRun,
        inputNames: ["input_ids", "encoder_hidden_states", "use_cache_branch"],
        outputNames: ["logits"],
      };
    });

    vi.resetModules();
    await import("./sttWorker");

    const handler = getHandler();
    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);
    mockPostMessage.mockClear();

    await handler({
      data: {
        type: "transcribe",
        audio: new Float32Array(16000),
        sampleRate: 16000,
      },
    } as unknown as MessageEvent);

    // Worker should short-circuit with an empty transcript and never call decoder
    // a second time (we'd see at least one EOT-driven exit otherwise).
    expect(mockPostMessage).toHaveBeenCalledWith({ type: "transcript", text: "" });
    expect(decoderRun).toHaveBeenCalledTimes(1);
  }, 30_000);
});

describe("sttWorker — init hardening", () => {
  // Unlike the OPFS-primed TTS path, this worker downloads its model
  // bytes itself: it needs its own captive-portal protection (an HTML
  // body fed to InferenceSession.create surfaces as an opaque
  // deserialize error) and must not hold encoder+decoder buffers
  // (~300 MB combined) simultaneously on the platform whose OOM kills
  // are silent.

  function modelResponse(firstByte: number) {
    return {
      ok: true,
      headers: { get: () => "100" },
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array([firstByte, 2, 3]),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    };
  }

  it("rejects an HTML payload before creating any session (captive portal)", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) {
        return { ok: true, json: async () => ({ model: { vocab: {} }, added_tokens: [] }) };
      }
      // "<" — an HTML login page instead of model bytes.
      return modelResponse("<".charCodeAt(0));
    });
    mockSessionCreate.mockResolvedValue({ run: vi.fn(), inputNames: [], outputNames: [] });

    vi.resetModules();
    await import("./sttWorker");
    const handler = getHandler();

    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);

    expect(mockSessionCreate).not.toHaveBeenCalled();
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: expect.stringContaining("encoder"),
      }),
    );
    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready" }),
    );
  });

  it("creates the encoder session before downloading the decoder (peak-memory cap)", async () => {
    const order: string[] = [];
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("tokenizer.json")) {
        return { ok: true, json: async () => ({ model: { vocab: {} }, added_tokens: [] }) };
      }
      order.push(url.includes("encoder") ? "dl:encoder" : "dl:decoder");
      return modelResponse(0x08);
    });
    mockSessionCreate.mockImplementation(async () => {
      order.push("create");
      return { run: vi.fn(), inputNames: [], outputNames: [] };
    });

    vi.resetModules();
    await import("./sttWorker");
    const handler = getHandler();

    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);

    const firstCreate = order.indexOf("create");
    const decoderDl = order.indexOf("dl:decoder");
    expect(firstCreate).toBeGreaterThanOrEqual(0);
    expect(decoderDl).toBeGreaterThanOrEqual(0);
    // Sequential contract: hand the encoder's ~66 MB buffer to ORT (and
    // let it become collectable) before the decoder's ~233 MB lands.
    expect(firstCreate).toBeLessThan(decoderDl);
  });
});

describe("sttWorker — warmup", () => {
  it("emits {type:'warm'} after warmup", async () => {
    setupFetchMocks();

    const vocabSize = 51865;

    // Encoder runs once; output shape just needs to be plausible.
    const encoderRun = vi.fn().mockResolvedValue({
      last_hidden_state: {
        data: new Float32Array(1500 * 768),
        dims: [1, 1500, 768],
      },
    });

    // First (and only) decoder step: emit EOT immediately so warmup completes
    // quickly without iterating the autoregressive loop.
    const decoderRun = vi.fn().mockImplementation(async () => {
      const seqLen = 4;
      const fullLogits = new Float32Array(seqLen * vocabSize);
      // Force EOT at the last position so handleTranscribe exits after step 0.
      fullLogits[(seqLen - 1) * vocabSize + TOKEN_EOT] = 100.0;
      const result: Record<string, unknown> = {
        logits: { data: fullLogits, dims: [1, seqLen, vocabSize] },
      };
      for (let i = 0; i < 12; i++) {
        for (const at of ["decoder", "encoder"]) {
          for (const kv of ["key", "value"]) {
            result[`present.${i}.${at}.${kv}`] = {
              data: new Float32Array(12 * 64),
              dims: [1, 12, 1, 64],
            };
          }
        }
      }
      return result;
    });

    let createIdx = 0;
    mockSessionCreate.mockImplementation(async () => {
      createIdx++;
      if (createIdx === 1) {
        return {
          run: encoderRun,
          inputNames: ["input_features"],
          outputNames: ["last_hidden_state"],
        };
      }
      return {
        run: decoderRun,
        inputNames: ["input_ids", "encoder_hidden_states", "use_cache_branch"],
        outputNames: ["logits"],
      };
    });

    vi.resetModules();
    await import("./sttWorker");

    const handler = getHandler();

    // Init then warmup.
    await handler({ data: { type: "init", modelUrl: "/models/stt/" } } as MessageEvent);
    mockPostMessage.mockClear();

    await handler({ data: { type: "warmup" } } as MessageEvent);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warm" }),
    );
  }, 30_000);
});
