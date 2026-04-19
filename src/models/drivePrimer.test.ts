import { describe, it, expect, vi, beforeEach } from "vitest";
import { useOfflineStore } from "../stores/offlineStore";

const loadManifestMock = vi.fn();
vi.mock("./modelsManifest", () => ({
  loadManifest: () => loadManifestMock(),
}));

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

  it("calls reportProgress on download-progress events", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "download-progress", model: "tts", file: "a.onnx", loaded: 5, total: 10 };
      yield { type: "complete", allOk: true };
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

  it("passes signal through to primeOffline", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true };
    });

    const ac = new AbortController();
    const drivePrimer = await importDrivePrimer();
    await drivePrimer({ signal: ac.signal });

    expect(primeOfflineMock).toHaveBeenCalledWith(MANIFEST, ac.signal);
  });

  it("passes manifest to primeOffline from loadManifest", async () => {
    primeOfflineMock.mockImplementation(async function* () {
      yield { type: "complete", allOk: true };
    });

    const drivePrimer = await importDrivePrimer();
    await drivePrimer();

    expect(loadManifestMock).toHaveBeenCalledOnce();
    expect(primeOfflineMock).toHaveBeenCalledWith(MANIFEST, undefined);
  });
});
