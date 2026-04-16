import type { ModelId, ModelStatus, LoadProgress } from "./types";

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

    // Request persistent storage so models aren't evicted
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }

    console.log(
      `[OwnVoice] Model manager initialized. EP: ${this.executionProvider}`,
    );
  }

  /** Check if a specific model is ready for inference */
  isReady(id: ModelId): boolean {
    return this.models[id].status === "ready";
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
   * Check if a model's files are cached in OPFS.
   * Returns the OPFS directory handle if cached, null otherwise.
   */
  async getOPFSCache(id: ModelId): Promise<FileSystemDirectoryHandle | null> {
    try {
      const root = await navigator.storage.getDirectory();
      const modelsDir = await root.getDirectoryHandle("models", {
        create: true,
      });
      const modelDir = await modelsDir.getDirectoryHandle(id);
      // Check for a sentinel file that marks a complete download
      await modelDir.getFileHandle("_complete");
      return modelDir;
    } catch {
      return null;
    }
  }

  /**
   * Download a model file and cache it in OPFS.
   * Returns the OPFS file path for the worker to load.
   */
  async downloadAndCache(
    id: ModelId,
    url: string,
    filename: string,
  ): Promise<File> {
    this.updateModel(id, { status: "downloading" });

    // Check OPFS cache first
    try {
      const root = await navigator.storage.getDirectory();
      const modelsDir = await root.getDirectoryHandle("models", {
        create: true,
      });
      const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });

      // Try to read from cache
      try {
        const fileHandle = await modelDir.getFileHandle(filename);
        const file = await fileHandle.getFile();
        if (file.size > 0) {
          console.log(`[OwnVoice] ${id}/${filename} loaded from OPFS cache`);
          this.updateModel(id, {
            loaded: file.size,
            total: file.size,
          });
          return file;
        }
      } catch {
        // Not cached, download
      }

      // Download with progress
      console.log(`[OwnVoice] Downloading ${id}/${filename}...`);
      const response = await fetch(url + filename);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const total = Number(response.headers.get("content-length")) || 0;
      this.updateModel(id, { total });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        this.updateModel(id, { loaded });
      }

      // Combine chunks
      const blob = new Blob(chunks as BlobPart[]);

      // Cache in OPFS
      const fileHandle = await modelDir.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      console.log(
        `[OwnVoice] ${id}/${filename} cached in OPFS (${(loaded / 1e6).toFixed(1)} MB)`,
      );
      return new File([blob], filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      this.updateModel(id, { status: "error", error: message });
      throw err;
    }
  }

  /** Mark a model download as complete (write sentinel file) */
  async markComplete(id: ModelId): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory();
      const modelsDir = await root.getDirectoryHandle("models", {
        create: true,
      });
      const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });
      const sentinel = await modelDir.getFileHandle("_complete", {
        create: true,
      });
      const writable = await sentinel.createWritable();
      await writable.write("ok");
      await writable.close();
    } catch {
      // Non-critical
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
