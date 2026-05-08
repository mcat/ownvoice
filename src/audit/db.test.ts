import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { openAuditDb, AUDIT_DB_NAME, AUDIT_DB_VERSION } from "./db";

describe("openAuditDb", () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(AUDIT_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it("creates ov-audit at version 1 with both stores", async () => {
    const db = await openAuditDb();
    expect(db.name).toBe(AUDIT_DB_NAME);
    expect(db.version).toBe(AUDIT_DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(["events", "workflows"]);
    db.close();
  });

  it("creates all events indexes", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("events", "readonly");
    const store = tx.objectStore("events");
    expect([...store.indexNames].sort()).toEqual([
      "by_name_time",
      "by_patient_time",
      "by_severity_time",
      "by_time",
      "by_workflow_id",
    ]);
    db.close();
  });

  it("creates all workflows indexes", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("workflows", "readonly");
    const store = tx.objectStore("workflows");
    expect([...store.indexNames].sort()).toEqual([
      "by_patient_id_hash",
      "by_status_started",
    ]);
    db.close();
  });

  it("inserts and retrieves a record by primary key", async () => {
    const db = await openAuditDb();
    const tx = db.transaction("events", "readwrite");
    tx.objectStore("events").put({
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      kind: "log",
      time: 1000,
      observed_time: 1000,
      name: "test.event",
      attributes: {},
    });
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    const tx2 = db.transaction("events", "readonly");
    const got = await new Promise<unknown>((res, rej) => {
      const r = tx2.objectStore("events").get("01ARZ3NDEKTSV4RRFFQ69G5FAV");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    expect((got as { name: string }).name).toBe("test.event");
    db.close();
  });
});
