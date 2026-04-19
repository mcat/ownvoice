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
// OPFS helpers — downloadAndCache / verifyOPFSCache / clearAll OPFS
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
      createWritable: async (writeOpts?: { keepExistingData?: boolean }) => {
        let buf = writeOpts?.keepExistingData
          ? new Uint8Array(store.get(path) ?? new ArrayBuffer(0))
          : new Uint8Array(0);
        // Per OPFS spec, cursor starts at 0 regardless of keepExistingData —
        // callers that want to append must seek() explicitly. Prior mock
        // defaulted to buf.byteLength, which silently hid missing seek() calls.
        let cursor = 0;
        return {
          seek: async (offset: number) => {
            cursor = offset;
          },
          write: async (data: unknown) => {
            let chunk: Uint8Array;
            if (typeof data === "string") {
              chunk = new TextEncoder().encode(data);
            } else if (data instanceof Blob) {
              chunk = new Uint8Array(await data.arrayBuffer());
            } else if (data instanceof Uint8Array) {
              chunk = data;
            } else if (data instanceof ArrayBuffer) {
              chunk = new Uint8Array(data);
            } else {
              return;
            }
            const needed = cursor + chunk.byteLength;
            if (needed > buf.byteLength) {
              const next = new Uint8Array(needed);
              next.set(buf, 0);
              buf = next;
            }
            buf.set(chunk, cursor);
            cursor += chunk.byteLength;
          },
          close: async () => {
            store.set(path, buf.buffer.slice(0, buf.byteLength));
          },
        };
      },
    };
  }

  function makeDirHandle(prefix: string): Record<string, unknown> {
    return {
      getFileHandle: async (name: string, opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`, opts),
      getDirectoryHandle: async (name: string, _opts?: { create?: boolean }) =>
        makeDirHandle(`${prefix}/${name}`),
      removeEntry: async (name: string) => {
        const target = `${prefix}/${name}`;
        for (const key of [...store.keys()]) {
          if (key === target || key.startsWith(`${target}/`)) store.delete(key);
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

describe("ModelManager — downloadAndCache", () => {
  it("returns cached file when it already exists in OPFS with matching size", async () => {
    const opfs = createOPFSMock();
    const data = new Uint8Array([1, 2, 3, 4]);
    opfs.store.set("/models/tts/model.onnx", data.buffer as ArrayBuffer);
    opfs.install();

    const mgr = getModelManager();
    const result = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 4);
    expect(result.file).toBeInstanceOf(File);
    expect(result.file.size).toBe(4);
    expect(result.fromCache).toBe(true);
  });

  it("downloads and caches a new file when not in OPFS", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    const mockData = new Uint8Array([10, 20, 30, 40, 50]);
    const mockFetch = vi.fn(
      async () =>
        new Response(mockData, {
          status: 200,
          headers: { "content-length": "5" },
        }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const mgr = getModelManager();
    const cb = vi.fn();
    mgr.onProgress(cb);

    const result = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);

    expect(result.file).toBeInstanceOf(File);
    expect(result.fromCache).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "/cdn/model.onnx",
      expect.objectContaining({ cache: "no-store" }),
    );
    expect(cb).toHaveBeenCalled();
    expect(opfs.store.has("/models/tts/model.onnx")).toBe(true);
  });

  it("sets error status and rethrows when fetch fails", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(null, { status: 404, statusText: "Not Found" }),
      ),
    );

    const mgr = getModelManager();
    await expect(
      mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5),
    ).rejects.toThrow(/HTTP 404/);

    const progress = mgr.getProgress();
    const tts = progress.find((p) => p.model === "tts");
    expect(tts?.status).toBe("error");
  });

  it("handles non-Error exceptions in the download path", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("string error"));

    const mgr = getModelManager();
    await expect(
      mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5),
    ).rejects.toBe("string error");

    const progress = mgr.getProgress();
    const tts = progress.find((p) => p.model === "tts");
    expect(tts?.status).toBe("error");
    expect(tts?.error).toBe("Download failed");
  });
});

describe("ModelManager — verifyOPFSCache", () => {
  it("returns ok when all manifest files pass integrity", async () => {
    const opfs = createOPFSMock();
    const good = new Uint8Array(10);
    good[0] = 0x08; // ONNX ModelProto field-1 tag
    good[1] = 0x07; // ir_version
    opfs.store.set("/models/tts/good.onnx", good.buffer.slice(0));
    opfs.install();

    const mgr = getModelManager();
    const report = await mgr.verifyOPFSCache("tts", {
      baseUrl: "/models/tts/",
      files: [{ name: "good.onnx", size: 10, magic: "onnx" }],
    });
    expect(report.ok).toBe(true);
  });

  it("returns not-ok with per-file reasons when a file is missing", async () => {
    const opfs = createOPFSMock();
    opfs.install();
    const mgr = getModelManager();
    const report = await mgr.verifyOPFSCache("tts", {
      baseUrl: "/models/tts/",
      files: [{ name: "missing.onnx", size: 10, magic: "onnx" }],
    });
    expect(report.ok).toBe(false);
    expect(report.files[0].reason).toMatch(/missing/i);
  });
});

describe("ModelManager — downloadAndCache streams to OPFS", () => {
  it("writes streamed chunks to OPFS", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    const body = new ReadableStream({
      async start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.enqueue(new Uint8Array([4, 5]));
        c.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(body, {
            status: 200,
            headers: { "content-length": "5" },
          }),
      ),
    );

    const mgr = getModelManager();
    const result = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);
    expect(result.file.size).toBe(5);
    expect(result.fromCache).toBe(false);
    expect(new Uint8Array(opfs.store.get("/models/tts/model.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
  });

  it("resumes from a partial download", async () => {
    const opfs = createOPFSMock();
    opfs.store.set(
      "/models/tts/model.onnx",
      new Uint8Array([1, 2, 3]).buffer as ArrayBuffer,
    );
    opfs.store.set(
      "/models/tts/model.onnx._progress.json",
      new TextEncoder()
        .encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 }))
        .slice().buffer,
    );
    opfs.install();

    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      const range = new Headers(init?.headers).get("range");
      if (range !== "bytes=3-") throw new Error(`bad range: ${range}`);
      const body = new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([4, 5]));
          c.close();
        },
      });
      return new Response(body, {
        status: 206,
        headers: { "content-length": "2", "content-range": "bytes 3-4/5" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const mgr = getModelManager();
    await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);

    expect(new Uint8Array(opfs.store.get("/models/tts/model.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
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
