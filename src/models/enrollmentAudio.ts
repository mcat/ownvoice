/**
 * Audio preprocessing for voice-clone enrollment.
 *
 * Raw MediaRecorder output goes through this pipeline before the speech
 * encoder ingests it. ICU recordings often contain ventilator/monitor hum,
 * head/tail silence, and inconsistent levels — left untreated, all of those
 * contaminate cond_emb and speaker_embeddings, which are persisted forever.
 *
 * Each helper is pure: returns a new Float32Array, never mutates input.
 */

import { applyBiquad } from "../speak";

const HP_CUTOFF_HZ = 80;
const SILENCE_TRIM_DBFS = -40;
const TARGET_PEAK = 0.95;
const MAX_GAIN_DB = 20;
const MIN_DURATION_SEC = 1.5;
// Calibrated for ICU permissiveness — vents/monitors push the noise floor
// up, so a tighter gate would reject real recordings. 6 dB only catches the
// degenerate cases (silence, pure noise, mic failure). Tighten with telemetry.
const MIN_SNR_DB = 6;
// Minimum fraction of pre-trim 20 ms frames above the silence threshold.
// Without this, a recording of 7 s of room tone with non-stationary noise
// can clear the 6 dB SNR gate (signal_rms / noise_rms > ~2 from random
// peaks) and produce a useless clone — the user gets a quality-score-of-0
// badge but can still hit "Use this take." 0.30 matches the no-speech
// guard threshold inside scoreVoiceSample (voiceQuality.ts).
const MIN_VOICED_FRACTION = 0.30;
const VOICED_FRAME_MS = 20;

export interface EnrollmentResult {
  /** Processed audio ready for the speech encoder. */
  audio: Float32Array;
  /** Final duration after silence trim (seconds). */
  durationSec: number;
  /** Final peak amplitude after normalization. */
  peak: number;
  /** SNR estimated on the pre-trim signal, in dB. */
  snrDb: number;
  /** Whether the recording passed the duration + SNR quality gate. */
  acceptable: boolean;
  /** Human-readable rejection reason if `acceptable` is false. */
  rejectionReason?: string;
}

/**
 * Apply the full enrollment pipeline: DC offset removal, 80 Hz high-pass,
 * SNR estimation, silence trim, peak normalization. Returns the processed
 * audio and quality metrics so the UI can re-prompt on poor recordings.
 *
 * SNR is estimated *before* trimming so head/tail silence acts as the
 * natural noise-floor reference.
 */
export function preprocessEnrollment(
  audio: Float32Array,
  sampleRate: number,
): EnrollmentResult {
  let buf = removeDCOffset(audio);
  buf = highPass(buf, sampleRate, HP_CUTOFF_HZ);
  const { snrDb } = estimateSNR(buf, sampleRate);
  // Compute voiced fraction on the pre-trim signal so silence at head/tail
  // counts against the recording (a 15 s file with 4 s of speech and 11 s
  // of silence is not a usable enrollment).
  const voicedFraction = computeVoicedFraction(buf, sampleRate);
  buf = trimSilence(buf, sampleRate, SILENCE_TRIM_DBFS);
  buf = peakNormalize(buf, TARGET_PEAK, MAX_GAIN_DB);

  const durationSec = buf.length / sampleRate;
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }

  let acceptable = true;
  let rejectionReason: string | undefined;
  if (durationSec < MIN_DURATION_SEC) {
    acceptable = false;
    rejectionReason = `Recording too short — got ${durationSec.toFixed(1)}s, need at least ${MIN_DURATION_SEC.toFixed(1)}s of speech.`;
  } else if (snrDb < MIN_SNR_DB) {
    acceptable = false;
    rejectionReason = `Recording too noisy — SNR ${snrDb.toFixed(0)} dB, need at least ${MIN_SNR_DB} dB. Try a quieter location.`;
  } else if (voicedFraction < MIN_VOICED_FRACTION) {
    acceptable = false;
    rejectionReason = `Not enough speech detected — only ${Math.round(voicedFraction * 100)}% of the recording was voiced (need at least ${Math.round(MIN_VOICED_FRACTION * 100)}%). Try speaking for the full duration.`;
  }

  return { audio: buf, durationSec, peak, snrDb, acceptable, rejectionReason };
}

/**
 * Fraction of pre-trim 20 ms frames whose RMS is above the silence floor
 * (-40 dBFS). Used by the hard gate to reject recordings that are mostly
 * silence even if they pass the SNR floor (room tone with non-stationary
 * noise can clear SNR=6 dB). Also exported so voiceQuality.ts can reuse
 * the same primitive without duplicating the framing loop.
 */
