import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initLogger, log, subscribe, flushNow, _resetForTests } from "./logger";
import { setActivePatientHash, resetSessionForTests } from "./session";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { openAuditDb, AUDIT_DB_NAME } from "./db";

async function clearAuditDb() {
  await new Promise<void>((res) => {
    const req = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    req.onsuccess = () => res();
    req.onerror = () => res();
    req.onblocked = () => res();
  });
}

describe("logger", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearAuditDb();
    const db = await openAuditDb();
    initLogger(db);
  });

  it("notifies subscribers synchronously before flush", () => {
    const seen: string[] = [];
    subscribe((r) => seen.push(r.name));
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.ACTOR]: "patient" } });
    expect(seen).toEqual([EVENT.SPEAK_TAP]);
  });

  it("snapshots patient_id_hash by value at log() time", async () => {
    setActivePatientHash("hash-AAA");
    log({ name: EVENT.SPEAK_TAP });
    setActivePatientHash("hash-BBB");
    log({ name: EVENT.SPEAK_TAP });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const tx = db.transaction("events", "readonly");
      const req = tx.objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    const hashes = records.map((r) => r.patient_id_hash).sort();
    expect(hashes).toEqual(["hash-AAA", "hash-BBB"]);
  });

  it("defaults severity to INFO when omitted", async () => {
    log({ name: EVENT.SPEAK_TAP });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const req = db.transaction("events", "readonly").objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    expect(records[0].severity_number).toBe(9);
    expect(records[0].severity_text).toBe("INFO");
  });

  it("hoists patient_id_hash + workflow_id from attributes onto record root", async () => {
    setActivePatientHash("hash-CCC");
    log({
      name: EVENT.SPEAK_TAP,
      attributes: { [ATTR.WORKFLOW_ID]: "wf-1" },
    });
    await flushNow();
    const db = await openAuditDb();
    const records = await new Promise<any[]>((res, rej) => {
      const req = db.transaction("events", "readonly").objectStore("events").getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    expect(records[0].patient_id_hash).toBe("hash-CCC");
    expect(records[0].workflow_id).toBe("wf-1");
  });

  it("never throws past the caller on IDB errors", () => {
    const badDb = {
      transaction: () => { throw new Error("boom"); },
    } as unknown as IDBDatabase;
    initLogger(badDb);
    expect(() => log({ name: EVENT.SPEAK_TAP })).not.toThrow();
  });
});
