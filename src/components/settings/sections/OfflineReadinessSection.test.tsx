/** @jsxImportSource preact */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { OfflineReadinessSection } from "./OfflineReadinessSection";
import { useOfflineStore } from "../../../stores/offlineStore";
import { light } from "../../../theme/tokens";

vi.mock("../../../models/modelsManifest", () => ({
  loadManifest: vi.fn(async () => ({
    version: 1,
    models: {
      tts: {
        baseUrl: "/models/tts/",
        files: [{ name: "a.onnx", size: 10, magic: "onnx" }],
      },
      llm: { baseUrl: "/models/llm/", files: [] },
      stt: { baseUrl: "/models/stt/", files: [] },
    },
  })),
}));

vi.mock("../../../models/offlinePrimer", () => ({
  primeOffline: vi.fn(async function* () {
    yield { type: "model-start", model: "tts" } as const;
    yield {
      type: "download-start",
      model: "tts",
      file: "a.onnx",
      size: 10,
    } as const;
    yield { type: "model-verified", model: "tts", ok: true } as const;
    yield { type: "complete", allOk: true } as const;
  }),
}));

const verifyAllOnBootMock = vi.fn(async () => {
  useOfflineStore.getState().setModelVerified("tts", true);
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

describe("OfflineReadinessSection", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    verifyAllOnBootMock.mockClear();
    clearAudioCacheMock.mockClear();
    abortRunnerMock.mockClear();
    runPreGenerationMock.mockClear();
    installStorageEstimate(500, 10_000); // 5% usage — no warning
  });
  afterEach(() => vi.clearAllMocks());

  it("shows a 'Prepare for offline' button with accessible label", () => {
    render(<OfflineReadinessSection t={light} />);
    expect(
      screen.getByRole("button", { name: /prepare for offline/i }),
    ).toBeTruthy();
  });

  it("runs the primer when the button is clicked and updates store", async () => {
    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /^prepare for offline$/i }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe(true);
    });
    await waitFor(() => {
      expect(useOfflineStore.getState().primerRunning).toBe(false);
    });
  });

  it("surfaces storage health info", async () => {
    render(<OfflineReadinessSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Storage:/i);
      expect(text).toMatch(/used/);
    });
  });

  it("runs verifyAllOnBoot and marks complete when 'Verify without downloading' is clicked", async () => {
    render(<OfflineReadinessSection t={light} />);
    fireEvent.click(
      screen.getByRole("button", { name: /verify without downloading/i }),
    );

    await waitFor(() => {
      expect(verifyAllOnBootMock).toHaveBeenCalled();
      expect(useOfflineStore.getState().verified.tts).toBe(true);
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
    installStorageEstimate(9000, 10_000); // 90% — triggers warning
    render(<OfflineReadinessSection t={light} />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /clear audio cache/i }),
      ).toBeTruthy();
    });
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
    // No cfg/speakerData seeded in the store, so runPreGeneration should be skipped.
    expect(runPreGenerationMock).not.toHaveBeenCalled();
  });
});
