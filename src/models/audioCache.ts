import { getModelManager } from "./modelManager";

const CACHE_DIR = "audio-cache";
const SAMPLE_RATE = 24000; // Chatterbox Turbo output rate

/**
 * Pre-generated audio cache for fixed phrases.
 *
 * After a voice sample is uploaded and the speaker embedding is created,
 * all ~150 fixed phrases are pre-generated as audio clips stored in OPFS.
 * On tap: read from cache → decode → play via Web Audio API (<50ms).
 *
 * Cache key: hash of phrase text + embedding fingerprint
 */

/** Simple hash for cache keys */
function hashKey(phrase: string, embeddingFingerprint: string): string {
  let hash = 0;
  const str = `${phrase}:${embeddingFingerprint}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Create a fingerprint from the first/last bytes of an embedding */
function embeddingFingerprint(embedding: Float32Array): string {
  if (embedding.length < 4) return "empty";
  const first = embedding[0].toFixed(4);
  const last = embedding[embedding.length - 1].toFixed(4);
  return `${embedding.length}_${first}_${last}`;
}

/** Get the OPFS cache directory, creating it if needed */
async function getCacheDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(CACHE_DIR, { create: true });
}

/** Check if a phrase is in the cache */
export async function hasCachedAudio(
  phrase: string,
  embedding: Float32Array,
): Promise<boolean> {
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, embeddingFingerprint(embedding));
    const fileHandle = await dir.getFileHandle(`${key}.raw`);
    const file = await fileHandle.getFile();
    return file.size > 0;
  } catch {
    return false;
  }
}

/** Retrieve cached audio as a Float32Array */
export async function getCachedAudio(
  phrase: string,
  embedding: Float32Array,
): Promise<{ audio: Float32Array; sampleRate: number } | null> {
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, embeddingFingerprint(embedding));
    const fileHandle = await dir.getFileHandle(`${key}.raw`);
    const file = await fileHandle.getFile();
    if (file.size === 0) return null;
    const buffer = await file.arrayBuffer();
    return { audio: new Float32Array(buffer), sampleRate: SAMPLE_RATE };
  } catch {
    return null;
  }
}

/** Store generated audio in the cache */
export async function putCachedAudio(
  phrase: string,
  embedding: Float32Array,
  audio: Float32Array,
): Promise<void> {
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, embeddingFingerprint(embedding));
    const fileHandle = await dir.getFileHandle(`${key}.raw`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(audio.buffer as ArrayBuffer);
    await writable.close();
  } catch (err) {
    console.error("[OwnVoice:Cache] Failed to store audio:", err);
  }
}

/**
 * Background-generate all fixed phrases for a given embedding.
 *
 * Yields progress after each phrase. The caller can display this in the UI:
 * "Preparing Margaret's voice... 47/150"
 *
 * Phrases already in the cache are skipped.
 */
export async function* generateAllPhrases(
  phrases: string[],
  embedding: Float32Array,
): AsyncGenerator<{ phrase: string; current: number; total: number }> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");

  if (!worker || !mgr.isReady("tts")) {
    console.warn("[OwnVoice:Cache] TTS model not ready, skipping pre-generation");
    return;
  }

  const total = phrases.length;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];

    // Skip if already cached
    if (await hasCachedAudio(phrase, embedding)) {
      yield { phrase, current: i + 1, total };
      continue;
    }

    // Generate via TTS worker
    try {
      const audio = await new Promise<Float32Array>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("TTS synthesis timeout")),
          10000,
        );

        const handler = (e: MessageEvent) => {
          if (e.data.type === "audio") {
            clearTimeout(timeout);
            worker.removeEventListener("message", handler);
            resolve(e.data.data);
          } else if (e.data.type === "error") {
            clearTimeout(timeout);
            worker.removeEventListener("message", handler);
            reject(new Error(e.data.message));
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({
          type: "synthesize",
          text: phrase,
          embedding,
        });
      });

      await putCachedAudio(phrase, embedding, audio);
    } catch (err) {
      console.warn(
        `[OwnVoice:Cache] Failed to generate "${phrase}":`,
        err,
      );
      // Continue with remaining phrases — don't let one failure stop the batch
    }

    yield { phrase, current: i + 1, total };
  }

  console.log(`[OwnVoice:Cache] Pre-generation complete (${total} phrases)`);
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

/** Count how many phrases are cached for a given embedding */
export async function countCached(
  phrases: string[],
  embedding: Float32Array,
): Promise<number> {
  let count = 0;
  for (const phrase of phrases) {
    if (await hasCachedAudio(phrase, embedding)) count++;
  }
  return count;
}
