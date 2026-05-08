export const AUDIT_DB_NAME = "ov-audit";
export const AUDIT_DB_VERSION = 1;

/** Open the audit database, creating schema on first run. Single source
 *  of truth for the IDB schema; called from boot and from tests. */
export function openAuditDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIT_DB_NAME, AUDIT_DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("events")) {
        const events = db.createObjectStore("events", { keyPath: "id" });
        events.createIndex("by_time", "time");
        events.createIndex("by_patient_time", ["patient_id_hash", "time"]);
        events.createIndex("by_severity_time", ["severity_number", "time"]);
        events.createIndex("by_workflow_id", "workflow_id");
        events.createIndex("by_name_time", ["name", "time"]);
      }

      if (!db.objectStoreNames.contains("workflows")) {
        const workflows = db.createObjectStore("workflows", {
          keyPath: "workflow_id",
        });
        workflows.createIndex("by_status_started", ["status", "started_at"]);
        workflows.createIndex("by_patient_id_hash", "patient_id_hash");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("ov-audit open blocked"));
  });
}
