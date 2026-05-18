/**
 * Single source of truth for the version segment used in R2 paths.
 *
 * Bumping these constants drives:
 *   1. The path that worker `ort.env.wasm.wasmPaths` resolves to (/ort/<ORT_VERSION>/)
 *   2. The path that `public/models-manifest.json` baseUrls reference
 *   3. The path the upload script uploads to in R2
 *   4. The keep-set the prune script computes
 *
 * Version names are arbitrary but should be human-readable (a developer
 * skimming an R2 path should know roughly what the bytes are).
 */

/** Bumped when we ship a new onnxruntime-web version. Matches package.json. */
export const ORT_VERSION = "v1.25.1";

/**
 * Bumped when we change which model bytes ship. Date-based label
 * (yyyy-mm-dd) rather than a model-specific name — the release covers
 * the entire set of models (TTS + LLM + STT), not just one.
 *
 * 2026-05-22 candidate: int8-weights / fp32-compute conditional_decoder
 * with p99.9 scale calibration. Extends fp16-weights pattern from
 * 2026-05-20 (PR #331) using per-output-channel symmetric int8
 * (DequantizeLinear before each Conv/MatMul/Gemm). p99.9 outlier-
 * clipping calibration found empirically to be the sweet spot for
 * this decoder (3× lower mechanical drift vs max-abs; p99.5 and
 * p99.95 / p99.99 both regress). Disk 275.7 MB → 158.2 MB (43%
 * smaller than fp16, 69% smaller than fp32). Compute stays fp32.
 *
 * Pre-listen-test diagnostic evidence (strongly supports clean):
 *   - No bzzt comb-filter signature: top onset peaks are speech
 *     formants (94-500 Hz), not the v2-fp16 bzzt's 500 Hz harmonic
 *     comb through 11 kHz.
 *   - Worst-case 2-4 kHz onset delta: +4.2 dB on plosive_d, at
 *     -27 dB below speech RMS — at perceptibility threshold in
 *     quiet listening, masked by typical environmental noise.
 *     Post-processing (denoise + gate + normalize) attenuates
 *     further.
 *   - Perceptual gate's 1/16 fail (plosive_d 3.6) is band-fraction
 *     of total spectral energy — a proportion measurement, not
 *     loudness. Other phrases show int8 QUIETER absolute in the
 *     band despite higher proportion ratios.
 *
 * Listen-test on production WebGPU EP is still the ship gate per
 * feedback_perceptual_validator_blind_spots, but the numeric
 * evidence puts ship probability high.
 */
export const MODELS_RELEASE = "2026-05-22";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
