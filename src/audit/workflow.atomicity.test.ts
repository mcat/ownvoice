import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { writeStepComplete } from "./workflowDb";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import type { WorkflowState } from "./types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("cross-store atomicity", () => {
  beforeEach(clearDb);

  it("happy path: writeStepComplete persists both stores", async () => {
    const db = await openAuditDb();
    const state: WorkflowState = {
      workflow_id: "wf1", name: "voice_enrollment", status: "running",
      started_at: 1, attempt: 1, step_history: [],
    };
    const span = {
      id: "s1", kind: "span" as const, time: 1, observed_time: 1,
      name: "step.complete", attributes: {},
    };
    await writeStepComplete(db, state, span);
    const w = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    const e = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(w).toHaveLength(1);
    expect(e).toHaveLength(1);
  });

  it("write to events fails => write to workflows is rolled back", async () => {
    const db = await openAuditDb();
    // Pre-insert event with id "fixed-id"
    await new Promise<void>((res) => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").put({
        id: "fixed-id", kind: "log", time: 1, observed_time: 1,
        name: "x", attributes: {},
      });
      tx.oncomplete = () => res();
    });

    const state: WorkflowState = {
      workflow_id: "wf-rollback", name: "voice_enrollment", status: "running",
      started_at: 1, attempt: 1, step_history: [],
    };

    // Force a constraint violation via .add() with an existing key.
    const aborted = await new Promise<boolean>((res) => {
      const tx = db.transaction(["events", "workflows"], "readwrite");
      tx.objectStore("workflows").put(state);
      const req = tx.objectStore("events").add({
        id: "fixed-id", kind: "span", time: 1, observed_time: 1,
        name: "step.complete", attributes: {},
      });
      req.onerror = () => { /* allow constraint error to propagate and abort the tx */ };
      tx.oncomplete = () => res(false);
      tx.onabort = () => res(true);
      tx.onerror = () => res(true);
    });

    expect(aborted).toBe(true);
    const w = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(w).toHaveLength(0);
  });
});
