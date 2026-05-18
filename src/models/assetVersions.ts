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
 * fp16 conditional_decoder is BLOCKED. Three attempts failed across
 * 2026-05-17 (STFT/istft/f0_upsamp), 2026-05-18 (+m_source +
 * Cast roundtrip removal), 2026-05-19 (+down_blocks/up_blocks/
 * f0_predictor). v2 failed user listen-test directly; v3 had worst-case
 * 2-4 kHz onset ratio that REGRESSED to 4.77 vs v2's 1.73 — adding more
 * blocks made things worse, not better. Per superpowers:systematic-
 * debugging Phase 4.5 (3+ failures on the same architectural pattern),
 * fp16 conversion via static block-list expansion is not workable for
 * this CFM vocoder. The buzz must live in the CFM flow integration
 * steps (mid_blocks) where fp16 error compounds across ODE steps —
 * blocking individual subgraphs doesn't address the iterative error
 * accumulation.
 *
 * See docs/known-issue-onset-bzzt.md.
 */
export const MODELS_RELEASE = "2026-05-20";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
