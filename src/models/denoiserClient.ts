/**
 * Main-thread client for the DeepFilterNet3 denoiser worker.
 *
 * Lazy: the worker isn't created until the first denoise() call —
 * enrollment is the only consumer and it happens rarely (once per
 * patient). Once created, the worker is memoised for the page lifetime.
 *
 * The denoiser model itself ships through the standard manifest +
 * offlinePrimer + OPFS pathway (see public/models-manifest.json), so
 * once the user has run "Prepare for offline" the worker fetch hits
 * OPFS and is instant. Pre-primer first-record incurs a network fetch
 * via the Pages Function proxy.
 */
import { MODEL_URLS } from "./types";

const LOG = "[OwnVoice:Denoiser:client]";

let workerPromise: Promise<Worker> | null = null;
let nextRequestId = 1;

function ensureWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise;
  workerPromise = new Promise<Worker>((resolve, reject) => {
    let w: Worker;
    try {
      w = new Worker(
        new URL("./denoiserWorker.ts", import.meta.url),
        { type: "module" },
      );
    } catch (err) {
      workerPromise = null;
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    const onReady = (e: MessageEvent) => {
      if (e.data?.type === "ready") {
        w.removeEventListener("message", onReady);
        console.log(`${LOG} worker ready`);
        resolve(w);
      } else if (e.data?.type === "error") {
        w.removeEventListener("message", onReady);
        workerPromise = null;
        reject(new Error(e.data.message || "denoiser init failed"));
      }
    };
    w.addEventListener("message", onReady);
    w.postMessage({ type: "init", modelUrl: MODEL_URLS.denoiser });
  });
  return workerPromise;
}

/**
 * Denoise a buffer. On any error — worker creation, init, run — falls
 * back to returning the input unchanged. Enrollment continues; the
 * denoise stage is best-effort enhancement, not a hard dependency.
 */
export async function denoise(
  audio: Float32Array,
  sampleRate: number,
): Promise<Float32Array> {
  let worker: Worker;
  try {
    worker = await ensureWorker();
  } catch (err) {
    console.warn(`${LOG} init failed, passing audio through unchanged:`, err);
    return audio;
  }

  const requestId = nextRequestId++;
  return new Promise<Float32Array>((resolve) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg?.type === "denoised") {
        worker.removeEventListener("message", handler);
        resolve(msg.audio as Float32Array);
      } else if (msg?.type === "error") {
        worker.removeEventListener("message", handler);
        console.warn(`${LOG} run failed, passing audio through:`, msg.message);
        resolve(audio);
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ type: "denoise", audio, sampleRate, requestId });
  });
}

/** Test hook — reset the memoised worker. */
export function __test__reset(): void {
  workerPromise = null;
  nextRequestId = 1;
}
