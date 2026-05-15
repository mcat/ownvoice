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

// Mock the settings store so bootTTSWasm's warmup-skip decision is
// deterministic — the real store goes through Zustand's persist
// middleware (async IDB hydration in jsdom) which would race with the
// synchronous onmessage handler under test.
const mockSettingsGetState = vi.fn<
  () => { cfg: { patients: { speakerData: unknown }[] } | null; _hasHydrated: boolean }
>(() => ({ cfg: null, _hasHydrated: false }));
vi.mock("../stores/settingsStore", () => ({
  useSettingsStore: { getState: mockSettingsGetState },
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
  // Default to "not hydrated yet" — matches the prior-art assumption
  // baked into the existing eager-warmup tests, so they keep passing.
  mockSettingsGetState.mockReturnValue({ cfg: null, _hasHydrated: false });
});

describe("bootModels", () => {
  it("calls mgr.init() before creating any workers", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    expect(mockInit).toHaveBeenCalled();
  });

  it("creates 2 workers (TTS WASM + STT WASM in jsdom — no navigator.gpu)", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();
    expect(createdWorkers).toHaveLength(2);
  });

  it("registers the TTS worker with setWorker immediately", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    // TTS registers immediately; STT registers later (on ready). So at
    // boot return, only the TTS setWorker call has fired.
    expect(mockSetWorker).toHaveBeenCalledWith("tts", expect.anything());
    const ttsCalls = mockSetWorker.mock.calls.filter((c) => c[0] === "tts");
    expect(ttsCalls).toHaveLength(1);
  });

  it("dispatches STT boot in parallel with TTS — both workers are constructed", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    // Two workers constructed: TTS WASM and STT WASM (jsdom has no
    // navigator.gpu, so the GPU branch is skipped and we land directly
    // on bootSTTWasm). Confirms STT boot is dispatched alongside TTS
    // rather than chained behind it.
    expect(createdWorkers).toHaveLength(2);

    // STT worker, on ready, must register itself with setWorker("stt", ...).
    const sttWorker = createdWorkers[1];
    sttWorker.onmessage?.({ data: { type: "ready" } });
    expect(mockSetWorker).toHaveBeenCalledWith("stt", expect.anything());
    expect(mockSetReady).toHaveBeenCalledWith("stt");
  });

  it("posts init message with the TTS model URL and bench flag", async () => {
    const { bootModels } = await import("./bootModels");
    await bootModels();

    expect(createdWorkers[0].postMessage).toHaveBeenCalledWith({
      type: "init",
      modelUrl: MODEL_URLS.tts,
      bench: false,
      // sessionNeedsCangjie defaults to true on a fresh/unhydrated store
      // — the test env doesn't seed settings, so we always expect this
      // safe-default branch.
      loadCangjie: true,
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

describe("sessionNeedsCangjie", () => {
  beforeEach(() => {
    // The other tests mock modelManager but use the real settingsStore.
    // Reset it to a known state before each Cangjie-flag test so the
    // store-from-previous-test doesn't bleed across.
  });

  it("returns true when settings have not hydrated yet (safe default)", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({ cfg: null, _hasHydrated: false });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(true);
  });

  it("returns true when cfg is null (fresh device)", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({ cfg: null, _hasHydrated: true });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(true);
  });

  it("returns true when caregiverLang is zh", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: {
        pin: "",
        caregiverLang: "zh",
        providers: [],
        patients: [],
        activePatientId: null,
      },
    });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(true);
  });

  it("returns true when caregiverLang is a zh-* sublocale", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: {
        pin: "",
        caregiverLang: "zh-TW",
        providers: [],
        patients: [],
        activePatientId: null,
      },
    });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(true);
  });

  it("returns true when any patient's patientLang is zh", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: {
        pin: "",
        caregiverLang: "en",
        providers: [],
        patients: [
          {
            id: "a",
            name: "",
            bed: "",
            patientLang: "en",
            hasVoice: false,
            speakerData: null,
            addedAt: 0,
            lastActiveAt: 0,
          },
          {
            id: "b",
            name: "",
            bed: "",
            patientLang: "zh",
            hasVoice: false,
            speakerData: null,
            addedAt: 0,
            lastActiveAt: 0,
          },
        ],
        activePatientId: null,
      },
    });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(true);
  });

  it("returns false when all locales are non-zh", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: {
        pin: "",
        caregiverLang: "en",
        providers: [],
        patients: [
          {
            id: "a",
            name: "",
            bed: "",
            patientLang: "es",
            hasVoice: false,
            speakerData: null,
            addedAt: 0,
            lastActiveAt: 0,
          },
        ],
        activePatientId: null,
      },
    });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(false);
  });

  it("returns false on a hydrated empty-patient device with non-zh caregiverLang", async () => {
    const { useSettingsStore } = await import("../stores/settingsStore");
    useSettingsStore.setState({
      _hasHydrated: true,
      cfg: {
        pin: "",
        caregiverLang: "fr",
        providers: [],
        patients: [],
        activePatientId: null,
      },
    });
    const { sessionNeedsCangjie } = await import("./bootModels");
    expect(sessionNeedsCangjie()).toBe(false);
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

describe("bootTTSWasm — skip warmup when all patients enrolled", () => {
  function hasWarmupCall(worker: MockWorker): boolean {
    return worker.postMessage.mock.calls.some(
      (call: unknown[]) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { type?: string }).type === "warmup",
    );
  }

  it("skips warmup when every patient already has speakerData", async () => {
    // Returning device with all patients fully enrolled. The eager
    // encoder warmup would load ~291 MB just to prep first-enrollment
    // latency — pointless when no enrollment is pending. Skipping
    // drops that peak from the iPad boot path.
    mockSettingsGetState.mockReturnValue({
      cfg: { patients: [{ speakerData: { condEmb: [0.1] } }] },
      _hasHydrated: true,
    });

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();
    createdWorkers[0].onmessage?.({ data: { type: "ready" } });

    expect(hasWarmupCall(createdWorkers[0])).toBe(false);
  });

  it("posts warmup when at least one patient is missing speakerData", async () => {
    mockSettingsGetState.mockReturnValue({
      cfg: { patients: [{ speakerData: { condEmb: [0.1] } }, { speakerData: null }] },
      _hasHydrated: true,
    });

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();
    createdWorkers[0].onmessage?.({ data: { type: "ready" } });

    expect(hasWarmupCall(createdWorkers[0])).toBe(true);
  });

  it("posts warmup when settings have not hydrated yet (fall through to old behavior)", async () => {
    // Edge case: TTS worker's "ready" arrives before settings rehydrate
    // from IDB. We err on the side of warming so the user-facing
    // first-enrollment path stays fast.
    mockSettingsGetState.mockReturnValue({
      cfg: { patients: [{ speakerData: { condEmb: [0.1] } }] },
      _hasHydrated: false,
    });

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();
    createdWorkers[0].onmessage?.({ data: { type: "ready" } });

    expect(hasWarmupCall(createdWorkers[0])).toBe(true);
  });

  it("posts warmup on a fresh device (no patients)", async () => {
    mockSettingsGetState.mockReturnValue({
      cfg: { patients: [] },
      _hasHydrated: true,
    });

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();
    createdWorkers[0].onmessage?.({ data: { type: "ready" } });

    expect(hasWarmupCall(createdWorkers[0])).toBe(true);
  });
});
