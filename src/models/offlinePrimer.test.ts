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
    mockMgr.downloadAndCache.mockResolvedValue(new File([], "ok"));
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
    expect(events.at(-1)).toEqual({ type: "complete", allOk: true });
  });

  it("emits download-failed without aborting the whole primer", async () => {
    mockMgr.downloadAndCache.mockImplementation(async (_id, _url, filename) => {
      if (filename === "a.onnx") throw new Error("network dropped");
      return new File([], "ok");
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
    );
    expect(events.at(-1)).toEqual({ type: "complete", allOk: false });
  });

  it("respects AbortSignal mid-primer", async () => {
    const controller = new AbortController();
    mockMgr.downloadAndCache.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    const events: PrimerEvent[] = [];
    try {
      for await (const ev of primeOffline(manifest, controller.signal)) events.push(ev);
    } catch (err) {
      expect((err as Error).name).toBe("AbortError");
    }
    expect(mockMgr.downloadAndCache.mock.calls.length).toBeLessThan(3);
  });
});
