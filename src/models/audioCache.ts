import { getModelManager } from "./modelManager";
import { isGPUReady, synthesizeGPU } from "./ttsEngine";
import { postProcessAudio } from "../speak";
import { recordHash } from "../stores/patientIndex";

// Bumped to v3 to orphan audio generated under the pre-sampling worker:
// the earlier `USE_GREEDY=true` code path produced stuttered audio for
// ~60% of phrases due to the LM looping on a repeating-token attractor
// that greedy argmax couldn't escape (see public/tts-gpu-worker.js
// top-of-file notes on the sampling pipeline). Without bumping the
// cache dir, the fix is invisible to any clinician whose v2 cache is
// already populated — reads are stable-keyed on hashKey(phrase,
// fingerprint) and would keep serving the old stuttered bytes.
//
// Previous v1→v2 reasons (kept for trail):
//   1. Stored bytes went post-processed (denoise/EQ/gate/limiter) instead
//      of raw decoder output — playback skips the FFT pipeline.
//   2. Stored bytes went Int16 PCM (scale 32767) instead of Float32,
//      halving on-disk footprint.
const CACHE_DIR = "audio-cache-v3";
const SAMPLE_RATE = 24000; // Chatterbox Turbo output rate
const INT16_SCALE = 32767;

/** Convert Float32 audio (assumed roughly in ±1.0) to clamped Int16 PCM. */
function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] * INT16_SCALE;
    // Clamp after scaling — the post-process limiter bounds output to ±0.9
    // in practice, so overflow is rare, but we clamp defensively.
    out[i] = s < -32768 ? -32768 : s > 32767 ? 32767 : s;
  }
  return out;
}

/** Convert Int16 PCM back to Float32 in ±1.0 range. */
function int16ToFloat32(samples: Int16Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] / INT16_SCALE;
  }
  return out;
}

/**
 * Pre-generated audio cache for fixed phrases.
 *
 * After a voice sample is uploaded and the speaker embedding is created,
 * all ~150 fixed phrases are pre-generated as audio clips stored in OPFS.
 * On tap: read from cache → decode → play via Web Audio API (<50ms).
 *
 * Cache key: hash of phrase text + embedding fingerprint
 */

/**
 * cyrb53 — a fast, dependency-free 53-bit string hash. Used to build
 * cache filenames.
 *
 * The previous hash (djb2 with Math.abs, truncated to 32 bits then
 * base-36-encoded) folded negative/positive hash pairs together and
 * produced short keys — two unrelated phrases could collide and
 * overwrite each other's cached audio. At ~150 phrases per speaker the
 * 53-bit space keeps collision probability below 1e-12.
 *
 * Reference: https://stackoverflow.com/a/52171480 (public domain)
 */
