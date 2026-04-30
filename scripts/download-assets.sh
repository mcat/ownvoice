#!/bin/bash
# Download all OwnVoice asset files for development.
# Total download: ~2.55 GB (50 MB ORT WASM + ~2.5 GB models)
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
echo "  Total: ~2.55 GB — this may take a few minutes."
echo ""

# ── ONNX Runtime WASM (~50 MB) ──
ORT_DIR="$ROOT/public/ort/$ORT_VERSION_FULL"
mkdir -p "$ORT_DIR"

echo "==> ONNX Runtime WASM ($ORT_VERSION_FULL)"
# Both .wasm binaries and .mjs glue files are needed at runtime — ORT
# dynamically imports the .mjs from `wasmPaths` (see vite.config.ts).
for f in \
  ort-wasm-simd-threaded.jsep.wasm \
  ort-wasm-simd-threaded.jsep.mjs \
  ort-wasm-simd-threaded.asyncify.wasm \
  ort-wasm-simd-threaded.asyncify.mjs \
  ort.webgpu.min.mjs; do
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
for model in speech_encoder embed_tokens language_model_q4 conditional_decoder; do
  for ext in onnx onnx_data; do
    f="${model}.${ext}"
    [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
  done
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── LFM2-1.2B-Instruct (LLM for suggestions, ~854 MB) ──
REPO="$HF/onnx-community/LFM2-1.2B-ONNX/resolve/main"
DIR="$BASE_DIR/lfm2-1.2b-instruct"
mkdir -p "$DIR"

echo "==> LFM2-1.2B-Instruct (LLM)"
for f in tokenizer.json config.json chat_template.jinja; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for f in model_q4.onnx model_q4.onnx_data; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── Whisper small (STT, ~302 MB) ──
REPO="$HF/onnx-community/whisper-small.en/resolve/main"
DIR="$BASE_DIR/whisper-small"
mkdir -p "$DIR"

echo "==> Whisper small (STT)"
for f in tokenizer.json tokenizer_config.json preprocessor_config.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for f in encoder_model_q4.onnx decoder_model_merged_q4.onnx; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

echo "All assets downloaded."
du -sh "$ROOT/public/ort" "$ROOT/public/models"
