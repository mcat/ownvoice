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

/**
 * ONNX files are protobuf-serialized as a ModelProto. Field 1 of that message
 * is `ir_version` (a varint int64), so the first byte on the wire is always
 * 0x08 — the protobuf tag for field 1, wire type VARINT (0x08 == (1 << 3) | 0).
 *
 * Earlier iterations of this check also required byte 1 == 0x01, assuming
 * ir_version == 1. Every modern ONNX export uses ir_version 7-10+ (our
 * shipped models currently use 7, 8, 9, and 10), so that assumption caused
 * every real file to fail verification. Just gate on byte 0 now — enough to
 * detect HTML error pages, zero-padding, or entirely wrong file formats
 * without over-constraining on ir_version.
 */
const ONNX_MAGIC_FIRST_BYTE = 0x08;

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
    const head = new Uint8Array(await file.slice(0, 1).arrayBuffer());
    if (head[0] !== ONNX_MAGIC_FIRST_BYTE) {
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
