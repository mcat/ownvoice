import { loadManifest } from "./modelsManifest";
import { primeOffline } from "./offlinePrimer";
import { useOfflineStore } from "../stores/offlineStore";

export interface DrivePrimerResult {
  downloadedCount: number;
}

/**
 * Run the offline primer, driving `offlineStore` from yielded events.
 *
 * - Early-returns if a primer is already running (one at a time).
 * - Calls `loadManifest()` internally.
 * - Always resets `primerRunning` in `finally`.
 *
 * Returns a summary including `downloadedCount` — the number of files
 * that were actually fetched from the network (not served from cache).
 */
export async function drivePrimer(opts?: {
  signal?: AbortSignal;
}): Promise<DrivePrimerResult | undefined> {
  const s = useOfflineStore.getState();
  if (s.primerRunning) return undefined;

  s.setPrimerRunning(true);
  let downloadedCount = 0;
  try {
    const manifest = await loadManifest();
    for await (const ev of primeOffline(manifest, opts?.signal)) {
      if (ev.type === "download-progress") {
        useOfflineStore
          .getState()
          .reportProgress(ev.model, ev.file, ev.loaded, ev.total);
      } else if (ev.type === "model-verified") {
        useOfflineStore.getState().setModelVerified(ev.model, ev.ok);
      } else if (ev.type === "complete") {
        downloadedCount = ev.downloadedCount;
        useOfflineStore.getState().markPrimerComplete();
      }
    }
  } finally {
    useOfflineStore.getState().setPrimerRunning(false);
  }
  return { downloadedCount };
}
