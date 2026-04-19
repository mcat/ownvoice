import { describe, it, expect, beforeEach } from "vitest";
import { useOfflineStore } from "./offlineStore";

describe("offlineStore", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
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
});
