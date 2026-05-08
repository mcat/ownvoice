import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { trimOversizedJournalResults } from "./journalCleanup";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import type { WorkflowState } from "./types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seedWorkflow(w: WorkflowState) {
  const db = await openAuditDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction("workflows", "readwrite");
    tx.objectStore("workflows").put(w);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

async function readWorkflow(id: string): Promise<WorkflowState | undefined> {
  const db = await openAuditDb();
  const w = await new Promise<WorkflowState | undefined>((res, rej) => {
    const tx = db.transaction("workflows", "readonly");
    const r = tx.objectStore("workflows").get(id);
    r.onsuccess = () => res(r.result as WorkflowState | undefined);
    r.onerror = () => rej(r.error);
  });
  db.close();
  return w;
}

describe("trimOversizedJournalResults", () => {
  beforeEach(clearDb);

  it("trims step.result strings over the cap and rewrites the record", async () => {
    const huge = "x".repeat(20000);
    await seedWorkflow({
      workflow_id: "w1",
      name: "audio_cache_pregen",
      status: "completed",
      started_at: 1000,
      attempt: 1,
      step_history: [{
        step_name: "synthesize",
        span_id: "span-1",
        attempt: 1,
        status: "completed",
        started_at: 1000,
        ended_at: 1100,
        result: huge,
      }],
    });

    const db = await openAuditDb();
    const out = await trimOversizedJournalResults(db);
    db.close();

    expect(out).toEqual({ scanned: 1, trimmed: 1 });
    const w = await readWorkflow("w1");
    expect(w?.step_history[0].result?.length).toBeLessThan(huge.length);
    expect(w?.step_history[0].result).toContain("(+15904 chars, trimmed)");
  });

  it("leaves small results untouched and reports trimmed=0", async () => {
    await seedWorkflow({
      workflow_id: "w2",
      name: "audio_cache_pregen",
      status: "completed",
      started_at: 2000,
      attempt: 1,
      step_history: [{
        step_name: "persist",
        span_id: "span-2",
        attempt: 1,
        status: "completed",
        started_at: 2000,
        ended_at: 2010,
        result: "{}",
      }],
    });

    const db = await openAuditDb();
    const out = await trimOversizedJournalResults(db);
    db.close();

    expect(out).toEqual({ scanned: 1, trimmed: 0 });
    const w = await readWorkflow("w2");
    expect(w?.step_history[0].result).toBe("{}");
  });

  it("is idempotent — running twice doesn't re-trim already-trimmed results", async () => {
    const huge = "x".repeat(10000);
    await seedWorkflow({
      workflow_id: "w3",
      name: "audio_cache_pregen",
      status: "completed",
      started_at: 3000,
      attempt: 1,
      step_history: [{
        step_name: "synthesize",
        span_id: "span-3",
        attempt: 1,
        status: "completed",
        started_at: 3000,
        ended_at: 3100,
        result: huge,
      }],
    });

    const db1 = await openAuditDb();
    const first = await trimOversizedJournalResults(db1);
    db1.close();
    const db2 = await openAuditDb();
    const second = await trimOversizedJournalResults(db2);
    db2.close();

    expect(first.trimmed).toBe(1);
    expect(second.trimmed).toBe(0);
  });
});
