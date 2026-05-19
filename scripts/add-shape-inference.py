#!/usr/bin/env python3
"""Add value_info entries (per-tensor shape annotations) to an ONNX model.

The int8-weights quantization toolchain strips value_info from the decoder
graph. ORT-Web's WebGPU EP then re-runs shape inference at session-create —
empirically adding ~65s of cold-load on this 24,480-node decoder.

By running shape inference offline and saving the populated graph, we offload
that work from boot to build, with no change to the shipped weight bytes.

Usage:
  python3 scripts/add-shape-inference.py <input.onnx> <output.onnx>
"""
import argparse
import sys
from pathlib import Path

import onnx
import onnx.shape_inference


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
    print(f"  value_info before: {len(m.graph.value_info)}")
    print(f"  nodes: {len(m.graph.node)} initializers: {len(m.graph.initializer)}")

    print("Running shape inference ...")
    inferred = onnx.shape_inference.infer_shapes(
        m, check_type=False, strict_mode=False, data_prop=True
    )
    print(f"  value_info after: {len(inferred.graph.value_info)}")

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
    onnx_size = args.output.stat().st_size
    data_path = args.output.parent / ext_name
    data_size = data_path.stat().st_size if data_path.exists() else 0
    print(f"  Output .onnx:      {args.output} ({onnx_size:,} bytes)")
    print(f"  External data:     {data_path} ({data_size:,} bytes)")


if __name__ == "__main__":
    main()
