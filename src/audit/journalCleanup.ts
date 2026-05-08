import type { WorkflowState } from "./types";

/** Existing devices may have multi-MB step.result payloads in the
 *  workflows store from before the memoize:false fix landed. Strip
 *  anything over the cap so the viewer doesn't OOM trying to load
 *  the journal. Cursor-based: one record at a time, in-place rewrite
 *  if any step needs trimming. Fires once on boot from initAudit. */
const RESULT_HARD_CAP = 4096;
const TRIMMED_MARKER = ", trimmed)";

export function trimOversizedJournalResults(db: IDBDatabase): Promise<{ scanned: number; trimmed: number }> {
  return new Promise((resolve, reject) => {
    let scanned = 0;
    let trimmed = 0;
    const tx = db.transaction("workflows", "readwrite");
    const req = tx.objectStore("workflows").openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return;
      scanned += 1;
      const w = c.value as WorkflowState;
      let needsWrite = false;
      const newSteps = (w.step_history ?? []).map((s) => {
        if (!s.result || s.result.length <= RESULT_HARD_CAP) return s;
        // Idempotent: a prior pass already left the marker, so leave alone.
        if (s.result.endsWith(TRIMMED_MARKER)) return s;
        needsWrite = true;
        return {
          ...s,
          result: s.result.slice(0, RESULT_HARD_CAP) + `… (+${s.result.length - RESULT_HARD_CAP} chars${TRIMMED_MARKER}`,
        };
      });
      if (needsWrite) {
        c.update({ ...w, step_history: newSteps });
        trimmed += 1;
      }
      c.continue();
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve({ scanned, trimmed });
    tx.onerror = () => reject(tx.error);
  });
}
