import {
  hasCachedAudio,
  getCachedAudio,
  putCachedAudio,
  clearAudioCache,
  countCached,
  generateAllPhrases,
  retryFailed,
  embeddingFingerprint,
  _resetCacheDirForTests,
} from "./audioCache";

// Mock the modelManager for generateAllPhrases tests
const mockWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

/** Echo helper for fake worker responses: the keyed protocol requires
 *  audio/error responses to carry the requestId of the synthesize
 *  message they answer (listener registration happens before
 *  postMessage, so read it inside the deferred dispatch). */
function lastSynthRequestId(): number | undefined {
  const sent = mockWorker.postMessage.mock.calls.at(-1)?.[0] as
    | { requestId?: number }
    | undefined;
  return sent?.requestId;
}
const mockModelManager = {
  isReady: vi.fn(() => false),
  // Explicit return type so mockReturnValue(workerLikeObject) type-checks.
  getWorker: vi.fn((): typeof mockWorker | null => null),
};
vi.mock("./modelManager", () => ({
  getModelManager: () => mockModelManager,
}));

// Mock postProcessAudio so tests can assert generateAllPhrases applies it
// on the synthesis path before caching. Identity function keeps existing
// round-trip tests unaffected (put/get goes direct, never through this).
vi.mock("../audio/dsp", () => ({
  postProcessAudio: vi.fn((audio: Float32Array) => audio),
}));

// Mock the GPU engine so gpuOnly tests can drive isGPUReady / synthesizeGPU
// directly without a real Worker. Defaults to "GPU not ready" so tests that
// pre-date the mock still see the original behaviour; the circuit-breaker
// test flips it on and controls synthesizeGPU per-call.
const isGPUReadyMock = vi.fn(() => false);
const synthesizeGPUMock = vi.fn();
vi.mock("./ttsEngine", () => ({
  isGPUReady: () => isGPUReadyMock(),
  synthesizeGPU: (...args: unknown[]) => synthesizeGPUMock(...args),
}));

// =============================================================================
// OPFS mock
// =============================================================================

/**
 * In-memory mock of the OPFS File System Access API.
 * Mimics FileSystemDirectoryHandle / FileSystemFileHandle behaviour.
 */
