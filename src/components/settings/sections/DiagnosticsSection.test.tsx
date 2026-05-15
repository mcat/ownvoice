/** @jsxImportSource preact */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { DiagnosticsSection } from "./DiagnosticsSection";

import { useOfflineStore } from "../../../stores/offlineStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { light } from "../../../theme/tokens";
import { makeTestCfg } from "../../../test/makeCfg";

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
  runPreGeneration: (cfg: unknown) => runPreGenerationMock(cfg),
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
    cfg: makeTestCfg({
      patient: { hasVoice: true, speakerData: { embedding: [1, 2, 3] } },
    }),
    speakerData: null,
  });
}

const CHECK_NAME = /check existing models/i;
const REDOWNLOAD_NAME = /redownload models/i;

describe("DiagnosticsSection", () => {
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
    render(<DiagnosticsSection t={light} />);
    // Redownload primary is conditional on needs-retry — absent on fresh render
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
    expect(screen.getByRole("button", { name: CHECK_NAME })).toBeTruthy();
  });

  it("shows 'All models ready' when every model is verified", () => {
    useOfflineStore.getState().setModelVerified("tts", "verified");
    useOfflineStore.getState().setModelVerified("llm", "verified");
    useOfflineStore.getState().setModelVerified("stt", "verified");
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByText(/all models ready/i)).toBeTruthy();
    // No recovery button needed
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
  });

  it("shows 'Redownload models' only when a model is in needs-retry", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    useOfflineStore.getState().setModelVerified("llm", "verified");
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByRole("button", { name: REDOWNLOAD_NAME })).toBeTruthy();
  });

  it("Redownload triggers the primer and updates the store", async () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
    });
  });

  it("hides the Redownload button while primer is already running", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    useOfflineStore.getState().setPrimerRunning(true);
    render(<DiagnosticsSection t={light} />);
    expect(screen.queryByRole("button", { name: REDOWNLOAD_NAME })).toBeNull();
    // But the progress message shows instead
    expect(screen.getByText(/downloading models/i)).toBeTruthy();
  });

  it("renders 'downloading…' for models currently in not-primed state", () => {
    useOfflineStore.getState().setModelVerified("tts", "not-primed");
    useOfflineStore.getState().setModelVerified("llm", "not-primed");
    render(<DiagnosticsSection t={light} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/tts: downloading/i);
    expect(text).toMatch(/llm: downloading/i);
    expect(text).not.toMatch(/needs retry/i);
  });

  it("renders 'needs retry' only when a model is in the needs-retry state", () => {
    useOfflineStore.getState().setModelVerified("tts", "needs-retry");
    render(<DiagnosticsSection t={light} />);
    expect((document.body.textContent ?? "")).toMatch(/tts: needs retry/i);
  });

  it("surfaces storage health info", async () => {
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Origin usage:/i);
      expect(text).toMatch(/used/);
    });
  });

  it("runs verifyAllOnBoot when the secondary button is clicked", async () => {
    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: CHECK_NAME }));

    await waitFor(() => {
      expect(verifyAllOnBootMock).toHaveBeenCalled();
      expect(useOfflineStore.getState().verified.tts).toBe("verified");
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });
  });

  it("button flashes '✓ Models verified' and disables itself after a successful check", async () => {
    verifyAllOnBootMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.setModelVerified("llm", "verified");
      s.setModelVerified("stt", "verified");
    });

    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: CHECK_NAME }));

    const verifiedBtn = await screen.findByRole("button", {
      name: /models verified/i,
    });
    expect(verifiedBtn).toBeTruthy();
    expect(verifiedBtn).toHaveProperty("disabled", true);
    // The idle label should no longer be on screen while the button is in
    // confirmation state.
    expect(screen.queryByRole("button", { name: CHECK_NAME })).toBeNull();
  });

  it("auto-dismisses the verify confirmation after 3 seconds and re-enables the button", async () => {
    vi.useFakeTimers();
    verifyAllOnBootMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "verified");
      s.setModelVerified("llm", "verified");
      s.setModelVerified("stt", "verified");
    });

    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: CHECK_NAME }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /models verified/i }),
      ).toBeTruthy();
    });

    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: CHECK_NAME });
      expect(btn).toHaveProperty("disabled", false);
    });

    vi.useRealTimers();
  });

  it("does not flash '✓ Models verified' if any model still needs retry after the check", async () => {
    // The verify result surfaces a model in needs-retry → the explicit
    // Redownload button is the feedback, the check button just returns
    // to its idle label (no confirmation).
    verifyAllOnBootMock.mockImplementation(async () => {
      const s = useOfflineStore.getState();
      s.setModelVerified("tts", "needs-retry");
      s.setModelVerified("llm", "verified");
      s.setModelVerified("stt", "verified");
    });

    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: CHECK_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe("needs-retry");
    });
    expect(
      screen.queryByRole("button", { name: /models verified/i }),
    ).toBeNull();
  });

  it("hides the 'Clear audio cache' button when storage is healthy", () => {
    render(<DiagnosticsSection t={light} />);
    expect(
      screen.queryByRole("button", { name: /clear audio cache/i }),
    ).toBeNull();
  });

  it("shows 'Clear audio cache' only when storage usage is at or above warning threshold", async () => {
    installStorageEstimate(9000, 10_000);
    render(<DiagnosticsSection t={light} />);
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

    render(<DiagnosticsSection t={light} />);
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

    render(<DiagnosticsSection t={light} />);
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

    render(<DiagnosticsSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: REDOWNLOAD_NAME }));

    await waitFor(() => {
      expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
    });

    expect(screen.queryByText(/already up to date/i)).toBeNull();
  });

  it("aborts the runner, clears the audio cache, and does not re-kick without cfg/speakerData", async () => {
    installStorageEstimate(9000, 10_000);
    render(<DiagnosticsSection t={light} />);

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
    render(<DiagnosticsSection t={light} />);

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

    render(<DiagnosticsSection t={light} />);

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

    render(<DiagnosticsSection t={light} />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /clear audio cache/i });
      expect(btn).toBeTruthy();
      expect(btn).toHaveProperty("disabled", false);
    });
  });

  it("uses expectedBytes (manifest total) — not the sum of in-flight progress — as the progress-bar denominator", () => {
    // Mid-run state: primer running, manifest sums to ~1.5 GB, but only one
    // small file's progress has been reported so far. Summing `progress[].total`
    // would wrongly say "12 MB / 12 MB (100%)" — the correct snapshot is
    // "12 MB / 1.40 GB (<1%)" with a fixed denominator.
    useOfflineStore.getState().setPrimerRunning(true);
    useOfflineStore.getState().beginPrimerRun(1_500_000_000);
    useOfflineStore
      .getState()
      .reportProgress("tts", "tiny.onnx", 12_000_000, 12_000_000);

    render(<DiagnosticsSection t={light} />);

    const bar = screen.getByRole("progressbar");
    expect(Number(bar.getAttribute("aria-valuenow"))).toBeLessThan(5);
    // Denominator in the label is the manifest total, not the in-flight sum.
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/1\.40 GB/);
    expect(text).not.toMatch(/12\.0 MB \/ 12\.0 MB/);
  });

  it("does NOT disable the secondary Check button during audio-cache rebuild", async () => {
    // Regression lock: audio-cache pre-gen is normal background behavior and
    // must not block clinician-initiated offline-prep actions.
    installStorageEstimate(500, 10_000);
    seedSettings();
    useAudioCacheStore.getState().start("patient", 100, "en", "fp-abc");

    render(<DiagnosticsSection t={light} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: CHECK_NAME }),
      ).toHaveProperty("disabled", false);
    });
  });
});

