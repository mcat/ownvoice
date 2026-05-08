import { openAuditDb } from "./db";
import type { WorkflowState, StepRecord } from "./types";

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

// step.result strings can hold encoded audio buffers (megabytes per
// workflow). Loading the full journal into JS memory for a list view
// would frequently OOM the renderer. Cap and annotate length so the
// table can still render the truncated preview accurately, and
// getWorkflowDetail() restores the full payload when a row is expanded.
const RESULT_PREVIEW_CAP = 512;

function summarizeStep(s: StepRecord): StepRecord {
  if (!s.result || s.result.length <= RESULT_PREVIEW_CAP) return s;
  return {
    ...s,
    result: s.result.slice(0, RESULT_PREVIEW_CAP) + `… (+${s.result.length - RESULT_PREVIEW_CAP} chars)`,
  };
}

function summarizeWorkflow(w: WorkflowState): WorkflowState {
  if (!w.step_history || w.step_history.length === 0) return w;
  return { ...w, step_history: w.step_history.map(summarizeStep) };
}

export async function queryWorkflows(filters: WorkflowQueryFilters): Promise<WorkflowState[]> {
  const db = await openAuditDb();
  try {
    // Stream via cursor + apply filters incrementally rather than
    // getAll(): the workflows store can hold gigabytes of step.result
    // payload that we don't want resident all at once.
    const out: WorkflowState[] = [];
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("workflows", "readonly");
      const req = tx.objectStore("workflows").openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) { resolve(); return; }
        const w = c.value as WorkflowState;
        if (passes(w, filters)) out.push(summarizeWorkflow(w));
        c.continue();
      };
      req.onerror = () => reject(req.error);
    });
    out.sort((a, b) => b.started_at - a.started_at);
    return out.slice(0, filters.limit);
  } finally {
    db.close();
  }
}

/** Fetch one workflow with its full step_history.result payloads
 *  intact. Used by the viewer to lazy-load detail when a row is
 *  expanded so the list view stays memory-cheap. */
export async function getWorkflowDetail(workflowId: string): Promise<WorkflowState | null> {
  const db = await openAuditDb();
  try {
    return await new Promise<WorkflowState | null>((resolve, reject) => {
      const req = db.transaction("workflows", "readonly").objectStore("workflows").get(workflowId);
      req.onsuccess = () => resolve((req.result as WorkflowState | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
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