function hashKey(phrase: string, fingerprint: string): string {
  const str = `${phrase}:${fingerprint}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hi = (2097151 & h2).toString(36);
  const lo = (h1 >>> 0).toString(36);
  return `${hi}${lo}`;
}

/**
 * Pull the voice-distinguishing vector out of whatever shape speakerData
 * has. Chatterbox Turbo's `SpeakerData` stores `speakerEmbeddings` as a
 * plain number[] (so it round-trips through JSON persistence); earlier
 * code paths could also pass a raw `Float32Array`. The fingerprint only
 * needs numeric values indexable by position.
 */
function pickEmbedding(data: unknown): ArrayLike<number> | null {
  if (data instanceof Float32Array) return data;
  if (Array.isArray(data)) return data as number[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const se = obj.speakerEmbeddings;
    if (se instanceof Float32Array) return se;
    if (Array.isArray(se)) return se as number[];
    const e = obj.embedding;
    if (e instanceof Float32Array) return e;
    if (Array.isArray(e)) return e as number[];
  }
  return null;
}

/**
 * Stable fingerprint of a speaker. Used both as a cache-key component
 * and as a run identifier in the progress store. Returns "none" when
 * the input has no recognisable embedding vector.
 */
export function embeddingFingerprint(speakerData: unknown): string {
  const arr = pickEmbedding(speakerData);
  if (!arr || arr.length < 4) return "none";
  const first = Number(arr[0]).toFixed(4);
  const last = Number(arr[arr.length - 1]).toFixed(4);
  return `${arr.length}_${first}_${last}`;
}

/** Get the OPFS cache directory, creating it if needed */
async function getCacheDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(CACHE_DIR, { create: true });
}

/** Check if a phrase is in the cache */
export async function hasCachedAudio(
  phrase: string,
  speakerData: unknown,
): Promise<boolean> {
  const fp = embeddingFingerprint(speakerData);
  if (fp === "none") return false;
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, fp);
    const fileHandle = await dir.getFileHandle(`${key}.raw`);
    const file = await fileHandle.getFile();
    return file.size > 0;
  } catch {
    return false;
  }
}

/** Retrieve cached audio as a Float32Array (converted from stored Int16). */
export async function getCachedAudio(
  phrase: string,
  speakerData: unknown,
): Promise<{ audio: Float32Array; sampleRate: number } | null> {
  const fp = embeddingFingerprint(speakerData);
  if (fp === "none") return null;
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, fp);
    const fileHandle = await dir.getFileHandle(`${key}.raw`);
    const file = await fileHandle.getFile();
    if (file.size === 0) return null;
    const buffer = await file.arrayBuffer();
    return {
      audio: int16ToFloat32(new Int16Array(buffer)),
      sampleRate: SAMPLE_RATE,
    };
  } catch {
    return null;
  }
}

/**
 * Store audio in the cache as Int16 PCM.
 *
 * This is a pure storage primitive — it stores exactly what it's given.
 * Callers on the synthesis path are expected to have already applied
 * postProcessAudio, because post-processing at write time (once) is
 * cheaper than at read time (on every tap replay). Int16 storage halves
 * disk footprint — a 5s clip drops from 480 KB to 240 KB.
 */
export async function putCachedAudio(
  phrase: string,
  speakerData: unknown,
  audio: Float32Array,
  /** The patient this clip belongs to — required for index maintenance.
   *  null for provider clips (no index tracking). */
  patientId: string | null = null,
): Promise<void> {
  const fp = embeddingFingerprint(speakerData);
  if (fp === "none") return;
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, fp);
    const fileHandle = await dir.getFileHandle(`${key}.raw`, { create: true });
    const writable = await fileHandle.createWritable();
    const pcm = float32ToInt16(audio);
    await writable.write(pcm.buffer as ArrayBuffer);
    await writable.close();
    if (patientId) {
      await recordHash(patientId, key);
    }
  } catch (err) {
    console.error("[OwnVoice:Cache] Failed to store audio:", err);
  }
}

export interface GenerateProgress {
  phrase: string;
  current: number;
  total: number;
  /** True when the TTS worker rejected this specific phrase. */
  failed?: boolean;
}

/**
 * Trip the circuit breaker when this many phrases fail back-to-back on a
 * GPU-only pass. The pain matrix is 702 phrases; if five consecutive
 * phrases time out, something is systemically wrong (zombie worker,
 * VRAM exhaustion) and grinding through the rest wastes the clinician's
 * time. The UI then surfaces a Retry button so they can try again
 * without reloading.
 */
const GPU_CONSECUTIVE_FAIL_LIMIT = 5;

/**
 * Background-generate fixed phrases for a given embedding.
 *
 * Yields after each phrase (cached or generated, success or failure) so
 * the caller can drive a progress UI. Phrases already in the cache are
 * skipped cheaply. Individual failures don't stop the batch — they
 * surface via `failed: true` on the yielded progress so a caller can
 * collect them for a retry pass.
 *
 * Pass an `AbortSignal` to cancel on locale change or reset. The
 * generator stops between phrases and also unblocks any in-flight
 * worker await when aborted.
 */
export async function* generateAllPhrases(
  phrases: string[],
  speakerData: unknown,
  signal?: AbortSignal,
  opts?: { gpuOnly?: boolean; patientId?: string | null },
): AsyncGenerator<GenerateProgress> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");
  const gpuAvailable = isGPUReady();
  const gpuOnly = opts?.gpuOnly === true;
  const patientId = opts?.patientId ?? null;

  // GPU-only mode is used for the large pain-sentence matrix where WASM
  // would take hours. If there is no GPU, skip the whole pass — don't
  // quietly fall back to WASM.
  if (gpuOnly && !gpuAvailable) {
    console.warn("[OwnVoice:Cache] GPU-only pass requested but GPU not ready, skipping");
    return;
  }

  // Need at least one synthesis path ready.
  if (!gpuAvailable && (!worker || !mgr.isReady("tts"))) {
    console.warn("[OwnVoice:Cache] No TTS path ready, skipping pre-generation");
    return;
  }
  if (embeddingFingerprint(speakerData) === "none") {
    console.warn("[OwnVoice:Cache] speakerData lacks a recognisable embedding, skipping");
    return;
  }

  const total = phrases.length;
  let consecutiveFailures = 0;

  for (let i = 0; i < phrases.length; i++) {
    if (signal?.aborted) return;
    const phrase = phrases[i];

    if (await hasCachedAudio(phrase, speakerData)) {
      consecutiveFailures = 0;
      yield { phrase, current: i + 1, total };
      continue;
    }

    let failed = false;
    try {
      const audio = await synthesizeWithRetries(
        worker,
        phrase,
        speakerData,
        signal,
        gpuOnly,
      );
      // Post-process once here, at cache-write time, so playback in
      // speak.ts skips the ~10-50ms FFT pipeline on every tap.
      const processed = postProcessAudio(audio, SAMPLE_RATE);
      await putCachedAudio(phrase, speakerData, processed, patientId);
      consecutiveFailures = 0;
    } catch (err) {
      if (signal?.aborted) return;
      failed = true;
      consecutiveFailures++;
      console.warn(
        `[OwnVoice:Cache] Gave up on "${phrase}" after retries:`,
        err,
      );
    }

    yield failed
      ? { phrase, current: i + 1, total, failed: true }
      : { phrase, current: i + 1, total };

    // Circuit breaker: only applies to GPU-only passes (the pain matrix).
    // For mixed GPU+WASM passes, a GPU timeout falls through to WASM, so
    // a fail signals a real problem worth retrying individually per
    // phrase rather than stopping the whole pass.
    if (gpuOnly && consecutiveFailures >= GPU_CONSECUTIVE_FAIL_LIMIT) {
      console.warn(
        `[OwnVoice:Cache] Circuit breaker tripped: ${consecutiveFailures} ` +
          `consecutive failures on GPU-only pass. Stopping after ${i + 1}/${total}.`,
      );
      return;
    }
  }

  console.log(`[OwnVoice:Cache] Pre-generation complete (${total} phrases)`);
}

/**
 * Regenerate a subset of phrases that previously failed. Phrases already
 * in the cache are skipped — the caller's failed set is treated as a
 * best-effort hint, not a hard list.
 */
export async function* retryFailed(
  phrases: string[],
  speakerData: unknown,
  signal?: AbortSignal,
  opts?: { gpuOnly?: boolean; patientId?: string | null },
): AsyncGenerator<GenerateProgress> {
  yield* generateAllPhrases(phrases, speakerData, signal, opts);
}

/**
 * Attempt to synthesize a phrase up to MAX_ATTEMPTS times. TTS failures
 * in practice come from transient worker state (mid-load, inflight
 * conflict) — a retry with no backoff usually succeeds. After the final
 * attempt the caller marks the phrase failed for a healthcare-worker-
 * initiated retry in Settings.
 *
 * Prefers the WebGPU path when available — Chatterbox on Metal/iPad is
 * sub-second per phrase; WASM on desktop can be 30–90s. Falls back to
 * the WASM worker if GPU isn't ready or fails on this attempt.
 */
const MAX_ATTEMPTS = 3;
// Pre-gen gets a longer GPU timeout than live taps. The LM loop itself
// is fast on M5 iPad (~33ms/step), but the conditional_decoder runs on
// single-threaded WASM and is ~24× real-time — a short "Yes" takes
// ~22s end-to-end, and pain-matrix sentences can stretch past 45s. 300s
// is a generous ceiling that lets the slowest phrases complete while
// still bounding the worst case. Revisit if/when the decoder moves to
// multi-threaded WASM or WebGPU.
const PREGEN_GPU_TIMEOUT_MS = 300_000;
async function synthesizeWithRetries(
  worker: Worker | null,
  phrase: string,
  speakerData: unknown,
  signal?: AbortSignal,
  gpuOnly: boolean = false,
): Promise<Float32Array> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      return await synthesizeBestAvailable(worker, phrase, speakerData, signal, gpuOnly);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = err;
      console.warn(
        `[OwnVoice:Cache] Attempt ${attempt}/${MAX_ATTEMPTS} failed for "${phrase}":`,
        err,
      );
    }
  }
  throw lastErr;
}

/**
 * One synthesis attempt. GPU first when available, WASM worker otherwise.
 * GPU doesn't take an AbortSignal; a pending GPU call continues to
 * completion even if we've since aborted, but the result is discarded
 * by the caller's aborted check.
 */
async function synthesizeBestAvailable(
  worker: Worker | null,
  phrase: string,
  speakerData: unknown,
  signal?: AbortSignal,
  gpuOnly: boolean = false,
): Promise<Float32Array> {
  if (isGPUReady()) {
    try {
      const { data } = await synthesizeGPU(
        phrase,
        speakerData as Parameters<typeof synthesizeGPU>[1],
        { timeoutMs: PREGEN_GPU_TIMEOUT_MS },
      );
      return data;
    } catch (err) {
      if (signal?.aborted) throw err;
      if (gpuOnly) throw err;
      console.warn(`[OwnVoice:Cache] GPU synth failed, trying WASM worker:`, err);
    }
  } else if (gpuOnly) {
    throw new Error("GPU-only synthesis requested but GPU not ready");
  }
  if (!worker) {
    throw new Error("No TTS worker available for WASM fallback");
  }
  return synthesizeOne(worker, phrase, speakerData, signal);
}

function synthesizeOne(
  worker: Worker,
  phrase: string,
  speakerData: unknown,
  signal?: AbortSignal,
): Promise<Float32Array> {
  return new Promise<Float32Array>((resolve, reject) => {
    // 180s per-phrase timeout — matches the speak.ts live-synth timeout.
    // WASM Chatterbox on desktop can take 30–90s per phrase (autoregressive
    // generation through all 24 transformer layers). First call is worst
    // due to model warmup. Faster on iPad with WebGPU/Metal, but this
    // ceiling is a safety net, not the target latency.
    const timeout = setTimeout(
      () => finish(reject, new Error("TTS synthesis timeout")),
      180_000,
    );

    const handler = (e: MessageEvent) => {
      if (e.data.type === "audio") {
        finish(resolve, e.data.data);
      } else if (e.data.type === "error") {
        finish(reject, new Error(e.data.message));
      }
    };

    const onAbort = () => finish(reject, new DOMException("Aborted", "AbortError"));

    function finish<T>(fn: (v: T) => void, value: T) {
      clearTimeout(timeout);
      worker.removeEventListener("message", handler);
      signal?.removeEventListener("abort", onAbort);
      fn(value);
    }

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort);
    worker.addEventListener("message", handler);
    // IMPORTANT: the TTS worker's synthesize handler reads `msg.speakerData`,
    // not `msg.embedding`. Passing `embedding` silently produced nothing.
    worker.postMessage({
      type: "synthesize",
      text: phrase,
      speakerData,
    });
  });
}

/**
 * Count how many phrases are currently cached for a speaker.
 *
 * Single directory scan then in-memory Set lookup — avoids N per-phrase
 * OPFS round-trips. On Safari each getFileHandle() is ~5ms; at 850
 * phrases the old per-phrase version spent ~4s just counting before
 * pre-gen could decide what to do.
 */
export async function countCached(
  phrases: string[],
  speakerData: unknown,
): Promise<number> {
  const fp = embeddingFingerprint(speakerData);
  if (fp === "none") return 0;

  let cachedKeys: Set<string>;
  try {
    cachedKeys = await listCachedKeys();
  } catch {
    return 0;
  }

  let count = 0;
  for (const phrase of phrases) {
    if (cachedKeys.has(hashKey(phrase, fp))) count++;
  }
  return count;
}

/**
 * Enumerate the cache directory once and return the set of cached hash
 * keys (stripped of the `.raw` extension). Used by countCached, and
 * available to callers that need a stable snapshot of what's on disk.
 *
 * Uses FileSystemDirectoryHandle's async-iterator protocol (`entries()`
 * or its default iterator) — available in Safari/Chrome for OPFS. If
 * neither iteration method exists, this throws and callers fall back
 * to treating the cache as empty.
 */
async function listCachedKeys(): Promise<Set<string>> {
  const dir = await getCacheDir();
  const keys = new Set<string>();
  // Both `entries()` and the default async iterator yield [name, handle]
  // tuples on OPFS directory handles. Cast through unknown to avoid the
  // DOM lib's narrower typings (which don't yet ship the iterator).
  const iter = (dir as unknown as {
    entries?: () => AsyncIterable<[string, unknown]>;
    [Symbol.asyncIterator]?: () => AsyncIterator<[string, unknown]>;
  });
  const source = iter.entries?.() ?? (iter[Symbol.asyncIterator]?.() as AsyncIterable<[string, unknown]> | undefined);
  if (!source) throw new Error("OPFS directory iteration unavailable");
  for await (const [name] of source) {
    if (name.endsWith(".raw")) keys.add(name.slice(0, -".raw".length));
  }
  return keys;
}

/** Clear all cached audio (for patient reset) */
export async function clearAudioCache(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(CACHE_DIR, { recursive: true });
    console.log("[OwnVoice:Cache] Audio cache cleared");
  } catch {
    // May not exist
  }
}

