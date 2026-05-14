import { loadManifest, totalBytes } from "./modelsManifest";
import { primeOffline } from "./offlinePrimer";
import { useOfflineStore } from "../stores/offlineStore";
import { ov } from "../audit/workflow";
import {
  primeModels,
  type PrimerEvent,
} from "../audit/workflows/modelPriming";

export interface DrivePrimerResult {
  downloadedCount: number;
}

/**
 * Run the offline primer, driving `offlineStore` from yielded events.
 *
 * - Early-returns if a primer is already running (one at a time).
 * - Calls `loadManifest()` internally.
 * - Always resets `primerRunning` in `finally`.
 * - Wraps the iteration in a durable `model_priming` workflow so each
 *   download/verify boundary is journaled.
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
    // Publish the manifest's total expected bytes now so the UI has a fixed
    // denominator before primeOffline starts emitting per-file progress.
    const expected = Object.values(manifest.models).reduce(
      (sum, m) => sum + totalBytes(m),
      0,
    );
    useOfflineStore.getState().beginPrimerRun(expected);
    await ov.workflow(
      "model_priming",
      (ctx) =>
        primeModels(ctx, {
          runPrimer: async function* (): AsyncGenerator<PrimerEvent> {
            for await (const ev of primeOffline(manifest, {
              signal: opts?.signal,
              onProgress: (model, file, loaded, total) => {
                useOfflineStore
                  .getState()
                  .reportProgress(model, file, loaded, total);
              },
            })) {
              if (ev.type === "model-verified") {
                // After a primer run, files are either present+ok or present+failed.
                // "not-primed" only applies before a primer has ever run.
                useOfflineStore
                  .getState()
                  .setModelVerified(
                    ev.model,
                    ev.ok ? "verified" : "needs-retry",
                  );
                yield { kind: "verified", file: ev.model };
              } else if (ev.type === "download-start") {
                yield { kind: "download", file: ev.file };
              } else if (ev.type === "download-failed") {
                yield { kind: "failed", file: ev.file };
              } else if (ev.type === "complete") {
                downloadedCount = ev.downloadedCount;
                useOfflineStore.getState().markPrimerComplete();
              }
            }
          },
        }),
      { recoveryMode: "auto" },
    );
  } finally {
    useOfflineStore.getState().setPrimerRunning(false);
  }
  return { downloadedCount };
}
