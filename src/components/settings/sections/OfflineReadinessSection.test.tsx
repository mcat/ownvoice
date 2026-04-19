/** @jsxImportSource preact */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { OfflineReadinessSection } from "./OfflineReadinessSection";
import { useOfflineStore } from "../../../stores/offlineStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { light } from "../../../theme/tokens";
import type { AppSettings } from "../../../types";

const drivePrimerMock = vi.fn(async () => {
  const s = useOfflineStore.getState();
  s.setModelVerified("tts", "verified");
  s.markPrimerComplete();
  return { downloadedCount: 1 };
});
vi.mock("../../../models/drivePrimer", () => ({
  drivePrimer: (...args: unknown[]) => drivePrimerMock(...args),
}));

const verifyAllOnBootMock = vi.fn(async () => {
  useOfflineStore.getState().setModelVerified("tts", "verified");
});
vi.mock("../../../models/bootModels", () => ({
  verifyAllOnBoot: () => verifyAllOnBootMock(),
}));

const clearAudioCacheMock = vi.fn(async () => {});
vi.mock("../../../models/audioCache", () => ({
  clearAudioCache: () => clearAudioCacheMock(),
}));

const abortRunnerMock = vi.fn();
const runPreGenerationMock = vi.fn();
vi.mock("../../../models/audioCacheRunner", () => ({
  abort: () => abortRunnerMock(),
  runPreGeneration: (cfg: unknown, data: unknown) => runPreGenerationMock(cfg, data),
  retryFailed: vi.fn(),
}));

function installStorageEstimate(usage: number, quota: number) {
  Object.defineProperty(navigator, "storage", {
    value: { estimate: vi.fn(async () => ({ usage, quota })) },
    configurable: true,
    writable: true,
  });
}

function seedSettings() {
  useSettingsStore.setState({
    cfg: { patientLang: "en", providers: [] } as unknown as AppSettings,
    speakerData: { embedding: [1, 2, 3] },
  });
}

const CHECK_NAME = /check existing models/i;
const REDOWNLOAD_NAME = /redownload models/i;

