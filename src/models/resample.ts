/**
 * Linear-interpolation resampler shared by the STT and denoiser workers.
 *
 * Good-enough quality for our pipeline: Whisper was trained on linearly
 * resampled augmentations and DF3 likewise. If a future caller needs
 * windowed-sinc quality, use `OfflineAudioContext` on the main thread
 * instead — workers don't have it.
 */
export function linearResample(
  audio: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return audio;
  const ratio = fromRate / toRate;
  const outLength = Math.round(audio.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, audio.length - 1);
    const frac = srcIdx - lo;
    out[i] = audio[lo] * (1 - frac) + audio[hi] * frac;
  }
  return out;
}
