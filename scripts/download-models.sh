#!/bin/bash
# Download all ONNX model files for OwnVoice development.
# Models are served by Vite dev server from public/models/.
# Total download: ~1.7 GB
#
# Usage: ./scripts/download-models.sh

set -e

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/models"
HF="https://huggingface.co"

echo "Downloading OwnVoice model files to $BASE_DIR"
echo "Total: ~1.7 GB — this may take a few minutes."
echo ""

# ── Chatterbox Turbo (TTS, q4f16, ~561 MB) ──
REPO="$HF/ResembleAI/chatterbox-turbo-ONNX/resolve/main"
DIR="$BASE_DIR/chatterbox-turbo"
mkdir -p "$DIR"

echo "==> Chatterbox Turbo (TTS)"
for f in tokenizer.json config.json generation_config.json preprocessor_config.json tokenizer_config.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for model in embed_tokens_q4f16 speech_encoder_q4f16 language_model_q4f16 conditional_decoder_q4f16; do
  for ext in onnx onnx_data; do
    f="${model}.${ext}"
    [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
  done
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── Gemma 3 1B (LLM, q4, ~820 MB) ──
REPO="$HF/onnx-community/gemma-3-1b-it-ONNX/resolve/main"
DIR="$BASE_DIR/gemma-3-1b"
mkdir -p "$DIR"

echo "==> Gemma 3 1B (LLM)"
for f in tokenizer.json tokenizer_config.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for f in model_q4.onnx model_q4.onnx_data; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

# ── Whisper small (STT, q4, ~299 MB) ──
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

# ── Chatterbox Multilingual (TTS, multilingual, ~1.5 GB) ──
REPO="$HF/onnx-community/chatterbox-multilingual-ONNX/resolve/main"
DIR="$BASE_DIR/chatterbox-multilingual"
mkdir -p "$DIR"

echo "==> Chatterbox Multilingual (TTS)"
for f in tokenizer.json Cangjie5_TC.json; do
  [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f"; curl -sL -o "$DIR/$f" "$REPO/$f"; }
done
for model in speech_encoder embed_tokens language_model_q4f16 conditional_decoder; do
  for ext in onnx onnx_data; do
    f="${model}.${ext}"
    [ -f "$DIR/$f" ] && echo "  $f (cached)" || { echo "  $f ..."; curl -L -o "$DIR/$f" "$REPO/onnx/$f" 2>/dev/null; }
  done
done
echo "  Done: $(du -sh "$DIR" | cut -f1)"
echo ""

echo "All models downloaded."
du -sh "$BASE_DIR"
