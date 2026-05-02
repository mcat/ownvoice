/**
 * Voice-clone enrollment quality score.
 *
 * Computes seven sub-scores from raw audio (no encoder run) and a
 * weighted aggregate. Designed as an *advisory* signal layered on top of
 * the existing hard gate in enrollmentAudio.ts — never gates by itself.
 *
 * See docs/superpowers/specs/2026-05-02-voice-quality-score-design.md.
 */

import { fftReal } from "./fft";
import type { VoiceQualityResult } from "./types";

/** Bumped when sub-score mappings, weights, or the schema change. */
export const QUALITY_VERSION = 1;

/** Default aggregation weights. Sum to 1.0. Pitch variation is the
 *  highest because Chatterbox conditions on frame-level features the LM
 *  uses for prosody, not just the pooled x-vector. */
export const DEFAULT_WEIGHTS = {
  snr: 0.20,
  clipping: 0.20,
  pitchVariation: 0.25,
  voicedFraction: 0.15,
  loudnessConsistency: 0.10,
  coverage: 0.05,
  spectralTilt: 0.05,
} as const;

export type SubScoreKey = keyof typeof DEFAULT_WEIGHTS;

function piecewiseLinear(x: number, points: readonly [number, number][]): number {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

export function scoreSnr(snrDb: number): number {
  return piecewiseLinear(snrDb, [
    [6, 0],
    [15, 50],
    [25, 90],
    [35, 100],
  ]);
}

const CLIP_THRESHOLD = 0.99;

export function computeClipFraction(audio: Float32Array): number {
  if (audio.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < audio.length; i++) {
    if (Math.abs(audio[i]) >= CLIP_THRESHOLD) count++;
  }
  return count / audio.length;
}

export function scoreClipping(clipFraction: number): number {
  return piecewiseLinear(clipFraction, [
    [0, 100],
    [0.0005, 80],
    [0.005, 30],
    [0.02, 0],
  ]);
}

export function scoreCoverage(speechDurationSec: number): number {
  return piecewiseLinear(speechDurationSec, [
    [2, 0],
    [6, 60],
    [12, 95],
    [12.0001, 100],
  ]);
}

const VOICED_FRAME_MS = 20;
const SILENCE_THRESHOLD_DBFS = -40;

export function computeVoicedFraction(audio: Float32Array, sampleRate: number): number {
  const frameSize = Math.floor((VOICED_FRAME_MS / 1000) * sampleRate);
  if (frameSize === 0 || audio.length < frameSize) return 0;
  const numFrames = Math.floor(audio.length / frameSize);
  if (numFrames === 0) return 0;
  const threshold = Math.pow(10, SILENCE_THRESHOLD_DBFS / 20);
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

export function scoreVoicedFraction(voicedFraction: number): number {
  return piecewiseLinear(voicedFraction, [
    [0.4, 0],
    [0.6, 40],
    [0.75, 80],
    [0.85, 100],
  ]);
}

export function computePitchStdevSemitones(
  f0Hz: Float32Array,
  voiced: Uint8Array,
): number | null {
  const voicedF0: number[] = [];
  for (let i = 0; i < f0Hz.length; i++) {
    if (voiced[i] && f0Hz[i] > 0) voicedF0.push(f0Hz[i]);
  }
  if (voicedF0.length < 2) return null;
  const refHz = voicedF0[Math.floor(voicedF0.length / 2)]; // median-anchored reference
  const semitones = voicedF0.map((f) => 12 * Math.log2(f / refHz));
  const mean = semitones.reduce((s, v) => s + v, 0) / semitones.length;
  const variance =
    semitones.reduce((s, v) => s + (v - mean) * (v - mean), 0) / semitones.length;
  return Math.sqrt(variance);
}

export function scorePitchVariation(stdevSemitones: number): number {
  return piecewiseLinear(stdevSemitones, [
    [1, 0],
    [2, 40],
    [2.5, 70],
    [3.5, 90],
    [4.5, 100],
  ]);
}

const LOUDNESS_WINDOW_MS = 200;

export function computeLoudnessCV(audio: Float32Array, sampleRate: number): number {
  const winSize = Math.floor((LOUDNESS_WINDOW_MS / 1000) * sampleRate);
  if (winSize === 0 || audio.length < winSize * 2) return 0;
  const numWindows = Math.floor(audio.length / winSize);
  const rmsValues = new Float64Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    let s = 0;
    const off = w * winSize;
    for (let i = 0; i < winSize; i++) s += audio[off + i] * audio[off + i];
    rmsValues[w] = Math.sqrt(s / winSize);
  }
  let mean = 0;
  for (let i = 0; i < numWindows; i++) mean += rmsValues[i];
  mean /= numWindows;
  if (mean < 1e-9) return 0;
  let variance = 0;
  for (let i = 0; i < numWindows; i++) variance += (rmsValues[i] - mean) ** 2;
  variance /= numWindows;
  return Math.sqrt(variance) / mean;
}

export function scoreLoudnessConsistency(cv: number): number {
  return piecewiseLinear(cv, [
    [0, 100],
    [0.25, 100],
    [0.5, 70],
    [1.0, 30],
    [1.5, 0],
  ]);
}

const SPECTRAL_FRAME_MS = 30;
const SPECTRAL_HOP_MS = 10;
const FFT_SIZE = 1024;
const TILT_TARGET_DB = -3;
const LOW_BAND_HZ: [number, number] = [80, 1000];
const HIGH_BAND_HZ: [number, number] = [1000, 5000];

export function computeSpectralTiltAlphaDb(
  audio: Float32Array,
  voiced: Uint8Array,
  sampleRate: number,
): number {
  const frameSize = Math.floor((SPECTRAL_FRAME_MS / 1000) * sampleRate);
  const hopSize = Math.floor((SPECTRAL_HOP_MS / 1000) * sampleRate);
  if (frameSize === 0 || audio.length < frameSize) return TILT_TARGET_DB;

  const window = new Float32Array(FFT_SIZE);
  let lowSum = 0;
  let highSum = 0;
  let voicedFrameCount = 0;
  const numFrames = Math.floor((audio.length - frameSize) / hopSize) + 1;
  for (let f = 0; f < numFrames; f++) {
    const voicedIdx = Math.floor((f / numFrames) * voiced.length);
    if (!voiced[voicedIdx]) continue;
    voicedFrameCount++;
    const start = f * hopSize;
    for (let i = 0; i < FFT_SIZE; i++) {
      if (i < frameSize && start + i < audio.length) {
        const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
        window[i] = audio[start + i] * hamming;
      } else {
        window[i] = 0;
      }
    }
    const { re, im } = fftReal(window);
    const binHz = sampleRate / FFT_SIZE;
    for (let k = 1; k < FFT_SIZE / 2; k++) {
      const f0 = k * binHz;
      const power = re[k] * re[k] + im[k] * im[k];
      if (f0 >= LOW_BAND_HZ[0] && f0 < LOW_BAND_HZ[1]) lowSum += power;
      else if (f0 >= HIGH_BAND_HZ[0] && f0 < HIGH_BAND_HZ[1]) highSum += power;
    }
  }
  if (voicedFrameCount === 0 || lowSum < 1e-12 || highSum < 1e-12) return TILT_TARGET_DB;
  return 10 * Math.log10(highSum / lowSum);
}

export function classifyTiltDirection(alphaDb: number): "boomy" | "tinny" | "neutral" {
  const delta = alphaDb - TILT_TARGET_DB;
  if (delta < -5) return "boomy";
  if (delta > 5) return "tinny";
  return "neutral";
}

export function scoreSpectralTilt(alphaDb: number): number {
  const absDelta = Math.abs(alphaDb - TILT_TARGET_DB);
  return piecewiseLinear(absDelta, [
    [0, 100],
    [3, 100],
    [7, 70],
    [12, 30],
    [18, 0],
  ]);
}
