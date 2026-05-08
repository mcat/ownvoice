import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { queryWorkflows } from "./queryWorkflows";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import type { WorkflowState } from "./types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seed(workflows: WorkflowState[]) {
  const db = await openAuditDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction("workflows", "readwrite");
    const store = tx.objectStore("workflows");
    for (const w of workflows) store.put(w);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

function wf(id: string, overrides: Partial<WorkflowState> = {}): WorkflowState {
  return {
    workflow_id: id,
    name: "audio_cache_pregen",
    status: "completed",
    started_at: 1000,
    attempt: 1,
    step_history: [],
    ...overrides,
  };
}

describe("queryWorkflows", () => {
  beforeEach(clearDb);

  it("returns all workflows newest-first when no filter applied", async () => {
    await seed([
      wf("a", { started_at: 100 }),
      wf("b", { started_at: 300 }),
      wf("c", { started_at: 200 }),
    ]);
    const out = await queryWorkflows({ limit: 10 });
    expect(out.map((w) => w.workflow_id)).toEqual(["b", "c", "a"]);
  });

  it("respects rangeStart/rangeEnd boundaries", async () => {
    await seed([
      wf("a", { started_at: 100 }),
      wf("b", { started_at: 200 }),
      wf("c", { started_at: 300 }),
    ]);
    const out = await queryWorkflows({ rangeStart: 150, rangeEnd: 300, limit: 10 });
    // rangeEnd is exclusive: 300 is excluded.
    expect(out.map((w) => w.workflow_id)).toEqual(["b"]);
  });

  it("filters by status list", async () => {
    await seed([
      wf("a", { status: "completed" }),
      wf("b", { status: "failed" }),
      wf("c", { status: "running" }),
    ]);
    const out = await queryWorkflows({ statuses: ["failed", "running"], limit: 10 });
    expect(out.map((w) => w.workflow_id).sort()).toEqual(["b", "c"]);
  });

  it("filters by patientIdHash", async () => {
    await seed([
      wf("a", { patient_id_hash: "h1" }),
      wf("b", { patient_id_hash: "h2" }),
      wf("c", { patient_id_hash: "h1" }),
    ]);
    const out = await queryWorkflows({ patientIdHash: "h1", limit: 10 });
    expect(out.map((w) => w.workflow_id).sort()).toEqual(["a", "c"]);
  });

  it("respects the limit", async () => {
    await seed([
      wf("a", { started_at: 100 }),
      wf("b", { started_at: 200 }),
      wf("c", { started_at: 300 }),
    ]);
    const out = await queryWorkflows({ limit: 2 });
    expect(out.map((w) => w.workflow_id)).toEqual(["c", "b"]);
  });

  it("filters by name substring", async () => {
    await seed([
      wf("a", { name: "audio_cache_pregen" }),
      wf("b", { name: "voice_enrollment" }),
      wf("c", { name: "model_priming" }),
    ]);
    const out = await queryWorkflows({ nameSubstring: "voice", limit: 10 });
    expect(out.map((w) => w.workflow_id)).toEqual(["b"]);
  });
});
