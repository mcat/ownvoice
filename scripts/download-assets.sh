#!/bin/bash
# Download all OwnVoice asset files for development.
# Total download: ~1.7 GB (50 MB ORT WASM + ~1.65 GB models)
#
# Usage: ./scripts/download-assets.sh
#
# Files download to versioned paths matching the R2 layout:
#   public/ort/v<ORT_VERSION>/*.wasm
#   public/models/<MODELS_RELEASE>/<group>/...
#
# After replacing model files, run: npm run manifest:regen
# (See public/models-manifest.json — the runtime authoritative file list.)
#
# After replacing ANY asset, push to R2 with: npm run assets:upload

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Read version constants from src/models/assetVersions.ts
ORT_VERSION_FULL=$(grep -E '^export const ORT_VERSION' "$ROOT/src/models/assetVersions.ts" | sed 's/.*"\([^"]*\)".*/\1/')
ORT_VERSION_BARE="${ORT_VERSION_FULL#v}"  # strip leading "v" for npm/unpkg URL
MODELS_RELEASE=$(grep -E '^export const MODELS_RELEASE' "$ROOT/src/models/assetVersions.ts" | sed 's/.*"\([^"]*\)".*/\1/')

if [ -z "$ORT_VERSION_FULL" ] || [ -z "$MODELS_RELEASE" ]; then
  echo "ERROR: could not parse ORT_VERSION / MODELS_RELEASE from src/models/assetVersions.ts"
  exit 1
fi

echo "Downloading OwnVoice asset files"
echo "  ORT version:    $ORT_VERSION_FULL (npm: $ORT_VERSION_BARE)"
echo "  Models release: $MODELS_RELEASE"
echo "  Total: ~1.7 GB — this may take a few minutes."
echo ""

# ── ONNX Runtime WASM (~50 MB) ──
ORT_DIR="$ROOT/public/ort/$ORT_VERSION_FULL"
mkdir -p "$ORT_DIR"

echo "==> ONNX Runtime WASM ($ORT_VERSION_FULL)"
# Both .wasm binaries and .mjs glue files are needed at runtime — ORT
# dynamically imports the .mjs from `wasmPaths` (see vite.config.ts).
#
# `ort.webgpu.min.mjs.map` is hosted too. The .mjs ships with a
# `//# sourceMappingURL=ort.webgpu.min.mjs.map` trailer baked in by
# upstream; without the map, Safari's Web Inspector logs noisy
# "Source Map loading errors" on every stack trace. Only this one .mjs
# carries a sourceMappingURL — the wasm glue .mjs files don't, so no
# corresponding maps are downloaded.
for f in \
  ort-wasm-simd-threaded.jsep.wasm \
  ort-wasm-simd-threaded.jsep.mjs \
  ort-wasm-simd-threaded.asyncify.wasm \
  ort-wasm-simd-threaded.asyncify.mjs \
  ort.webgpu.min.mjs \
  ort.webgpu.min.mjs.map; do
  if [ -f "$ORT_DIR/$f" ]; then
    echo "  $f (cached)"
  else
    echo "  $f"
    curl -sL -o "$ORT_DIR/$f" "https://unpkg.com/onnxruntime-web@${ORT_VERSION_BARE}/dist/$f"
  fi
done
echo "  Done: $(du -sh "$ORT_DIR" | cut -f1)"
echo ""

BASE_DIR="$ROOT/public/models/$MODELS_RELEASE"
HF="https://huggingface.co"

# ── Chatterbox Multilingual (TTS, 23 languages, ~1.5 GB) ──
REPO="$HF/onnx-community/chatterbox-multilingual-ONNX/resolve/main"
DIR="$BASE_DIR/chatterbox-multilingual"
mkdir -p "$DIR"

