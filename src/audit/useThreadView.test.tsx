import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/preact";
import { useThreadView } from "./useThreadView";
import { initAudit } from "./init";
import { log, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { AUDIT_DB_NAME, openAuditDb } from "./db";
import { patientIdHash } from "./hash";
import type { AuditRecord } from "./types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

/**
 * Insert audit records directly into IDB, bypassing the logger buffer.
 * The logger has its own BUFFER_CAP that prevents pushing 500+ events
 * through it in tests without overflow substitution — but for testing
 * the THREAD_VIEW cap we just need many real SPEAK_TAP records in IDB
 * with the right patient_id_hash, regardless of how they got there.
 */
async function seedSpeakTaps(hash: string, count: number, prefix: string) {
  const db = await openAuditDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    for (let i = 0; i < count; i++) {
      const record: AuditRecord = {
        id: `seed-${prefix}-${i}`,
        kind: "log",
        // Strictly ascending time so the index returns them in order.
        time: Date.now() + i,
        observed_time: Date.now() + i,
        name: EVENT.SPEAK_TAP,
        severity_text: "INFO",
        severity_number: 9,
        patient_id_hash: hash,
        attributes: {
          [ATTR.SPEECH_TEXT]: `${prefix}-${i}`,
          [ATTR.ACTOR]: "patient",
        },
      };
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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

  it("caps the in-memory window at 500 entries from the initial IDB load", async () => {
    // A long shift can produce thousands of SPEAK_TAP records. Seed 510
    // directly in IDB (bypassing the logger buffer, which has its own
    // 500-cap and would substitute overflow records here), then assert
    // the hook surfaces only the most recent 500 of them in memory.
    const hash = await patientIdHash("p3");
    setActivePatientHash(hash);
    await seedSpeakTaps(hash, 510, "seed");

    const { result } = renderHook(() => useThreadView("p3"));

    await waitFor(() => {
      expect(result.current.length).toBe(500);
    });
    // Slice retains the most recent entries: with 510 seeded (indices
    // 0..509) the kept window is 10..509.
    expect(result.current[0].text).toBe("seed-10");
    expect(result.current[result.current.length - 1].text).toBe("seed-509");
  });

  it("does not slice when fewer than 500 entries are present", async () => {
    const hash = await patientIdHash("p4");
    setActivePatientHash(hash);
    await seedSpeakTaps(hash, 25, "few");

    const { result } = renderHook(() => useThreadView("p4"));

    await waitFor(() => {
      expect(result.current.length).toBe(25);
    });
    expect(result.current[0].text).toBe("few-0");
    expect(result.current[24].text).toBe("few-24");
  });

  it("caps live appends to 500 entries", async () => {
    // Seed exactly 500 entries (the cap) then live-append 5 more via the
    // logger's subscribe path. The cap should hold; each append evicts
    // the oldest one.
    const hash = await patientIdHash("p5");
    setActivePatientHash(hash);
    await seedSpeakTaps(hash, 500, "base");

    const { result } = renderHook(() => useThreadView("p5"));
    await waitFor(() => expect(result.current.length).toBe(500));
    expect(result.current[0].text).toBe("base-0");

    // Live-append 5 more — these arrive via the logger's subscribe()
    // fan-out, not the cursor.
    for (let i = 0; i < 5; i++) {
      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: `live-${i}`,
          [ATTR.ACTOR]: "patient",
        },
      });
    }

    await waitFor(() => {
      // Length stays pinned at 500; the oldest base entries got pushed out.
      expect(result.current.length).toBe(500);
      expect(result.current[result.current.length - 1].text).toBe("live-4");
    });
    expect(result.current[0].text).toBe("base-5");
  });
});
