import type { ManifestFile, ManifestModel } from "./modelsManifest";

export interface FileIntegrityResult {
  name: string;
  ok: boolean;
  reason?: string;
}

export interface IntegrityReport {
  ok: boolean;
  files: FileIntegrityResult[];
}

const ONNX_MAGIC = new Uint8Array([0x08, 0x01]);

export async function verifyFile(
  dir: FileSystemDirectoryHandle,
  spec: ManifestFile,
): Promise<FileIntegrityResult> {
  let file: File;
  try {
    const handle = await dir.getFileHandle(spec.name);
    file = await handle.getFile();
  } catch {
    return { name: spec.name, ok: false, reason: "file missing from OPFS" };
  }

  if (file.size !== spec.size) {
    return {
      name: spec.name,
      ok: false,
      reason: `size ${file.size} != expected ${spec.size}`,
    };
  }

  if (spec.magic === "onnx") {
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (head[0] !== ONNX_MAGIC[0] || head[1] !== ONNX_MAGIC[1]) {
      return { name: spec.name, ok: false, reason: "onnx magic mismatch" };
    }
  } else if (spec.magic === "json") {
    try {
      JSON.parse(await file.text());
    } catch {
      return { name: spec.name, ok: false, reason: "json parse failed" };
    }
  }

  return { name: spec.name, ok: true };
}

export async function verifyModel(
  dir: FileSystemDirectoryHandle,
  model: ManifestModel,
): Promise<IntegrityReport> {
  const files = await Promise.all(model.files.map((f) => verifyFile(dir, f)));
  return { ok: files.every((f) => f.ok), files };
}
