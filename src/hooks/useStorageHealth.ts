import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export interface StorageHealth {
  usage: number | null;
  quota: number | null;
  percentUsed: number | null;
  /** True when usage/quota >= 0.85 — clinician should be warned. */
  warning: boolean;
  /**
   * Whether the origin holds persistent-storage permission.
   * - `true`: granted; storage is protected from eviction.
   * - `false`: not granted; the browser may evict under pressure.
   * - `null`: API unavailable; status unknown.
   */
  persisted: boolean | null;
  /**
   * Request persistent storage and re-poll `persisted()` so the returned
   * status reflects the new state without waiting for the next 60s tick.
   * Resolves to the post-request `persisted()` value.
   */
  requestPersist: () => Promise<boolean | null>;
}

const POLL_MS = 60_000;
const WARN_THRESHOLD = 0.85;

export function useStorageHealth(): StorageHealth {
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const cancelledRef = useRef(false);

  const pollPersisted = useCallback(async (): Promise<boolean | null> => {
    if (!navigator.storage?.persisted) return null;
    const value = await navigator.storage.persisted();
    if (!cancelledRef.current) setPersisted(value);
    return value;
  }, []);

  const pollEstimate = useCallback(async () => {
    if (!navigator.storage?.estimate) return;
    const est = await navigator.storage.estimate();
    if (cancelledRef.current) return;
    setUsage(est.usage ?? 0);
    setQuota(est.quota ?? 0);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void pollEstimate();
    void pollPersisted();
    const id = setInterval(() => {
      void pollEstimate();
      void pollPersisted();
    }, POLL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [pollEstimate, pollPersisted]);

  const requestPersist = useCallback(async (): Promise<boolean | null> => {
    if (!navigator.storage?.persist) return null;
    await navigator.storage.persist();
    return pollPersisted();
  }, [pollPersisted]);

  const percentUsed =
    usage != null && quota != null && quota > 0 ? (usage / quota) * 100 : null;
  const warning =
    usage != null && quota != null && quota > 0 && usage / quota >= WARN_THRESHOLD;

  return { usage, quota, percentUsed, warning, persisted, requestPersist };
}
