import { MODEL_URLS } from "./types";

const mockInit = vi.fn(() => Promise.resolve());
const mockSetWorker = vi.fn();
const mockSetReady = vi.fn();
const mockSetError = vi.fn();
const mockIsReady = vi.fn(() => false);
const mockMarkWarm = vi.fn();
const mockIsWarm = vi.fn(() => false);
const mockVerifyOPFSCache = vi.fn(() =>
  Promise.resolve({ ok: true, files: [] }),
);

vi.mock("./modelManager", () => ({
  getModelManager: () => ({
    init: mockInit,
    setWorker: mockSetWorker,
    setReady: mockSetReady,
    setError: mockSetError,
    isReady: mockIsReady,
    markWarm: mockMarkWarm,
    isWarm: mockIsWarm,
    verifyOPFSCache: mockVerifyOPFSCache,
  }),
}));

vi.mock("./modelsManifest", () => ({
  loadManifest: vi.fn(async () => ({
    version: 1,
    models: {
      tts: { baseUrl: "/models/tts/", files: [{ name: "a.onnx", size: 10, magic: "onnx" }] },
    },
  })),
}));

interface MockWorker {
  postMessage: ReturnType<typeof vi.fn>;
  onmessage: ((e: { data: { type: string; message?: string; phase?: string } }) => void) | null;
  onerror: ((e: { message: string }) => void) | null;
  terminate: ReturnType<typeof vi.fn>;
}
const createdWorkers: MockWorker[] = [];

class FakeWorker {
  postMessage = vi.fn();
  onmessage: ((e: { data: { type: string; message?: string; phase?: string } }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  terminate = vi.fn();
  constructor() {
    createdWorkers.push(this as unknown as MockWorker);
  }
}

vi.stubGlobal("Worker", FakeWorker);

beforeEach(() => {
  vi.clearAllMocks();
  createdWorkers.length = 0;
  mockIsReady.mockReturnValue(false);
});

describe("bootModels", () => {
  it("calls mgr.init() before creating any workers", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    expect(mockInit).toHaveBeenCalled();
  });

  it("creates 1 worker (TTS WASM)", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    expect(createdWorkers).toHaveLength(1);
  });

  it("registers the TTS worker with setWorker immediately", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    expect(mockSetWorker).toHaveBeenCalledTimes(1);
    expect(mockSetWorker.mock.calls[0][0]).toBe("tts");
  });

  it("posts init message with the TTS model URL and bench flag", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    expect(createdWorkers[0].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: MODEL_URLS.tts,
      bench: false,
    });
  });

  it("calls setReady when TTS worker sends ready message", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[0].onmessage?.({ data: { type: "ready" } });
    expect(mockSetReady).toHaveBeenCalledWith("tts");
  });

  it("calls setError when TTS worker sends error during init", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[0].onmessage?.({
      data: { type: "error", message: "TTS init failed" },
    });
    expect(mockSetError).toHaveBeenCalledWith("tts", "TTS init failed");
  });

  it("handles TTS worker creation failure gracefully", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        postMessage = vi.fn();
        onmessage: unknown = null;
        onerror: unknown = null;
        terminate = vi.fn();
        constructor() {
          throw new Error("Worker creation failed");
        }
      },
    );

    const { bootModels } = await import("./bootModels");
    await expect(bootModels()).resolves.toBeUndefined();
    // restore for downstream tests
    vi.stubGlobal("Worker", FakeWorker);
  });
});

describe("verifyAllOnBoot", () => {
  it("marks models 'verified' when integrity passes", async () => {
    const { verifyAllOnBoot } = await import("./bootModels");
    const { useOfflineStore } = await import("../stores/offlineStore");
    useOfflineStore.getState().reset();

    mockVerifyOPFSCache.mockImplementation(async () => ({
      ok: true,
      files: [{ name: "a.onnx", ok: true }],
    }));

    await verifyAllOnBoot();
    const v = useOfflineStore.getState().verified;
    expect(v.tts).toBe("verified");
  });

  it("marks models 'not-primed' when every file is missing (fresh install, OPFS empty)", async () => {
    const { verifyAllOnBoot } = await import("./bootModels");
    const { useOfflineStore } = await import("../stores/offlineStore");
    useOfflineStore.getState().reset();

    mockVerifyOPFSCache.mockImplementation(async () => ({
      ok: false,
      files: [
        { name: "a.onnx", ok: false, reason: "file missing from OPFS" },
        { name: "b.onnx_data", ok: false, reason: "file missing from OPFS" },
      ],
    }));

    await verifyAllOnBoot();
    const v = useOfflineStore.getState().verified;
    expect(v.tts).toBe("not-primed");
  });

  it("marks models 'needs-retry' when some files are present but fail verification", async () => {
    const { verifyAllOnBoot } = await import("./bootModels");
    const { useOfflineStore } = await import("../stores/offlineStore");
    useOfflineStore.getState().reset();

    mockVerifyOPFSCache.mockImplementation(async () => ({
      ok: false,
      files: [
        { name: "a.onnx", ok: false, reason: "size 50 != expected 100" },
        { name: "b.onnx_data", ok: false, reason: "file missing from OPFS" },
      ],
    }));

    await verifyAllOnBoot();
    const v = useOfflineStore.getState().verified;
    expect(v.tts).toBe("needs-retry");
  });
});

describe("bootModels — eager warmup", () => {
  it("posts a warmup message to TTS after receiving ready", async () => {
    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();

    const ttsWorker = createdWorkers[0];
    ttsWorker.onmessage?.({ data: { type: "ready" } });

    const warmupCall = ttsWorker.postMessage.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { type?: string }).type === "warmup",
    );
    expect(warmupCall).toBeTruthy();
  });

  it("calls markWarm on TTS warm message", async () => {
    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();

    const ttsWorker = createdWorkers[0];
    ttsWorker.onmessage?.({ data: { type: "ready" } });
    ttsWorker.onmessage?.({ data: { type: "warm" } });

    expect(mockMarkWarm).toHaveBeenCalledWith("tts");
  });

  it("calls setError on TTS warmup-phase error after ready", async () => {
    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();

    const ttsWorker = createdWorkers[0];
    ttsWorker.onmessage?.({ data: { type: "ready" } });
    mockIsReady.mockReturnValueOnce(true);
    ttsWorker.onmessage?.({
      data: { type: "error", message: "wasm broken", phase: "warmup" },
    });

    expect(mockSetError).toHaveBeenCalledWith("tts", "wasm broken");
  });

  it("does NOT call setError on TTS synthesis-phase error after ready", async () => {
    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();

    const ttsWorker = createdWorkers[0];
    ttsWorker.onmessage?.({ data: { type: "ready" } });
    mockSetError.mockClear();
    ttsWorker.onmessage?.({
      data: { type: "error", message: "synth blip", phase: "synthesis" },
    });

    expect(mockSetError).not.toHaveBeenCalled();
  });
});
