#!/usr/bin/env python3
"""
Convert the Chatterbox-Multilingual conditional_decoder to fp16-weights /
fp32-compute. Saves ~half the weight memory (~270 MB → ~135 MB on disk)
while keeping every activation, RNG draw, and arithmetic operation at
fp32 — so audio output is mathematically identical to the fp32 model
within last-bit rounding of the weight quantization.

This is a fundamentally DIFFERENT approach from the block-list-expansion
pattern tried in `convert-decoder-fp16.py` (and which failed across
three iterations per Phase 4.5). The block-list pattern leaves the
ARITHMETIC at fp16 in non-blocked regions, which compounds error across
the CFM ODE flow steps. This script does the opposite: it quantizes
WEIGHTS only and casts them back to fp32 right before each consuming
op, so compute precision is preserved.

How it works:
  For every Conv / ConvTranspose / MatMul / Gemm node that reads a
  float initializer:
    1. Convert the initializer's data_type to FLOAT16, with values
       quantized to fp16 representation.
    2. Insert a Cast(fp16→fp32) node before the op consuming this
       weight.
    3. Rewire the op to read the cast output instead of the original
       initializer.
  Activations, the op's compute, RNG draws, and downstream tensors
  stay at fp32 throughout.

Trade-offs vs static block-list fp16:
  + No precision loss in compute → audio is perceptually fp32-equivalent
  + No fp16 round-trip artifacts at op boundaries
  - Memory savings only on weights (not activations); the
    activation/KV-cache memory peak is unchanged
  - Slightly slower than fp16 compute on hardware with fast fp16 paths
    (negligible on CPU EP; possibly measurable on WebGPU)

Usage:
    python3 scripts/convert-decoder-fp16-weights-only.py \\
        --input  public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx \\
        --output public/models/2026-05-20/chatterbox-multilingual/conditional_decoder.onnx
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

# Ops whose weight inputs we want to quantize. These are the ops that
# carry the bulk of model weights (Conv/Linear stacks). Other ops
# (Add/Mul/Norm) typically read small constants or scalar parameters
# whose fp16 representation would barely save memory; leaving them
# alone keeps the graph surgery focused.
WEIGHTED_OPS = {"Conv", "ConvTranspose", "MatMul", "Gemm"}


def convert(in_path: Path, out_path: Path) -> None:
    print(f"Loading fp32 model from {in_path}")
    model = onnx.load(str(in_path))

    in_size = sum(
        os.path.getsize(in_path.parent / f)
        for f in os.listdir(in_path.parent)
        if f.startswith(in_path.name)
    )
    print(f"  fp32 total: {in_size / 1024 / 1024:.1f} MB")

    # Index initializers by name and find which ones are float32 weights.
    name_to_init: dict[str, onnx.TensorProto] = {i.name: i for i in model.graph.initializer}

    # First pass: find every Conv/MatMul/Gemm/ConvTranspose op and identify
    # the float-typed initializers it reads. These are the weights/biases to
    # quantize. We DON'T quantize int initializers (shape constants etc).
    weight_init_names: set[str] = set()
    op_weight_map: dict[str, list[int]] = {}  # node.name -> [input_idx, ...]
    for node in model.graph.node:
        if node.op_type not in WEIGHTED_OPS:
            continue
        # Conv/ConvTranspose: input 0 is X (activation), input 1 is W (weight),
        # optional input 2 is B (bias). Gemm: A, B, C. MatMul: A, B.
        # We quantize EVERY float initializer input, regardless of position.
        for idx, inp in enumerate(node.input):
            if not inp:
                continue
            init = name_to_init.get(inp)
            if init is None:
                continue
            if init.data_type == TensorProto.FLOAT:
                weight_init_names.add(inp)
                op_weight_map.setdefault(node.name, []).append(idx)

    print(f"  Found {len(weight_init_names)} float weight initializers feeding "
          f"{len(op_weight_map)} weighted ops")

    # Second pass: convert each weight initializer to fp16. The raw_data
    # is the on-disk byte buffer; we re-encode the values at fp16 precision.
    for name in weight_init_names:
        init = name_to_init[name]
        arr = numpy_helper.to_array(init)
        arr16 = arr.astype(np.float16)
        # Build a fresh TensorProto so external-data offsets, etc. get
        # regenerated on save.
        new_init = numpy_helper.from_array(arr16, name=name)
        # Replace the initializer in-place
        init.CopyFrom(new_init)

    # Third pass: insert Cast(fp16→fp32) before each weight input on each
    # weighted op. The Cast outputs replace the original weight name in
    # the op's inputs.
    new_nodes: list[onnx.NodeProto] = []
    cast_counter = 0
    rewires_per_op: dict[str, dict[int, str]] = {}  # node.name -> {input_idx -> new_name}

    # Walk the original node list to determine where to insert Casts.
    # Each op gets a Cast inserted ONLY for the indices of its float-weight
    # inputs (per op_weight_map).
    cast_for_init: dict[str, str] = {}  # init_name -> Cast output name (deduped)
    for node in model.graph.node:
        if node.name in op_weight_map:
            for idx in op_weight_map[node.name]:
                init_name = node.input[idx]
                # Dedup: if we've already cast this initializer, reuse the output.
                # (Same weight tensor consumed by multiple ops is rare in practice
                # but happens for shared embeddings; the dedup keeps the graph small.)
                if init_name not in cast_for_init:
                    cast_name = f"_w_cast_{cast_counter}"
                    cast_out = f"{cast_name}_out"
                    cast_counter += 1
                    cast_node = helper.make_node(
                        "Cast",
                        inputs=[init_name],
                        outputs=[cast_out],
                        name=cast_name,
                        to=TensorProto.FLOAT,
                    )
                    new_nodes.append(cast_node)
                    cast_for_init[init_name] = cast_out
                rewires_per_op.setdefault(node.name, {})[idx] = cast_for_init[init_name]
        new_nodes.append(node)

    # Apply the rewires to op inputs.
    for node in new_nodes:
        if node.name in rewires_per_op:
            for idx, new_name in rewires_per_op[node.name].items():
                node.input[idx] = new_name

    del model.graph.node[:]
    model.graph.node.extend(new_nodes)
    del model.graph.value_info[:]

    print(f"  Inserted {cast_counter} Cast(fp16→fp32) nodes")
    print(f"  Quantized {len(weight_init_names)} weight tensors to fp16")

    # Save. External data goes to a fresh _data file.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data_filename = out_path.name + "_data"
    data_path = out_path.parent / data_filename
    if data_path.exists():
        data_path.unlink()
    if out_path.exists():
        out_path.unlink()

    print(f"Saving fp16-weights model to {out_path}")
    onnx.save(
        model,
        str(out_path),
        save_as_external_data=True,
        all_tensors_to_one_file=True,
        location=data_filename,
    )

    out_size = out_path.stat().st_size + data_path.stat().st_size
    print(f"  fp16-weights total: {out_size / 1024 / 1024:.1f} MB")
    print(f"  reduction: {(1 - out_size / in_size) * 100:.1f}%")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.suffix != ".onnx":
        print(f"ERROR: output must end in .onnx (got {args.output})", file=sys.stderr)
        return 1
    convert(args.input, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
