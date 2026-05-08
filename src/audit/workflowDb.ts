import type { AuditRecord, WorkflowState } from "./types";

function tx2(
  db: IDBDatabase,
  body: (tx: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "workflows"], "readwrite");
    body(tx);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("tx aborted"));
  });
}

export function writeWorkflowStart(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}

export function writeStepComplete(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}

export function writeStepFailed(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}

export function writeWorkflowComplete(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}

export function writeWorkflowFailed(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}

export function writeWorkflowAbandoned(db: IDBDatabase, state: WorkflowState, span: AuditRecord): Promise<void> {
  return tx2(db, (tx) => {
    tx.objectStore("workflows").put(state);
    tx.objectStore("events").put(span);
  });
}
