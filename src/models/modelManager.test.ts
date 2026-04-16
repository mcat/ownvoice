// We need a fresh singleton per test, so we use dynamic import + resetModules.

let getModelManager: typeof import("./modelManager").getModelManager;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./modelManager");
  getModelManager = mod.getModelManager;
});

// =============================================================================
// Singleton behaviour
// =============================================================================
describe("ModelManager — singleton", () => {
  it("returns the same instance on repeated calls", () => {
    const a = getModelManager();
    const b = getModelManager();
    expect(a).toBe(b);
  });
});

// =============================================================================
// init()
// =============================================================================
describe("ModelManager — init()", () => {
  it("requests persistent storage on first call", async () => {
    const persistMock = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, "storage", {
      value: { persist: persistMock, getDirectory: vi.fn() },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    await mgr.init();

    expect(persistMock).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — second call is a no-op", async () => {
    const persistMock = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(navigator, "storage", {
      value: { persist: persistMock, getDirectory: vi.fn() },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    await mgr.init();
    await mgr.init();

    expect(persistMock).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Worker registration (setWorker / getWorker)
// =============================================================================
describe("ModelManager — setWorker / getWorker", () => {
  it("returns null for unset workers", () => {
    const mgr = getModelManager();
    expect(mgr.getWorker("tts")).toBeNull();
    expect(mgr.getWorker("llm")).toBeNull();
    expect(mgr.getWorker("stt")).toBeNull();
  });

  it("stores and retrieves a worker", () => {
    const mgr = getModelManager();
    const worker = { terminate: vi.fn() } as unknown as Worker;
    mgr.setWorker("tts", worker);
    expect(mgr.getWorker("tts")).toBe(worker);
  });
});

// =============================================================================
// State transitions (setReady / isReady / setError)
// =============================================================================
describe("ModelManager — state transitions", () => {
  it("starts idle (not ready)", () => {
    const mgr = getModelManager();
    expect(mgr.isReady("tts")).toBe(false);
    expect(mgr.isReady("llm")).toBe(false);
    expect(mgr.isReady("stt")).toBe(false);
  });

  it("setReady makes isReady return true", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    expect(mgr.isReady("tts")).toBe(true);
  });

  it("setReady for one model does not affect others", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    expect(mgr.isReady("llm")).toBe(false);
  });

  it("setError sets status to error", () => {
    const mgr = getModelManager();
    mgr.setError("stt", "Download failed");

    const progress = mgr.getProgress();
    const stt = progress.find((p) => p.model === "stt");
    expect(stt?.status).toBe("error");
    expect(stt?.error).toBe("Download failed");
  });

  it("setError makes isReady return false", () => {
    const mgr = getModelManager();
    mgr.setReady("stt");
    expect(mgr.isReady("stt")).toBe(true);

    mgr.setError("stt", "Crashed");
    expect(mgr.isReady("stt")).toBe(false);
  });
});

// =============================================================================
// Progress callbacks
// =============================================================================
describe("ModelManager — onProgress", () => {
  it("notifies subscribers on state change", () => {
    const mgr = getModelManager();
    const cb = vi.fn();
    mgr.onProgress(cb);

    mgr.setReady("tts");

    expect(cb).toHaveBeenCalledTimes(1);
    const progress = cb.mock.calls[0][0];
    expect(progress).toBeInstanceOf(Array);
    expect(progress.find((p: { model: string }) => p.model === "tts")?.status).toBe("ready");
  });

  it("returns an unsubscribe function", () => {
    const mgr = getModelManager();
    const cb = vi.fn();
    const unsub = mgr.onProgress(cb);

    mgr.setReady("tts");
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();

    mgr.setReady("llm");
    // Should still be 1 — no longer subscribed
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("supports multiple subscribers", () => {
    const mgr = getModelManager();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    mgr.onProgress(cb1);
    mgr.onProgress(cb2);

    mgr.setReady("tts");

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// getProgress
// =============================================================================
describe("ModelManager — getProgress", () => {
  it("returns progress for all four model slots", () => {
    const mgr = getModelManager();
    const progress = mgr.getProgress();
    const ids = progress.map((p) => p.model);
    expect(ids).toContain("tts");
    expect(ids).toContain("tts-encoder");
    expect(ids).toContain("llm");
    expect(ids).toContain("stt");
  });

  it("all models start idle with zero loaded/total", () => {
    const mgr = getModelManager();
    for (const p of mgr.getProgress()) {
      expect(p.status).toBe("idle");
      expect(p.loaded).toBe(0);
      expect(p.total).toBe(0);
    }
  });
});

// =============================================================================
// clearAll
// =============================================================================
describe("ModelManager — clearAll", () => {
  it("terminates all workers and resets state", async () => {
    // Provide a minimal OPFS mock
    const mockRemoveEntry = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "storage", {
      value: {
        persist: vi.fn(),
        getDirectory: vi.fn(() =>
          Promise.resolve({ removeEntry: mockRemoveEntry }),
        ),
      },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    const worker1 = { terminate: vi.fn() } as unknown as Worker;
    const worker2 = { terminate: vi.fn() } as unknown as Worker;

    mgr.setWorker("tts", worker1);
    mgr.setWorker("llm", worker2);
    mgr.setReady("tts");
    mgr.setReady("llm");

    await mgr.clearAll();

    expect(worker1.terminate).toHaveBeenCalled();
    expect(worker2.terminate).toHaveBeenCalled();
    expect(mgr.isReady("tts")).toBe(false);
    expect(mgr.isReady("llm")).toBe(false);
    expect(mgr.getWorker("tts")).toBeNull();
    expect(mgr.getWorker("llm")).toBeNull();
  });

  it("attempts to remove OPFS models directory", async () => {
    const mockRemoveEntry = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "storage", {
      value: {
        persist: vi.fn(),
        getDirectory: vi.fn(() =>
          Promise.resolve({ removeEntry: mockRemoveEntry }),
        ),
      },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    await mgr.clearAll();

    expect(mockRemoveEntry).toHaveBeenCalledWith("models", { recursive: true });
  });

  it("notifies subscribers after clearing", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        persist: vi.fn(),
        getDirectory: vi.fn(() =>
          Promise.resolve({ removeEntry: vi.fn(() => Promise.resolve()) }),
        ),
      },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    const cb = vi.fn();
    mgr.onProgress(cb);
    cb.mockClear();

    await mgr.clearAll();

    expect(cb).toHaveBeenCalled();
  });
});

// =============================================================================
// WebGPU detection
// =============================================================================
describe("ModelManager — WebGPU detection", () => {
  it("reports hasWebGPU = true when navigator.gpu exists", () => {
    Object.defineProperty(navigator, "gpu", {
      value: {},
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    expect(mgr.hasWebGPU).toBe(true);
    expect(mgr.executionProvider).toBe("webgpu");

    // cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).gpu;
  });

  it("reports hasWebGPU = false when navigator.gpu is absent", () => {
    // ensure gpu is not present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).gpu;

    const mgr = getModelManager();
    expect(mgr.hasWebGPU).toBe(false);
    expect(mgr.executionProvider).toBe("wasm");
  });
});

// =============================================================================
// OPFS helpers — getOPFSCache / markComplete / downloadAndCache / clearAll OPFS
// =============================================================================

/** Creates an in-memory OPFS mock with directory + file handles. */
function createOPFSMock() {
  const store = new Map<string, ArrayBuffer>();

  function makeFileHandle(path: string, opts?: { create?: boolean }) {
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
          if (typeof data === "string") {
            store.set(path, new TextEncoder().encode(data).buffer as ArrayBuffer);
          } else if (data instanceof Blob) {
            store.set(path, await data.arrayBuffer());
          } else if (data instanceof ArrayBuffer) {
            store.set(path, data);
          }
        },
        close: async () => {},
      }),
    };
  }

  function makeDirHandle(prefix: string): Record<string, unknown> {
    return {
      getFileHandle: async (name: string, opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`, opts),
      getDirectoryHandle: async (name: string, _opts?: { create?: boolean }) =>
        makeDirHandle(`${prefix}/${name}`),
      removeEntry: async () => {
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
  };
}

describe("ModelManager — getOPFSCache", () => {
  it("returns null when model dir does not exist", async () => {
    const opfs = createOPFSMock();
    opfs.install();
    const mgr = getModelManager();
    const result = await mgr.getOPFSCache("tts");
    expect(result).toBeNull();
  });

  it("returns null when _complete sentinel is missing", async () => {
    const opfs = createOPFSMock();
    // Create the model dir but NOT the _complete sentinel
    opfs.store.set("/models/tts/somefile.onnx", new ArrayBuffer(10));
    opfs.install();
    const mgr = getModelManager();
    const result = await mgr.getOPFSCache("tts");
    expect(result).toBeNull();
  });

  it("returns directory handle when _complete sentinel exists", async () => {
    const opfs = createOPFSMock();
    // Create the _complete sentinel in the model dir
    opfs.store.set("/models/tts/_complete", new TextEncoder().encode("ok").buffer as ArrayBuffer);
    opfs.install();
    const mgr = getModelManager();
    const result = await mgr.getOPFSCache("tts");
    expect(result).not.toBeNull();
  });
});

describe("ModelManager — markComplete", () => {
  it("writes a _complete sentinel file to OPFS", async () => {
    const opfs = createOPFSMock();
    opfs.install();
    const mgr = getModelManager();
    await mgr.markComplete("tts");

    // The sentinel file should exist in the store
    expect(opfs.store.has("/models/tts/_complete")).toBe(true);
    const buf = opfs.store.get("/models/tts/_complete")!;
    const text = new TextDecoder().decode(buf);
    expect(text).toBe("ok");
  });

  it("does not throw when OPFS operations fail", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        getDirectory: vi.fn(() => Promise.reject(new Error("OPFS unavailable"))),
        persist: vi.fn(),
      },
      configurable: true,
      writable: true,
    });
    const mgr = getModelManager();
    // markComplete catches errors silently
    await expect(mgr.markComplete("tts")).resolves.toBeUndefined();
  });
});

describe("ModelManager — downloadAndCache", () => {
  it("returns cached file when it already exists in OPFS", async () => {
    const opfs = createOPFSMock();
    // Pre-populate OPFS cache with a file
    const data = new Uint8Array([1, 2, 3, 4]);
    opfs.store.set("/models/tts/model.onnx", data.buffer as ArrayBuffer);
    opfs.install();

    const mgr = getModelManager();
    const file = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx");
    expect(file).toBeInstanceOf(File);
    expect(file.size).toBe(4);
  });

  it("downloads and caches a new file when not in OPFS", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    // Mock fetch with streaming body
    const mockData = new Uint8Array([10, 20, 30, 40, 50]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => String(mockData.length) },
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({ done: false, value: mockData })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const mgr = getModelManager();
    const cb = vi.fn();
    mgr.onProgress(cb);

    const file = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx");

    expect(file).toBeInstanceOf(File);
    expect(mockFetch).toHaveBeenCalledWith("/cdn/model.onnx");
    // Progress callback should have been called (status=downloading + loaded updates)
    expect(cb).toHaveBeenCalled();
    // The file should now be cached in OPFS
    expect(opfs.store.has("/models/tts/model.onnx")).toBe(true);
  });

  it("sets error status and rethrows when fetch fails", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    const mgr = getModelManager();
    await expect(
      mgr.downloadAndCache("tts", "/cdn/", "model.onnx"),
    ).rejects.toThrow("HTTP 404");

    const progress = mgr.getProgress();
    const tts = progress.find((p) => p.model === "tts");
    expect(tts?.status).toBe("error");
  });

  it("sets error status when response body is missing", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "0" },
        body: null,
      }),
    );

    const mgr = getModelManager();
    await expect(
      mgr.downloadAndCache("tts", "/cdn/", "model.onnx"),
    ).rejects.toThrow("No response body");
  });

  it("handles non-Error exceptions in the download path", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue("string error"),
    );

    const mgr = getModelManager();
    await expect(
      mgr.downloadAndCache("tts", "/cdn/", "model.onnx"),
    ).rejects.toBe("string error");

    const progress = mgr.getProgress();
    const tts = progress.find((p) => p.model === "tts");
    expect(tts?.status).toBe("error");
    expect(tts?.error).toBe("Download failed");
  });
});

describe("ModelManager — clearAll OPFS error handling", () => {
  it("does not throw when OPFS removeEntry fails", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        persist: vi.fn(),
        getDirectory: vi.fn(() =>
          Promise.resolve({
            removeEntry: vi.fn(() =>
              Promise.reject(new DOMException("Not found")),
            ),
          }),
        ),
      },
      configurable: true,
      writable: true,
    });

    const mgr = getModelManager();
    await expect(mgr.clearAll()).resolves.toBeUndefined();
  });
});
