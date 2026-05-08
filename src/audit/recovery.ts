import { openAuditDb } from "./db";
import { getWorkflowRunner } from "./registry";
import { ov } from "./workflow";
import type { WorkflowState } from "./types";

export interface AbandonedWorkflow {
  workflow_id: string;
  name: WorkflowState["name"];
  recoveryMode: "auto" | "prompt" | "manual";
  patient_id_hash?: string;
}

const DEFAULT_RECOVERY: Record<WorkflowState["name"], "auto" | "prompt" | "manual"> = {
  voice_enrollment: "prompt",
  audio_cache_pregen: "auto",
  model_priming: "auto",
};

export async function sweepAbandonedWorkflows(): Promise<AbandonedWorkflow[]> {
  const db = await openAuditDb();
  const out: AbandonedWorkflow[] = [];
  await new Promise<void>((res) => {
    const tx = db.transaction("workflows", "readonly");
    const idx = tx.objectStore("workflows").index("by_status_started");
    const cursor = idx.openCursor(IDBKeyRange.bound(["running", -Infinity], ["running", Infinity]));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        const w = c.value as WorkflowState;
        out.push({
          workflow_id: w.workflow_id,
          name: w.name,
          recoveryMode: DEFAULT_RECOVERY[w.name] ?? "manual",
          patient_id_hash: w.patient_id_hash,
        });
        c.continue();
      }
    };
    tx.oncomplete = () => res();
  });
  db.close();
  return out;
}

/** Resume an abandoned workflow by re-invoking its registered runner.
 *  v1 limitation: this starts a NEW workflow instance (fresh workflow_id)
 *  rather than resuming the original by id. The application-layer
 *  operations are idempotent per the spec, so re-running is safe. The
 *  original abandoned row stays in the DB until retention sweeps it out;
 *  next call to sweepAbandonedWorkflows will surface it again until it's
 *  marked terminal or aged out. */
export async function resumeWorkflow(workflowId: string): Promise<void> {
  const db = await openAuditDb();
  const row = await new Promise<WorkflowState | undefined>((res) => {
    const r = db.transaction("workflows", "readonly").objectStore("workflows").get(workflowId);
    r.onsuccess = () => res(r.result as WorkflowState | undefined);
  });
  db.close();
  if (!row) return;

  const runner = getWorkflowRunner(row.name);
  if (!runner) {
    console.warn("[audit] no runner registered for workflow", row.name);
    return;
  }
  try {
    await ov.workflow(row.name, runner, { patientIdHash: row.patient_id_hash });
  } catch (err) {
    console.warn("[audit] resumeWorkflow runner threw:", err);
  }
}
