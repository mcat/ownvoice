import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initAudit } from "./init";
import { isDegraded, _resetForTests } from "./logger";
import { resetSessionForTests, getSession } from "./session";
import { AUDIT_DB_NAME } from "./db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("initAudit", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
  });

  it("opens the DB and exits degraded=false on success", async () => {
    await initAudit({ activePatientId: null });
    expect(isDegraded()).toBe(false);
  });

  it("precomputes patient hash when active patient is set", async () => {
    await initAudit({ activePatientId: "p-uuid-1" });
    expect(getSession().patientIdHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("never throws past the caller", async () => {
    await expect(initAudit({ activePatientId: null })).resolves.toBeUndefined();
  });
});
