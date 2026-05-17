#!/usr/bin/env python3
"""
Convert the Chatterbox-Multilingual conditional_decoder from fp32 → fp16.

Why: the decoder weights file is the single largest model in OwnVoice's
loaded set (~534 MB at fp32). fp16 halves it to ~267 MB. Cutting retained
heap by ~270 MB is the largest remaining lever in the memory-footprint
backlog — see issue #287. fp32→fp16 quantization can shift waveform output
audibly, so this script produces the candidate model for a clinical A/B
listening review; the conversion itself is mechanical and the safety gate
is downstream.

DSP-flavored subgraphs that must stay fp32:

  * `/STFT` — the STFT op runs FFT compute. ORT requires fp32 input/output
    for STFT regardless of weight precision; converting it produces a
    model the runtime refuses to load.

  * `/istft/*` — the inverse-STFT pipeline: 20 nodes built around two
    ConvTranspose synthesis layers + window math. This is the final
    waveform synthesis path, exactly where quality matters most. The math
    relies on fp32 windowing precision; fp16 here produces audible buzz.

  * `/f0_upsamp/Resize` — f0 (fundamental frequency) upsampling. f0 values
    drive pitch contour; the Resize op interpolates them, and fp16's
    ~3-digit precision around 200 Hz is barely enough but the upstream
    boundary is fp32 anyway.

The conv stacks (`/f0_predictor/`, `/encoder/`, `/up_blocks/`, etc.) all
convert cleanly to fp16. Inputs/outputs (speech_tokens int64,
speaker_embeddings/features fp32, waveform fp32) stay fp32 via
`keep_io_types=True`.

Usage:
    python3 scripts/convert-decoder-fp16.py \\
        --input  public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx \\
        --output public/models/2026-04-29-decoder-fp16/chatterbox-multilingual/conditional_decoder.onnx

Requires: onnx, onnxconverter-common. Tested with onnx 1.21.0 +
onnxconverter-common 1.16.0 on Python 3.14.
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

# Subgraphs that do signal-domain DSP and must stay fp32. The encoder's
# script blocks resamplers; the decoder's analogue is the STFT/ISTFT
# synthesis path plus the f0 upsampler.
_DSP_SCOPE_RE = re.compile(r"^(/STFT$|/istft/|/f0_upsamp/)")

# Ops that require all float inputs to share type parameter T. Identical
# list to the encoder script — these are ORT-wide constraints, not
# model-specific.
_TYPE_T_OPS = {
    "Add", "Sub", "Mul", "Div", "Pow", "Mod",
    "Min", "Max", "Mean", "Sum",
    "Greater", "Less", "Equal", "GreaterOrEqual", "LessOrEqual",
    "Where",
    "Conv", "ConvTranspose", "Gemm", "MatMul",
    "LayerNormalization", "BatchNormalization",
    "InstanceNormalization", "GroupNormalization",
    "PRelu", "Concat",
}


def align_op_input_types(model: onnx.ModelProto) -> onnx.ModelProto:
    """
    Walk the graph after fp16 conversion and insert `Cast(fp32→fp16)` on
    any type-T op (Conv, MatMul, Add, Concat, …) that ended up with mixed
    fp32/fp16 float inputs. The converter library respects upstream
    `Cast(to=fp32)` pins (e.g. the DSP boundaries we blocked above) while
    rewriting the consuming op's other inputs to fp16; ORT's loader then
    rejects the mismatched op with `Type parameter (T) bound to different
    types`. Iterate to a fixed point because each Cast changes downstream
    output types and can surface new mismatches.

    Identical algorithm to convert-encoder-fp16.py — the type-T constraint
    is ORT-wide.
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
                if node.op_type == "Where":
                    type_input_idxs = list(range(1, len(node.input)))
                else:
                    type_input_idxs = list(range(len(node.input)))
                type_input_idxs = [i for i in type_input_idxs if node.input[i]]

                input_types = [dtype_map.get(node.input[i]) for i in type_input_idxs]
                float_types = [
                    t for t in input_types
                    if t in (TensorProto.FLOAT, TensorProto.FLOAT16)
                ]
                if len(float_types) >= 2 and len(set(float_types)) > 1:
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
        del model.graph.value_info[:]

        total_inserted += fixed_this_pass
        print(f"  pass {pass_idx}: inserted {fixed_this_pass} Cast(fp32→fp16) nodes")
        if fixed_this_pass == 0:
            break
        if pass_idx >= 10:
            print(f"  WARNING: hit fixed-point ceiling ({pass_idx} passes); some mismatches may remain")
            break

    print(f"  Total Cast(fp32→fp16) nodes inserted across all passes: {total_inserted}")
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

    skip_node_names = [
        n.name for n in model.graph.node if _DSP_SCOPE_RE.match(n.name)
    ]
    print(f"  Skipping {len(skip_node_names)} DSP nodes (STFT/ISTFT synthesis + f0 upsampler)")

    print("Converting weights to fp16 (keep_io_types=True)")
    fp16_model = convert_float_to_float16(
        model,
        keep_io_types=True,
        node_block_list=skip_node_names,
    )

    del fp16_model.graph.value_info[:]

    fp16_model = align_op_input_types(fp16_model)

    out_path.parent.mkdir(parents=True, exist_ok=True)
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
                        help="path to fp32 conditional_decoder.onnx")
    parser.add_argument("--output", required=True, type=Path,
                        help="path to write fp16 conditional_decoder.onnx (companion .onnx_data is auto-named)")
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
