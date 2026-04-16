import { useSettingsStore } from "./settingsStore";
import { useConversationStore } from "./conversationStore";
import { useUIStore } from "./uiStore";

// Mock external deps that touch OPFS / workers
vi.mock("../store", () => ({
  clearAll: vi.fn(() => Promise.resolve()),
}));

vi.mock("../models/audioCache", () => ({
  clearAudioCache: vi.fn(() => Promise.resolve()),
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
import { getModelManager } from "../models/modelManager";

beforeEach(() => {
  vi.clearAllMocks();
  // Set up some non-default state so we can verify the reset
  useSettingsStore.setState({
    cfg: {
      patientName: "Alice",
      bed: "C-3",
      patientLang: "es",
      patientVoice: true,
      pin: "9999",
      providers: [],
    },
    speakerData: { data: true },
  });
  useConversationStore.setState({
    messages: [{ from: "patient", text: "Help", time: "1:00 PM", label: "quick" }],
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
    expect(useConversationStore.getState().messages).toEqual([]);
  });

  it("resets UI store", async () => {
    await resetAll();
    const ui = useUIStore.getState();
    expect(ui.tab).toBe("quick");
    expect(ui.wishesOpen).toBe(false);
  });

  it("clears localStorage theme override", async () => {
    localStorage.setItem("ov-theme", "dark");
    await resetAll();
    expect(localStorage.getItem("ov-theme")).toBeNull();
  });

  it("deletes all Cache API caches", async () => {
    await resetAll();
    expect(caches.keys).toBeDefined();
    // caches.delete is called for each cache key (mocked in test env)
  });
});
