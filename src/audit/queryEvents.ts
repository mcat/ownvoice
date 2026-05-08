import { openAuditDb } from "./db";
import { ulidForTime } from "./ulid";
import type { AuditRecord } from "./types";

export interface QueryFilters {
  patientIdHash?: string;
  rangeStart?: number;
  rangeEnd?: number;
  minSeverity?: number;
  namePrefix?: string;
  attributeSubstring?: string;
  limit: number;
}

export async function queryEvents(filters: QueryFilters): Promise<AuditRecord[]> {
  const db = await openAuditDb();
  try {
    const out: AuditRecord[] = [];
    const seen = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("events", "readonly");
      const store = tx.objectStore("events");

      let cursor: IDBRequest<IDBCursorWithValue | null>;
      const direction: IDBCursorDirection = "prev";

      if (filters.patientIdHash) {
        const idx = store.index("by_patient_time");
        const lo = filters.rangeStart ?? -Infinity;
        const hi = filters.rangeEnd ?? Infinity;
        cursor = idx.openCursor(IDBKeyRange.bound([filters.patientIdHash, lo], [filters.patientIdHash, hi]), direction);
      } else if (filters.rangeStart !== undefined || filters.rangeEnd !== undefined) {
        const range = IDBKeyRange.bound(
          ulidForTime(filters.rangeStart ?? 0).slice(0, 10) + "0000000000000000",
          ulidForTime(filters.rangeEnd ?? Date.now() + 1).slice(0, 10) + "ZZZZZZZZZZZZZZZZ",
        );
        cursor = store.openCursor(range, direction);
      } else {
        cursor = store.index("by_time").openCursor(null, direction);
      }

      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c || out.length >= filters.limit) { resolve(); return; }
        const r = c.value as AuditRecord;
        if (seen.has(r.id)) { c.continue(); return; }

        if (passesPostFilters(r, filters)) {
          seen.add(r.id);
          out.push(r);
        }
        c.continue();
      };
      cursor.onerror = () => reject(cursor.error);
    });

    return out;
  } finally {
    db.close();
  }
}

/** Shared predicate so live-tail can apply the same filter logic the
 *  initial cursor pass did. Without this, incoming records would be
 *  appended to the rendered list regardless of the active filter. */
export function eventPassesFilters(r: AuditRecord, f: Omit<QueryFilters, "limit">): boolean {
  if (f.patientIdHash && r.patient_id_hash !== f.patientIdHash) return false;
  if (f.minSeverity !== undefined && (r.severity_number ?? 0) < f.minSeverity) return false;
  if (f.rangeStart !== undefined && r.time < f.rangeStart) return false;
  if (f.rangeEnd !== undefined && r.time >= f.rangeEnd) return false;
  if (f.namePrefix && !r.name.startsWith(f.namePrefix)) return false;
  if (f.attributeSubstring) {
    const haystack = JSON.stringify(r.attributes);
    if (!haystack.includes(f.attributeSubstring)) return false;
  }
  return true;
}

function passesPostFilters(r: AuditRecord, f: QueryFilters): boolean {
  return eventPassesFilters(r, f);
}
