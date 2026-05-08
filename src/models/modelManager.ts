import type { ModelId, ModelStatus, LoadProgress } from "./types";
import type { ManifestModel } from "./modelsManifest";
import type { IntegrityReport } from "./integrityCheck";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";

interface ModelEntry {
  status: ModelStatus;
  loaded: number;
  total: number;
  worker: Worker | null;
  error?: string;
}

type ProgressCallback = (progress: LoadProgress[]) => void;

/**
 * Singleton orchestrator for all on-device models.
 * Handles downloading, OPFS caching, worker lifecycle, and progress reporting.
 */
class ModelManager {
  private models: Record<ModelId, ModelEntry> = {
    tts: { status: "idle", loaded: 0, total: 0, worker: null },
    "tts-encoder": { status: "idle", loaded: 0, total: 0, worker: null },
    llm: { status: "idle", loaded: 0, total: 0, worker: null },
    stt: { status: "idle", loaded: 0, total: 0, worker: null },
  };
  private listeners: Set<ProgressCallback> = new Set();
  private initialized = false;

  /** Check if WebGPU is available */
  get hasWebGPU(): boolean {
    return "gpu" in navigator;
  }

  /** Get the best execution provider */
  get executionProvider(): string {
    return this.hasWebGPU ? "webgpu" : "wasm";
  }

  /** Initialize the model manager and request persistent storage */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    log({ name: EVENT.MODEL_BOOT_START });

