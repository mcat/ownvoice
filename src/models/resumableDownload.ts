import { registerResumeSync } from "./backgroundSyncResume";
import {
  ContentValidationError,
  bytesToHex,
  checkFirstByteMagic,
  checkResponseContentType,
} from "./contentValidator";
import type { ManifestFile } from "./modelsManifest";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";

export interface ResumableProgress {
  bytesWritten: number;
  expectedSize: number;
}

export interface ResumableDownloadOpts {
  url: string;
  dir: FileSystemDirectoryHandle;
  filename: string;
  /** Exact final size the file must reach (from manifest). */
  expectedSize: number;
  /** Manifest magic kind ("onnx" | "json" | null). When provided, the first
   *  byte of a fresh download is checked against the magic before being
   *  written to OPFS — turns "captive portal returns HTML" into a hard fail
   *  rather than silent corruption. */
  magic?: ManifestFile["magic"];
  signal?: AbortSignal;
  onProgress?: (p: ResumableProgress) => void;
}

const PROGRESS_SUFFIX = "._progress.json";

async function readProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<ResumableProgress | null> {
  try {
    const handle = await dir.getFileHandle(filename + PROGRESS_SUFFIX);
    const file = await handle.getFile();
    if (file.size === 0) return null;
    const parsed = JSON.parse(await file.text()) as ResumableProgress;
    if (typeof parsed.bytesWritten !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
  progress: ResumableProgress,
): Promise<void> {
  const handle = await dir.getFileHandle(filename + PROGRESS_SUFFIX, { create: true });
  const writable = await handle.createWritable();
  // Pass Uint8Array (not .buffer) — some runtimes return TextEncoder buffers
  // with non-zero byteOffset, where .buffer contains pre-pad bytes.
  await writable.write(new TextEncoder().encode(JSON.stringify(progress)));
  await writable.close();
}

async function clearProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename + PROGRESS_SUFFIX);
  } catch {
    // Not present — fine.
  }
}

async function removePartial(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename);
  } catch {
    // Already absent — fine.
  }
}

function logDownloadFailure(
  filename: string,
  reason: string,
  contentType: string | null,
  firstBytes: string | null,
): void {
  const parts = [reason];
  if (contentType) parts.push(`content-type=${contentType}`);
  if (firstBytes) parts.push(`first-bytes=${firstBytes}`);
  log({
    name: EVENT.MODEL_DOWNLOAD_FAILURE,
    severity: "ERROR",
    attributes: {
      [ATTR.MODEL_NAME]: filename,
      [ATTR.ERROR_MESSAGE]: parts.join("; "),
    },
  });
}

/**
 * Stream `url` into `dir/filename`. If a prior attempt left a partial file,
 * sends `Range: bytes=N-` and appends.
 *
 * Bypasses the service worker via `cache: "no-store"` — the SW never sees
 * these fetches, so partial 2xx responses can't poison the Cache API.
 *
 * Refuses to write a chunk to OPFS unless the response looks plausibly like
 * what was requested:
 *   - Content-Type must not be `text/html` (guards against captive portals,
 *     SPA fallbacks, and auth redirects that 200 with an HTML error page).
 *   - The first byte of a fresh download must match the manifest magic when
 *     one is declared (ONNX files start with 0x08, JSON with `{`/`[`/etc).
 *
 * On either failure: deletes any partial OPFS bytes and the progress marker
 * so a retry starts clean, emits `MODEL_DOWNLOAD_FAILURE`, and throws a
 * `ContentValidationError` carrying the diagnostic context.
 */
