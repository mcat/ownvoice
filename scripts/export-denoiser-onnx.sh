#!/usr/bin/env bash
# Reproduce denoiser_model.onnx from upstream DeepFilterNet3 weights.
#
# Source of truth for the artifact published at
# https://github.com/mcat/ownvoice-denoiser. Run this when you need a
# fresh export (e.g. upstream weights bump). The committed/R2-hosted
# artifact must match this script's output bit-for-bit; if it doesn't,
# investigate before shipping.
#
# Usage:
#   scripts/export-denoiser-onnx.sh [OUTPUT_PATH]
#
# Expected SHA-256: 14b2627f24df36c9b68c1325ce3878f35d7a460fb85c6807f8e412112fefb511

set -euo pipefail

GRAZDER_COMMIT=408414f2bdb9ed772580558d1c3ec26c5dc002d7
WORKDIR=$(mktemp -d -t df3-retrace.XXXXXX)
echo "workdir: $WORKDIR"

cd "$WORKDIR"
git clone https://github.com/grazder/DeepFilterNet.git
cd DeepFilterNet
git checkout "$GRAZDER_COMMIT"

uv venv
# shellcheck disable=SC1091
source .venv/bin/activate
uv pip install --quiet \
    torch torchaudio \
    deepfilternet \
    loguru onnxsim soundfile scipy onnx onnxruntime numpy

OUT="${1:-$(pwd)/../denoiser_model.onnx}"
python torchDF/model_onnx_export.py --minimal --output-path "$OUT"

echo "exported: $OUT"
shasum -a 256 "$OUT"
