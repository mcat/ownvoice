import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { renderHook, waitFor } from "@testing-library/preact";
import { useThreadView } from "./useThreadView";
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
});
