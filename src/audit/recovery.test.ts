import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { sweepAbandonedWorkflows, resumeWorkflow } from "./recovery";
import { _resetRegistryForTests, registerWorkflow } from "./registry";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { _resetForTests as resetLogger } from "./logger";
import { initAudit } from "./init";
import { resetSessionForTests } from "./session";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seedWorkflow(status: "running" | "completed", started_at = 1000) {
  const db = await openAuditDb();
  await new Promise<void>((res) => {
    const tx = db.transaction("workflows", "readwrite");
    tx.objectStore("workflows").put({
      workflow_id: "wf-" + status + "-" + started_at,
      name: "voice_enrollment", status, started_at, attempt: 1, step_history: [],
    });
    tx.oncomplete = () => res();
  });
  db.close();
}

describe("sweepAbandonedWorkflows", () => {
  beforeEach(async () => {
    resetLogger();
    resetSessionForTests();
    _resetRegistryForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("returns workflows with status=running", async () => {
    await seedWorkflow("running", 100);
    await seedWorkflow("completed", 200);
    const found = await sweepAbandonedWorkflows();
    expect(found.map((w) => w.workflow_id)).toEqual(["wf-running-100"]);
  });

  it("classifies recoveryMode by name", async () => {
    await seedWorkflow("running", 100);
    const [w] = await sweepAbandonedWorkflows();
    expect(w.recoveryMode).toBe("prompt"); // voice_enrollment defaults to prompt
  });
});

describe("resumeWorkflow", () => {
  beforeEach(async () => {
    resetLogger();
    resetSessionForTests();
    _resetRegistryForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("invokes the registered runner for the named workflow", async () => {
    let invoked = false;
    registerWorkflow("voice_enrollment", async () => { invoked = true; });
    await seedWorkflow("running", 100);
    await resumeWorkflow("wf-running-100");
    expect(invoked).toBe(true);
  });

  it("logs a warning and no-ops when no runner is registered", async () => {
    await seedWorkflow("running", 100);
    await expect(resumeWorkflow("wf-running-100")).resolves.toBeUndefined();
  });

  it("no-ops when workflow_id does not exist", async () => {
    await expect(resumeWorkflow("does-not-exist")).resolves.toBeUndefined();
  });
});
