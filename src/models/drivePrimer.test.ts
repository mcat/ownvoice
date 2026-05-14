import { describe, it, expect, vi, beforeEach } from "vitest";
import { useOfflineStore } from "../stores/offlineStore";

const loadManifestMock = vi.fn();
vi.mock(import("./modelsManifest"), async (importOriginal) => {
  // Keep the real `totalBytes` helper — drivePrimer uses it to compute the
  // expected-bytes total. Only loadManifest needs to be mocked.
  const actual = await importOriginal();
  return {
    ...actual,
    loadManifest: () => loadManifestMock(),
  };
});

const primeOfflineMock = vi.fn();
vi.mock("./offlinePrimer", () => ({
  primeOffline: (...args: unknown[]) => primeOfflineMock(...args),
}));

const MANIFEST = {
  version: 1 as const,
  models: {
    tts: {
      baseUrl: "/models/tts/",
      files: [{ name: "a.onnx", size: 10, magic: "onnx" as const }],
    },
    llm: { baseUrl: "/models/llm/", files: [] },
    stt: { baseUrl: "/models/stt/", files: [] },
  },
};

describe("drivePrimer", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    loadManifestMock.mockReset();
    primeOfflineMock.mockReset();
    loadManifestMock.mockResolvedValue(MANIFEST);
  });

  async function importDrivePrimer() {
    const mod = await import("./drivePrimer");
    return mod.drivePrimer;
  }

  it("sets primerRunning true then false on a successful run", async () => {
    const seen: boolean[] = [];
    primeOfflineMock.mockImplementation(async function* () {
      seen.push(useOfflineStore.getState().primerRunning);
      yield { type: "complete", allOk: true };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    // Was true while iterating
    expect(seen).toEqual([true]);
    // False after completion
    expect(useOfflineStore.getState().primerRunning).toBe(false);
  });

  it("early-returns when primerRunning is already true", async () => {
    useOfflineStore.getState().setPrimerRunning(true);
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(loadManifestMock).not.toHaveBeenCalled();
    expect(primeOfflineMock).not.toHaveBeenCalled();
  });

  it("writes to offlineStore.progress via the onProgress callback passed to primeOffline", async () => {
    primeOfflineMock.mockImplementation(async function* (_manifest: unknown, opts: { onProgress?: (m: string, f: string, l: number, t: number) => void }) {
      // Simulate the primer firing the onProgress callback mid-stream.
      opts.onProgress?.("tts", "a.onnx", 5, 10);
      yield { type: "complete", allOk: true, downloadedCount: 1 };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    const p = useOfflineStore.getState().progress["tts/a.onnx"];
    expect(p).toEqual({ loaded: 5, total: 10 });
  });

  it("marks model 'verified' on successful model-verified events", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "model-verified", model: "tts", ok: true };
      yield { type: "complete", allOk: true };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(useOfflineStore.getState().verified.tts).toBe("verified");
  });

  it("marks model 'needs-retry' on failed model-verified events (post-primer)", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "model-verified", model: "tts", ok: false };
      yield { type: "complete", allOk: false };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    // After a primer run, failure means partial/corrupt download — not "not-primed"
    expect(useOfflineStore.getState().verified.tts).toBe("needs-retry");
  });

  it("calls markPrimerComplete on complete events", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true, downloadedCount: 1 };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(useOfflineStore.getState().lastVerifiedAt).not.toBeNull();
  });

  it("returns downloadedCount from the complete event", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true, downloadedCount: 0 };
    });

    const drivePrimer = await importDrivePrimer();
    const result = await drivePrimer();

    expect(result).toEqual({ downloadedCount: 0 });
  });

  it("returns downloadedCount > 0 when files were downloaded", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true, downloadedCount: 5 };
    });

    const drivePrimer = await importDrivePrimer();
    const result = await drivePrimer();

    expect(result).toEqual({ downloadedCount: 5 });
  });

  it("resets primerRunning in finally even when primer throws", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "model-verified", model: "tts", ok: false };
      throw new Error("network failure");
    });

    const drivePrimer = await importDrivePrimer();
    await expect(drivePrimer()).rejects.toThrow("network failure");
    expect(useOfflineStore.getState().primerRunning).toBe(false);
  });

  it("passes signal through to primeOffline options", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true, downloadedCount: 0 };
    });

    const ac = new AbortController();
    const drivePrimer = await importDrivePrimer();
    await drivePrimer({ signal: ac.signal });

    expect(primeOfflineMock).toHaveBeenCalledWith(
      MANIFEST,
      expect.objectContaining({ signal: ac.signal }),
    );
  });

  it("passes manifest to primeOffline from loadManifest", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true, downloadedCount: 0 };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(loadManifestMock).toHaveBeenCalledOnce();
    // primeOffline now takes (manifest, options) — options.onProgress is always
    // wired, options.signal may be undefined.
    expect(primeOfflineMock).toHaveBeenCalledWith(
      MANIFEST,
      expect.objectContaining({ onProgress: expect.any(Function) }),
    );
  });

  it("publishes the manifest's total expected bytes to offlineStore before the primer iterates", async () => {
    // Sum of every file across every model in the fixture manifest.
    const expected = Object.values(MANIFEST.models)
      .flatMap((m) => m.files)
      .reduce((sum, f) => sum + f.size, 0);

    let seenWhileRunning: number | null = null;
    primeOfflineMock.mockImplementation(async function* () {
      // Snapshot the store the moment iteration begins — this is when the UI
      // first paints a progress bar, so the denominator must already be set.
      seenWhileRunning = useOfflineStore.getState().expectedBytes;
      yield { type: "complete", allOk: true, downloadedCount: 0 };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(seenWhileRunning).toBe(expected);
  });

  it("clears stale progress entries when a new primer run begins", async () => {
    // Pre-seed a stale entry from a hypothetical previous run.
    useOfflineStore.getState().reportProgress("tts", "stale.onnx", 50, 50);

    let progressDuringRun: Record<string, unknown> | null = null;
    primeOfflineMock.mockImplementation(async function* () {
      progressDuringRun = { ...useOfflineStore.getState().progress };
      yield { type: "complete", allOk: true, downloadedCount: 0 };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(progressDuringRun).toEqual({});
  });
});
