import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enableMemDiag,
  isMemDiagEnabled,
  recordStage,
  clearTombstone,
  readPreviousTombstone,
  readTrail,
  clearTrail,
  registerHeapSampler,
  _resetSamplerForTests,
  type HeapWatermark,
} from "./crashTombstone";

const FLAG_KEY = "__OV_MEMDIAG__" as const;
const TOMBSTONE_KEY = "ov:memdiag:last-stage";
const TRAIL_KEY = "ov:memdiag:trail";

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

  it("recordStage writes the first call immediately (leading edge)", () => {
    enableMemDiag();
    recordStage("boot:foo");
    expect(readPreviousTombstone()?.stage).toBe("boot:foo");
  });

  it("recordStage throttles back-to-back calls and writes the latest after the cooldown", async () => {
    vi.useFakeTimers();
    try {
      enableMemDiag();
      recordStage("boot:foo");
      expect(readPreviousTombstone()?.stage).toBe("boot:foo");
      // Two more calls inside the 250ms window — should not write yet.
      recordStage("boot:bar");
      recordStage("boot:baz");
      expect(readPreviousTombstone()?.stage).toBe("boot:foo");
      // After the cooldown the trailing write fires with the *latest*
      // stashed payload.
      await vi.advanceTimersByTimeAsync(260);
      expect(readPreviousTombstone()?.stage).toBe("boot:baz");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clearTombstone cancels a pending throttled write so it cannot resurrect the tombstone", async () => {
    vi.useFakeTimers();
    try {
      enableMemDiag();
      recordStage("boot:foo");
      recordStage("boot:bar"); // stashed
      clearTombstone();
      await vi.advanceTimersByTimeAsync(500);
      expect(readPreviousTombstone()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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

describe("crashTombstone — trail (#315)", () => {
  it("readTrail is empty by default", () => {
    expect(readTrail()).toEqual([]);
  });

  it("recordStage does not write to trail when memdiag is disabled", () => {
    recordStage("boot:test");
    expect(readTrail()).toEqual([]);
  });

  it("recordStage appends each call to the trail unthrottled", () => {
    enableMemDiag();
    recordStage("a");
    recordStage("b");
    recordStage("c");
    const trail = readTrail();
    expect(trail.map((e) => e.stage)).toEqual(["a", "b", "c"]);
    // Every entry has timestamp + v
    for (const e of trail) {
      expect(typeof e.ts).toBe("number");
      expect(e.v).toBe(2);
    }
  });

  it("trail captures sampler heap watermark on each entry", () => {
    enableMemDiag();
    registerHeapSampler(() => SAMPLE_HW);
    recordStage("synth:gpu:1");
    recordStage("synth:gpu:2");
    const trail = readTrail();
    expect(trail).toHaveLength(2);
    expect(trail[0].hw).toEqual(SAMPLE_HW);
    expect(trail[1].hw).toEqual(SAMPLE_HW);
  });

  it("trail bounds itself by entry count under degenerate load", () => {
    enableMemDiag();
    // Push more than the entry cap; trail must trim the oldest.
    for (let i = 0; i < 2050; i++) {
      recordStage(`s${i}`);
    }
    const trail = readTrail();
    expect(trail.length).toBeLessThanOrEqual(2000);
    // Oldest are evicted; newest is the last we recorded.
    expect(trail[trail.length - 1].stage).toBe("s2049");
  });

  it("trail bounds itself by byte size when entries get large", () => {
    enableMemDiag();
    registerHeapSampler(() => SAMPLE_HW);
    // Append entries with long stage names so the byte cap (256 KB)
    // engages before the entry-count cap (2 000).
    const longStage = "stage:" + "x".repeat(500);
    for (let i = 0; i < 1000; i++) {
      recordStage(`${longStage}:${i}`);
    }
    const raw = localStorage.getItem(TRAIL_KEY)!;
    expect(raw.length).toBeLessThanOrEqual(256 * 1024);
    // At least some entries survived — we didn't end up with an empty
    // log because eviction was too aggressive.
    expect(readTrail().length).toBeGreaterThan(0);
  });

  it("clearTrail wipes the trail without touching the tombstone", () => {
    enableMemDiag();
    recordStage("boot:foo");
    expect(readTrail()).toHaveLength(1);
    expect(readPreviousTombstone()).not.toBeNull();
    clearTrail();
    expect(readTrail()).toEqual([]);
    // Tombstone still present for the boot-time crash check.
    expect(readPreviousTombstone()).not.toBeNull();
  });

  it("clearTombstone also clears the trail (graceful-exit cleanup)", () => {
    enableMemDiag();
    recordStage("boot:foo");
    recordStage("boot:bar");
    expect(readTrail()).toHaveLength(2);
    clearTombstone();
    // Graceful exit wipes both: next boot should not see either as
    // forensic evidence.
    expect(readTrail()).toEqual([]);
    expect(readPreviousTombstone()).toBeNull();
  });

  it("readTrail tolerates malformed JSON in the trail key", () => {
    localStorage.setItem(TRAIL_KEY, "not-json");
    expect(readTrail()).toEqual([]);
  });

  it("readTrail tolerates non-array JSON in the trail key", () => {
    localStorage.setItem(TRAIL_KEY, '{"stage":"x"}');
    expect(readTrail()).toEqual([]);
  });
});
