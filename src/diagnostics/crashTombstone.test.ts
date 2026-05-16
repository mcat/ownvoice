import { describe, it, expect, beforeEach } from "vitest";
import {
  enableMemDiag,
  isMemDiagEnabled,
  recordStage,
  clearTombstone,
  readPreviousTombstone,
  registerHeapSampler,
  _resetSamplerForTests,
  type HeapWatermark,
} from "./crashTombstone";

const FLAG_KEY = "__OV_MEMDIAG__" as const;
const TOMBSTONE_KEY = "ov:memdiag:last-stage";

const SAMPLE_HW: HeapWatermark = {
  opfsUsage: 1234567,
  opfsQuota: 99999999,
  opfsAgeMs: 42,
  hotCacheEntries: 7,
  workers: { tts: "warm", stt: "ready" },
  gpuTtsReady: true,
  gpuTtsPendingSynths: 0,
};

beforeEach(() => {
  delete (globalThis as Record<string, unknown>)[FLAG_KEY];
  localStorage.clear();
  _resetSamplerForTests();
});

describe("crashTombstone", () => {
  it("isMemDiagEnabled is false by default", () => {
    expect(isMemDiagEnabled()).toBe(false);
  });

  it("enableMemDiag flips the gate on", () => {
    enableMemDiag();
    expect(isMemDiagEnabled()).toBe(true);
  });

  it("recordStage is a no-op when memdiag is disabled", () => {
    recordStage("boot:test");
    expect(localStorage.getItem(TOMBSTONE_KEY)).toBeNull();
  });

  it("recordStage writes a v2 stage + timestamp + null hw when enabled", () => {
    enableMemDiag();
    recordStage("boot:gpu-init");
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.stage).toBe("boot:gpu-init");
    expect(typeof parsed.ts).toBe("number");
    expect(parsed.v).toBe(2);
    expect(parsed.hw).toBeNull();
  });

  it("recordStage captures the registered sampler's HeapWatermark", () => {
    enableMemDiag();
    registerHeapSampler(() => SAMPLE_HW);
    recordStage("synth:gpu:1");
    const parsed = JSON.parse(localStorage.getItem(TOMBSTONE_KEY)!);
    expect(parsed.hw).toEqual(SAMPLE_HW);
  });

  it("recordStage survives a misbehaving sampler — stage still written, hw null", () => {
    enableMemDiag();
    registerHeapSampler(() => {
      throw new Error("sampler exploded");
    });
    expect(() => recordStage("synth:gpu:2")).not.toThrow();
    const parsed = JSON.parse(localStorage.getItem(TOMBSTONE_KEY)!);
    expect(parsed.stage).toBe("synth:gpu:2");
    expect(parsed.hw).toBeNull();
  });

  it("readPreviousTombstone returns the HeapWatermark from the prior session", () => {
    enableMemDiag();
    registerHeapSampler(() => SAMPLE_HW);
    recordStage("pregen:patient:42/702");
    const prev = readPreviousTombstone();
    expect(prev?.hw).toEqual(SAMPLE_HW);
  });

  it("readPreviousTombstone accepts a legacy v1 payload (no hw) and returns hw:null", () => {
    localStorage.setItem(
      TOMBSTONE_KEY,
      JSON.stringify({ stage: "boot:legacy", ts: Date.now(), v: 1 }),
    );
    const prev = readPreviousTombstone();
    expect(prev?.stage).toBe("boot:legacy");
    expect(prev?.hw).toBeNull();
  });

  it("recordStage overwrites prior stage with the latest", () => {
    enableMemDiag();
    recordStage("boot:foo");
    recordStage("boot:bar");
    expect(readPreviousTombstone()?.stage).toBe("boot:bar");
  });

  it("readPreviousTombstone returns null when no tombstone exists", () => {
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readPreviousTombstone returns stage, ts, and ageMs after a record", () => {
    enableMemDiag();
    recordStage("pregen:patient:42/700");
    const result = readPreviousTombstone();
    expect(result?.stage).toBe("pregen:patient:42/700");
    expect(typeof result?.ts).toBe("number");
    expect(result?.ageMs).toBeGreaterThanOrEqual(0);
  });

  it("clearTombstone wipes the stored value", () => {
    enableMemDiag();
    recordStage("boot:foo");
    clearTombstone();
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readPreviousTombstone tolerates malformed JSON (returns null)", () => {
    localStorage.setItem(TOMBSTONE_KEY, "not-json");
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readPreviousTombstone tolerates missing fields (returns null)", () => {
    localStorage.setItem(TOMBSTONE_KEY, "{}");
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readPreviousTombstone rejects non-string stage", () => {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify({ stage: 7, ts: 1, v: 1 }));
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readPreviousTombstone rejects non-number ts", () => {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify({ stage: "x", ts: "no", v: 1 }));
    expect(readPreviousTombstone()).toBeNull();
  });
});
