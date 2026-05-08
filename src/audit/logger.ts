import type { AuditRecord, AttrValue, SeverityText } from "./types";
import type { EventName } from "./events";
import { EVENT } from "./events";
import { ATTR } from "./attrs";
import { ulid } from "./ulid";
import { getSession } from "./session";

export interface AuditEvent {
  name: EventName;
  severity?: SeverityText;
  body?: string;
  attributes?: Record<string, AttrValue>;
}

const SEVERITY_NUMBERS: Record<SeverityText, number> = {
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
};

const BUFFER_CAP = 500;
const FAILURE_LIMIT = 10;

let db: IDBDatabase | null = null;
let buffer: AuditRecord[] = [];
let scheduled = false;
let consecutiveFailures = 0;
let degraded = false;
let lastWarnAt = 0;
const subscribers = new Set<(r: AuditRecord) => void>();

export function initLogger(database: IDBDatabase): void {
  db = database;
  buffer = [];
  scheduled = false;
  consecutiveFailures = 0;
  degraded = false;
}

export function subscribe(listener: (record: AuditRecord) => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function log(event: AuditEvent): void {
  if (degraded || !db) return;
  try {
    const sev = event.severity ?? "INFO";
    const session = getSession();
    const now = Date.now();
    const attrs = { ...(event.attributes ?? {}) };
    if (
      session.patientIdHash !== undefined &&
      attrs[ATTR.PATIENT_ID_HASH] === undefined
    ) {
      attrs[ATTR.PATIENT_ID_HASH] = session.patientIdHash;
    }
    if (attrs[ATTR.SESSION_ID] === undefined) {
      attrs[ATTR.SESSION_ID] = session.sessionId;
    }

    const record: AuditRecord = {
      id: ulid(),
      kind: "log",
      time: now,
      observed_time: now,
      name: event.name,
      body: event.body,
      severity_number: SEVERITY_NUMBERS[sev],
      severity_text: sev,
      patient_id_hash: session.patientIdHash,
      workflow_id:
        typeof attrs[ATTR.WORKFLOW_ID] === "string"
          ? (attrs[ATTR.WORKFLOW_ID] as string)
          : undefined,
      attributes: attrs,
    };

    if (buffer.length >= BUFFER_CAP) {
      buffer.shift();
      buffer.push({
        ...record,
        name: EVENT.AUDIT_BUFFER_OVERFLOW,
        severity_text: "WARN",
        severity_number: SEVERITY_NUMBERS.WARN,
        attributes: { ...attrs, [ATTR.AUDIT_DROPPED_COUNT]: 1 },
      });
    } else {
      buffer.push(record);
    }

    for (const sub of subscribers) {
      try {
        sub(record);
      } catch {
        /* don't let subscribers break the logger */
      }
    }

    schedule();
  } catch (err) {
    console.warn("[audit] log() failed:", err);
  }
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const ric = (
    globalThis as unknown as { requestIdleCallback?: (cb: () => void) => void }
  ).requestIdleCallback;
  if (ric) {
    ric(() => {
      void flushNow();
    });
  } else {
    setTimeout(() => {
      void flushNow();
    }, 0);
  }
}

export async function flushNow(): Promise<void> {
  scheduled = false;
  if (!db || buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction("events", "readwrite");
      const store = tx.objectStore("events");
      for (const r of batch) store.put(r);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("tx aborted"));
    });
    consecutiveFailures = 0;
  } catch (err) {
    consecutiveFailures += 1;
    buffer = [...batch, ...buffer];
    const now = Date.now();
    if (now - lastWarnAt > 60_000) {
      console.warn("[audit] flush failed:", err);
      lastWarnAt = now;
    }
    if (consecutiveFailures >= FAILURE_LIMIT) {
      degraded = true;
      console.error(
        "[audit] entered degraded mode after",
        consecutiveFailures,
        "failures",
      );
    }
  }
}

export function isDegraded(): boolean {
  return degraded;
}

export function _resetForTests(): void {
  if (db) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
  db = null;
  buffer = [];
  scheduled = false;
  consecutiveFailures = 0;
  degraded = false;
  lastWarnAt = 0;
  subscribers.clear();
}