export function computeVoicedFraction(audio: Float32Array, sampleRate: number): number {
  const frameSize = Math.floor((VOICED_FRAME_MS / 1000) * sampleRate);
  if (frameSize === 0 || audio.length < frameSize) return 0;
  const numFrames = Math.floor(audio.length / frameSize);
  if (numFrames === 0) return 0;
  const threshold = Math.pow(10, SILENCE_TRIM_DBFS / 20);
  let voiced = 0;
  for (let f = 0; f < numFrames; f++) {
    let s = 0;
    const off = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const x = audio[off + i];
      s += x * x;
    }
    const rms = Math.sqrt(s / frameSize);
    if (rms > threshold) voiced++;
  }
  return voiced / numFrames;
}

/** 2nd-order Butterworth high-pass; returns a new Float32Array. */
export function highPass(audio: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const out = new Float32Array(audio);
  applyBiquad(out, sampleRate, cutoffHz, "hp");
  return out;
}

/**
 * Scale audio so its peak amplitude matches `target` (0..1).
 * Caps the gain at `maxGainDb` to avoid amplifying near-silence into noise.
 */
export function peakNormalize(
  audio: Float32Array,
  target: number,
  maxGainDb = 20,
): Float32Array {
  const n = audio.length;
  const out = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(audio[i]);
    if (a > peak) peak = a;
  }
  if (peak === 0) return out;
  const desiredGain = target / peak;
  const maxGain = Math.pow(10, maxGainDb / 20);
  const gain = Math.min(desiredGain, maxGain);
  for (let i = 0; i < n; i++) out[i] = audio[i] * gain;
  return out;
}

/**
 * Estimate SNR by comparing the loudest 10% of frames (presumed signal)
 * to the quietest 10% (presumed noise floor). Works on unprocessed speech
 * with quiet pauses; degrades on heavily-processed or stationary signals.
 */
export function estimateSNR(
  audio: Float32Array,
  sampleRate: number,
): { snrDb: number; signalRms: number; noiseRms: number } {
  const frameSize = Math.floor(0.02 * sampleRate);
  const numFrames = Math.floor(audio.length / frameSize);
  if (numFrames < 10) return { snrDb: 0, signalRms: 0, noiseRms: 0 };

  const rmsValues: number[] = new Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const off = f * frameSize;
    let s = 0;
    for (let i = 0; i < frameSize; i++) {
      const x = audio[off + i];
      s += x * x;
    }
    rmsValues[f] = Math.sqrt(s / frameSize);
  }
  rmsValues.sort((a, b) => a - b);

  const tenPercent = Math.max(1, Math.floor(numFrames * 0.1));
  let noiseSum = 0;
  for (let i = 0; i < tenPercent; i++) noiseSum += rmsValues[i];
  let signalSum = 0;
  for (let i = numFrames - tenPercent; i < numFrames; i++) signalSum += rmsValues[i];

  const noiseRms = noiseSum / tenPercent;
  const signalRms = signalSum / tenPercent;
  const snrDb = 20 * Math.log10(signalRms / Math.max(noiseRms, 1e-10));
  return { snrDb, signalRms, noiseRms };
}

/**
 * Trim leading and trailing silence based on a frame-RMS energy gate.
 * Internal silence (gaps between words) is preserved. A small margin is
 * kept on each side so plosive onsets/offsets aren't clipped.
 *
 * @param thresholdDbfs Frame RMS below this is treated as silence (default -40).
 */
export function trimSilence(
  audio: Float32Array,
  sampleRate: number,
  thresholdDbfs: number,
): Float32Array {
  const n = audio.length;
  if (n === 0) return new Float32Array(0);
  const frameSize = Math.floor(0.02 * sampleRate); // 20 ms
  const marginSamples = Math.floor(0.03 * sampleRate); // 30 ms keep on each side
  const threshold = Math.pow(10, thresholdDbfs / 20);
  const numFrames = Math.floor(n / frameSize);

  let firstActive = -1;
  let lastActive = -1;
  for (let f = 0; f < numFrames; f++) {
    const off = f * frameSize;
    let s = 0;
    for (let i = 0; i < frameSize; i++) {
      const x = audio[off + i];
      s += x * x;
    }
    const rms = Math.sqrt(s / frameSize);
    if (rms > threshold) {
      if (firstActive === -1) firstActive = f;
      lastActive = f;
    }
  }

  if (firstActive === -1) return new Float32Array(audio); // nothing above threshold

  const start = Math.max(0, firstActive * frameSize - marginSamples);
  const end = Math.min(n, (lastActive + 1) * frameSize + marginSamples);
  return audio.slice(start, end);
}

/** Subtract the mean so the signal is centered on zero. */
export function removeDCOffset(audio: Float32Array): Float32Array {
  const n = audio.length;
  if (n === 0) return new Float32Array(0);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += audio[i];
  const mean = sum / n;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = audio[i] - mean;
  return out;
}
