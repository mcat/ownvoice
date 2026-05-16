/**
 * JSON replacer/reviver that round-trip Float32Array values through
 * Zustand's string-based IDB storage. Used by `settingsStore` so the
 * speaker-encoder outputs (condEmb, speakerEmbeddings, speakerFeatures)
 * can live as Float32Array in memory while still persisting through a
 * standard JSON.stringify/parse pipeline.
 *
 * On-disk format for a tagged value: `{ __t: "f32", v: number[] }`. The
 * reviver only converts objects with the marker — bare `number[]` from
 * legacy installs passes through unchanged so a returning device keeps
 * its existing speakerData rather than corrupting it. The store
 * normalizes on the next write because `ttsWorker.handleEmbed` now
 * always produces Float32Array, which the replacer tags on write.
 */

const F32_TAG = "f32";

interface F32Tagged {
  __t: typeof F32_TAG;
  v: number[];
}

function isF32Tagged(value: unknown): value is F32Tagged {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.__t === F32_TAG && Array.isArray(v.v);
}

export function f32Replacer(_key: string, value: unknown): unknown {
  if (value instanceof Float32Array) {
    return { __t: F32_TAG, v: Array.from(value) } satisfies F32Tagged;
  }
  return value;
}

export function f32Reviver(_key: string, value: unknown): unknown {
  if (isF32Tagged(value)) return new Float32Array(value.v);
  return value;
}
