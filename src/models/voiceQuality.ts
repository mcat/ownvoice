/**
 * Voice-clone enrollment quality score.
 *
 * Computes seven sub-scores from raw audio (no encoder run) and a
 * weighted aggregate. Designed as an *advisory* signal layered on top of
 * the existing hard gate in enrollmentAudio.ts — never gates by itself.
 *
 * See docs/superpowers/specs/2026-05-02-voice-quality-score-design.md.
 */

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
