export type ModelId = "tts" | "stt";

export interface ManifestFile {
  /** Filename relative to the model baseUrl. */
  name: string;
  /** Exact byte size. Integrity checks compare against this. */
  size: number;
  /** "onnx" for ONNX Runtime files, "json" for JSON, null for raw data blobs. */
  magic: "onnx" | "json" | null;
}

export interface ManifestModel {
  /** URL prefix under which all files live. */
  baseUrl: string;
  files: ManifestFile[];
}

export interface ModelsManifest {
  version: 1;
  models: Record<ModelId, ManifestModel>;
}

const MANIFEST_URL = "/models-manifest.json";

/** Fetch + validate the shipped manifest. Throws on any shape mismatch. */
export async function loadManifest(): Promise<ModelsManifest> {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`manifest fetch failed: HTTP ${response.status}`);
  }
  const raw = (await response.json()) as unknown;
  if (!raw || typeof raw !== "object") {
    throw new Error("manifest is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`unsupported manifest version: ${String(obj.version)}`);
  }
  if (!obj.models || typeof obj.models !== "object") {
    throw new Error("manifest.models missing");
  }
  return obj as unknown as ModelsManifest;
}

/** Total expected bytes across all files of a model. */
export function totalBytes(model: ManifestModel): number {
  return model.files.reduce((sum, f) => sum + f.size, 0);
}
