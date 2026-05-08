import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  writeWorkflowStart, writeStepComplete, writeWorkflowComplete,
} from "./workflowDb";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import type { AuditRecord, WorkflowState } from "./types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

function blankState(): WorkflowState {
  return {
    workflow_id: "wf1", name: "voice_enrollment",
    status: "running", started_at: 1000, attempt: 1,
    step_history: [],
  };
}

function blankSpan(name: string): AuditRecord {
  return {
    id: name + "-id", kind: "span", time: 1000, observed_time: 1000,
    name, attributes: {},
  };
}

describe("workflowDb writers", () => {
  beforeEach(clearDb);

  it("writeWorkflowStart inserts row + span atomically", async () => {
    const db = await openAuditDb();
    await writeWorkflowStart(db, blankState(), blankSpan("workflow.start"));

    const ws = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    const es = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(ws).toHaveLength(1);
    expect(ws[0].status).toBe("running");
    expect(es).toHaveLength(1);
    expect(es[0].name).toBe("workflow.start");
  });

  it("writeStepComplete updates workflow + appends span atomically", async () => {
    const db = await openAuditDb();
    await writeWorkflowStart(db, blankState(), blankSpan("workflow.start"));

    const updated: WorkflowState = {
      ...blankState(),
      step_history: [
        { step_name: "s1", span_id: "sp1", attempt: 1, status: "completed",
          started_at: 1, ended_at: 2 },
      ],
    };
    await writeStepComplete(db, updated, blankSpan("step.complete"));

    const ws = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    const es = await new Promise<any[]>((res) => {
      const r = db.transaction("events", "readonly").objectStore("events").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(ws[0].step_history).toHaveLength(1);
    expect(es).toHaveLength(2);
  });

  it("writeWorkflowComplete sets status=completed", async () => {
    const db = await openAuditDb();
    await writeWorkflowStart(db, blankState(), blankSpan("workflow.start"));

    const final: WorkflowState = { ...blankState(), status: "completed", ended_at: 2 };
    await writeWorkflowComplete(db, final, blankSpan("workflow.complete"));

    const ws = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(ws[0].status).toBe("completed");
  });
});