echo "==> Chatterbox Multilingual (TTS)"
for f in tokenizer.json Cangjie5_TC.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
# embed_tokens / language_model_q4 / conditional_decoder ship as-is from HF.
for model in embed_tokens language_model_q4 conditional_decoder; do
  for ext in onnx onnx_data; do
    f="${model}.${ext}"
    [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
  done
done

# speech_encoder: HF publishes only fp32 (~591 MB) but iPad Safari's
# WebAssembly heap cap blocks anything > ~500 MB in a worker (issue #163).
# We download the fp32 source then convert locally to fp16 in-place; the
# manifest expects the fp16 sizes (~296 MB). Detection is by data-file size:
# fp32 ≈ 591 MB, fp16 ≈ 296 MB.
for ext in onnx onnx_data; do
  f="speech_encoder.${ext}"
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
done
DATA_SIZE=$(stat -f%z "$DIR/speech_encoder.onnx_data" 2>/dev/null || stat -c%s "$DIR/speech_encoder.onnx_data" 2>/dev/null || echo 0)
if [ "$DATA_SIZE" -lt 400000000 ]; then
  echo "  speech_encoder fp16 (already converted, ${DATA_SIZE} bytes)"
else
  if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 not found on PATH; needed to convert speech_encoder fp32 → fp16."
    echo "       Install Python 3.10+ (e.g. brew install python) and re-run."
    exit 1
  fi
  VENV="$ROOT/.venv-fp16"
  if [ ! -x "$VENV/bin/python" ]; then
    echo "  setting up Python venv at .venv-fp16 (one-time, ~30s) ..."
    python3 -m venv "$VENV"
    "$VENV/bin/pip" install --quiet --upgrade pip
    "$VENV/bin/pip" install --quiet onnx onnxconverter-common
  fi
  echo "  converting speech_encoder fp32 → fp16 ..."
  # Convert into a temp dir so the input fp32 stays valid until conversion
  # completes (avoids self-overwrite via the canonical filename), then
  # atomic-replace the fp32 source with the fp16 result.
  TMP=$(mktemp -d -t ov-fp16.XXXXXX)
  trap 'rm -rf "$TMP"' EXIT
  "$VENV/bin/python" "$ROOT/scripts/convert-encoder-fp16.py" \
    --input "$DIR/speech_encoder.onnx" \
    --output "$TMP/speech_encoder.onnx"
  mv -f "$TMP/speech_encoder.onnx" "$DIR/speech_encoder.onnx"
  mv -f "$TMP/speech_encoder.onnx_data" "$DIR/speech_encoder.onnx_data"
  rmdir "$TMP"
  trap - EXIT
fi
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── Whisper small.en (STT, English-only, ~302 MB) ──
REPO="$HF/onnx-community/whisper-small.en/resolve/main"
DIR="$BASE_DIR/whisper-small.en"
mkdir -p "$DIR"

echo "==> Whisper small.en (STT, English-only)"
for f in tokenizer.json tokenizer_config.json preprocessor_config.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for f in encoder_model_q4.onnx decoder_model_merged_q4.onnx; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── DeepFilterNet3 denoiser (~12 MB) ──
# Re-traced combined ONNX (raw PCM in/out @ 48 kHz). Hosted in a separate
# provenance repo, pinned to the commit that exported the artifact we audited.
# Upstream weights: Rikorose/DeepFilterNet (MIT/Apache-2.0).
# Re-trace script: grazder/DeepFilterNet@408414f (see ownvoice-denoiser/NOTICE).
DENOISER_COMMIT=17d22a5b028bb50e77538c5feb20e30d80cef229
DENOISER_BASE="https://raw.githubusercontent.com/mcat/ownvoice-denoiser/$DENOISER_COMMIT"
DIR="$BASE_DIR/denoiser"
mkdir -p "$DIR"

echo "==> DeepFilterNet3 denoiser"
for f in denoiser_model.onnx LICENSE-APACHE LICENSE-MIT NOTICE; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$DENOISER_BASE/$f"; }
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

echo "All assets downloaded."
du -sh "$ROOT/public/ort" "$ROOT/public/models"
