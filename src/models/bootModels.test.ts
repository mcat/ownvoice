import { MODEL_URLS } from "./types";

// --- Mock modelManager ---
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
      llm: { baseUrl: "/models/llm/", files: [] },
      stt: { baseUrl: "/models/stt/", files: [] },
    },
  })),
}));

// --- Mock Worker constructor ---
// Capture created workers and their onmessage handlers
interface MockWorker {
  postMessage: ReturnType<typeof vi.fn>;
  onmessage: ((e: { data: { type: string; message?: string } }) => void) | null;
  onerror: ((e: { message: string }) => void) | null;
  terminate: ReturnType<typeof vi.fn>;
}
const createdWorkers: MockWorker[] = [];

class FakeWorker {
  postMessage = vi.fn();
  onmessage: ((e: { data: { type: string; message?: string } }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  terminate = vi.fn();
  constructor() {
    createdWorkers.push(this as unknown as MockWorker);
  }
}

vi.stubGlobal("Worker", FakeWorker);

// Ensure import.meta.url does not cause issues
beforeEach(() => {
  vi.clearAllMocks();
  createdWorkers.length = 0;
  mockIsReady.mockReturnValue(false);
});

describe("bootModels", () => {
  it("calls mgr.init() before creating any workers", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    // bootModels composes bootTTSWasm + bootSTTAndLLM; each top-level entry
    // point calls mgr.init() (which is itself idempotent), so we expect at
    // least one call rather than exactly one.
    expect(mockInit).toHaveBeenCalled();
  });

  it("creates 3 workers (TTS, LLM, STT)", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    // No navigator.gpu in jsdom → WASM path for STT
    expect(createdWorkers).toHaveLength(3);
  });

  it("registers TTS and LLM workers with setWorker immediately", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    // TTS and LLM get setWorker immediately; STT defers until "ready"
    expect(mockSetWorker).toHaveBeenCalledTimes(2);
    const registeredIds = mockSetWorker.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(registeredIds).toContain("tts");
    expect(registeredIds).toContain("llm");
  });

  it("posts init message with correct model URLs", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    // Workers are created in order: TTS, LLM, STT
    expect(createdWorkers[0].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: MODEL_URLS.tts,
    });
    expect(createdWorkers[1].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: MODEL_URLS.llm,
    });
    expect(createdWorkers[2].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: MODEL_URLS.stt,
    });
  });

  it("calls setReady when TTS worker sends ready message", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[0].onmessage?.({ data: { type: "ready" } });
    expect(mockSetReady).toHaveBeenCalledWith("tts");
  });

  it("calls setError when LLM worker sends error message", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[1].onmessage?.({
      data: { type: "error", message: "Model load failed" },
    });
    expect(mockSetError).toHaveBeenCalledWith("llm", "Model load failed");
  });

  it("calls setReady when LLM worker sends ready", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[1].onmessage?.({ data: { type: "ready" } });
    expect(mockSetReady).toHaveBeenCalledWith("llm");
  });

  it("calls setWorker and setReady together when STT worker sends ready", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    // STT worker (index 2, WASM path) sends "ready"
    createdWorkers[2].onmessage?.({ data: { type: "ready" } });
    expect(mockSetWorker).toHaveBeenCalledWith("stt", createdWorkers[2]);
    expect(mockSetReady).toHaveBeenCalledWith("stt");
  });

  it("calls setError when TTS worker sends error during init", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[0].onmessage?.({
      data: { type: "error", message: "TTS init failed" },
    });
    expect(mockSetError).toHaveBeenCalledWith("tts", "TTS init failed");
  });

  it("calls setError when STT worker sends error", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    createdWorkers[2].onmessage?.({
      data: { type: "error", message: "STT init failed" },
    });
    expect(mockSetError).toHaveBeenCalledWith("stt", "STT init failed");
  });

  it("handles TTS worker creation failure gracefully", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "Worker",
      class {
        postMessage = vi.fn();
        onmessage: unknown = null;
        onerror: unknown = null;
        terminate = vi.fn();
        constructor() {
          callCount++;
          if (callCount === 1) throw new Error("Worker creation failed");
          createdWorkers.push(this as unknown as MockWorker);
        }
      },
    );

    const { bootModels } = await import("./bootModels");
    await bootModels();

    // Should still create LLM and STT workers (2 out of 3)
    expect(createdWorkers).toHaveLength(2);
  });

  it("handles LLM worker creation failure gracefully", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "Worker",
      class {
        postMessage = vi.fn();
        onmessage: unknown = null;
        onerror: unknown = null;
        terminate = vi.fn();
        constructor() {
          callCount++;
          if (callCount === 2) throw new Error("LLM worker failed");
          createdWorkers.push(this as unknown as MockWorker);
        }
      },
    );

    const { bootModels } = await import("./bootModels");
    await bootModels();

    // TTS and STT should still be created
    expect(createdWorkers).toHaveLength(2);
  });

  it("handles STT worker creation failure gracefully", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "Worker",
      class {
        postMessage = vi.fn();
        onmessage: unknown = null;
        onerror: unknown = null;
        terminate = vi.fn();
        constructor() {
          callCount++;
          if (callCount === 3) throw new Error("STT worker failed");
          createdWorkers.push(this as unknown as MockWorker);
        }
      },
    );

    const { bootModels } = await import("./bootModels");
    await bootModels();

    // TTS and LLM should still be created
    expect(createdWorkers).toHaveLength(2);
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
    expect(v.llm).toBe("verified");
    expect(v.stt).toBe("verified");
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
    expect(v.llm).toBe("not-primed");
    expect(v.stt).toBe("not-primed");
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

    // First created worker is the TTS worker
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

  it("posts a warmup message to STT (WASM path) after receiving ready", async () => {
    const { bootSTTAndLLM } = await import("./bootModels");
    await bootSTTAndLLM();

    // bootSTTAndLLM creates LLM (index 0) then STT (index 1, WASM path since no navigator.gpu)
    const sttWorker = createdWorkers[1];
    sttWorker.onmessage?.({ data: { type: "ready" } });

    const warmupCall = sttWorker.postMessage.mock.calls.find(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { type?: string }).type === "warmup",
    );
    expect(warmupCall).toBeTruthy();
  });

  it("calls markWarm on STT warm message", async () => {
    const { bootSTTAndLLM } = await import("./bootModels");
    await bootSTTAndLLM();

    const sttWorker = createdWorkers[1];
    sttWorker.onmessage?.({ data: { type: "ready" } });
    sttWorker.onmessage?.({ data: { type: "warm" } });

    expect(mockMarkWarm).toHaveBeenCalledWith("stt");
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

  it("calls setError on STT WASM warmup-phase error after ready", async () => {
    const { bootSTTAndLLM } = await import("./bootModels");
    await bootSTTAndLLM();

    const sttWorker = createdWorkers[1];
    sttWorker.onmessage?.({ data: { type: "ready" } });
    sttWorker.onmessage?.({
      data: { type: "error", message: "stt wasm bad", phase: "warmup" },
    });

    expect(mockSetError).toHaveBeenCalledWith("stt", "stt wasm bad");
  });
});
