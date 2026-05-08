import { ulidForTime } from "./ulid";

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function sweepRetention(db: IDBDatabase, now = Date.now()): Promise<number> {
  const cutoffId = ulidForTime(now - RETENTION_MS);
  return new Promise((resolve, reject) => {
    let deleted = 0;
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const range = IDBKeyRange.upperBound(cutoffId, true);
    const req = store.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        deleted += 1;
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

/** Schedule the sweep to run hourly via requestIdleCallback. */
export function scheduleHourlyRetention(db: IDBDatabase): () => void {
  const ric = (globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  const id = setInterval(() => {
    if (ric) ric(() => { void sweepRetention(db); });
    else void sweepRetention(db);
  }, 60 * 60 * 1000);
  return () => clearInterval(id);
}
