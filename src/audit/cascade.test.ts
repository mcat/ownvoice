import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { clearAuditForPatient } from "./cascade";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulid } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("clearAuditForPatient", () => {
  beforeEach(clearDb);

  it("deletes only events with the matching patient_id_hash", async () => {
    const db = await openAuditDb();
    await new Promise<void>((res) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "speak.tap",
        patient_id_hash: "AAA", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "speak.tap",
        patient_id_hash: "BBB", attributes: {},
      });
      tx.objectStore("events").put({
        id: ulid(), kind: "log", time: 1, observed_time: 1, name: "model.boot.start",
        attributes: {},
      });
      tx.oncomplete = () => res();
    });

    await clearAuditForPatient(db, "AAA");

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    const hashes = remaining.map((r) => r.patient_id_hash);
    expect(hashes).toHaveLength(2);
    expect(hashes).toContain("BBB");
    expect(hashes).toContain(undefined);
    expect(hashes).not.toContain("AAA");
  });
});
