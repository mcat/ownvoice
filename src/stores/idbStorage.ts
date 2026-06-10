import type { StateStorage } from "zustand/middleware";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";

const DB_NAME = "ownvoice";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () =>
      resolve(req.result != null ? (req.result as string) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Report a failed persistence write. The settings blob carries the
 * patient's voice clone — a silently-dropped write here is how a patient
 * "loses their voice" on the next reload. Console for the dev log sink,
 * audit event for the in-app ActivityLog (best-effort: the audit DB may
 * be broken for the same underlying reason).
 */
function reportPersistFailure(key: string, err: unknown): void {
  console.error(`[OwnVoice:Persist] IndexedDB write failed for "${key}"`, err);
  try {
    log({
      name: EVENT.PERSIST_ERROR,
      severity: "ERROR",
      attributes: {
        [ATTR.ERROR_TYPE]: (err as Error)?.name ?? "Error",
        [ATTR.ERROR_MESSAGE]: (err as Error)?.message ?? String(err),
        key,
      },
    });
  } catch {
    // Audit logging unavailable — console.error above already fired.
  }
}

export function createIDBStorage(): StateStorage {
  return {
    getItem: idbGet,
    setItem: idbSet,
    removeItem: idbRemove,
  };
}

interface PendingWrite {
  timer: ReturnType<typeof setTimeout>;
  /** Every setItem promise coalesced into this write. All of them settle
   *  when the final (latest-value) write completes — a superseded call's
   *  promise must not hang forever (zustand awaits these). */
  settlers: Array<() => void>;
}

/**
 * Debounced variant of the IDB storage. Writes coalesce per key; the
 * last value wins.
 *
 * Failure semantics: setItem promises always RESOLVE, even when the
 * underlying write fails. Zustand's persist middleware returns the
 * setItem promise to every setState caller, none of which handle it — a
 * rejection here would surface as a window-level unhandled rejection per
 * failed write. Failures are reported through reportPersistFailure
 * (console + audit event) instead.
 */
export function createDebouncedIDBStorage(ms: number): StateStorage {
  const pending = new Map<string, PendingWrite>();

  return {
    getItem: idbGet,
    setItem: (key: string, value: string) => {
      return new Promise<void>((resolve) => {
        const prior = pending.get(key);
        if (prior) clearTimeout(prior.timer);
        const settlers = [...(prior?.settlers ?? []), resolve];
        const timer = setTimeout(() => {
          pending.delete(key);
          idbSet(key, value).then(
            () => settlers.forEach((settle) => settle()),
            (err) => {
              reportPersistFailure(key, err);
              settlers.forEach((settle) => settle());
            },
          );
        }, ms);
        pending.set(key, { timer, settlers });
      });
    },
    removeItem: idbRemove,
  };
}