    // Request persistent storage so models aren't evicted
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }

    console.log(
      `[OwnVoice] Model manager initialized. EP: ${this.executionProvider}`,
    );
  }

  /** Check if a specific model is ready for inference. Returns true for
   *  both `"ready"` and `"warm"` — warm is strictly stronger than ready
   *  (the worker has loaded enough to run inference AND confirmed it on
   *  a one-shot warmup). Consumers gating "is this model usable?" stay
   *  correct as the model transitions ready → warm. */
  isReady(id: ModelId): boolean {
    const status = this.models[id].status;
    return status === "ready" || status === "warm";
  }

  /** Get loading progress for all models */
  getProgress(): LoadProgress[] {
    return (Object.keys(this.models) as ModelId[]).map((id) => ({
      model: id,
      status: this.models[id].status,
      loaded: this.models[id].loaded,
      total: this.models[id].total,
      error: this.models[id].error,
    }));
  }

  /** Subscribe to progress updates */
  onProgress(cb: ProgressCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const progress = this.getProgress();
    for (const cb of this.listeners) cb(progress);
  }

  private updateModel(id: ModelId, updates: Partial<ModelEntry>): void {
    Object.assign(this.models[id], updates);
    this.notify();
  }

  /**
   * Download a model file and cache it in OPFS using resumable streaming.
   * If a partial file + progress marker exist from a prior attempt, resumes
   * with `Range: bytes=N-` — survives spotty wifi across dropouts.
   *
   * `expectedSize` comes from the manifest. Mid-download truncation is
   * detected at close time and preserved as a progress marker for the next
   * attempt to pick up where this one died.
   */
  async downloadAndCache(
    id: ModelId,
    url: string,
    filename: string,
    expectedSize: number,
    onProgress?: (bytesWritten: number) => void,
  ): Promise<{ file: File; fromCache: boolean }> {
    this.updateModel(id, { status: "downloading", total: expectedSize });

    try {
      const root = await navigator.storage.getDirectory();
      const modelsDir = await root.getDirectoryHandle("models", { create: true });
      const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });

      // Fast path: fully present and size matches.
      let priorBytes = 0;
      try {
        const existing = await modelDir.getFileHandle(filename);
        const file = await existing.getFile();
        if (file.size === expectedSize) {
          console.log(`[OwnVoice] ${id}/${filename} loaded from OPFS cache`);
          this.updateModel(id, { loaded: expectedSize });
          return { file, fromCache: true };
        }
        priorBytes = file.size;
      } catch {
        // Missing — proceed to download.
      }

      if (priorBytes > 0) {
        log({
          name: EVENT.MODEL_DOWNLOAD_RESUME,
          attributes: {
            [ATTR.MODEL_NAME]: `${id}/${filename}`,
            [ATTR.MODEL_SIZE_BYTES]: expectedSize,
          },
        });
      } else {
        log({
          name: EVENT.MODEL_DOWNLOAD_START,
          attributes: {
            [ATTR.MODEL_NAME]: `${id}/${filename}`,
            [ATTR.MODEL_SIZE_BYTES]: expectedSize,
          },
        });
      }

      const { resumableDownload } = await import("./resumableDownload");
      await resumableDownload({
        url: url + filename,
        dir: modelDir,
        filename,
        expectedSize,
        onProgress: ({ bytesWritten }) => {
          this.updateModel(id, { loaded: bytesWritten });
          onProgress?.(bytesWritten);
        },
      });

      const handle = await modelDir.getFileHandle(filename);
      const file = await handle.getFile();
      console.log(
        `[OwnVoice] ${id}/${filename} cached in OPFS (${(file.size / 1e6).toFixed(1)} MB)`,
      );
      log({
        name: EVENT.MODEL_DOWNLOAD_COMPLETE,
        attributes: {
          [ATTR.MODEL_NAME]: `${id}/${filename}`,
          [ATTR.MODEL_SIZE_BYTES]: file.size,
        },
      });
      return { file, fromCache: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      this.updateModel(id, { status: "error", error: message });
      throw err;
    }
  }

  /**
   * Verify every file of a model against the manifest. Cheap (reads first
   * 2 bytes per ONNX file + full text for JSON), safe to run on every boot.
   */
  async verifyOPFSCache(
    id: ModelId,
    model: ManifestModel,
  ): Promise<IntegrityReport> {
    const { verifyModel } = await import("./integrityCheck");
    try {
      const root = await navigator.storage.getDirectory();
      const modelsDir = await root.getDirectoryHandle("models", { create: true });
      const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });
      return verifyModel(modelDir, model);
    } catch {
      return {
        ok: false,
        files: model.files.map((f) => ({
          name: f.name,
          ok: false,
          reason: "OPFS unavailable",
        })),
      };
    }
  }

  /** Set a worker for a model (created by the specific model integration) */
  setWorker(id: ModelId, worker: Worker): void {
    this.models[id].worker = worker;
  }

  /** Get the worker for a model */
  getWorker(id: ModelId): Worker | null {
    return this.models[id].worker;
  }

  /** Mark a model as ready */
  setReady(id: ModelId): void {
    this.updateModel(id, { status: "ready" });
    console.log(`[OwnVoice] ${id} model ready`);
  }

  /** True only when the worker can actually run inference for this model. */
  isWarm(id: ModelId): boolean {
    return this.models[id].status === "warm";
  }

  /** Mark a model as warm — the worker has confirmed it can run inference. */
  markWarm(id: ModelId): void {
    this.updateModel(id, { status: "warm" });
    console.log(`[OwnVoice] ${id} model warm`);
    log({
      name: EVENT.MODEL_BOOT_COMPLETE,
      attributes: { [ATTR.MODEL_NAME]: id },
    });
  }

  /** Mark a model as errored */
  setError(id: ModelId, error: string): void {
    this.updateModel(id, { status: "error", error });
    console.error(`[OwnVoice] ${id} model error: ${error}`);
  }

  /** Clear all model data from OPFS (for patient reset) */
  async clearAll(): Promise<void> {
    // Terminate all workers
    for (const id of Object.keys(this.models) as ModelId[]) {
      this.models[id].worker?.terminate();
      this.models[id] = {
        status: "idle",
        loaded: 0,
        total: 0,
        worker: null,
      };
    }

    // Remove OPFS model cache
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry("models", { recursive: true });
    } catch {
      // May not exist
    }

    this.notify();
    console.log("[OwnVoice] All model data cleared");
  }
}

// Singleton
let instance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!instance) instance = new ModelManager();
  return instance;
}
