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
 * onset that the mechanical smoke-test in #317 didn't catch.
 *
 * 2026-05-18 re-attempt: blocked /m_source/ (NSF harmonic-source) +
 * short-circuited fp16 Cast round-trips inside the blocked scope. CPU EP
 * mechanical drift dropped 44.6% → 9.9% vs fp32, but USER LISTEN-TEST
 * on extracted WebGPU EP cache audio (post-processed) STILL CONFIRMED
 * BUZZ. The /m_source/ blocking helped on quantitative metrics but did
 * not eliminate the audible artifact. Next bisection targets:
 * down_blocks.0, up_blocks.0, and the conv stacks they feed.
 *
 * Rolled back to 2026-04-29 (fp32 decoder, 540 MB) until the next
 * conversion attempt converges on clean audio.
 *
 * See docs/known-issue-onset-bzzt.md.
 */
export const MODELS_RELEASE = "2026-04-29";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
