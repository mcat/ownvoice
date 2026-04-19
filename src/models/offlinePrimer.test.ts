import { describe, it, expect, vi, beforeEach } from "vitest";
import { primeOffline, type PrimerEvent } from "./offlinePrimer";
import type { ModelsManifest } from "./modelsManifest";

const mockMgr = {
  downloadAndCache: vi.fn(),
  verifyOPFSCache: vi.fn(),
};

vi.mock("./modelManager", () => ({
  getModelManager: () => mockMgr,
}));

const manifest: ModelsManifest = {
  version: 1,
  models: {
    tts: {
      baseUrl: "/models/tts/",
      files: [
        { name: "a.onnx", size: 10, magic: "onnx" },
        { name: "b.onnx_data", size: 100, magic: null },
      ],
    },
    llm: {
      baseUrl: "/models/llm/",
      files: [{ name: "c.onnx", size: 5, magic: "onnx" }],
    },
    stt: { baseUrl: "/models/stt/", files: [] },
  },
};

describe("primeOffline", () => {
  beforeEach(() => {
    mockMgr.downloadAndCache.mockReset();
    mockMgr.verifyOPFSCache.mockReset();
    mockMgr.downloadAndCache.mockResolvedValue({ file: new File([], "ok"), fromCache: false });
    mockMgr.verifyOPFSCache.mockResolvedValue({ ok: true, files: [] });
  });

  it("downloads every manifest file and yields progress events", async () => {
    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    expect(mockMgr.downloadAndCache).toHaveBeenCalledTimes(3);
    expect(
      events.some((e) => e.type === "download-start" && e.file === "a.onnx"),
    ).toBe(true);
    expect(
      events.some((e) => e.type === "model-verified" && e.model === "tts"),
    ).toBe(true);
    expect(events.at(-1)).toEqual({ type: "complete", allOk: true, downloadedCount: 3 });
  });

  it("sets downloadedCount to 0 when all files hit the cache fast-path", async () => {
    mockMgr.downloadAndCache.mockResolvedValue({ file: new File([], "ok"), fromCache: true });
    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    const complete = events.at(-1);
    expect(complete).toEqual({ type: "complete", allOk: true, downloadedCount: 0 });
  });

  it("counts only non-cached files in downloadedCount", async () => {
    let call = 0;
    mockMgr.downloadAndCache.mockImplementation(async () => {
      call++;
      // First file: cached. Second & third: downloaded.
      return call === 1
        ? { file: new File([], "ok"), fromCache: true }
        : { file: new File([], "ok"), fromCache: false };
    });
    mockMgr.verifyOPFSCache.mockResolvedValue({ ok: true, files: [] });

    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    const complete = events.at(-1);
    expect(complete).toEqual({ type: "complete", allOk: true, downloadedCount: 2 });
  });

  it("emits a model-start event for every model that has files", () => {
    // Asserts the exact event type and the full set of models that got started
    // so ObjectLiteral / StringLiteral mutants on `yield { type: "model-start", model: id }` die.
    return (async () => {
      const events: PrimerEvent[] = [];
      for await (const ev of primeOffline(manifest)) events.push(ev);
      const starts = events.filter((e) => e.type === "model-start");
      expect(starts.map((e) => (e as { model: string }).model)).toEqual(["tts", "llm"]);
    })();
  });

  it("skips models with no files (no model-start, no model-verified)", async () => {
    // stt has files: []. The `!model || model.files.length === 0` guard should
    // skip it entirely — kills ConditionalExpression + LogicalOperator mutants.
    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);
    expect(events.some((e) => "model" in e && e.model === "stt")).toBe(false);
    expect(mockMgr.verifyOPFSCache).not.toHaveBeenCalledWith(
      "stt",
      expect.anything(),
    );
  });

  it("emits download-failed without aborting the whole primer", async () => {
    mockMgr.downloadAndCache.mockImplementation(async (_id, _url, filename) => {
      if (filename === "a.onnx") throw new Error("network dropped");
      return { file: new File([], "ok"), fromCache: false };
    });
    mockMgr.verifyOPFSCache.mockImplementation(async (id) => ({
      ok: id !== "tts",
      files: [],
    }));

    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    expect(
      events.some((e) => e.type === "download-failed" && e.file === "a.onnx"),
    ).toBe(true);
    expect(mockMgr.downloadAndCache).toHaveBeenCalledWith(
      "llm",
      "/models/llm/",
      "c.onnx",
      5,
      undefined, // no onProgress passed to primeOffline in this test
    );
    expect(events.at(-1)).toEqual({ type: "complete", allOk: false, downloadedCount: 2 });
  });

  it("respects AbortSignal mid-primer", async () => {
    const controller = new AbortController();
    mockMgr.downloadAndCache.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    const events: PrimerEvent[] = [];
    try {
      for await (const ev of primeOffline(manifest, { signal: controller.signal })) events.push(ev);
    } catch (err) {
      expect((err as Error).name).toBe("AbortError");
    }
    expect(mockMgr.downloadAndCache.mock.calls.length).toBeLessThan(3);
  });

  it("honors a signal aborted between successful downloads", async () => {
    // Targets the `if (signal?.aborted) throw` guards at iteration boundaries —
    // ensures they actually fire when signal flips to aborted WITHOUT the inner
    // downloadAndCache raising. Kills ConditionalExpression mutants on lines
    // 37 + 44 (outer + inner loop abort checks).
    const controller = new AbortController();
    let callCount = 0;
    mockMgr.downloadAndCache.mockImplementation(async () => {
      callCount++;
      // After the first successful file, abort the signal. Don't throw — let
      // the primer's iteration-boundary check be the ONLY exit path.
      if (callCount === 1) controller.abort();
      return new File([], "ok");
    });

    let thrown: unknown;
    try {
      for await (const _ of primeOffline(manifest, { signal: controller.signal })) {
        // drain
      }
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error | undefined)?.name).toBe("AbortError");
    // Exactly one download happened before the boundary check caught abort.
    // If the guard is mutated to `false`, both tts files + llm file run → 3 calls.
    expect(callCount).toBe(1);
  });

  it("rethrows AbortError even when signal isn't set", async () => {
    // Targets `if ((err as Error).name === "AbortError") throw err;` (line 51).
    // If downloadAndCache throws an AbortError without signal.aborted ever being
    // true, the primer must still propagate — otherwise a cancelled worker
    // would look like a silent failure. Kills the `if (false)` + empty-string
    // mutants on the name check.
    mockMgr.downloadAndCache.mockImplementation(async () => {
      throw new DOMException("Aborted", "AbortError");
    });

    let thrown: unknown;
    try {
      for await (const _ of primeOffline(manifest)) {
        // drain
      }
    } catch (err) {
      thrown = err;
    }
    expect((thrown as Error | undefined)?.name).toBe("AbortError");
    // Only the first file attempted before the rethrow — not all three.
    expect(mockMgr.downloadAndCache).toHaveBeenCalledTimes(1);
  });
});
