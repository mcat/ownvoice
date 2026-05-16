/**
 * Stable identity for a speaker's voice vector. Used as:
 *   - audio-cache directory key (audioCache.ts)
 *   - worker-side speakerData cache key (#303: transferable buffers in
 *     ttsEngine.ts → tts-gpu-worker.js)
 *
 * Lives in its own module to break the audioCache ↔ ttsEngine import
 * cycle that would form if either module owned this function.
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

/** Returns `"none"` when the input has no recognisable embedding vector. */
export function embeddingFingerprint(speakerData: unknown): string {
  const arr = pickEmbedding(speakerData);
  if (!arr || arr.length < 4) return "none";
  const first = Number(arr[0]).toFixed(4);
  const last = Number(arr[arr.length - 1]).toFixed(4);
  return `${arr.length}_${first}_${last}`;
}
