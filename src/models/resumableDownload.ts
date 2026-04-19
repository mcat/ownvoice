import { registerResumeSync } from "./backgroundSyncResume";

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

/**
 * Stream `url` into `dir/filename`. If a prior attempt left a partial file,
 * sends `Range: bytes=N-` and appends.
 *
 * Bypasses the service worker via `cache: "no-store"` — the SW never sees
 * these fetches, so partial 2xx responses can't poison the Cache API.
 */
export async function resumableDownload(opts: ResumableDownloadOpts): Promise<void> {
  const { url, dir, filename, expectedSize, signal, onProgress } = opts;

  const prior = await readProgress(dir, filename);
  let resumeFrom =
    prior && prior.expectedSize === expectedSize ? prior.bytesWritten : 0;

  const headers: HeadersInit = {};
  if (resumeFrom > 0) headers["Range"] = `bytes=${resumeFrom}-`;

  const response = await fetch(url, { cache: "no-store", headers, signal });
  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status} ${response.statusText}`);
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
  const reader = response.body?.getReader();
  if (!reader) {
    await writable.close();
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
      bytesWritten += value.byteLength;
      onProgress?.({ bytesWritten, expectedSize });
      // Abort checked AFTER processing each chunk so bytes that arrived
      // before cancellation are preserved for the next resume.
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    }
  } catch (err) {
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
