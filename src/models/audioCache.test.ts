import {
  hasCachedAudio,
  getCachedAudio,
  putCachedAudio,
  clearAudioCache,
  countCached,
  generateAllPhrases,
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

    let callCount = 0;
    mockWorker.addEventListener.mockImplementation(
      (_event: string, handler: (e: MessageEvent) => void) => {
        callCount++;
        setTimeout(() => {
          if (callCount === 1) {
            // First phrase fails
            handler({
              data: { type: "error", message: "synthesis failed" },
            } as unknown as MessageEvent);
          } else {
            // Second phrase succeeds
            handler({
              data: { type: "audio", data: new Float32Array([0.2]) },
            } as unknown as MessageEvent);
          }
        }, 5);
      },
    );

    const gen = generateAllPhrases(["Fail phrase", "Success phrase"], EMBEDDING);
    const results: Array<{ phrase: string; current: number; total: number }> = [];
    for await (const item of gen) {
      results.push(item);
    }

    // Both phrases yield progress, even though the first one failed
    expect(results).toHaveLength(2);
    expect(results[0].phrase).toBe("Fail phrase");
    expect(results[1].phrase).toBe("Success phrase");
  });

  it("handles TTS timeout for a phrase", async () => {
    mockModelManager.isReady.mockReturnValue(true);
    mockModelManager.getWorker.mockReturnValue(mockWorker);

    // Worker never responds — the 10000ms timeout should fire
    // But we'll use vi.useFakeTimers to speed it up
    vi.useFakeTimers();

    mockWorker.addEventListener.mockImplementation(() => {
      // Never calls handler — simulates timeout
    });

    const gen = generateAllPhrases(["Timeout phrase"], EMBEDDING);
    const resultsPromise = (async () => {
      const results: unknown[] = [];
      for await (const item of gen) {
        results.push(item);
      }
      return results;
    })();

    // Advance timer past the 10000ms timeout
    await vi.advanceTimersByTimeAsync(11000);

    const results = await resultsPromise;
    expect(results).toHaveLength(1); // Still yields progress even after timeout

    vi.useRealTimers();
  });
});

// =============================================================================
// Embedding fingerprint edge case
// =============================================================================
describe("audioCache — embedding fingerprint", () => {
  it("uses 'empty' fingerprint for embeddings shorter than 4 elements", async () => {
    const shortEmbedding = new Float32Array([0.1, 0.2]); // < 4 elements
    await putCachedAudio("test phrase", shortEmbedding, AUDIO);
    const result = await hasCachedAudio("test phrase", shortEmbedding);
    expect(result).toBe(true);

    // A different short embedding should also produce 'empty' fingerprint
    const otherShort = new Float32Array([0.9, 0.8]);
    const result2 = await hasCachedAudio("test phrase", otherShort);
    // Both short embeddings map to "empty", so the cache hit happens
    expect(result2).toBe(true);
  });
});
