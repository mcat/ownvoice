import type { StateStorage } from "zustand/middleware";

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

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () =>
      resolve(req.result != null ? (req.result as string) : null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createIDBStorage(): StateStorage {
  return {
    getItem: idbGet,
    setItem: idbSet,
    removeItem: idbRemove,
  };
}

export function createDebouncedIDBStorage(ms: number): StateStorage {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    getItem: idbGet,
    setItem: (key: string, value: string) => {
      return new Promise<void>((resolve) => {
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);
        timers.set(
          key,
          setTimeout(() => {
            timers.delete(key);
            idbSet(key, value).then(resolve);
          }, ms),
        );
      });
    },
    removeItem: idbRemove,
  };
}