function createOPFSMock() {
  const store = new Map<string, ArrayBuffer>(); // path → data

  /** Mock FileSystemFileHandle */
  function makeFileHandle(
    path: string,
    opts?: { create?: boolean },
  ): { getFile: () => Promise<File>; createWritable: () => Promise<{ write: (d: unknown) => Promise<void>; close: () => Promise<void> }> } {
    if (!opts?.create && !store.has(path)) {
      throw new DOMException("Not found", "NotFoundError");
    }
    if (opts?.create && !store.has(path)) {
      store.set(path, new ArrayBuffer(0));
    }
    return {
      getFile: async () => {
        const buf = store.get(path) ?? new ArrayBuffer(0);
        return new File([buf], path.split("/").pop() ?? "");
      },
      createWritable: async () => ({
        write: async (data: unknown) => {
          if (data instanceof ArrayBuffer) {
            store.set(path, data);
          } else if (data instanceof Blob) {
            store.set(path, await data.arrayBuffer());
          } else if (ArrayBuffer.isView(data)) {
            // Handle TypedArray views (e.g. Float32Array.buffer)
            // TS's `view.buffer` is `ArrayBufferLike` (ArrayBuffer | SharedArrayBuffer);
            // tests only produce regular ArrayBuffers, so narrow explicitly.
            const view = data as ArrayBufferView;
            const copy = (view.buffer as ArrayBuffer).slice(
              view.byteOffset,
              view.byteOffset + view.byteLength,
            );
            store.set(path, copy);
          }
        },
        close: async () => {},
      }),
    };
  }

  /** Mock FileSystemDirectoryHandle */
  function makeDirHandle(
    prefix: string,
  ): {
    getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<ReturnType<typeof makeFileHandle>>;
    getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<ReturnType<typeof makeDirHandle>>;
    removeEntry: (name: string, opts?: { recursive?: boolean }) => Promise<void>;
    entries: () => AsyncIterable<[string, unknown]>;
  } {
    const dir = {
      getFileHandle: async (name: string, opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`, opts),
      getDirectoryHandle: async (
        name: string,
        _opts?: { create?: boolean },
      ) => makeDirHandle(`${prefix}/${name}`),
      removeEntry: async (_name: string, _opts?: { recursive?: boolean }) => {
        // Remove all keys starting with prefix
        for (const key of store.keys()) {
          if (key.startsWith(`${prefix}/`)) store.delete(key);
        }
      },
      /**
       * Async-iterate over immediate children. Mirrors the real OPFS
       * FileSystemDirectoryHandle.entries() — yields [name, handle]
       * tuples for every direct child. The handle is shape-compatible
       * enough for code that only reads the name.
       */
      entries: async function* () {
        const seen = new Set<string>();
        for (const key of store.keys()) {
          if (!key.startsWith(`${prefix}/`)) continue;
          const tail = key.slice(prefix.length + 1);
          // Only direct children (no nested path separators)
          const slash = tail.indexOf("/");
          const name = slash === -1 ? tail : tail.slice(0, slash);
          if (seen.has(name)) continue;
          seen.add(name);
          yield [name, null] as [string, unknown];
        }
      },
    };
    return dir;
  }

  const root = makeDirHandle("");

  return {
    root,
    store,
    install() {
      Object.defineProperty(navigator, "storage", {
        value: {
          getDirectory: vi.fn(() => Promise.resolve(root)),
          persist: vi.fn(() => Promise.resolve(true)),
        },
        configurable: true,
        writable: true,
      });
    },
    clear() {
      store.clear();
    },
  };
}

// =============================================================================
// Test setup
// =============================================================================
let opfs: ReturnType<typeof createOPFSMock>;

beforeEach(() => {
  opfs = createOPFSMock();
  opfs.install();
  // The cache module memoises navigator.storage.getDirectory + the cache
  // dir handle for the page lifetime. In tests, each beforeEach installs
  // a fresh OPFS mock, so we must drop the stale memo before any cache
  // op runs against the new mock.
  _resetCacheDirForTests();
});

afterEach(() => {
  opfs.clear();
  _resetCacheDirForTests();
  // Guard against one test's fake timers starving another's setTimeout-based
  // mocks. Real timers is the safe default between tests.
  vi.useRealTimers();
});

const EMBEDDING = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
const AUDIO = new Float32Array([0.5, -0.5, 0.3, -0.3]);

// =============================================================================
// putCachedAudio / getCachedAudio round-trip
// =============================================================================
describe("audioCache — put / get round-trip", () => {
  it("stores and retrieves audio data", async () => {
    await putCachedAudio("I need water", EMBEDDING, AUDIO);
    const result = await getCachedAudio("I need water", EMBEDDING);

    expect(result).not.toBeNull();
    expect(result!.sampleRate).toBe(24000);
    expect(result!.audio.length).toBe(AUDIO.length);
    // Int16 storage is lossy at ~3e-5 (1 / 32767). Four-decimal tolerance
    // covers that cleanly. Post-processing is NOT applied here — that's
    // the generator's job, so putCachedAudio → getCachedAudio is a pure
    // lossless-modulo-quantization round-trip.
    for (let i = 0; i < AUDIO.length; i++) {
      expect(result!.audio[i]).toBeCloseTo(AUDIO[i], 4);
    }
  });

  it("returns null for uncached phrases", async () => {
    const result = await getCachedAudio("unknown phrase", EMBEDDING);
    expect(result).toBeNull();
  });

  it("different embeddings produce different cache keys", async () => {
    const embedding2 = new Float32Array([0.9, 0.8, 0.7, 0.6, 0.5]);
    await putCachedAudio("Hello", EMBEDDING, AUDIO);

    const result = await getCachedAudio("Hello", embedding2);
    expect(result).toBeNull();
  });
});

// =============================================================================
// Int16 PCM round-trip — clamping & boundaries
// =============================================================================
describe("audioCache — int16 PCM clamping", () => {
  it("clamps out-of-range positive samples to +1.0 on read", async () => {
    // Input 2.0 is outside the normal ±1.0 range; float32ToInt16 should
    // clamp to +32767 before writing, and the round-trip result should
    // be ~+1.0 (not 2.0, and not some wrapped negative value).
    const overdriven = new Float32Array([2.0, 5.0, 100.0]);
    await putCachedAudio("overdrive-positive", EMBEDDING, overdriven);
    const result = await getCachedAudio("overdrive-positive", EMBEDDING);

    expect(result).not.toBeNull();
    for (let i = 0; i < overdriven.length; i++) {
      // Clamped to 32767, which divides back to ~1.0 on read.
      expect(result!.audio[i]).toBeCloseTo(1.0, 4);
    }
  });

  it("clamps out-of-range negative samples to -1.0 on read", async () => {
    const overdriven = new Float32Array([-2.0, -5.0, -100.0]);
    await putCachedAudio("overdrive-negative", EMBEDDING, overdriven);
    const result = await getCachedAudio("overdrive-negative", EMBEDDING);

    expect(result).not.toBeNull();
    for (let i = 0; i < overdriven.length; i++) {
      // Clamps to -32768; -32768 / 32767 ≈ -1.00003. Tolerance of 3
      // covers the half-LSB asymmetry without masking sign errors.
      expect(result!.audio[i]).toBeCloseTo(-1.0, 3);
    }
  });

  it("preserves exact boundary values at ±1.0", async () => {
    // Values right at the boundary: -1.0 maps to -32767 (not -32768,
    // because 1.0 * 32767 = 32767, and negating gives -32767). The
    // boundary-inclusive vs -exclusive comparison in the clamp
    // shouldn't change the stored bytes for in-range input.
    const edges = new Float32Array([-1.0, -0.5, 0.0, 0.5, 1.0]);
    await putCachedAudio("edges", EMBEDDING, edges);
    const result = await getCachedAudio("edges", EMBEDDING);

    expect(result).not.toBeNull();
    for (let i = 0; i < edges.length; i++) {
      expect(result!.audio[i]).toBeCloseTo(edges[i], 4);
    }
  });

  it("stores an empty audio buffer as zero bytes and rejects it on read", async () => {
    // Covers the "for (let i = 0; i < samples.length; i++)" loop bound
    // on empty input. An off-by-one to `<=` would attempt to read
    // samples[0] which is undefined; the resulting int16 would be NaN
    // or 0 depending on the branch, either way distinguishable from
    // the documented "empty file = null" behavior of getCachedAudio.
    const empty = new Float32Array(0);
    await putCachedAudio("empty", EMBEDDING, empty);
    // getCachedAudio returns null when file.size === 0.
    const result = await getCachedAudio("empty", EMBEDDING);
    expect(result).toBeNull();
  });
});

// =============================================================================
// hasCachedAudio
// =============================================================================
describe("audioCache — hasCachedAudio", () => {
  it("returns false when nothing is cached", async () => {
    expect(await hasCachedAudio("Hello", EMBEDDING)).toBe(false);
  });

  it("returns true after putting audio", async () => {
    await putCachedAudio("Hello", EMBEDDING, AUDIO);
    expect(await hasCachedAudio("Hello", EMBEDDING)).toBe(true);
  });
});

// =============================================================================
// clearAudioCache
// =============================================================================
describe("audioCache — clearAudioCache", () => {
  it("clears all cached audio", async () => {
    await putCachedAudio("Hello", EMBEDDING, AUDIO);
    await putCachedAudio("Goodbye", EMBEDDING, AUDIO);

    await clearAudioCache();

    // After clearing, nothing should be found
    expect(await hasCachedAudio("Hello", EMBEDDING)).toBe(false);
    expect(await hasCachedAudio("Goodbye", EMBEDDING)).toBe(false);
  });

  it("does not throw when cache is already empty", async () => {
    await expect(clearAudioCache()).resolves.toBeUndefined();
  });
});

// =============================================================================
// countCached
// =============================================================================
describe("audioCache — countCached", () => {
  it("returns 0 when nothing is cached", async () => {
    const count = await countCached(["Hello", "Goodbye"], EMBEDDING);
    expect(count).toBe(0);
  });

  it("returns correct count after caching some phrases", async () => {
    await putCachedAudio("Hello", EMBEDDING, AUDIO);
    await putCachedAudio("Goodbye", EMBEDDING, AUDIO);

    const count = await countCached(
      ["Hello", "Goodbye", "Not cached"],
      EMBEDDING,
    );
    expect(count).toBe(2);
  });

  it("returns 0 when the embedding is too short to fingerprint", async () => {
    // Guards the `if (fp === "none") return 0` early-exit. Without this
    // test, a mutation that always falls through would pass — countCached
    // would then try to hashKey() against an un-fingerprinted embedding
    // and return nonsense.
    const shortEmbedding = new Float32Array([0.1, 0.2]);
    await putCachedAudio("Hello", shortEmbedding, AUDIO); // stores nothing
    const count = await countCached(["Hello"], shortEmbedding);
    expect(count).toBe(0);
  });

  it("ignores non-.raw entries in the cache directory", async () => {
    // listCachedKeys filters by filename extension so we don't count
    // stray files (e.g., a future "index.json" manifest). Without a
    // non-.raw entry in the dir, the .endsWith(".raw") → true mutation
    // survives because there's nothing non-matching for it to wrongly
    // include.
    await putCachedAudio("Hello", EMBEDDING, AUDIO);

    // Manually poke a non-raw file into the mock OPFS store via the same
    // backing map the handles use. The CACHE_DIR lives at "/audio-cache-v2".
    opfs.store.set("/audio-cache-v2/readme.txt", new ArrayBuffer(10));
    opfs.store.set("/audio-cache-v2/something.json", new ArrayBuffer(10));

    const count = await countCached(["Hello", "Not cached"], EMBEDDING);
    expect(count).toBe(1); // Only "Hello", NOT the txt/json
  });
});

// =============================================================================
// generateAllPhrases
// =============================================================================
describe("audioCache — generateAllPhrases", () => {
  beforeEach(() => {
    mockModelManager.isReady.mockReturnValue(false);
    mockModelManager.getWorker.mockReturnValue(null);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
    mockWorker.removeEventListener.mockClear();
  });

  it("returns immediately when TTS model is not ready", async () => {
    mockModelManager.isReady.mockReturnValue(false);
    mockModelManager.getWorker.mockReturnValue(null);

    const gen = generateAllPhrases(["Hello", "Goodbye"], EMBEDDING);
    const results: unknown[] = [];
    for await (const item of gen) {
      results.push(item);
    }
    expect(results).toHaveLength(0);
  });

  it("returns immediately when TTS worker is null", async () => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(null);

    const gen = generateAllPhrases(["Hello"], EMBEDDING);
    const results: unknown[] = [];
    for await (const item of gen) {
      results.push(item);
    }
    expect(results).toHaveLength(0);
  });

  it("skips already-cached phrases and yields progress", async () => {
    // Pre-cache "Hello"
    await putCachedAudio("Hello", EMBEDDING, AUDIO);

    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);

    // For "Goodbye", simulate the worker responding with audio
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "audio", data: new Float32Array([0.1, -0.1]), requestId: lastSynthRequestId() },
          } as unknown as MessageEvent);
        }, 5);
      },
    );

    const gen = generateAllPhrases(["Hello", "Goodbye"], EMBEDDING);
    const results: Array<{ phrase: string; current: number; total: number }> = [];
    for await (const item of gen) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    // First yield: "Hello" was skipped (cached), so still yields progress
    expect(results[0]).toEqual({ phrase: "Hello", current: 1, total: 2 });
    // Second yield: "Goodbye" was generated via worker
    expect(results[1]).toEqual({ phrase: "Goodbye", current: 2, total: 2 });
  });

  it("keys each synthesize request and ignores unrelated unkeyed errors", async () => {
    // The WASM worker is shared (pre-gen + embed + warmup). Before the
    // protocol was keyed, ANY error broadcast — e.g. a warmup failure —
    // rejected whatever synth happened to be in flight and burned a retry.
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);

    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          // Unrelated, unsolicited failure first (no requestId)…
          handler({
            data: { type: "error", message: "warmup exploded" },
          } as unknown as MessageEvent);
          // …then the keyed audio for the actual request.
          const sent = mockWorker.postMessage.mock.calls.at(-1)?.[0] as
            | { requestId?: number }
            | undefined;
          handler({
            data: {
              type: "audio",
              data: new Float32Array([0.1, -0.1]),
              requestId: sent?.requestId,
            },
          } as unknown as MessageEvent);
        }, 5);
      },
    );

    const gen = generateAllPhrases(["Hello"], EMBEDDING);
    const results: unknown[] = [];
    for await (const item of gen) results.push(item);

    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "synthesize", requestId: expect.any(Number) }),
    );
    // One attempt suffices: the unkeyed error must NOT consume a retry.
    expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
  });

  it("applies postProcessAudio before caching synthesized audio", async () => {
    // Stryker's default mutator set doesn't delete function calls, so a
    // silent "oops, we forgot to post-process" regression wouldn't get
    // surfaced by mutation testing. This test is the backstop: the
    // generator must route synthesized audio through postProcessAudio
    // (once, with the right sample rate) before handing it to the cache.
    const { postProcessAudio } = await import("../audio/dsp");
    const mockedPP = vi.mocked(postProcessAudio);
    mockedPP.mockClear();

    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    const synthAudio = new Float32Array([0.25, -0.25]);
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "audio", data: synthAudio, requestId: lastSynthRequestId() },
          } as unknown as MessageEvent);
        }, 1);
      },
    );

    const gen = generateAllPhrases(["Fresh"], EMBEDDING);
    for await (const _ of gen) { /* drain */ void _; }

    expect(mockedPP).toHaveBeenCalledTimes(1);
    expect(mockedPP).toHaveBeenCalledWith(
      expect.any(Float32Array),
      24000, // SAMPLE_RATE
    );
    // The Float32Array passed in must be the synthesis output, not
    // something else (e.g., the phrase text accidentally re-routed).
    const passedAudio = mockedPP.mock.calls[0][0];
    expect(passedAudio.length).toBe(synthAudio.length);
    expect(passedAudio[0]).toBeCloseTo(synthAudio[0], 6);
  });

  it("continues generating even if one phrase fails", async () => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);

    // Retries hit synthesizeOne up to 3 times per phrase — key by text
    // so "Fail phrase" fails on every attempt and "Success phrase"
    // succeeds. addEventListener runs BEFORE postMessage, so capture
    // pendingText inside the setTimeout callback (after postMessage sets it).
    let pendingText = "";
    mockWorker.postMessage.mockImplementation(
      (msg: { text: string }) => {
        pendingText = msg.text;
      },
    );
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          if (pendingText === "Fail phrase") {
            handler({
              data: { type: "error", message: "synthesis failed", requestId: lastSynthRequestId() },
            } as unknown as MessageEvent);
          } else {
            handler({
              data: { type: "audio", data: new Float32Array([0.2]), requestId: lastSynthRequestId() },
            } as unknown as MessageEvent);
          }
        }, 1);
      },
    );

    const gen = generateAllPhrases(["Fail phrase", "Success phrase"], EMBEDDING);
    const results: Array<{ phrase: string; current: number; total: number; failed?: boolean }> = [];
    for await (const item of gen) results.push(item);

    expect(results).toHaveLength(2);
    expect(results[0].phrase).toBe("Fail phrase");
    expect(results[0].failed).toBe(true);
    expect(results[1].phrase).toBe("Success phrase");
    expect(results[1].failed).toBeUndefined();
  });

  it("handles TTS timeout for a phrase", async () => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);

    vi.useFakeTimers();

    mockWorker.addEventListener.mockImplementation(() => {
      // Never calls handler — simulates a stuck worker
    });

    const gen = generateAllPhrases(["Timeout phrase"], EMBEDDING);
    const resultsPromise = (async () => {
      const results: unknown[] = [];
      for await (const item of gen) results.push(item);
      return results;
    })();

    try {
      // 3 retry attempts × 180s timeout each. advanceTimersByTimeAsync
      // drains microtasks between expiries, so one long advance fires
      // every scheduled timer in order.
      await vi.advanceTimersByTimeAsync(555_000);
      const results = await resultsPromise;
      expect(results).toHaveLength(1);
      expect((results[0] as { failed?: boolean }).failed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

// =============================================================================
// Embedding fingerprint edge case
// =============================================================================
describe("audioCache — embedding fingerprint", () => {
  it("refuses to cache when the embedding is too short to fingerprint", async () => {
    const shortEmbedding = new Float32Array([0.1, 0.2]); // < 4 elements
    await putCachedAudio("test phrase", shortEmbedding, AUDIO);
    // With no real fingerprint we don't write anything — so no read hit either.
    expect(await hasCachedAudio("test phrase", shortEmbedding)).toBe(false);
  });

  it("exports embeddingFingerprint returning a stable string per embedding", () => {
    const a = new Float32Array([0.11, 0.22, 0.33, 0.44, 0.55]);
    const b = new Float32Array([0.11, 0.22, 0.33, 0.44, 0.55]);
    const c = new Float32Array([0.99, 0.88, 0.77, 0.66, 0.55]);
    expect(embeddingFingerprint(a)).toBe(embeddingFingerprint(b));
    expect(embeddingFingerprint(a)).not.toBe(embeddingFingerprint(c));
  });
});

// =============================================================================
// generateAllPhrases — retries up to 3 times
// =============================================================================
describe("audioCache — generateAllPhrases retries", () => {
  beforeEach(() => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
    mockWorker.removeEventListener.mockClear();
  });

  it("retries up to 3 times and succeeds on the third attempt", async () => {
    let attempts = 0;
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        attempts++;
        setTimeout(() => {
          if (attempts < 3) {
            handler({ data: { type: "error", message: "flake", requestId: lastSynthRequestId() } } as unknown as MessageEvent);
          } else {
            handler({ data: { type: "audio", data: new Float32Array([0.1]), requestId: lastSynthRequestId() } } as unknown as MessageEvent);
          }
        }, 1);
      },
    );

    const gen = generateAllPhrases(["Retry me"], EMBEDDING);
    const results: Array<{ failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    expect(attempts).toBe(3);
    expect(results).toHaveLength(1);
    expect(results[0].failed).toBeUndefined();
  });

  it("marks failed after 3 unsuccessful attempts", async () => {
    let attempts = 0;
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        attempts++;
        setTimeout(() => {
          handler({ data: { type: "error", message: "nope", requestId: lastSynthRequestId() } } as unknown as MessageEvent);
        }, 1);
      },
    );

    const gen = generateAllPhrases(["Always fails"], EMBEDDING);
    const results: Array<{ failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    expect(attempts).toBe(3);
    expect(results).toHaveLength(1);
    expect(results[0].failed).toBe(true);
  });
});

// =============================================================================
// generateAllPhrases — failed flag
// =============================================================================
describe("audioCache — generateAllPhrases failed flag", () => {
  beforeEach(() => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
    mockWorker.removeEventListener.mockClear();
  });

  it("marks failed phrases with failed: true on yielded progress", async () => {
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "error", message: "bad", requestId: lastSynthRequestId() },
          } as unknown as MessageEvent);
        }, 5);
      },
    );

    const gen = generateAllPhrases(["Boom"], EMBEDDING);
    const results: Array<{ phrase: string; failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    expect(results).toHaveLength(1);
    expect(results[0].failed).toBe(true);
  });

  it("omits failed flag on successful yields", async () => {
    await putCachedAudio("Cached", EMBEDDING, AUDIO);
    const gen = generateAllPhrases(["Cached"], EMBEDDING);
    const results: Array<{ phrase: string; failed?: boolean }> = [];
    for await (const r of gen) results.push(r);
    expect(results).toHaveLength(1);
    expect(results[0].failed).toBeUndefined();
  });
});

// =============================================================================
// generateAllPhrases — AbortSignal
// =============================================================================
describe("audioCache — generateAllPhrases abort", () => {
  beforeEach(() => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
  });

  it("stops before the first phrase when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const gen = generateAllPhrases(["A", "B", "C"], EMBEDDING, controller.signal);
    const results: unknown[] = [];
    for await (const r of gen) results.push(r);

    expect(results).toHaveLength(0);
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  it("unblocks an in-flight synthesis call when aborted mid-run", async () => {
    const controller = new AbortController();

    // Worker never resolves — only abort can end the promise
    mockWorker.addEventListener.mockImplementation(() => {});

    const gen = generateAllPhrases(["Slow phrase"], EMBEDDING, controller.signal);
    const promise = (async () => {
      const out: unknown[] = [];
      for await (const r of gen) out.push(r);
      return out;
    })();

    // Abort after the worker call has started
    setTimeout(() => controller.abort(), 10);

    const results = await promise;
    expect(results).toHaveLength(0); // no progress yielded — run exits cleanly
  });
});

// =============================================================================
// generateAllPhrases — GPU-only gating
// =============================================================================
describe("audioCache — generateAllPhrases gpuOnly", () => {
  beforeEach(() => {
    // WASM worker IS ready — proves the gpuOnly gate ignores it, rather
    // than accidentally succeeding because no synth path exists at all.
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
    // Reset the GPU-engine mocks each test rather than at the end of each
    // test body — a failing assertion in-body would otherwise leak a
    // `true`-returning isGPUReady into tests that assume the default.
    isGPUReadyMock.mockReturnValue(false);
    synthesizeGPUMock.mockReset();
  });

  it("yields nothing and never calls the WASM worker when GPU is not ready", async () => {
    // isGPUReady() returns false by default via the ttsEngine mock. This
    // is the WASM-only desktop scenario: gpuOnly must short-circuit
    // rather than silently take the ~3-6 hour WASM path.
    const gen = generateAllPhrases(["A", "B"], EMBEDDING, undefined, {
      gpuOnly: true,
    });
    const results: unknown[] = [];
    for await (const r of gen) results.push(r);

    expect(results).toHaveLength(0);
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  it("trips the circuit breaker after 5 consecutive GPU synth failures", async () => {
    // Reproduces the production hang: on the pain matrix, every phrase
    // times out at the main-thread level, so generator failure mode is
    // "fail → move on → fail → move on → …" indefinitely. At 702 phrases
    // × ~minutes each, that's days of wasted time. The circuit breaker
    // gives up after 5 consecutive failures so the UI can surface a
    // Retry button and the clinician isn't held hostage to a stuck worker.
    isGPUReadyMock.mockReturnValue(true);
    synthesizeGPUMock.mockRejectedValue(new Error("GPU synthesis timeout (60000ms)"));

    // 10 phrases — enough to prove the breaker stops the run before the
    // end, not just coincidentally at the last phrase.
    const phrases = Array.from({ length: 10 }, (_, i) => `phrase ${i}`);
    const gen = generateAllPhrases(phrases, EMBEDDING, undefined, { gpuOnly: true });
    const results: Array<{ current: number; failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    // Exactly 5 failures yielded, then the generator stops early.
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.failed === true)).toBe(true);
    expect(results[results.length - 1].current).toBe(5);
  });

  it("cache hits reset the consecutive-failure counter (no premature breaker trip)", async () => {
    // Mutation guard: generateAllPhrases resets consecutiveFailures in
    // TWO places — on cache hit (branch: hasCachedAudio returns true,
    // yield + continue) and on successful synth (branch: synth resolves,
    // putCachedAudio, then reset). The "resets on a successful phrase"
    // test below covers the synth path; this one covers the cache-hit
    // path, which a targeted mutant could remove without affecting any
    // other test.
    //
    // Shape a run where the test outcome discriminates: 4 failures →
    // cache hit → 4 more failures. With the reset (correct), the
    // counter goes 4→0→4 and the breaker never trips; all 9 phrases
    // yield. Without the reset (mutant), the counter stays at 4 through
    // the cache hit, then the 5th consecutive failure (total phrase 5)
    // hits the limit and the generator returns early.
    isGPUReadyMock.mockReturnValue(true);
    await putCachedAudio("cached mid-run", EMBEDDING, AUDIO);
    synthesizeGPUMock.mockImplementation((text: string) => {
      if (text === "cached mid-run") {
        // Shouldn't be called — the cache-hit branch short-circuits
        // before reaching synthesizeGPU.
        throw new Error("cache hit should not reach synthesizeGPU");
      }
      return Promise.reject(new Error("GPU timeout"));
    });

    const phrases = [
      "fail 0", "fail 1", "fail 2", "fail 3",  // counter → 1,2,3,4
      "cached mid-run",                         // reset → 0 (expected)
      "fail 4", "fail 5", "fail 6", "fail 7",  // counter → 1,2,3,4 — no trip
    ];
    const gen = generateAllPhrases(phrases, EMBEDDING, undefined, {
      gpuOnly: true,
    });
    const results: Array<{ phrase: string; current: number; total: number; failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    // All 9 phrases yielded = no early return from breaker trip.
    expect(results).toHaveLength(9);
    // Cache hit at index 4 is not a failure.
    expect(results[4].phrase).toBe("cached mid-run");
    expect(results[4].failed).toBeUndefined();
    // 8 failures total, 1 cache-hit success.
    expect(results.filter((r) => r.failed === true)).toHaveLength(8);
  });

  it("resets the consecutive-failure counter on a successful phrase", async () => {
    // If the breaker counted total failures rather than consecutive ones,
    // a flaky worker that intermittently succeeds would still trip it.
    // This test interleaves 4 failures, a success, then 4 more failures
    // — only 4 consecutive at any point, so the breaker must not trip.
    isGPUReadyMock.mockReturnValue(true);
    synthesizeGPUMock.mockImplementation((text: string) => {
      if (text === "phrase 4") {
        return Promise.resolve({ data: new Float32Array([0.1, 0.2]), sampleRate: 24000 });
      }
      return Promise.reject(new Error("GPU synthesis timeout (60000ms)"));
    });

    const phrases = Array.from({ length: 9 }, (_, i) => `phrase ${i}`);
    const gen = generateAllPhrases(phrases, EMBEDDING, undefined, { gpuOnly: true });
    const results: Array<{ current: number; failed?: boolean }> = [];
    for await (const r of gen) results.push(r);

    // All 9 phrases yielded: 4 failed, 1 succeeded, 4 failed. Breaker
    // never hits 5 consecutive so the run completes normally.
    expect(results).toHaveLength(9);
    expect(results.filter((r) => r.failed === true)).toHaveLength(8);
    expect(results.filter((r) => !r.failed)).toHaveLength(1);
  });
});

// =============================================================================
// retryFailed — subset regen
// =============================================================================
describe("audioCache — retryFailed", () => {
  beforeEach(() => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);
    mockWorker.postMessage.mockClear();
    mockWorker.addEventListener.mockClear();
  });

  it("regenerates only the passed subset of phrases", async () => {
    const received: string[] = [];
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "audio", data: new Float32Array([0.1]), requestId: lastSynthRequestId() },
          } as unknown as MessageEvent);
        }, 2);
      },
    );
    mockWorker.postMessage.mockImplementation((msg: { text: string }) => {
      received.push(msg.text);
    });

    const gen = retryFailed(["Only this", "And this"], EMBEDDING);
    const results: unknown[] = [];
    for await (const r of gen) results.push(r);

    expect(results).toHaveLength(2);
    expect(received).toEqual(["Only this", "And this"]);
  });
});
