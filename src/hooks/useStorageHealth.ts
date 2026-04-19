import { useEffect, useState } from "preact/hooks";

export interface StorageHealth {
  usage: number | null;
  quota: number | null;
  percentUsed: number | null;
  /** True when usage/quota >= 0.85 — clinician should be warned. */
  warning: boolean;
}

const POLL_MS = 60_000;
const WARN_THRESHOLD = 0.85;

export function useStorageHealth(): StorageHealth {
  const [health, setHealth] = useState<StorageHealth>({
    usage: null,
    quota: null,
    percentUsed: null,
    warning: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!navigator.storage?.estimate) return;
      const est = await navigator.storage.estimate();
      if (cancelled) return;
      const usage = est.usage ?? 0;
      const quota = est.quota ?? 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      setHealth({
        usage,
        quota,
        percentUsed,
        warning: quota > 0 && usage / quota >= WARN_THRESHOLD,
      });
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return health;
}
