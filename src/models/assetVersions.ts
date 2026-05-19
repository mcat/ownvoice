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
 * 2026-05-24: applied offline shape inference to conditional_decoder.onnx
 * (scripts/add-shape-inference.py). The int8 quantization toolchain strips
 * value_info (per-tensor shape annotations on every intermediate tensor) —
 * without them ORT-Web's WebGPU EP runs full shape inference at
 * session-create, adding ~60s of cold load on this 24,480-node decoder.
 * Pre-computing offline drops decoder createSession from 137-188s (cold
 * int8) to ~77s warm / ~85s cold projected, matching the fp32 baseline
 * timing while keeping the 158 MB int8 weights. The .onnx file grows
 * ~2 MB (4.9 → 6.8 MB); .onnx_data is byte-identical to 2026-05-23.
 *
 * 2026-05-23: int8-weights / fp32-compute conditional_decoder with p99.9
 * scale calibration. Per-output-channel symmetric int8 (DequantizeLinear
 * before each Conv/MatMul/Gemm). Disk 275.7 MB → 158.2 MB (43% smaller
 * than fp16, 69% smaller than fp32). Compute stays fp32.
 */
export const MODELS_RELEASE = "2026-05-24";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
