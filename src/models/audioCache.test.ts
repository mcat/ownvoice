import {
  hasCachedAudio,
  getCachedAudio,
  putCachedAudio,
  clearAudioCache,
  countCached,
  generateAllPhrases,
  retryFailed,
  embeddingFingerprint,
} from "./audioCache";

// Mock the modelManager for generateAllPhrases tests
const mockWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
const mockModelManager = {
  isReady: vi.fn(() => false),
  // Explicit return type so mockReturnValue(workerLikeObject) type-checks.
  getWorker: vi.fn((): typeof mockWorker | null => null),
};
vi.mock("./modelManager", () => ({
  getModelManager: () => mockModelManager,
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
  } {
    return {
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
    };
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
});

afterEach(() => {
  opfs.clear();
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
    // Float32Array bytes should match
    for (let i = 0; i < AUDIO.length; i++) {
      expect(result!.audio[i]).toBeCloseTo(AUDIO[i], 5);
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
            data: { type: "audio", data: new Float32Array([0.1, -0.1]) },
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
              data: { type: "error", message: "synthesis failed" },
            } as unknown as MessageEvent);
          } else {
            handler({
              data: { type: "audio", data: new Float32Array([0.2]) },
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
            handler({ data: { type: "error", message: "flake" } } as unknown as MessageEvent);
          } else {
            handler({ data: { type: "audio", data: new Float32Array([0.1]) } } as unknown as MessageEvent);
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
          handler({ data: { type: "error", message: "nope" } } as unknown as MessageEvent);
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
            data: { type: "error", message: "bad" },
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
            data: { type: "audio", data: new Float32Array([0.1]) },
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
