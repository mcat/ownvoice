#!/usr/bin/env python3
"""
Convert the Chatterbox-Multilingual conditional_decoder to int8-weights /
fp32-compute. Extends the fp16-weights-only pattern from PR #331 to int8
for ~half the disk footprint of fp16 (~275 MB → ~140 MB).

Same precision-preservation invariant: every activation, RNG draw, and
arithmetic operation stays at fp32. Only the static weight buffers shrink.
DequantizeLinear nodes inserted before each consuming op convert int8
weights back to fp32 at session init (constant folded by ORT) or
just-in-time on EPs that don't fold.

Why per-output-channel symmetric:
  Per-tensor int8 has ~6-10x higher RMSE than per-channel on Conv/MatMul
  weights. On a CFM ODE decoder where errors compound across 12+ flow
  steps, the gap between per-tensor and per-channel is the difference
  between audible drift and clean audio. Per-channel costs an extra ~4
  bytes per output channel of scale data — negligible vs the int8
  savings.

Why bias stays fp32:
  Standard int32-bias-with-derived-scale needs an input_scale that
  weights-only quantization doesn't have (activations stay fp32 with no
  fixed scale). Biases are tiny (~0.01% of total weight size), and
  quantizing them to int8 directly would introduce error at output
  scale, not weight scale. fp32 biases are correct here.

Axis logic per op type:
  Conv:           weight [C_out, C_in/g, K, ...]   → axis 0
  ConvTranspose:  weight [C_in, C_out/g, K, ...]   → axis 1
  MatMul:         weight [..., K, N]               → axis = rank - 1
  Gemm B:         weight [K, N] or [N, K] if transB → axis 1 or 0

Scale calibration:
  Default uses max(|w|) for each channel; this lets rare outlier weights
  dominate scale and gives the bulk of weights ~6-bit usable precision.
  Empirically on this decoder, 19% of weight tensors have p99.9/max_abs <
  0.5 (severe outliers), median ratio 0.63. Pass --scale-percentile 99.9
  to clip these outliers: the bulk of weights get ~7 usable bits and the
  smoke-test mechanical drift drops from 42.9% → 15.6%. p99.99 is too
  gentle — most outliers still dominate scale, and drift regresses to
  46%. p99.9 is the empirical sweet spot for this decoder.

Usage:
    # Default (max-abs scale, simpler, ~9× higher drift than fp16):
    python3 scripts/convert-decoder-int8-weights-only.py \\
        --input  public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx \\
        --output public/models/2026-05-21/chatterbox-multilingual/conditional_decoder.onnx

    # p99.9 scale (recommended for audio quality):
    python3 scripts/convert-decoder-int8-weights-only.py \\
        --input  public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx \\
        --output public/models/2026-05-21/chatterbox-multilingual/conditional_decoder.onnx \\
        --scale-percentile 99.9
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import numpy as np
import onnx
import onnx.shape_inference
from onnx import TensorProto, helper, numpy_helper

WEIGHTED_OPS = {"Conv", "ConvTranspose", "MatMul", "Gemm"}

# DSP-scope regex matching the v2 fp16 block-list state (the best known
# subgraph set where weight precision specifically matters for the
# harmonic-source / STFT / f0-upsampling paths). When --keep-fp16-scope
# is passed, ops whose .name starts with one of these scopes get fp16-
# weights + Cast(fp16→fp32) instead of int8 + DequantizeLinear. The
# COMPUTE stays fp32 in both cases — this only changes the storage
# precision of the weight buffers in these subgraphs.
DEFAULT_FP16_SCOPE_RE = re.compile(r"^(/STFT$|/istft/|/f0_upsamp/|/m_source/)")


def per_channel_axis(node: onnx.NodeProto, input_idx: int, weight_shape: list[int]) -> int | None:
    """Return the output-channel axis for per-channel quantization on
    this op's weight initializer at input_idx. Returns None for ops/inputs
    that should fall back to per-tensor."""
    rank = len(weight_shape)
    if rank < 2:
        return None
    op = node.op_type
    if op == "Conv":
        return 0 if input_idx == 1 else None
    if op == "ConvTranspose":
        return 1 if input_idx == 1 else None
    if op == "MatMul":
        # Either input could be the weight initializer. Whichever is
        # the initializer, the output-channel axis is the LAST dim of
        # the weight (matching standard [..., K, N] convention where N
        # is output). If the initializer turns out to be the left
        # operand, that's a transposed weight and last-dim is still
        # the right answer for keeping per-channel scales independent.
        return rank - 1
    if op == "Gemm":
        # Only input 1 (B) is the weight; input 0 (A) is activation,
        # input 2 (C) is bias. Per-channel for B.
        if input_idx != 1:
            return None
        transB = 0
        for attr in node.attribute:
            if attr.name == "transB":
                transB = attr.i
                break
        return 0 if transB else 1
    return None


def is_bias_slot(op: str, input_idx: int) -> bool:
    """True if this input slot is a bias (Conv/ConvTranspose/Gemm idx 2)."""
    return op in ("Conv", "ConvTranspose", "Gemm") and input_idx == 2


def _calibration_magnitude(values: np.ndarray, percentile: float | None) -> float:
    """Magnitude that maps to int8 ±127. With percentile=None, returns
    max(abs). With percentile=99.9, returns the 99.9th percentile of
    abs(values) — outliers above this get clipped to ±127, sacrificing
    the rare extremes for ~1.6× more precision on the bulk weights.

    Empirical justification for this decoder: 19% of weight tensors have
    p99.9/max_abs < 0.5 (severe outliers); median ratio is 0.63 across
    all tensors. Standard symmetric int8 lets these outliers dominate
    scale, reducing precision for the 99.9% majority.
    """
    if percentile is None:
        return float(np.max(np.abs(values)))
    return float(np.percentile(np.abs(values), percentile))


def quantize_per_channel_symmetric(
    arr: np.ndarray, axis: int, percentile: float | None = None
) -> tuple[np.ndarray, np.ndarray]:
    """Symmetric int8 per-channel quantization along `axis`.

    Returns (q_int8, scale_fp32_1d).
    Scale has shape [arr.shape[axis]]. zero_point is implicitly 0.

    Symmetric quantization: each channel's max-abs value maps to ±127
    (the 127 cap leaves -128 unused, eliminating round-to-overflow at
    the negative edge). With `percentile` set, uses that percentile of
    abs values as the calibration magnitude instead of max — outliers
    are clipped at the int8 boundary.
    """
    moved = np.moveaxis(arr, axis, 0)
    flat = moved.reshape(arr.shape[axis], -1)
    if percentile is None:
        mag = np.max(np.abs(flat), axis=1)
    else:
        mag = np.percentile(np.abs(flat), percentile, axis=1)
    mag = np.where(mag > 0, mag, 1e-8)
    scale = (mag / 127.0).astype(np.float32)
    bshape = [1] * arr.ndim
    bshape[axis] = arr.shape[axis]
    scale_b = scale.reshape(bshape)
    q = np.round(arr / scale_b).clip(-128, 127).astype(np.int8)
    return q, scale


def quantize_per_tensor_symmetric(
    arr: np.ndarray, percentile: float | None = None
) -> tuple[np.ndarray, np.ndarray]:
    """Symmetric int8 per-tensor quantization. Scalar scale."""
    mag = _calibration_magnitude(arr, percentile)
    if mag == 0.0:
        mag = 1e-8
    scale = np.array([mag / 127.0], dtype=np.float32)
    q = np.round(arr / scale[0]).clip(-128, 127).astype(np.int8)
    return q, scale


def convert(
    in_path: Path,
    out_path: Path,
    keep_fp16_re: re.Pattern | None = None,
    scale_percentile: float | None = None,
) -> None:
    print(f"Loading fp32 model from {in_path}")
    model = onnx.load(str(in_path))

    in_size = sum(
        os.path.getsize(in_path.parent / f)
        for f in os.listdir(in_path.parent)
        if f.startswith(in_path.name)
    )
    print(f"  fp32 total: {in_size / 1024 / 1024:.1f} MB")
    if keep_fp16_re:
        print(f"  Mixed precision: ops matching {keep_fp16_re.pattern} → fp16 weights, rest → int8 weights")
    if scale_percentile is not None:
        print(f"  Percentile-calibrated int8: scale = p{scale_percentile:.1f} / 127 (rare outliers clipped at ±127)")

    name_to_init: dict[str, onnx.TensorProto] = {i.name: i for i in model.graph.initializer}

    # First pass: identify (node, input_idx, init_name) triples that are
    # float weight initializers feeding weighted ops, excluding bias slots.
    # Also classify each target as "fp16-scope" (matches keep_fp16_re) or
    # "int8-scope" (default).
    quant_targets: list[tuple[onnx.NodeProto, int, str, bool]] = []  # last bool = use_fp16
    for node in model.graph.node:
        if node.op_type not in WEIGHTED_OPS:
            continue
        use_fp16 = bool(keep_fp16_re and keep_fp16_re.search(node.name or ""))
        for idx, inp in enumerate(node.input):
            if not inp:
                continue
            init = name_to_init.get(inp)
            if init is None:
                continue
            if init.data_type != TensorProto.FLOAT:
                continue
            if is_bias_slot(node.op_type, idx):
                continue
            quant_targets.append((node, idx, inp, use_fp16))

    # Index targets by initializer name to dedupe (a single weight tensor
    # may feed multiple ops; we want one int8 + scale + DequantizeLinear
    # OR one fp16 + Cast, not N copies). If the same weight is consumed
    # by both fp16-scope and int8-scope ops, prefer fp16 (the safer
    # precision) for that weight.
    targets_by_init: dict[str, tuple[list[tuple[onnx.NodeProto, int]], bool]] = {}
    for node, idx, name, use_fp16 in quant_targets:
        if name in targets_by_init:
            existing_consumers, existing_fp16 = targets_by_init[name]
            existing_consumers.append((node, idx))
            targets_by_init[name] = (existing_consumers, existing_fp16 or use_fp16)
        else:
            targets_by_init[name] = ([(node, idx)], use_fp16)

    n_fp16 = sum(1 for _, use_fp16 in targets_by_init.values() if use_fp16)
    n_int8 = len(targets_by_init) - n_fp16
    print(f"  Found {len(targets_by_init)} float weight initializers feeding "
          f"{len(set(n.name for n, _, _, _ in quant_targets))} weighted ops")
    if keep_fp16_re:
        print(f"  Classification: {n_int8} int8, {n_fp16} fp16")

    # Second pass: quantize each weight initializer, generate scale and
    # zero-point initializers, build DequantizeLinear nodes (int8) or
    # Cast nodes (fp16, for keep_fp16-scoped weights).
    new_initializers: list[onnx.TensorProto] = []
    init_to_dequant_out: dict[str, str] = {}  # original init name -> consumer-input name
    preamble_nodes: list[onnx.NodeProto] = []
    dq_counter = 0
    cast_counter = 0
    n_per_channel = 0
    n_per_tensor = 0
    n_skipped_small = 0
    n_fp16_converted = 0

    for init_name, (consumers, use_fp16) in targets_by_init.items():
        init = name_to_init[init_name]
        arr = numpy_helper.to_array(init)

        # Skip initializers that don't materially benefit from int8 quant
        # (e.g., scalar constants, ~16-byte tensors). The overhead of a
        # DequantizeLinear + scale + zp is constant per tensor.
        # fp16 path doesn't have this overhead but still skip for
        # consistency: a 16-byte weight is too small to be perceptually
        # significant under either scheme.
        if arr.size < 64:
            n_skipped_small += 1
            continue

        if use_fp16:
            # fp16-weights-only pattern: re-encode initializer as fp16,
            # insert Cast(fp16→fp32) before consuming ops.
            arr16 = arr.astype(np.float16)
            fp16_init = numpy_helper.from_array(arr16, name=init_name)
            init.CopyFrom(fp16_init)

            cast_out = f"{init_name}_cast_out"
            cast_name = f"_w_cast_{cast_counter}"
            cast_counter += 1
            cast_node = helper.make_node(
                "Cast",
                inputs=[init_name],
                outputs=[cast_out],
                name=cast_name,
                to=TensorProto.FLOAT,
            )
            preamble_nodes.append(cast_node)
            init_to_dequant_out[init_name] = cast_out
            n_fp16_converted += 1
            continue

        # int8 path
        first_node, first_idx = consumers[0]
        axis = per_channel_axis(first_node, first_idx, list(arr.shape))

        if axis is not None and arr.shape[axis] >= 2:
            q, scale = quantize_per_channel_symmetric(arr, axis, scale_percentile)
            n_per_channel += 1
        else:
            q, scale = quantize_per_tensor_symmetric(arr, scale_percentile)
            axis = 0
            n_per_tensor += 1

        q_init = numpy_helper.from_array(q, name=init_name)
        assert q_init.data_type == TensorProto.INT8
        init.CopyFrom(q_init)

        scale_name = f"{init_name}_scale"
        scale_init = numpy_helper.from_array(scale, name=scale_name)
        new_initializers.append(scale_init)

        zp_name = f"{init_name}_zero_point"
        zp = np.zeros_like(scale, dtype=np.int8)
        zp_init = numpy_helper.from_array(zp, name=zp_name)
        new_initializers.append(zp_init)

        dq_out = f"{init_name}_dq_out"
        dq_name = f"_dq_{dq_counter}"
        dq_counter += 1
        dq_node = helper.make_node(
            "DequantizeLinear",
            inputs=[init_name, scale_name, zp_name],
            outputs=[dq_out],
            name=dq_name,
        )
        if scale.size > 1:
            dq_node.attribute.append(helper.make_attribute("axis", axis))
        preamble_nodes.append(dq_node)
        init_to_dequant_out[init_name] = dq_out

    print(f"  int8 per-channel quantized: {n_per_channel}")
    print(f"  int8 per-tensor quantized:  {n_per_tensor}")
    print(f"  fp16 converted (keep-scope): {n_fp16_converted}")
    print(f"  Skipped (too small):        {n_skipped_small}")
    print(f"  Preamble nodes inserted:    {len(preamble_nodes)} (DQ={dq_counter}, Cast={cast_counter})")

    # Third pass: rewire consuming ops to read DequantizeLinear / Cast
    # outputs in place of the original initializer.
    for node in model.graph.node:
        if node.op_type not in WEIGHTED_OPS:
            continue
        for idx, inp in enumerate(node.input):
            if inp in init_to_dequant_out and not is_bias_slot(node.op_type, idx):
                node.input[idx] = init_to_dequant_out[inp]

    # Fourth pass: splice preamble nodes (DQ + Cast) at the top of the
    # graph. ONNX requires topological order, but since all preamble
    # inputs are initializers, they can go at the top.
    new_node_list = list(preamble_nodes) + list(model.graph.node)
    del model.graph.node[:]
    model.graph.node.extend(new_node_list)

    # Append the new initializers (scale, zero_point).
    model.graph.initializer.extend(new_initializers)

    # Re-run shape inference. The structural changes above (inserted DQL nodes,
    # int8 weight initializers) invalidate the original value_info entries.
    # Without value_info, ORT-Web's WebGPU EP must run full shape inference at
    # session-create — adding ~60s of cold load on this 24,480-node decoder.
    # Pre-computing them offline matches the fp32 baseline timing.
    del model.graph.value_info[:]
    print("Re-running shape inference to populate value_info ...")
    inferred = onnx.shape_inference.infer_shapes(
        model, check_type=False, strict_mode=False, data_prop=True
    )
    print(f"  value_info entries: {len(inferred.graph.value_info)}")
    model = inferred

    # Save with fresh external data.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    data_filename = out_path.name + "_data"
    data_path = out_path.parent / data_filename
    if data_path.exists():
        data_path.unlink()
    if out_path.exists():
        out_path.unlink()

    print(f"Saving int8-weights model to {out_path}")
    onnx.save(
        model,
        str(out_path),
        save_as_external_data=True,
        all_tensors_to_one_file=True,
        location=data_filename,
    )

    out_size = out_path.stat().st_size + data_path.stat().st_size
    print(f"  int8-weights total: {out_size / 1024 / 1024:.1f} MB")
    print(f"  reduction vs fp32: {(1 - out_size / in_size) * 100:.1f}%")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--keep-fp16-scope",
        nargs="?",
        const=DEFAULT_FP16_SCOPE_RE.pattern,
        default=None,
        help=(
            "Mixed-precision mode: ops whose .name matches this regex keep "
            "fp16 weights (Cast pattern from PR #331). All other weighted "
            "ops get int8 (DequantizeLinear pattern). Pass without value to "
            f"use the default v2-fp16 DSP scope: {DEFAULT_FP16_SCOPE_RE.pattern}"
        ),
    )
    parser.add_argument(
        "--scale-percentile",
        type=float,
        default=None,
        help=(
            "Use percentile-based scale calibration instead of max_abs. "
            "Typical values: 99.9 or 99.95. Clips the rare extreme weights "
            "to ±127 in int8 space, trading outlier fidelity for ~1.6× "
            "more precision on the bulk weights (median p99.9/max_abs = "
            "0.63 across this decoder's 546 weights)."
        ),
    )
    args = parser.parse_args()
    if args.output.suffix != ".onnx":
        print(f"ERROR: output must end in .onnx (got {args.output})", file=sys.stderr)
        return 1
    keep_fp16_re = re.compile(args.keep_fp16_scope) if args.keep_fp16_scope else None
    convert(
        args.input,
        args.output,
        keep_fp16_re=keep_fp16_re,
        scale_percentile=args.scale_percentile,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