describe("OfflineReadinessSection", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    useAudioCacheStore.getState().abortAll();
    useSettingsStore.getState().reset();
    drivePrimerMock.mockClear();
    verifyAllOnBootMock.mockClear();
    clearAudioCacheMock.mockClear();
    abortRunnerMock.mockClear();
    runPreGenerationMock.mockClear();
    installStorageEstimate(500, 10_000);
  });
  afterEach(() => vi.clearAllMocks());

  it("renders only the secondary check button when no models are in the store yet", () => {
    render(<OfflineReadinessSection t={light} />);
    // Redownload primary is conditional on needs-retry — absent on fresh render
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
    expect(screen.getByRole("button", { name: CHECK_NAME })).toBeTruthy();
  });

  it("shows 'All models ready' when every model is verified", () => {
    useOfflineStore.getState().setModelVerified("tts", "verified");
    useOfflineStore.getState().setModelVerified("llm", "verified");
    useOfflineStore.getState().setModelVerified("stt", "verified");
    render(<OfflineReadinessSection t={light} />);
    expect(screen.getByText(/all models ready/i)).toBeTruthy();
    // No recovery button needed
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
  });

  it("shows 'Redownload models' only when a model is in needs-retry", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    useOfflineStore.getState().setModelVerified("llm", "verified");
    render(<OfflineReadinessSection t={light} />);
    expect(screen.getByRole("button", { name: REDOWNLOAD_NAME })).toBeTruthy();
  });

  it("Redownload triggers the primer and updates the store", async () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
    });
  });

  it("hides the Redownload button while primer is already running", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    useOfflineStore.getState().setPrimerRunning(true);
    render(<OfflineReadinessSection t={light} />);
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
    // But the progress message shows instead
    expect(screen.getByText(/downloading models/i)).toBeTruthy();
  });

  it("renders 'downloading…' for models currently in not-primed state", () => {
    useOfflineStore.getState().setModelVerified("tts", "not-primed");
    useOfflineStore.getState().setModelVerified("llm", "not-primed");
    render(<OfflineReadinessSection t={light} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/tts: downloading/i);
    expect(text).toMatch(/llm: downloading/i);
    expect(text).not.toMatch(/needs retry/i);
  });

  it("renders 'needs retry' only when a model is in the needs-retry state", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    render(<OfflineReadinessSection t={light} />);
    expect((document.body.textContent ?? "")).toMatch(/tts: needs retry/i);
  });

  it("surfaces storage health info", async () => {
    render(<OfflineReadinessSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Storage:/i);
      expect(text).toMatch(/used/);
    });
  });

  it("runs verifyAllOnBoot when the secondary button is clicked", async () => {
    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: CHECK_NAME }));

    await waitFor(() => {
      expect(verifyAllOnBootMock).toHaveBeenCalled();
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });
  });

  it("hides the 'Clear audio cache' button when storage is healthy", () => {
    render(<OfflineReadinessSection t={light} />);
    expect(
      screen.queryByRole("button", { name: /clear audio cache/i }),
    ).toBeNull();
  });

  it("shows 'Clear audio cache' only when storage usage is at or above warning threshold", async () => {
    installStorageEstimate(9000, 10_000);
    render(<OfflineReadinessSection t={light} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear audio cache/i }),
      ).toBeTruthy();
    });
  });

  it("shows 'Already up to date' when Redownload completes with zero downloads", async () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 0 };
    });

    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(screen.getByText(/already up to date/i)).toBeTruthy();
    });
  });

  it("auto-dismisses 'Already up to date' after timeout", async () => {
    vi.useFakeTimers();
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 0 };
    });

    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(screen.getByText(/already up to date/i)).toBeTruthy();
    });

    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      expect(screen.queryByText(/already up to date/i)).toBeNull();
    });

    vi.useRealTimers();
  });

  it("does not show 'Already up to date' when Redownload actually downloaded files", async () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 3 };
    });

    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });

    expect(screen.queryByText(/already up to date/i)).toBeNull();
  });

  it("aborts the runner, clears the audio cache, and does not re-kick without cfg/speakerData", async () => {
    installStorageEstimate(9000, 10_000);
    render(<OfflineReadinessSection t={light} />);

    const btn = await screen.findByRole("button", { name: /clear audio cache/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(abortRunnerMock).toHaveBeenCalled();
      expect(clearAudioCacheMock).toHaveBeenCalled();
    });
    expect(runPreGenerationMock).not.toHaveBeenCalled();
  });

  it("clicking Clear triggers abort, clearAudioCache, and runPreGeneration in order", async () => {
    installStorageEstimate(9000, 10_000);
    seedSettings();
    render(<OfflineReadinessSection t={light} />);

    const btn = await screen.findByRole("button", { name: /clear audio cache/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(abortRunnerMock).toHaveBeenCalled();
      expect(clearAudioCacheMock).toHaveBeenCalled();
      expect(runPreGenerationMock).toHaveBeenCalled();
    });
  });

  it("shows 'Rebuilding: N / M' during rebuild phase and keeps Clear button disabled", async () => {
    installStorageEstimate(9000, 10_000);
    seedSettings();
    useAudioCacheStore.getState().start("patient", 150, "en", "fp-abc");
    useAudioCacheStore.getState().progress("patient", "Hello", 42);

    render(<OfflineReadinessSection t={light} />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /rebuilding/i });
      expect(btn).toBeTruthy();
      expect(btn.textContent).toMatch(/42\s*\/\s*150/);
      expect(btn).toHaveProperty("disabled", true);
    });
  });

  it("returns to 'Clear audio cache' when rebuild completes", async () => {
    installStorageEstimate(9000, 10_000);
    seedSettings();
    useAudioCacheStore.getState().start("patient", 10, "en", "fp-abc");
    useAudioCacheStore.getState().progress("patient", "Done", 10);
    useAudioCacheStore.getState().finish("patient");

    render(<OfflineReadinessSection t={light} />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /clear audio cache/i });
      expect(btn).toBeTruthy();
      expect(btn).toHaveProperty("disabled", false);
    });
  });

  it("does NOT disable the secondary Check button during audio-cache rebuild", async () => {
    // Regression lock: audio-cache pre-gen is normal background behavior and
    // must not block clinician-initiated offline-prep actions.
    installStorageEstimate(500, 10_000);
    seedSettings();
    useAudioCacheStore.getState().start("patient", 100, "en", "fp-abc");

    render(<OfflineReadinessSection t={light} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: CHECK_NAME }),
      ).toHaveProperty("disabled", false);
    });
  });
});