export async function resumableDownload(opts: ResumableDownloadOpts): Promise<void> {
  const { url, dir, filename, expectedSize, magic, signal, onProgress } = opts;

  const prior = await readProgress(dir, filename);
  let resumeFrom =
    prior && prior.expectedSize === expectedSize ? prior.bytesWritten : 0;

  const headers: HeadersInit = {};
  if (resumeFrom > 0) headers["Range"] = `bytes=${resumeFrom}-`;

  let response = await fetch(url, { cache: "no-store", headers, signal });
  if (response.status === 416 && resumeFrom > 0) {
    // Stale progress marker is past EOF (e.g. manifest size changed under us).
    // Wipe partial state and retry without Range.
    console.warn(
      `[OwnVoice] Server returned 416 for Range bytes=${resumeFrom}- — discarding stale progress and restarting`,
    );
    try {
      await response.body?.cancel();
    } catch {
      // Body already drained — fine.
    }
    await removePartial(dir, filename);
    await clearProgress(dir, filename);
    resumeFrom = 0;
    response = await fetch(url, { cache: "no-store", headers: {}, signal });
  }
  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status} ${response.statusText}`);
  }

  // Content-Type sanity check — bail before touching OPFS so an HTML
  // response (captive portal, SPA fallback, login redirect) can't corrupt
  // a freshly-created empty file.
  const contentType = response.headers.get("content-type");
  const ctReason = checkResponseContentType(contentType);
  if (ctReason) {
    // Also drop any prior partial bytes — they predate this validation
    // pass, but on a retry we'd rather start clean than risk that the
    // existing bytes were already corrupted by a pre-fix run.
    await removePartial(dir, filename);
    await clearProgress(dir, filename);
    try {
      await response.body?.cancel();
    } catch {
      // Body already drained / cancelled — fine.
    }
    logDownloadFailure(filename, ctReason, contentType, null);
    throw new ContentValidationError(
      `${filename}: ${ctReason}`,
      filename,
      contentType,
      null,
    );
  }

  if (resumeFrom > 0 && response.status !== 206) {
    // Server ignored Range (captive portal / middlebox / server without
    // partial-content support). The body is a full-file 200 — discard the
    // stale progress marker and treat this as a fresh download.
    console.warn(
      `[OwnVoice] Server returned ${response.status} instead of 206 for Range request — restarting from byte 0`,
    );
    await clearProgress(dir, filename);
    resumeFrom = 0;
  }

  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = (await fileHandle.createWritable({
    keepExistingData: resumeFrom > 0,
  } as FileSystemCreateWritableOptions)) as FileSystemWritableFileStream;
  if (resumeFrom > 0) await writable.seek(resumeFrom);

  let bytesWritten = resumeFrom;
  // Magic-byte check applies only at the very start of the file. When
  // resuming, the first chunk we receive is mid-file and unrelated to magic.
  // Capture into a separately-typed local so the in-loop narrow survives.
  const magicToCheck: ManifestFile["magic"] | undefined =
    resumeFrom === 0 ? magic : undefined;
  let needMagicCheck = magicToCheck !== null && magicToCheck !== undefined;
  const reader = response.body?.getReader();
  if (!reader) {
    await writable.close();
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (needMagicCheck && magicToCheck !== undefined && value.byteLength > 0) {
        const reason = checkFirstByteMagic(magicToCheck, value[0]);
        needMagicCheck = false;
        if (reason) {
          const firstBytes = bytesToHex(value);
          await writable.close();
          await removePartial(dir, filename);
          await clearProgress(dir, filename);
          try {
            await reader.cancel();
          } catch {
            // Already terminated — fine.
          }
          logDownloadFailure(filename, reason, contentType, firstBytes);
          throw new ContentValidationError(
            `${filename}: ${reason}`,
            filename,
            contentType,
            firstBytes,
          );
        }
      }

      await writable.write(value);
      bytesWritten += value.byteLength;
      onProgress?.({ bytesWritten, expectedSize });
      // Abort checked AFTER processing each chunk so bytes that arrived
      // before cancellation are preserved for the next resume.
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    }
  } catch (err) {
    if (err instanceof ContentValidationError) {
      throw err;
    }
    await writable.close();
    await writeProgress(dir, filename, { bytesWritten, expectedSize });
    // Fire-and-forget: register BackgroundSync so the SW can wake on
    // connectivity even if the app tab closes before the user retries.
    void registerResumeSync();
    throw err;
  }

  await writable.close();

  if (bytesWritten !== expectedSize) {
    await writeProgress(dir, filename, { bytesWritten, expectedSize });
    void registerResumeSync();
    throw new Error(
      `size mismatch after download: got ${bytesWritten}, expected ${expectedSize}`,
    );
  }

  await clearProgress(dir, filename);
}
