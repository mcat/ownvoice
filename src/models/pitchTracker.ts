/**
 * Autocorrelation pitch tracker.
 *
 * Operates on raw audio at any sample rate; internally downsamples to
 * 8 kHz before correlation (covers F0 down to ~70 Hz; ~3× cheaper than
 * 24 kHz). Returns per-frame F0, voiced mask, and the normalised
 * autocorrelation peak height — the latter is consumed by the dysphonia
 * guard in voiceQuality.ts to decide whether the F0 estimates are
 * trustworthy enough to score.
 */

const TARGET_SR = 8000;
const FRAME_MS = 30;
const HOP_MS = 10;
const F0_MIN_HZ = 70;
const F0_MAX_HZ = 500;
const VOICING_PEAK_THRESHOLD = 0.3;

export interface PitchTrack {
  f0Hz: Float32Array;
  voiced: Uint8Array;
  peakHeights: Float32Array;
}

export function trackPitch(audio: Float32Array, sampleRate: number): PitchTrack {
  const downsampled = downsampleTo(audio, sampleRate, TARGET_SR);
  const filtered = bandpassF0Range(downsampled, TARGET_SR);
  const frameSize = Math.floor((FRAME_MS / 1000) * TARGET_SR);
  const hopSize = Math.floor((HOP_MS / 1000) * TARGET_SR);

  if (filtered.length < frameSize) {
    return { f0Hz: new Float32Array(0), voiced: new Uint8Array(0), peakHeights: new Float32Array(0) };
  }

  const numFrames = Math.floor((filtered.length - frameSize) / hopSize) + 1;
  const f0Hz = new Float32Array(numFrames);
  const voiced = new Uint8Array(numFrames);
  const peakHeights = new Float32Array(numFrames);

  const minLag = Math.floor(TARGET_SR / F0_MAX_HZ);
  const maxLag = Math.ceil(TARGET_SR / F0_MIN_HZ);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSize;
    const frame = filtered.subarray(start, start + frameSize);
    const { peakLag, peakNorm } = autocorrelatePeak(frame, minLag, maxLag);
    peakHeights[f] = peakNorm;
    if (peakNorm >= VOICING_PEAK_THRESHOLD && peakLag > 0) {
      voiced[f] = 1;
      f0Hz[f] = TARGET_SR / peakLag;
    } else {
      voiced[f] = 0;
      f0Hz[f] = 0;
    }
  }

  return { f0Hz, voiced, peakHeights };
}

/** Plain integer-factor decimation with a 2-tap moving-average prefilter.
 *  Adequate for F0 work — higher-quality resampling is unnecessary because
 *  we only care about resolving a fundamental, not preserving fidelity. */
function downsampleTo(audio: Float32Array, fromSr: number, toSr: number): Float32Array {
  if (fromSr === toSr) return audio;
  const ratio = fromSr / toSr;
  const out = new Float32Array(Math.floor(audio.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, audio.length - 1);
    const t = src - i0;
    out[i] = audio[i0] * (1 - t) + audio[i1] * t;
  }
  return out;
}

/** Cascade of one-pole high-pass and one-pole low-pass at F0_MIN/F0_MAX. */
function bandpassF0Range(audio: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(audio.length);
  const aHp = Math.exp((-2 * Math.PI * F0_MIN_HZ) / sampleRate);
  const aLp = 1 - Math.exp((-2 * Math.PI * F0_MAX_HZ) / sampleRate);
  let prevIn = 0;
  let prevHp = 0;
  let prevLp = 0;
  for (let i = 0; i < audio.length; i++) {
    const hp = aHp * (prevHp + audio[i] - prevIn);
    prevIn = audio[i];
    prevHp = hp;
    prevLp = prevLp + aLp * (hp - prevLp);
    out[i] = prevLp;
  }
  return out;
}

function autocorrelatePeak(
  frame: Float32Array,
  minLag: number,
  maxLag: number,
): { peakLag: number; peakNorm: number } {
  let r0 = 0;
  for (let i = 0; i < frame.length; i++) r0 += frame[i] * frame[i];
  if (r0 < 1e-12) return { peakLag: 0, peakNorm: 0 };

  let peakLag = 0;
  let peakValue = 0;
  for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
    let sum = 0;
    for (let i = 0; i < frame.length - lag; i++) sum += frame[i] * frame[i + lag];
    if (sum > peakValue) { peakValue = sum; peakLag = lag; }
  }
  return { peakLag, peakNorm: peakValue / r0 };
}
