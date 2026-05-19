#!/usr/bin/env python3
"""Add value_info entries recursively, including inside If/Loop subgraphs.

`onnx.shape_inference.infer_shapes` doesn't propagate into subgraphs by
default. The Whisper "merged" decoder (and any model with control-flow ops)
ships as a single If node containing 2-5k inner ops in `then_branch` /
`else_branch` — those inner subgraphs were missing value_info too.

This script runs shape inference at the top level, then walks every If/Loop
subgraph and shape-infers them in-place. For ORT-Web's WebGPU EP, this
avoids re-inferring shapes for the merged-decoder branches at session-
create.

Usage:
  python3 scripts/add-shape-inference-recursive.py <input.onnx> <output.onnx>
"""
import argparse
import sys
from pathlib import Path

import onnx
import onnx.shape_inference
from onnx import AttributeProto, GraphProto
from onnx.external_data_helper import uses_external_data
from onnxruntime.tools.symbolic_shape_infer import SymbolicShapeInference


def shape_infer_subgraph(sub: GraphProto, model_opset_imports) -> int:
    """Run shape inference on a single subgraph. Uses onnxruntime's symbolic
    shape inferer which handles MS-domain ops (MatMulNBits, etc.); falls back
    to onnx.shape_inference for plain ops.

    Returns the count of value_info entries added.
    """
    before = len(sub.value_info)
    m = onnx.helper.make_model(sub, opset_imports=list(model_opset_imports))
    try:
        inferred = SymbolicShapeInference.infer_shapes(m, auto_merge=True, verbose=0)
        del sub.value_info[:]
        sub.value_info.extend(inferred.graph.value_info)
    except Exception as e:
        # Fall back to plain ONNX inferer; it can't handle MS ops but will at
        # least populate value_info for the standard ones it does understand.
        try:
            inferred = onnx.shape_inference.infer_shapes(
                m, check_type=False, strict_mode=False, data_prop=True
            )
            del sub.value_info[:]
            sub.value_info.extend(inferred.graph.value_info)
        except Exception:
            return 0
        _ = e
    return len(sub.value_info) - before


def infer_subgraphs(graph: GraphProto, opset_imports, depth: int = 0) -> int:
    """Recursively shape-infer every subgraph in `graph`. Returns total
    value_info entries added inside subgraphs."""
    total_added = 0
    for node in graph.node:
        for attr in node.attribute:
            if attr.type == AttributeProto.GRAPH:
                sub = attr.g
                added = shape_infer_subgraph(sub, opset_imports)
                total_added += added
                indent = "  " * (depth + 1)
                print(f"{indent}subgraph {attr.name}: {len(sub.value_info)} value_info (+{added})")
                total_added += infer_subgraphs(sub, opset_imports, depth + 1)
            elif attr.type == AttributeProto.GRAPHS:
                for sub in attr.graphs:
                    added = shape_infer_subgraph(sub, opset_imports)
                    total_added += added
                    total_added += infer_subgraphs(sub, opset_imports, depth + 1)
    return total_added


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
    print(f"  outer nodes: {len(m.graph.node)} value_info: {len(m.graph.value_info)}")

    had_external = any(uses_external_data(t) for t in m.graph.initializer)
    print(f"  external data: {'yes' if had_external else 'no (single-file)'}")

    print("Running top-level shape inference (with MS-ops support) ...")
    try:
        inferred = SymbolicShapeInference.infer_shapes(m, auto_merge=True, verbose=0)
    except Exception as e:
        print(f"  SymbolicShapeInference failed ({e}); falling back to plain inferer")
        inferred = onnx.shape_inference.infer_shapes(
            m, check_type=False, strict_mode=False, data_prop=True
        )
    print(f"  outer value_info after: {len(inferred.graph.value_info)}")

    print("Recursing into subgraphs ...")
    total_added = infer_subgraphs(inferred.graph, m.opset_import)
    print(f"  total subgraph value_info entries added: {total_added}")

    if had_external:
        ext_name = args.output.name + "_data"
        print(f"Saving to {args.output} (external data → {ext_name}) ...")
        onnx.save_model(
            inferred,
            str(args.output),
            save_as_external_data=True,
            all_tensors_to_one_file=True,
            location=ext_name,
            size_threshold=1024,
            convert_attribute=False,
        )
        data_path = args.output.parent / ext_name
        print(f"  External data: {data_path} ({data_path.stat().st_size:,} bytes)")
    else:
        print(f"Saving to {args.output} (single-file, no external data) ...")
        onnx.save_model(inferred, str(args.output), save_as_external_data=False)
    print(f"  Output .onnx:  {args.output} ({args.output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
