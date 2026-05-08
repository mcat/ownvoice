import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initAudit } from "./init";
import { log, flushNow, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { clearAuditForPatient } from "./cascade";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { patientIdHash } from "./hash";
import { EVENT } from "./events";
import { ATTR } from "./attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("cascade end-to-end", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("clearAuditForPatient(p1) leaves p2's records intact", async () => {
    const h1 = await patientIdHash("p1");
    const h2 = await patientIdHash("p2");

    setActivePatientHash(h1);
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "p1 says hi" } });
    setActivePatientHash(h2);
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "p2 says hello" } });
    await flushNow();

    const db = await openAuditDb();
    await clearAuditForPatient(db, h1);

    const remaining = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();

    const remainingHashes = remaining.map((r) => r.patient_id_hash);
    expect(remainingHashes).toContain(h2);
    expect(remainingHashes).not.toContain(h1);
  });
});
