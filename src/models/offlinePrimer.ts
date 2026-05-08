import { getModelManager } from "./modelManager";
import type { ModelId, ModelsManifest } from "./modelsManifest";

export type PrimerEvent =
  | { type: "model-start"; model: ModelId }
  | { type: "download-start"; model: ModelId; file: string; size: number }
  | { type: "download-failed"; model: ModelId; file: string; error: string }
  | { type: "model-verified"; model: ModelId; ok: boolean }
  | { type: "complete"; allOk: boolean; downloadedCount: number };

export interface PrimerOptions {
  signal?: AbortSignal;
  /** Called repeatedly during each file's download. High-frequency — don't
   *  do expensive work in the handler; write to a store and let subscribers
   *  read at their own cadence. */
  onProgress?: (
    model: ModelId,
    file: string,
    loaded: number,
    total: number,
  ) => void;
}

/**
 * Walks every file in the manifest, downloads any missing or short files,
 * and verifies integrity per model.
 *
 * Individual download failures don't stop the primer — they're emitted as
 * `download-failed` events and the corresponding model's verification will
 * report the missing file. This matches the clinical UX: surface everything
 * that's broken in one pass so the clinician can decide whether to retry
 * or proceed anyway.
 */
export async function* primeOffline(
  manifest: ModelsManifest,
  options: PrimerOptions = {},
): AsyncGenerator<PrimerEvent> {
  const { signal, onProgress } = options;
  const mgr = getModelManager();
  const modelIds = Object.keys(manifest.models) as ModelId[];
  let allOk = true;
  let downloadedCount = 0;

  for (const id of modelIds) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const model = manifest.models[id];
    if (!model || model.files.length === 0) continue;

    yield { type: "model-start", model: id };

    for (const spec of model.files) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      yield { type: "download-start", model: id, file: spec.name, size: spec.size };
      try {
        const result = await mgr.downloadAndCache(
          id,
          model.baseUrl,
          spec.name,
          spec.size,
          onProgress
            ? (loaded) => onProgress(id, spec.name, loaded, spec.size)
            : undefined,
          spec.magic,
        );
        if (!result.fromCache) downloadedCount++;
        // Emit a final "complete" progress tick so aggregate UIs that snapshot
        // progress see the file at 100% before moving on. Matters for files
        // served from the OPFS fast-path (no streaming progress was emitted).
        onProgress?.(id, spec.name, spec.size, spec.size);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        yield { type: "download-failed", model: id, file: spec.name, error: message };
        if ((err as Error).name === "AbortError") throw err;
      }
    }

    const report = await mgr.verifyOPFSCache(id, model);
    if (!report.ok) allOk = false;
    yield { type: "model-verified", model: id, ok: report.ok };
  }

  yield { type: "complete", allOk, downloadedCount };
}
