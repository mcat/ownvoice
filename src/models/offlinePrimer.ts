import { getModelManager } from "./modelManager";
import type { ModelId, ModelsManifest } from "./modelsManifest";

export type PrimerEvent =
  | { type: "model-start"; model: ModelId }
  | { type: "download-start"; model: ModelId; file: string; size: number }
  | {
      type: "download-progress";
      model: ModelId;
      file: string;
      loaded: number;
      total: number;
    }
  | { type: "download-failed"; model: ModelId; file: string; error: string }
  | { type: "model-verified"; model: ModelId; ok: boolean }
  | { type: "complete"; allOk: boolean; downloadedCount: number };

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
  signal?: AbortSignal,
): AsyncGenerator<PrimerEvent> {
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
        const result = await mgr.downloadAndCache(id, model.baseUrl, spec.name, spec.size);
        if (!result.fromCache) downloadedCount++;
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
