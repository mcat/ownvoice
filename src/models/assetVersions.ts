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
 * 2026-05-17 shipped the fp16 conditional_decoder (#287/#318) — REVERTED
 * because the fp16 conversion produces an audible artifact at speech
 * onset that the mechanical smoke-test in #317 didn't catch. The PR
 * description claimed "fp32 and fp16 sound indistinguishable" based on
 * a single rainbow-sentence A/B; user listen-tests across many cached
 * phrases revealed a modulated 2-4 kHz "bzzt" at every utterance onset.
 *
 * Rolled back to 2026-04-29 (fp32 decoder, 540 MB) until either
 *   (a) the conversion script can be improved to preserve the layers
 *       responsible for the onset transient at fp32, or
 *   (b) a different vocoder model is adopted.
 *
 * See docs/known-issue-onset-bzzt.md.
 */
export const MODELS_RELEASE = "2026-04-29";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
