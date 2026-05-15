import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/preact";
import { useThreadView, capToWindow, THREAD_VIEW_CAP } from "./useThreadView";
import { initAudit } from "./init";
import { log, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { AUDIT_DB_NAME } from "./db";
import { patientIdHash } from "./hash";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("useThreadView", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("returns thread-visible events for the given patient", async () => {
    const hash = await patientIdHash("p1");
    setActivePatientHash(hash);

    log({
      name: EVENT.SPEAK_TAP,
      attributes: { [ATTR.SPEECH_TEXT]: "hello", [ATTR.ACTOR]: "patient" },
    });
    log({ name: EVENT.MODEL_BOOT_START });

    const { result } = renderHook(() => useThreadView("p1"));

    await waitFor(() => {
      expect(result.current.length).toBe(1);
      expect(result.current[0].text).toBe("hello");
      expect(result.current[0].from).toBe("patient");
    });
  });

  it("excludes non-thread events", async () => {
    const hash = await patientIdHash("p2");
    setActivePatientHash(hash);
    log({ name: EVENT.MODEL_BOOT_COMPLETE });
    log({ name: EVENT.SPEAK_CACHE_HIT });
    const { result } = renderHook(() => useThreadView("p2"));
    await waitFor(() => expect(result.current.length).toBe(0));
  });

  it("returns empty array for null patient", () => {
    const { result } = renderHook(() => useThreadView(null));
    expect(result.current).toEqual([]);
  });

  it("appends live events via subscribe and keeps the cap as an upper bound", async () => {
    // Smoke test that the cap path is wired correctly without trying to
    // synthesize 500+ records (which is fragile under fake-indexeddb
    // at the BUFFER_CAP boundary). The cap invariant itself is tested
    // by capToWindow tests below; here we just verify the hook subscribes
    // and accumulates new events without ever exceeding the cap.
    const hash = await patientIdHash("p3");
    setActivePatientHash(hash);
    const { result } = renderHook(() => useThreadView("p3"));
    // Settle initial cursor pass.
    await waitFor(() => expect(result.current.length).toBe(0));

    for (let i = 0; i < 10; i++) {
      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: `live-${i}`,
          [ATTR.ACTOR]: "patient",
        },
      });
    }

    await waitFor(() => expect(result.current.length).toBe(10));
    expect(result.current.length).toBeLessThanOrEqual(THREAD_VIEW_CAP);
  });
});

describe("capToWindow (thread-view slice invariant)", () => {
  it("returns the input unchanged when length <= cap", () => {
    expect(capToWindow([], 500)).toEqual([]);
    expect(capToWindow([1, 2, 3], 500)).toEqual([1, 2, 3]);
    expect(capToWindow([1, 2, 3, 4, 5], 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the most recent `cap` entries when length > cap", () => {
    expect(capToWindow([1, 2, 3, 4, 5], 3)).toEqual([3, 4, 5]);
    // Slice keeps the END of the array — the most-recently-appended
    // entries — which is the semantic the audit log expects (events
    // are inserted in time-ascending order).
    const arr = Array.from({ length: 510 }, (_, i) => i);
    const capped = capToWindow(arr, 500);
    expect(capped.length).toBe(500);
    expect(capped[0]).toBe(10);
    expect(capped[capped.length - 1]).toBe(509);
  });

  it("exposes THREAD_VIEW_CAP as 500 (heap-budget invariant)", () => {
    // The cap value is the load-bearing constant for the iPad
    // long-session heap budget. Re-pinning it here so a future
    // refactor that accidentally lowers it (or raises it past the
    // ~1 MB budget) trips this test rather than silently regressing.
    expect(THREAD_VIEW_CAP).toBe(500);
  });
});
