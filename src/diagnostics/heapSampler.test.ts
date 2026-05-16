import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetProgress = vi.fn<
  () => Array<{ model: string; status: string; loaded: number; total: number }>
>(() => [
  { model: "tts", status: "warm", loaded: 1, total: 1 },
  { model: "stt", status: "ready", loaded: 1, total: 1 },
]);
const mockIsGPUReady = vi.fn(() => false);
const mockGetGpuPendingSynths = vi.fn(() => 0);
const mockGetHotCacheSize = vi.fn(() => 0);

vi.mock("../models/modelManager", () => ({
  getModelManager: () => ({ getProgress: mockGetProgress }),
}));
vi.mock("../models/ttsEngine", () => ({
  isGPUReady: mockIsGPUReady,
  getGpuPendingSynths: mockGetGpuPendingSynths,
}));
vi.mock("../speak", () => ({
  getHotCacheSize: mockGetHotCacheSize,
}));

const FLAG_KEY = "__OV_MEMDIAG__" as const;

beforeEach(() => {
  delete (globalThis as Record<string, unknown>)[FLAG_KEY];
  localStorage.clear();
  mockGetProgress.mockClear();
  mockIsGPUReady.mockClear();
  mockGetGpuPendingSynths.mockClear();
  mockGetHotCacheSize.mockClear();
});

describe("heapSampler", () => {
  it("does not register when memdiag is off", async () => {
    const { startHeapSampler } = await import("./heapSampler");
    const { recordStage, enableMemDiag, readPreviousTombstone } = await import(
      "./crashTombstone"
    );
    startHeapSampler();
    enableMemDiag();
    recordStage("test:no-sampler");
    expect(readPreviousTombstone()?.hw).toBeNull();
  });

  it("registers a sampler that pulls from the model layer when memdiag is on", async () => {
    mockIsGPUReady.mockReturnValueOnce(true);
    mockGetHotCacheSize.mockReturnValueOnce(12);
    mockGetGpuPendingSynths.mockReturnValueOnce(2);

    const { enableMemDiag, recordStage, readPreviousTombstone, _resetSamplerForTests } =
      await import("./crashTombstone");
    const { startHeapSampler, _resetHeapSamplerForTests } = await import(
      "./heapSampler"
    );
    _resetSamplerForTests();
    _resetHeapSamplerForTests();
    enableMemDiag();
    startHeapSampler();
    recordStage("test:with-sampler");
    const prev = readPreviousTombstone();
    expect(prev?.hw?.hotCacheEntries).toBe(12);
    expect(prev?.hw?.gpuTtsReady).toBe(true);
    expect(prev?.hw?.gpuTtsPendingSynths).toBe(2);
    expect(prev?.hw?.workers).toEqual({ tts: "warm", stt: "ready" });
    // OPFS estimate is async; the first synchronous sample will have
    // null usage because navigator.storage.estimate() races the
    // recordStage call.
    expect(prev?.hw?.opfsUsage === null || typeof prev?.hw?.opfsUsage === "number").toBe(true);
    _resetHeapSamplerForTests();
  });
});
