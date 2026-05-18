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

  * `/m_source/` — the NSF harmonic-source generator (231 nodes). The
    inner chain `CumSum → Floor/Sub (phase wrapping) → Sin → MatMul →
    Tanh` builds the harmonic basis. CumSum accumulates phase across
    samples (24 kHz × seconds = tens of thousands of values); fp16 loses
    integer precision above 2048, exactly the same constraint that blocks
    the encoder's resampler chain. fp16 here produced the modulated
    2-4 kHz onset buzz with harmonics through 11 kHz documented in
    docs/known-issue-onset-bzzt.md.

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
# synthesis path, the f0 upsampler, and the NSF harmonic-source
# generator (m_source — see the module docstring for why).
_DSP_SCOPE_RE = re.compile(r"^(/STFT$|/istft/|/f0_upsamp/|/m_source/)")

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


def short_circuit_blocked_cast_roundtrips(
    model: onnx.ModelProto, scope_re: re.Pattern
) -> onnx.ModelProto:
    """
    Remove fp16 round-trips inside a blocked subgraph.

    `convert_float_to_float16`'s `node_block_list` mechanism inserts paired
    `Cast(fp32→fp16)` after every blocked node and `Cast(fp16→fp32)` before
    every blocked node, so each blocked op operates in fp32 but its
    boundary tensors get downgraded. Between two ADJACENT blocked ops
    inside the same scope, the round-trip
    `blocked_A → Cast→fp16 → Cast→fp32 → blocked_B`
    means fp32 → fp16 → fp32: the fp16 intermediate is precision-lossy
    even though both ops are "blocked".

    For the NSF harmonic-source generator (`/m_source/`), CumSum
    accumulates phase across many samples; at 24 kHz that gets to tens
    of thousands per second, well beyond fp16's 2 048 integer cap. A
    fp16 round-trip on the phase value rounds it to multiples of 2 (or
    worse), shifting the Sin downstream and producing the modulated
    onset buzz described in docs/known-issue-onset-bzzt.md.

    This pass finds those Cast pairs where BOTH ends are inside the
    blocked scope and short-circuits them: consumer reads producer
    directly, intermediate fp16 tensor disappears.

    The pass is conservative: it only removes a fp16 intermediate
    tensor when ALL its consumers are Cast(fp16→fp32) inside the
    blocked scope. Anything else holding a reference (graph outputs,
    branches that escape the scope) keeps the round-trip in place.
    """
    pass_idx = 0
    total_removed = 0
    total_rewires = 0
    while True:
        pass_idx += 1
        producers: dict[str, onnx.NodeProto] = {}
        consumers: dict[str, list[onnx.NodeProto]] = {}
        for n in model.graph.node:
            for out in n.output:
                producers[out] = n
            for inp in n.input:
                consumers.setdefault(inp, []).append(n)

        rewires: dict[str, str] = {}
        removed: set[str] = set()

        # Strategy: walk every Cast(fp16→fp32) inside scope. If its
        # producer is itself a Cast(fp32→fp16) inside scope, the
        # CONSUMING fp32 tensor (this node's output) is equivalent to
        # the producer's input (the original fp32 source). Rewire and
        # remove this consumer. The upstream Cast(fp32→fp16) is left
        # in place — its OTHER consumers (Shape ops, branches that
        # escape the scope) still need the fp16 form.
        for n in model.graph.node:
            if n.op_type != "Cast" or not scope_re.match(n.name):
                continue
            to_attr = next((a for a in n.attribute if a.name == "to"), None)
            if to_attr is None or to_attr.i != TensorProto.FLOAT:
                continue  # not Cast(*→fp32)

            src_name = n.input[0]
            src = producers.get(src_name)
            if src is None or src.op_type != "Cast" or not scope_re.match(src.name):
                continue
            src_to = next((a for a in src.attribute if a.name == "to"), None)
            if src_to is None or src_to.i != TensorProto.FLOAT16:
                continue
            # src is Cast(?→fp16); the chain is `[fp32_orig] → src → [fp16] → n → [fp32]`.
            # Confirm src input is actually fp32 — otherwise the round-trip
            # might have been (fp16→fp16) which makes no sense to short-circuit.
            # (cheap shortcut: skip the type-check, downstream alignment pass will
            # handle any mismatch; the value pre-cast is whatever the original
            # producer made, and removing this Cast only avoids the fp16 hop)

            fp32_orig = src.input[0]
            rewires[n.output[0]] = fp32_orig
            removed.add(n.name)

        # Garbage-collect any Cast(fp32→fp16) whose consumers all just
        # got short-circuited away. After this pass it's a dead node.
        live_consumers: dict[str, int] = {}
        for node in model.graph.node:
            for inp in node.input:
                live_consumers[inp] = live_consumers.get(inp, 0) + 1
        for n in model.graph.node:
            if n.op_type != "Cast" or not scope_re.match(n.name) or n.name in removed:
                continue
            to_attr = next((a for a in n.attribute if a.name == "to"), None)
            if to_attr is None or to_attr.i != TensorProto.FLOAT16:
                continue
            # Count how many live (non-removed) consumers reference this Cast's output.
            still_used = False
            for c in consumers.get(n.output[0], []):
                if c.name in removed:
                    continue
                still_used = True
                break
            graph_output = any(o.name == n.output[0] for o in model.graph.output)
            if not still_used and not graph_output:
                removed.add(n.name)

        if not rewires and not removed:
            print(f"  pass {pass_idx}: no fp16 round-trips in scope; done")
            break

        for node in model.graph.node:
            for i, inp in enumerate(node.input):
                if inp in rewires:
                    node.input[i] = rewires[inp]
        for out in model.graph.output:
            if out.name in rewires:
                out.name = rewires[out.name]

        new_nodes = [n for n in model.graph.node if n.name not in removed]
        del model.graph.node[:]
        model.graph.node.extend(new_nodes)

        total_removed += len(removed)
        total_rewires += len(rewires)
        print(f"  pass {pass_idx}: removed {len(removed)} Cast nodes, rewired {len(rewires)} edges")
        if pass_idx >= 8:
            print("  WARNING: hit fixed-point ceiling — some round-trips may remain")
            break

    print(f"  Short-circuit total: removed {total_removed} Cast nodes, {total_rewires} edges rewired")
    del model.graph.value_info[:]
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
    print(f"  Skipping {len(skip_node_names)} DSP nodes (STFT/ISTFT synthesis + f0 upsampler + m_source)")

    print("Converting weights to fp16 (keep_io_types=True)")
    fp16_model = convert_float_to_float16(
        model,
        keep_io_types=True,
        node_block_list=skip_node_names,
    )

    del fp16_model.graph.value_info[:]

    fp16_model = align_op_input_types(fp16_model)

    print("Short-circuiting fp16 round-trips inside DSP scope")
    fp16_model = short_circuit_blocked_cast_roundtrips(fp16_model, _DSP_SCOPE_RE)

    # Re-run the type-T alignment pass: removing intermediate fp16 nodes
    # may have surfaced new mixed-type edges on consumers that read from
    # both the (now fp32) blocked scope and other fp16 paths.
    print("Re-aligning op input types after short-circuit pass")
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
