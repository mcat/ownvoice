#!/usr/bin/env python3
"""Apply offline ONNX graph optimizations to the int8 decoder.

Targets the shape-handling subgraphs (Shape→Unsqueeze→Gather chains, redundant
Casts, no-op Reshape/Transpose) that ORT-Web compiles separate WGSL kernels
for. Each optimization that reduces the unique-shape kernel count reduces
session-create time.

Critically AVOIDS ORT's transformers/optimizer.optimize_model, which has been
observed to multiply DequantizeLinear ops 7× on int8 graphs (per the prior
session's debug notes). Uses the lower-level onnxoptimizer instead, which
only applies surgical, behavior-preserving passes.

Usage:
  python3 scripts/optimize-decoder-graph.py <input.onnx> <output.onnx>
"""
import argparse
import sys
from collections import Counter
from pathlib import Path

import onnx
import onnx.shape_inference
import onnxoptimizer


SAFE_PASSES = [
    # Drop ops that are mathematical no-ops.
    "eliminate_nop_cast",
    "eliminate_nop_dropout",
    "eliminate_nop_flatten",
    "eliminate_nop_pad",
    "eliminate_nop_concat",
    "eliminate_nop_split",
    "eliminate_nop_expand",
    "eliminate_nop_transpose",
    "eliminate_nop_reshape",
    "eliminate_nop_with_unit",
    # Collapse redundant shape arithmetic that ORT-Web bills as full kernels.
    "eliminate_shape_gather",
    "eliminate_slice_after_shape",
    # Fuse consecutive same-op chains into single nodes.
    "fuse_consecutive_concats",
    "fuse_consecutive_squeezes",
    "fuse_consecutive_transposes",
    "fuse_consecutive_unsqueezes",
    "fuse_concat_into_reshape",
    # Pattern-based fusions
    "fuse_add_bias_into_conv",
    "fuse_matmul_add_bias_into_gemm",
    "fuse_pad_into_conv",
    "fuse_pad_into_pool",
    "fuse_transpose_into_gemm",
    "fuse_consecutive_reduce_unsqueeze",
    "fuse_consecutive_log_softmax",
    # Move runtime constants into initializers (helps ORT-Web cache them as graph constants)
    "extract_constant_to_initializer",
    # Common subexpression elimination — finds duplicate subgraphs.
    "eliminate_common_subexpression",
    # Remove subgraphs that produce values nothing consumes.
    "eliminate_deadend",
    # Eliminate If with constant condition. The decoder has 20 If nodes.
    "eliminate_if_with_const_cond",
    # Misc
    "eliminate_consecutive_idempotent_ops",
    "eliminate_nop_monotone_argmax",
]


def op_counts(model):
    return Counter(n.op_type for n in model.graph.node)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()

    print(f"Loading {args.input} ...")
    m = onnx.load(str(args.input))
    print(f"  nodes: {len(m.graph.node)}, initializers: {len(m.graph.initializer)}")
    print(f"  value_info: {len(m.graph.value_info)}")
    before = op_counts(m)
    print(f"  top op types: {dict(before.most_common(10))}")

    print(f"\nApplying {len(SAFE_PASSES)} optimization passes ...")
    optimized = onnxoptimizer.optimize(m, SAFE_PASSES)
    after = op_counts(optimized)
    print(f"  nodes after: {len(optimized.graph.node)}")
    delta_total = len(m.graph.node) - len(optimized.graph.node)
    print(f"  total ops reduced: {delta_total} ({delta_total / len(m.graph.node) * 100:.1f}%)")

    # Per-op-type delta
    print(f"\n  Per-op-type delta:")
    all_ops = set(before) | set(after)
    diffs = [(op, after.get(op, 0) - before.get(op, 0)) for op in all_ops]
    diffs.sort(key=lambda x: x[1])
    for op, delta in diffs:
        if delta != 0:
            sign = "+" if delta > 0 else ""
            print(f"    {op:25s} {before.get(op, 0):5d} → {after.get(op, 0):5d}  ({sign}{delta})")

    # Re-run shape inference because optimization may have changed shapes.
    print(f"\nRe-running shape inference ...")
    optimized = onnx.shape_inference.infer_shapes(
        optimized, check_type=False, strict_mode=False, data_prop=True
    )
    print(f"  value_info: {len(optimized.graph.value_info)}")

    # Save with external data.
    ext_name = args.output.name + "_data"
    print(f"\nSaving to {args.output} (external → {ext_name}) ...")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    onnx.save_model(
        optimized,
        str(args.output),
        save_as_external_data=True,
        all_tensors_to_one_file=True,
        location=ext_name,
        size_threshold=1024,
        convert_attribute=False,
    )
    print(f"  .onnx:      {args.output} ({args.output.stat().st_size:,} bytes)")
    data_path = args.output.parent / ext_name
    if data_path.exists():
        print(f"  ext_data:   {data_path} ({data_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
