import { openAuditDb } from "./db";
import type { WorkflowState } from "./types";

export interface WorkflowQueryFilters {
  patientIdHash?: string;
  rangeStart?: number;
  rangeEnd?: number;
  /** Substring match on workflow_name. */
  nameSubstring?: string;
  /** When set, restricts to workflows in any of these statuses. */
  statuses?: WorkflowState["status"][];
  limit: number;
}

export async function queryWorkflows(filters: WorkflowQueryFilters): Promise<WorkflowState[]> {
  const db = await openAuditDb();
  try {
    const all = await new Promise<WorkflowState[]>((resolve, reject) => {
      const tx = db.transaction("workflows", "readonly");
      const req = tx.objectStore("workflows").getAll();
      req.onsuccess = () => resolve(req.result as WorkflowState[]);
      req.onerror = () => reject(req.error);
    });

    const out = all.filter((w) => passes(w, filters));
    out.sort((a, b) => b.started_at - a.started_at);
    return out.slice(0, filters.limit);
  } finally {
    db.close();
  }
}

function passes(w: WorkflowState, f: WorkflowQueryFilters): boolean {
  if (f.patientIdHash && w.patient_id_hash !== f.patientIdHash) return false;
  if (f.rangeStart !== undefined && w.started_at < f.rangeStart) return false;
  if (f.rangeEnd !== undefined && w.started_at >= f.rangeEnd) return false;
  if (f.statuses && !f.statuses.includes(w.status)) return false;
  if (f.nameSubstring && !w.name.includes(f.nameSubstring)) return false;
  return true;
}
