import { useSettingsStore } from "./settingsStore";
import { useConversationStore } from "./conversationStore";
import { useUIStore } from "./uiStore";
import { useOfflineStore } from "./offlineStore";
import { makeTestCfg } from "../test/makeCfg";

// Mock external deps that touch OPFS / workers
vi.mock("../store", () => ({
  clearAll: vi.fn(() => Promise.resolve()),
}));

vi.mock("../models/audioCache", () => ({
  clearAudioCache: vi.fn(() => Promise.resolve()),
}));

vi.mock("../models/audioCacheRunner", () => ({
  abort: vi.fn(),
  runPreGeneration: vi.fn(),
  retryFailed: vi.fn(),
}));

const mockModelManager = {
  clearAll: vi.fn(() => Promise.resolve()),
};

vi.mock("../models/modelManager", () => ({
  getModelManager: vi.fn(() => mockModelManager),
}));

// Import after mocks are set up
import { resetAll } from "./resetAll";
import { clearAll } from "../store";
import { clearAudioCache } from "../models/audioCache";
import * as audioCacheRunner from "../models/audioCacheRunner";
import { getModelManager } from "../models/modelManager";

const TEST_PATIENT_ID = "test-patient-1";

beforeEach(() => {
  vi.clearAllMocks();
  // Set up some non-default state so we can verify the reset
  const cfg = makeTestCfg({
    patient: { name: "Alice", bed: "C-3", patientLang: "es", hasVoice: true, speakerData: { data: true } },
    cfg: { pin: "9999" },
  });
  useSettingsStore.setState({
    cfg,
    speakerData: null,
  });
  useConversationStore.setState({
    messagesByPatientId: {
      [TEST_PATIENT_ID]: [{ from: "patient", text: "Help", time: "1:00 PM", label: "quick" }],
    },
  });
  useUIStore.getState().setTab("pain");
  useUIStore.getState().openOverlay("wishes");
});

describe("resetAll", () => {
  it("calls clearAll from store.ts", async () => {
    await resetAll();
    expect(clearAll).toHaveBeenCalledOnce();
  });

  it("calls clearAudioCache", async () => {
    await resetAll();
    expect(clearAudioCache).toHaveBeenCalledOnce();
  });

  it("aborts the audio cache runner before clearing OPFS", async () => {
    const abortOrder: string[] = [];
    vi.mocked(audioCacheRunner.abort).mockImplementation(() => {
      abortOrder.push("abort");
    });
    vi.mocked(clearAudioCache).mockImplementation(async () => {
      abortOrder.push("clear");
    });

    await resetAll();

    expect(audioCacheRunner.abort).toHaveBeenCalledOnce();
    expect(abortOrder).toEqual(["abort", "clear"]);
  });

  it("calls modelManager.clearAll", async () => {
    await resetAll();
    const manager = getModelManager();
    expect(manager.clearAll).toHaveBeenCalledOnce();
  });

  it("resets settings store", async () => {
    await resetAll();
    const s = useSettingsStore.getState();
    expect(s.cfg).toBeNull();
    expect(s.speakerData).toBeNull();
  });

  it("clears conversation store", async () => {
    await resetAll();
    expect(useConversationStore.getState().messagesByPatientId).toEqual({});
  });

  it("resets UI store", async () => {
    await resetAll();
    const ui = useUIStore.getState();
    expect(ui.tab).toBe("quick");
    expect(ui.wishesOpen).toBe(false);
  });

  it("clears offlineStore", async () => {
    useOfflineStore.getState().setModelVerified("tts", true);
    useOfflineStore.getState().markPrimerComplete();
    await resetAll();
    expect(useOfflineStore.getState().verified).toEqual({});
    expect(useOfflineStore.getState().lastVerifiedAt).toBeNull();
  });

  it("clears localStorage theme override", async () => {
    localStorage.setItem("ov-theme", "dark");
    await resetAll();
    expect(localStorage.getItem("ov-theme")).toBeNull();
  });

  it("deletes every Cache API entry returned by caches.keys()", async () => {
    vi.mocked(caches.keys).mockResolvedValueOnce(["models-v1", "audio-v2"]);
    vi.mocked(caches.delete).mockResolvedValue(true);

    await resetAll();

    expect(caches.delete).toHaveBeenCalledWith("models-v1");
    expect(caches.delete).toHaveBeenCalledWith("audio-v2");
    expect(caches.delete).toHaveBeenCalledTimes(2);
  });

  it("unregisters every active service worker registration", async () => {
    const unregisterA = vi.fn(() => Promise.resolve(true));
    const unregisterB = vi.fn(() => Promise.resolve(true));
    vi.mocked(navigator.serviceWorker.getRegistrations).mockResolvedValueOnce([
      { unregister: unregisterA } as unknown as ServiceWorkerRegistration,
      { unregister: unregisterB } as unknown as ServiceWorkerRegistration,
    ]);

    await resetAll();

    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalledOnce();
    expect(unregisterA).toHaveBeenCalledOnce();
    expect(unregisterB).toHaveBeenCalledOnce();
  });
});
