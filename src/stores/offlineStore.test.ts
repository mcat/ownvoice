import { describe, it, expect, beforeEach } from "vitest";
import { useOfflineStore } from "./offlineStore";

describe("offlineStore", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
  });

  it("starts in a clean idle state", () => {
    const s = useOfflineStore.getState();
    expect(s.primerRunning).toBe(false);
    expect(s.progress).toEqual({});
    expect(s.verified).toEqual({});
    expect(s.lastVerifiedAt).toBeNull();
  });

  it("markPrimerComplete sets lastVerifiedAt to a recent timestamp", () => {
    const before = Date.now();
    useOfflineStore.getState().markPrimerComplete();
    const after = Date.now();
    const ts = useOfflineStore.getState().lastVerifiedAt;
    expect(ts).not.toBeNull();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("tracks primer running state", () => {
    useOfflineStore.getState().setPrimerRunning(true);
    expect(useOfflineStore.getState().primerRunning).toBe(true);
    useOfflineStore.getState().setPrimerRunning(false);
    expect(useOfflineStore.getState().primerRunning).toBe(false);
  });

  it("stores per-file progress keyed by `${model}/${file}`", () => {
    useOfflineStore.getState().reportProgress("tts", "a.onnx", 50, 100);
    expect(useOfflineStore.getState().progress["tts/a.onnx"]).toEqual({
      loaded: 50,
      total: 100,
    });
  });

  it("records model verification status", () => {
    useOfflineStore.getState().setModelVerified("tts", true);
    useOfflineStore.getState().setModelVerified("llm", false);
    expect(useOfflineStore.getState().verified).toEqual({
      tts: true,
      llm: false,
    });
  });

  it("reset clears everything", () => {
    useOfflineStore.getState().setPrimerRunning(true);
    useOfflineStore.getState().reportProgress("tts", "a.onnx", 1, 2);
    useOfflineStore.getState().setModelVerified("tts", true);
    useOfflineStore.getState().reset();
    const s = useOfflineStore.getState();
    expect(s.primerRunning).toBe(false);
    expect(s.progress).toEqual({});
    expect(s.verified).toEqual({});
  });

  it("starts with expectedBytes at 0", () => {
    expect(useOfflineStore.getState().expectedBytes).toBe(0);
  });

  it("beginPrimerRun sets expectedBytes and clears any stale progress entries", () => {
    // Stale state from a prior run: a progress entry that won't be touched again
    // (e.g. a file dropped from the manifest in a new release).
    useOfflineStore.getState().reportProgress("tts", "old.onnx", 100, 100);
    useOfflineStore.getState().beginPrimerRun(1_500_000);
    const s = useOfflineStore.getState();
    expect(s.expectedBytes).toBe(1_500_000);
    expect(s.progress).toEqual({});
  });

  it("beginPrimerRun does not flip primerRunning (caller controls that flag separately)", () => {
    useOfflineStore.getState().setPrimerRunning(true);
    useOfflineStore.getState().beginPrimerRun(42);
    expect(useOfflineStore.getState().primerRunning).toBe(true);

    useOfflineStore.getState().setPrimerRunning(false);
    useOfflineStore.getState().beginPrimerRun(99);
    expect(useOfflineStore.getState().primerRunning).toBe(false);
  });

  it("reset clears expectedBytes back to 0", () => {
    useOfflineStore.getState().beginPrimerRun(2_000_000_000);
    useOfflineStore.getState().reset();
    expect(useOfflineStore.getState().expectedBytes).toBe(0);
  });
});
