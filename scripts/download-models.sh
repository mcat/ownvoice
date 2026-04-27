#!/bin/bash
# Download all ONNX model files for OwnVoice development.
# Models are served by Vite dev server from public/models/.
# Total download: ~2.7 GB
#
# Usage: ./scripts/download-models.sh
#
# After adding/replacing files, run: npm run manifest:regen
# (See public/models-manifest.json — the runtime authoritative file list.)

set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/models"
HF="https://huggingface.co"

echo "Downloading OwnVoice model files to $BASE_DIR"
echo "Total: ~2.7 GB — this may take a few minutes."
echo ""

# ── Chatterbox Multilingual (TTS, 23 languages, ~1.5 GB) ──
# Source for runtime TTS — not the English-only Turbo variant.
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
# Liquid Foundation Models — small, ICU-grounded suggestions. NOT Gemma.
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

echo "All models downloaded."
du -sh "$BASE_DIR"
