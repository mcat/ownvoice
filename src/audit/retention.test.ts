import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { sweepRetention, RETENTION_MS } from "./retention";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulidForTime } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("sweepRetention", () => {
  beforeEach(clearDb);

  it("evicts records older than RETENTION_MS", async () => {
    const db = await openAuditDb();
    const now = Date.now();
    const old = now - RETENTION_MS - 1000;

    await new Promise<void>((res) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put({
        id: ulidForTime(old), kind: "log", time: old, observed_time: old,
        name: "x", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulidForTime(now), kind: "log", time: now, observed_time: now,
        name: "y", attributes: {},
      });
      tx.oncomplete = () => res();
    });

    await sweepRetention(db, now);

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(remaining.map((r) => r.name)).toEqual(["y"]);
  });
});
