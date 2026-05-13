export const AUDIT_DB_NAME = "ov-audit";
// Bumped 1 → 2 to recover installs that ended up with the DB at v1 but
// missing one or both object stores (cause unconfirmed; seen on iPad after
// the user manually deleted ov-audit in Safari DevTools). The upgrade
// handler below is idempotent — both `createObjectStore` calls are guarded
// by `contains(...)` checks — so this bump heals corrupted installs
// without touching clean ones. Future bumps should layer real migrations
// on top of this one.
export const AUDIT_DB_VERSION = 2;

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
