import type { ManifestFile, ManifestModel } from "./modelsManifest";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import { checkFirstByteMagic } from "./contentValidator";

export interface FileIntegrityResult {
  name: string;
  ok: boolean;
  reason?: string;
}

export interface IntegrityReport {
  ok: boolean;
  files: FileIntegrityResult[];
}

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
    const reason = checkFirstByteMagic(spec.magic, head[0]);
    if (reason) {
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
  const ok = files.every((f) => f.ok);
  if (ok) {
    log({
      name: EVENT.MODEL_VERIFY_SUCCESS,
      attributes: { [ATTR.MODEL_NAME]: model.baseUrl },
    });
  } else {
    const failed = files.find((f) => !f.ok);
    log({
      name: EVENT.MODEL_VERIFY_FAILURE,
      severity: "ERROR",
      attributes: {
        [ATTR.MODEL_NAME]: model.baseUrl,
        [ATTR.ERROR_MESSAGE]: failed
          ? `${failed.name}: ${failed.reason ?? "unknown"}`
          : "unknown failure",
      },
    });
  }
  return { ok, files };
}
