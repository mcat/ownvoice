#!/usr/bin/env python3
"""Fold all DequantizeLinear nodes (with constant inputs) in the int8 conditional_decoder
into fp32 initializers, mimicking the fp32 baseline's protobuf structure exactly.

KEY DIFFERENCE from the prior session's fold attempt:
The prior fold kept DQL output names verbatim (e.g. `onnx::MatMul_85909_dq_out`)
and used them as the new initializer names. ORT-Web's graph optimizer behaves
differently against those names than against the baseline's clean names (e.g.
`onnx::MatMul_85909`). The pre-folded model loaded in 180s instead of the
baseline's 74s for that reason.

This script:
  1. Evaluates each DQL with constant inputs (all 546 of them)
  2. Renames the resulting fp32 initializer to the ORIGINAL int8 input's
     name (stripping the `_dq_out` suffix from the DQL output name)
  3. Rewires downstream consumers: input refs that used the `_dq_out`
     name are renamed back to the original
  4. Drops the int8 initializer (was the DQL's first input), the scale
     and zero-point initializers (DQL inputs 1 and 2)
  5. Removes the DQL nodes
  6. Saves with `save_as_external_data=True`, matching the baseline's
     external-data layout

The result should be structurally indistinguishable from the fp32 baseline
ONNX, but with weight VALUES from the int8 quantization (functionally
equivalent up to dequant rounding error).

Usage:
  python3 scripts/fold-decoder-dql.py <input.onnx> <output.onnx>
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import onnx
import onnx.shape_inference
from onnx import TensorProto, helper, numpy_helper


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input", type=Path)
    ap.add_argument("output", type=Path)
    args = ap.parse_args()

    if not args.input.exists():
        sys.exit(f"Input not found: {args.input}")
    args.output.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading {args.input} ...")
    m = onnx.load(str(args.input))
    g = m.graph

    init_by_name = {init.name: init for init in g.initializer}

    # Identify foldable DQL: all inputs must be initializers
    foldable = []
    for n in g.node:
        if n.op_type != "DequantizeLinear":
            continue
        if all(inp in init_by_name for inp in n.input):
            foldable.append(n)

    print(f"Found {len(foldable)} foldable DQL nodes out of {sum(1 for n in g.node if n.op_type == 'DequantizeLinear')}")

    # Build the rename map: DQL output name → original int8 weight name.
    # This is what lets us match the baseline's naming convention.
    rename: dict[str, str] = {}
    new_inits_by_orig_name: dict[str, TensorProto] = {}
    inits_to_drop: set[str] = set()

    for n in foldable:
        x_name = n.input[0]  # int8 weight
        scale_name = n.input[1]
        zp_name = n.input[2] if len(n.input) > 2 else None
        out_name = n.output[0]

        x_init = init_by_name[x_name]
        scale_init = init_by_name[scale_name]

        x_arr = numpy_helper.to_array(x_init)
        scale_arr = numpy_helper.to_array(scale_init)

        if zp_name is not None and zp_name in init_by_name:
            zp_init = init_by_name[zp_name]
            zp_arr = numpy_helper.to_array(zp_init)
        else:
            zp_arr = np.array(0, dtype=x_arr.dtype)

        # axis attribute defaults to 1 if present, but defaults to 0 in opset 21+.
        # The current opset is 17 (per inspect-decoder-graph), where ONNX default is 1.
        axis = 1
        for a in n.attribute:
            if a.name == "axis":
                axis = a.i
                break

        # Broadcast scale/zp along axis when they're 1-D and x is multi-D.
        if scale_arr.ndim == 1 and x_arr.ndim > 1:
            shape = [1] * x_arr.ndim
            shape[axis] = scale_arr.shape[0]
            scale_arr = scale_arr.reshape(shape)
            if zp_arr.ndim == 1:
                zp_arr = zp_arr.reshape(shape)

        fp32 = (x_arr.astype(np.float32) - zp_arr.astype(np.float32)) * scale_arr.astype(np.float32)

        # KEY: rename downstream from the DQL output to the original int8 weight name.
        # This drops `_dq_out` suffix and matches the fp32 baseline's naming.
        new_name = x_name
        rename[out_name] = new_name

        new_init = numpy_helper.from_array(fp32, name=new_name)
        new_inits_by_orig_name[new_name] = new_init

        # Drop the original int8 weight (it gets replaced by fp32 version
        # with the same name), the scale, and the zero point.
        inits_to_drop.add(x_name)
        inits_to_drop.add(scale_name)
        if zp_name is not None:
            inits_to_drop.add(zp_name)

    # Build the new initializer list:
    #   - Keep all original initializers EXCEPT those marked drop
    #   - Replace dropped weights with their fp32 fold
    #   - The fp32 folds inherit the position the original int8 weight had
    #     in the initializer list (best effort to preserve order).
    new_initializers = []
    for orig_init in g.initializer:
        if orig_init.name in inits_to_drop:
            # If a fold replaces this name, append the fp32 version here
            if orig_init.name in new_inits_by_orig_name:
                new_initializers.append(new_inits_by_orig_name[orig_init.name])
        else:
            new_initializers.append(orig_init)

    # Sanity check: every fold replacement should have been emitted
    emitted = {i.name for i in new_initializers}
    for name in new_inits_by_orig_name:
        if name not in emitted:
            new_initializers.append(new_inits_by_orig_name[name])
            print(f"  (note) appended unseated fold init: {name}")

    print(f"Old initializers: {len(g.initializer)}, new: {len(new_initializers)}")

    # Build new node list:
    #   - Skip the folded DQL nodes
    #   - For all other nodes, rename their inputs from DQL outputs back to
    #     the original (stripped) names.
    foldable_node_ids = {id(n) for n in foldable}
    new_nodes = []
    rewires = 0
    for n in g.node:
        if id(n) in foldable_node_ids:
            continue
        new_inputs = []
        for inp in n.input:
            if inp in rename:
                new_inputs.append(rename[inp])
                rewires += 1
            else:
                new_inputs.append(inp)
        if new_inputs != list(n.input):
            new_node = helper.make_node(
                n.op_type,
                inputs=new_inputs,
                outputs=list(n.output),
                name=n.name,
                **{a.name: helper.get_attribute_value(a) for a in n.attribute},
            )
            # Copy over domain if needed
            if n.domain:
                new_node.domain = n.domain
            new_nodes.append(new_node)
        else:
            new_nodes.append(n)
    print(f"Old nodes: {len(g.node)}, new: {len(new_nodes)} ({rewires} inputs rewired)")

    # Build new graph preserving identity of inputs/outputs/value_info
    new_graph = helper.make_graph(
        nodes=new_nodes,
        name=g.name,
        inputs=list(g.input),
        outputs=list(g.output),
        initializer=new_initializers,
        value_info=list(g.value_info),
    )
    # sparse_initializers (if any)
    if g.sparse_initializer:
        new_graph.sparse_initializer.extend(g.sparse_initializer)

    new_model = helper.make_model(
        new_graph,
        producer_name=m.producer_name,
        producer_version=m.producer_version,
        ir_version=m.ir_version,
        opset_imports=list(m.opset_import),
    )

    # CRITICAL — run shape inference to populate value_info.
    #
    # The int8 quantization tool strips value_info entries (per-tensor shape
    # annotations for every intermediate). Without these, ORT-Web's WebGPU EP
    # must run full shape inference at session-create — adding ~65s of cold
    # load on this decoder. The fp32 baseline export ships with 23,933
    # value_info entries; matching that is the discriminator that recovers
    # the 73s vs 139s gap.
    #
    # shape_inference uses the symbolic shapes from inputs and propagates them
    # through every op. The result has dim_param ('batch_size', etc) preserved
    # rather than dim_value, which is what the baseline carries.
    try:
        print("Running shape inference to populate value_info ...")
        # Use the data_prop option to propagate constant values through Shape ops.
        # check_type=False because some int64 dim values might overflow the default
        # inferred type during shape ops (we trust the graph was already valid).
        inferred = onnx.shape_inference.infer_shapes(
            new_model, check_type=False, strict_mode=False, data_prop=True
        )
        print(f"  value_info before: {len(new_graph.value_info)}")
        print(f"  value_info after:  {len(inferred.graph.value_info)}")
        new_model = inferred
    except Exception as e:
        print(f"  Shape inference WARNING: {e}")
        print("  Proceeding without value_info — load time may regress.")
    if m.domain:
        new_model.domain = m.domain
    if m.model_version:
        new_model.model_version = m.model_version

    # Save with external data, matching baseline layout
    ext_name = args.output.name + "_data"
    print(f"Saving to {args.output} (external data → {ext_name}) ...")
    onnx.save_model(
        new_model,
        str(args.output),
        save_as_external_data=True,
        all_tensors_to_one_file=True,
        location=ext_name,
        size_threshold=1024,
        convert_attribute=False,
    )
    print("Done.")
    print(f"  Output .onnx:      {args.output} ({args.output.stat().st_size:,} bytes)")
    data_path = args.output.parent / ext_name
    if data_path.exists():
        print(f"  External data:     {data_path} ({data_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
