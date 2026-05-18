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
 * 2026-05-17 shipped the fp16 conditional_decoder (#287/#318) and was
 * reverted because the conversion produced an audible 2-4 kHz buzz at
 * speech onset. Root cause was traced to the `/m_source/` NSF
 * harmonic-source subgraph: its `CumSum → Floor/Sub → Sin → MatMul →
 * Tanh` chain accumulates phase across samples and at 24 kHz pushes
 * past fp16's 2 048-integer-precision cap. The previous conversion left
 * m_source ops unprotected.
 *
 * 2026-05-18 re-attempts fp16 with the conversion script (a) adding
 * /m_source/ to the DSP block-list and (b) a new post-process that
 * short-circuits the fp16 Cast round-trips the library otherwise
 * inserts between adjacent blocked ops (which would still cost
 * precision at every boundary). Mechanical validation: meanAbs shift
 * vs fp32 dropped from 44.6% (previous fp16) to 9.9% (this release).
 *
 * See docs/known-issue-onset-bzzt.md for the full diagnostic chain.
 */
export const MODELS_RELEASE = "2026-05-18";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
