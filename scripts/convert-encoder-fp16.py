#!/usr/bin/env python3
"""
Convert the Chatterbox-Multilingual speech_encoder from fp32 → fp16.

Why: iPadOS Safari imposes a per-WebAssembly-instance linear-memory cap of
~500 MB in DedicatedWorker contexts. The fp32 encoder's weights file is
591 MB (`speech_encoder.onnx_data`), which busts the cap and causes
`RangeError: Out of memory` during voice-cloning enrollment. fp16 cuts the
weights in half (~296 MB) and slides comfortably under the cap. See issue
#163, Phase 1.

Output filenames are chosen to match what `src/models/ttsWorker.ts` derives
at runtime — the worker constructs the data filename as `<onnx>_data`, so
this script writes `speech_encoder.onnx` + `speech_encoder.onnx_data` and
no code in the worker has to change.

`keep_io_types=True` preserves fp32 graph inputs/outputs. The internal
weights and activations run in fp16, but `audio_values` (input) stays
fp32 and `cond_emb` / `prompt_token` / `speaker_embeddings` /
`speaker_features` (outputs) stay fp32 too. This is what we want — every
caller of the encoder feeds a fp32 tensor and reads fp32 outputs; flipping
that contract would ripple through the worker and the persisted SpeakerData
shape.

Usage:
    python3 scripts/convert-encoder-fp16.py \
        --input  public/models/2026-04-27/chatterbox-multilingual/speech_encoder.onnx \
        --output public/models/2026-04-29/chatterbox-multilingual/speech_encoder.onnx

Requires: onnx, onnxconverter-common (install in a venv; tested on Python 3.14
with onnx 1.21.0 + onnxconverter-common 1.16.0).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import onnx
from onnx import TensorProto, helper
from onnxconverter_common.float16 import convert_float_to_float16

# Subgraphs that do signal-domain DSP (resampling, padding) and need to stay
# fp32. The chains in here cast int64 sample-counts up to fp32, divide by a
# resampling ratio, take a Ceil, and cast back to int64 — fp16 can't safely
# represent integers above 2048, so a 4-second 16 kHz buffer (64 000 samples)
# would round catastrophically.
_DSP_SCOPE_RE = re.compile(r"^/resampler(?:_\d+)?/")

# Ops that take multiple float inputs which must share the same type
# parameter T. ORT's loader rejects any of these with mixed fp16/fp32 inputs.
# The conversion library covers the obvious binary cases on its own but
# leaves Conv/Gemm/MatMul/Norms unaligned when an upstream `Cast(to=fp32)`
# pinned an input at fp32 while the weights got rewritten to fp16.
_TYPE_T_OPS = {
    # Element-wise math (commutative + comparison + selection)
    "Add", "Sub", "Mul", "Div", "Pow", "Mod",
    "Min", "Max", "Mean", "Sum",
    "Greater", "Less", "Equal", "GreaterOrEqual", "LessOrEqual",
    "Where",
    # Linear-algebra ops
    "Conv", "ConvTranspose", "Gemm", "MatMul",
    # Normalizations (X, scale, bias share T)
    "LayerNormalization", "BatchNormalization",
    "InstanceNormalization", "GroupNormalization",
    # Other multi-input ops
    "PRelu", "Concat",
}


def align_op_input_types(model: onnx.ModelProto) -> onnx.ModelProto:
    """
    After fp16 conversion, ops that require all float inputs to share the
    same type parameter T (Add, Sub, Mul, Div, Conv, Gemm, MatMul, Norms,
    Concat, …) end up with mismatched fp32/fp16 inputs because
    `convert_float_to_float16` respects explicit `Cast(to=fp32)` nodes
    upstream while rewriting the consuming op's other inputs (e.g. Conv
    weights) to fp16. ORT's loader rejects this with
    `Type parameter (T) of Optype (X) bound to different types`. Walk the
    graph, find every type-T op with mixed float inputs, and insert
    `Cast(fp32→fp16)` on the fp32 inputs so all share T = fp16.

    Repeated until no more mismatches surface — a single pass can leave
    new mismatches in place because casting an input changes the consuming
    op's *output* type, which can in turn create new mismatches downstream.
    """
    pass_idx = 0
    total_inserted = 0
    while True:
        pass_idx += 1
        model = onnx.shape_inference.infer_shapes(model, strict_mode=False)

        dtype_map: dict[str, int] = {}
        for collection in (model.graph.value_info, model.graph.input, model.graph.output):
            for t in collection:
                elem = t.type.tensor_type.elem_type
                if elem:
                    dtype_map[t.name] = elem
        for init in model.graph.initializer:
            dtype_map[init.name] = init.data_type

        new_nodes: list[onnx.NodeProto] = []
        cast_counter = total_inserted
        fixed_this_pass = 0

        for node in model.graph.node:
            if node.op_type in _TYPE_T_OPS:
                # Determine which inputs participate in the type-T constraint.
                # `Where(cond, x, y)` — only x and y; skip cond at index 0.
                if node.op_type == "Where":
                    type_input_idxs = list(range(1, len(node.input)))
                else:
                    type_input_idxs = list(range(len(node.input)))
                # Skip empty optional inputs (e.g. Conv bias may be "")
                type_input_idxs = [i for i in type_input_idxs if node.input[i]]

                input_types = [dtype_map.get(node.input[i]) for i in type_input_idxs]
                float_types = [
                    t for t in input_types
                    if t in (TensorProto.FLOAT, TensorProto.FLOAT16)
                ]
                if len(float_types) >= 2 and len(set(float_types)) > 1:
                    # Mismatch — insert Cast(fp32→fp16) on every fp32 input.
                    for i in type_input_idxs:
                        inp = node.input[i]
                        if dtype_map.get(inp) == TensorProto.FLOAT:
                            cast_name = f"_fp16fix_{cast_counter}"
                            cast_out = f"{cast_name}_out"
                            cast_counter += 1
                            new_nodes.append(
                                helper.make_node(
                                    "Cast",
                                    inputs=[inp],
                                    outputs=[cast_out],
                                    name=cast_name,
                                    to=TensorProto.FLOAT16,
                                )
                            )
                            node.input[i] = cast_out
                            dtype_map[cast_out] = TensorProto.FLOAT16
                            fixed_this_pass += 1
            new_nodes.append(node)

        del model.graph.node[:]
        model.graph.node.extend(new_nodes)
        # Clear stale value_info so downstream output types get re-inferred
        # next pass (e.g. a Sub whose inputs are now both fp16 must annotate
        # fp16 output, not the cached fp32 from before the fix).
        del model.graph.value_info[:]

        total_inserted += fixed_this_pass
        print(f"  pass {pass_idx}: inserted {fixed_this_pass} Cast(fp32→fp16) nodes")
        if fixed_this_pass == 0:
            break
        if pass_idx >= 10:
            print(f"  WARNING: hit fixed-point ceiling ({pass_idx} passes); some mismatches may remain")
            break

    print(f"  Total Cast(fp32→fp16) nodes inserted across all passes: {total_inserted}")
    # Final shape inference for the saved model.
    return onnx.shape_inference.infer_shapes(model, strict_mode=False)


def convert(in_path: Path, out_path: Path) -> None:
    print(f"Loading fp32 model from {in_path}")
    model = onnx.load(str(in_path))

    in_size = sum(
        os.path.getsize(in_path.parent / f)
        for f in os.listdir(in_path.parent)
        if f.startswith(in_path.name)
    )
    print(f"  fp32 total: {in_size / 1024 / 1024:.1f} MB")

    # The resampler subgraphs (`/resampler/`, `/resampler_1/`) do
    # signal-domain DSP. Their critical chain is `int64 sample_count →
    # Cast(fp32) → Div(by_ratio) → Ceil → Cast(int64)` — fp16 represents
    # integers exactly only up to 2 048, so a 4-second 16 kHz buffer
    # (64 000 samples) would round catastrophically. Block every resampler
    # node from conversion so the entire DSP chain stays fp32 (`align_op_
    # input_types` then handles the boundary back into fp16 territory).
    skip_node_names = [
        n.name for n in model.graph.node if _DSP_SCOPE_RE.match(n.name)
    ]
    print(f"  Skipping {len(skip_node_names)} DSP nodes (resampler shape arithmetic)")

    print("Converting weights to fp16 (keep_io_types=True)")
    fp16_model = convert_float_to_float16(
        model,
        keep_io_types=True,
        node_block_list=skip_node_names,
    )

    # `convert_float_to_float16` rewrites tensor data and IO types but can
    # leave stale `value_info` entries on internal nodes that still claim
    # fp32 even though the producing node now emits fp16. ORT's loader runs
    # a strict type-check and fails with `Type (tensor(float16)) ... does
    # not match expected type (tensor(float))`. Drop stale value_info and
    # re-run shape inference so the resulting model has a consistent type
    # graph.
    del fp16_model.graph.value_info[:]

    # Insert Cast(fp32→fp16) at every type-T mismatch the converter left
    # behind (Conv with fp16 weights + fp32 X, Sub with fp16 mean + fp32
    # variance correction, Concat with mixed inputs, etc.). Iterates to a
    # fixed point because each Cast changes downstream output types and
    # may surface new mismatches.
    fp16_model = align_op_input_types(fp16_model)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Strip any existing _data file so save_as_external_data starts clean —
    # otherwise onnx appends to the existing buffer instead of replacing it.
    data_filename = out_path.name + "_data"
    data_path = out_path.parent / data_filename
    if data_path.exists():
        print(f"  removing stale {data_path.name}")
        data_path.unlink()
    if out_path.exists():
        out_path.unlink()

    print(f"Saving fp16 model to {out_path}")
    onnx.save(
        fp16_model,
        str(out_path),
        save_as_external_data=True,
        all_tensors_to_one_file=True,
        location=data_filename,
    )

    out_size = out_path.stat().st_size + data_path.stat().st_size
    print(f"  fp16 total: {out_size / 1024 / 1024:.1f} MB")
    print(f"  reduction:  {(1 - out_size / in_size) * 100:.1f}%")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path,
                        help="path to fp32 speech_encoder.onnx")
    parser.add_argument("--output", required=True, type=Path,
                        help="path to write fp16 speech_encoder.onnx (companion .onnx_data is auto-named)")
    args = parser.parse_args()

    if not args.input.exists():
        print(f"ERROR: input not found: {args.input}", file=sys.stderr)
        return 1

    if args.output.suffix != ".onnx":
        print(f"ERROR: output must end in .onnx (got {args.output})", file=sys.stderr)
        return 1

    convert(args.input, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
