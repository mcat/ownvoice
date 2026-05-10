import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/preact";
import { PatientVoiceStatus } from "./PatientVoiceStatus";

const mockMgr = {
  isWarm: vi.fn().mockReturnValue(false),
  getProgress: vi.fn().mockReturnValue([]),
  onProgress: vi.fn().mockReturnValue(() => {}),
  init: vi.fn().mockResolvedValue(undefined),
  getWorker: vi.fn().mockReturnValue(null),
  clearError: vi.fn(),
};

vi.mock("../../models/modelManager", () => ({
  getModelManager: () => mockMgr,
}));

vi.mock("../../hooks/useModels", () => ({
  useModels: () => ({
    isWarm: mockMgr.isWarm,
    isReady: () => false,
    isLoading: () => false,
    getError: vi.fn().mockReturnValue(undefined),
    humanCountdown: vi.fn().mockReturnValue(null),
    isAlmostReady: vi.fn().mockReturnValue(false),
    secondsLeft: () => undefined,
    progress: [],
    initialized: true,
    totalProgress: () => ({ loaded: 0, total: 0 }),
  }),
}));

const patient = {
  id: "p1",
  name: "Alex",
  bed: "12",
  patientLang: "en",
  hasVoice: true,
  speakerData: null,
  pendingVoiceBlob: "ZmFrZQ==",
  addedAt: Date.now(),
  lastActiveAt: Date.now(),
};

describe("PatientVoiceStatus", () => {
  beforeEach(() => {
    cleanup();
    mockMgr.isWarm.mockReturnValue(false);
  });

  it("renders 'Using a temporary voice' when not warm", () => {
    render(<PatientVoiceStatus patient={patient as any} />);
    expect(screen.getByText(/Using a temporary voice/i)).toBeInTheDocument();
  });

  it("hides when warm and speakerData is set", () => {
    mockMgr.isWarm.mockReturnValue(true);
    const ready = { ...patient, speakerData: { foo: 1 }, pendingVoiceBlob: null };
    const { container } = render(<PatientVoiceStatus patient={ready as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a Try again button on failure", async () => {
    // Re-mock useModels to return an error
    vi.doMock("../../hooks/useModels", () => ({
      useModels: () => ({
        isWarm: () => false,
        isReady: () => false,
        isLoading: () => false,
        getError: () => "boom",
        humanCountdown: () => null,
        isAlmostReady: () => false,
        secondsLeft: () => undefined,
        progress: [],
        initialized: true,
        totalProgress: () => ({ loaded: 0, total: 0 }),
      }),
    }));
    vi.resetModules();
    const { PatientVoiceStatus: Fresh } = await import("./PatientVoiceStatus");
    render(<Fresh patient={patient as any} />);
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeInTheDocument();
  });

  it("Try again click clears the error and posts warmup to the worker", async () => {
    const postMessage = vi.fn();
    vi.doMock("../../hooks/useModels", () => ({
      useModels: () => ({
        isWarm: () => false,
        isReady: () => false,
        isLoading: () => false,
        getError: () => "boom",
        humanCountdown: () => null,
        isAlmostReady: () => false,
        secondsLeft: () => undefined,
        progress: [],
        initialized: true,
        totalProgress: () => ({ loaded: 0, total: 0 }),
      }),
    }));
    mockMgr.clearError.mockClear();
    mockMgr.getWorker.mockReturnValue({ postMessage } as any);
    vi.resetModules();
    const { PatientVoiceStatus: Fresh } = await import("./PatientVoiceStatus");
    render(<Fresh patient={patient as any} />);
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(mockMgr.clearError).toHaveBeenCalledWith("tts");
    expect(postMessage).toHaveBeenCalledWith({ type: "warmup" });
  });

  it("status pill is not a button", () => {
    render(<PatientVoiceStatus patient={patient as any} />);
    const pill = screen.getByRole("status");
    expect(pill.tagName).not.toBe("BUTTON");
  });
});
