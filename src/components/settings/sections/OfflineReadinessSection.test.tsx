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

/** Seed settingsStore with enough for runPreGeneration to fire. */
function seedSettings() {
  useSettingsStore.setState({
    cfg: { patientLang: "en", providers: [] } as unknown as AppSettings,
    speakerData: { embedding: [1, 2, 3] },
  });
}

const PRIMER_NAME = /download and verify voice files/i;
const VERIFY_NAME = /check existing files only/i;

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
    installStorageEstimate(500, 10_000); // 5% — no quota warning
  });
  afterEach(() => vi.clearAllMocks());

  it("renders the primary and secondary offline-prep buttons", () => {
    render(<OfflineReadinessSection t={light} theme="light" />);
    expect(screen.getByRole("button", { name: PRIMER_NAME })).toBeTruthy();
    expect(screen.getByRole("button", { name: VERIFY_NAME })).toBeTruthy();
  });

  it("runs the primer when the primary button is clicked and marks tts verified", async () => {
    render(<OfflineReadinessSection t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: PRIMER_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
    });
    await waitFor(() => {
      expect(useOfflineStore.getState().primerRunning).toBe(false);
    });
  });

  it("surfaces storage health info", async () => {
    render(<OfflineReadinessSection t={light} theme="light" />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Storage:/i);
      expect(text).toMatch(/used/);
    });
  });

  it("runs verifyAllOnBoot and marks complete when the secondary button is clicked", async () => {
    render(<OfflineReadinessSection t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: VERIFY_NAME }));

    await waitFor(() => {
      expect(verifyAllOnBootMock).toHaveBeenCalled();
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });
  });

  it("renders 'not yet downloaded' for models in the not-primed state", () => {
    useOfflineStore.getState().setModelVerified("tts", "not-primed");
    useOfflineStore.getState().setModelVerified("llm", "not-primed");
    render(<OfflineReadinessSection t={light} theme="light" />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/tts: not yet downloaded/i);
    expect(text).toMatch(/llm: not yet downloaded/i);
    // Should NOT say "needs retry" for a fresh install
    expect(text).not.toMatch(/needs retry/i);
  });

  it("renders 'needs retry' only when a model is in the needs-retry state", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    render(<OfflineReadinessSection t={light} theme="light" />);
    expect((document.body.textContent ?? "")).toMatch(/tts: needs retry/i);
  });

  it("hides the 'Clear audio cache' button when storage is healthy", () => {
    render(<OfflineReadinessSection t={light} theme="light" />);
    expect(
      screen.queryByRole("button", { name: /clear audio cache/i }),
    ).toBeNull();
  });

  it("shows 'Clear audio cache' only when storage usage is at or above warning threshold", async () => {
    installStorageEstimate(9000, 10_000);
    render(<OfflineReadinessSection t={light} theme="light" />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear audio cache/i }),
      ).toBeTruthy();
    });
  });

  it("shows 'Already up to date' when primer completes with zero downloads", async () => {
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 0 };
    });

    render(<OfflineReadinessSection t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: PRIMER_NAME }));

    await waitFor(() => {
      expect(screen.getByText(/already up to date/i)).toBeTruthy();
    });
  });

  it("auto-dismisses 'Already up to date' after timeout", async () => {
    vi.useFakeTimers();
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 0 };
    });

    render(<OfflineReadinessSection t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: PRIMER_NAME }));

    await waitFor(() => {
      expect(screen.getByText(/already up to date/i)).toBeTruthy();
    });

    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      expect(screen.queryByText(/already up to date/i)).toBeNull();
    });

    vi.useRealTimers();
  });

  it("does not show 'Already up to date' when primer downloaded files", async () => {
    drivePrimerMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.markPrimerComplete();
      return { downloadedCount: 3 };
    });

    render(<OfflineReadinessSection t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: PRIMER_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });

    expect(screen.queryByText(/already up to date/i)).toBeNull();
  });

  it("aborts the runner, clears the audio cache, and does not re-kick without cfg/speakerData", async () => {
    installStorageEstimate(9000, 10_000);
    render(<OfflineReadinessSection t={light} theme="light" />);

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
    render(<OfflineReadinessSection t={light} theme="light" />);

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

    render(<OfflineReadinessSection t={light} theme="light" />);

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

    render(<OfflineReadinessSection t={light} theme="light" />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /clear audio cache/i });
      expect(btn).toBeTruthy();
      expect(btn).toHaveProperty("disabled", false);
    });
  });

  it("does NOT disable the primary/secondary buttons during audio-cache rebuild", async () => {
    // Regression: PR #37 originally folded rebuildingCache into anyActionRunning,
    // leaving all four buttons disabled any time the audio-cache pre-generation
    // runner was active — which is the normal background state whenever a voice
    // clone is configured. This test locks the fix: rebuild only disables Clear.
    installStorageEstimate(500, 10_000); // healthy — no Clear button
    seedSettings();
    useAudioCacheStore.getState().start("patient", 100, "en", "fp-abc");

    render(<OfflineReadinessSection t={light} theme="light" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: PRIMER_NAME }),
      ).toHaveProperty("disabled", false);
      expect(
        screen.getByRole("button", { name: VERIFY_NAME }),
      ).toHaveProperty("disabled", false);
    });
  });
});
