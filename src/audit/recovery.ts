import { openAuditDb } from "./db";
import { getWorkflowRunner } from "./registry";
import { ov } from "./workflow";
import type { WorkflowState } from "./types";
import { patientIdHash } from "./hash";
import type { AppSettings } from "../types";

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

/**
 * Filter abandoned workflows whose intended outcome has already
 * materialised in the current settings, so they don't keep surfacing
 * the recovery banner forever. See #226.
 *
 * Currently reconciles `voice_enrollment` only: a row whose
 * `patient_id_hash` matches an existing patient that already has
 * `speakerData` is treated as effectively done. The DB row itself
 * isn't touched (retention will sweep it out); we just keep it from
 * lighting up the UI.
 *
 * `audio_cache_pregen` and `model_priming` aren't filtered here because
 * their app-level reconciliation already happens elsewhere — pre-gen
 * skips cached phrases, primer skips files that pass `verifyAllOnBoot`.
 * The recovery hooks for those names are auto-resume no-ops, so a stale
 * row resumes silently rather than prompting.
 */
export async function reconcileAbandonedWithSettings(
  abandoned: readonly AbandonedWorkflow[],
  cfg: AppSettings,
): Promise<AbandonedWorkflow[]> {
  if (abandoned.length === 0) return [];
  // Compute hashes only for patients who could possibly satisfy the
  // outcome — saves us from hashing every patient on the device.
  const enrolledHashes = new Set<string>();
  for (const p of cfg.patients) {
    if (p.speakerData) {
      enrolledHashes.add(await patientIdHash(p.id));
    }
  }
  return abandoned.filter((w) => {
    if (
      w.name === "voice_enrollment" &&
      w.patient_id_hash != null &&
      enrolledHashes.has(w.patient_id_hash)
    ) {
      // Patient is already enrolled. Suppress the prompt.
      return false;
    }
    return true;
  });
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