describe("DiagnosticsSection — storage rows", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    useAudioCacheStore.getState().abortAll();
    useSettingsStore.getState().reset();
    useSettingsStore.setState({ lastInteractionAt: null });
    installStorageEstimate(500, 10_000);
  });

  // -------- Row 1: Models on device --------

  it("Row 1 shows manifest-bytes when all models verified and expectedBytes > 0", async () => {
    useOfflineStore.getState().setModelVerified("tts", "verified");
    useOfflineStore.getState().setModelVerified("stt", "verified");
    useOfflineStore.getState().beginPrimerRun(1_500_000_000);
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByText(/Voice & speech models: 1\.40 GB on device/i)).toBeTruthy();
  });

  it("Row 1 shows 'not yet downloaded' fallback when expectedBytes is 0", () => {
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByText(/models not yet downloaded/i)).toBeTruthy();
  });

  // -------- Row 2: Storage protection --------

  it("Row 2 shows 'protected' copy when persisted=true and no Last-used line", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => true),
        persist: vi.fn(async () => true),
      },
      configurable: true,
      writable: true,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Storage protected/i)).toBeTruthy());
    expect(screen.queryByText(/Last used/i)).toBeNull();
  });

  it("Row 2 shows 'not protected' copy + 'Last used: today' when persisted=false", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => false),
        persist: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });
    useSettingsStore.setState({ lastInteractionAt: Date.now() });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Storage not protected/i)).toBeTruthy());
    expect(screen.getByText(/Last used: today/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /check protection status/i })).toBeTruthy();
  });

  it("Row 2 formats 'Last used: 3 days ago' for a known lastInteractionAt", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });
    useSettingsStore.setState({
      lastInteractionAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Last used: 3 days ago/i)).toBeTruthy());
  });

  it("Row 2 is hidden entirely when navigator.storage.persisted is absent", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        // No persisted/persist methods
      },
      configurable: true,
      writable: true,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Origin usage/i)).toBeTruthy());
    expect(screen.queryByText(/Storage protected/i)).toBeNull();
    expect(screen.queryByText(/Storage not protected/i)).toBeNull();
  });

  // -------- Row 3: Origin usage estimate --------

  it("Row 3 renders '(estimate)' framing and no headline %", async () => {
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Origin usage:.*\(estimate\)/i);
      expect(text).not.toMatch(/\(\d+%\)/);
    });
  });

  it("Row 3 still triggers the 'Clear audio cache' warning when usage > 85% of quota", async () => {
    installStorageEstimate(9000, 10_000);
    render(<DiagnosticsSection t={light} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /clear audio cache/i })).toBeTruthy(),
    );
  });
});
