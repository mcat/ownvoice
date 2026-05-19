#!/usr/bin/env python3
"""Compare int8 vs fp32-baseline conditional_decoder ONNX models at the protobuf
level. Identify structural differences that could affect ORT-Web session-create
time (initializer order, node order, raw_data encoding, opset, IR version, etc).

This is the falsifier for the "pre-folded fp32 loads in 180s vs baseline 74s"
mystery from docs/perf/2026-05-19-tts-boot-profiling.md. By understanding the
exact protobuf differences, we can produce a fold that matches the baseline.
"""
import sys
from pathlib import Path

import onnx
from onnx import TensorProto

INT8 = Path("/tmp/inspectdec/int8/conditional_decoder.onnx")
FP32 = Path("/tmp/inspectdec/fp32/conditional_decoder.onnx")


def dtype_name(t):
    return TensorProto.DataType.Name(t)


def model_summary(label, m):
    g = m.graph
    print(f"\n=== {label} ===")
    print(f"  ir_version={m.ir_version}")
    print(f"  producer_name={m.producer_name!r}")
    print(f"  producer_version={m.producer_version!r}")
    print(f"  opset={[(o.domain, o.version) for o in m.opset_import]}")
    print(f"  nodes={len(g.node)}, initializers={len(g.initializer)}")

    # External data analysis
    ext_count = 0
    inline_count = 0
    raw_data_inits = 0
    typed_data_inits = 0
    for init in g.initializer:
        if init.data_location == TensorProto.EXTERNAL:
            ext_count += 1
        else:
            inline_count += 1
        if init.raw_data:
            raw_data_inits += 1
        # Typed-field initializers (float_data, int32_data, etc.)
        elif init.float_data or init.int32_data or init.int64_data or init.string_data:
            typed_data_inits += 1
    print(f"  initializer storage: external={ext_count}, inline={inline_count}")
    print(f"  initializer encoding: raw_data={raw_data_inits}, typed-fields={typed_data_inits}")

    # First few initializer names — to compare naming conventions
    print(f"  first 10 init names:")
    for init in g.initializer[:10]:
        loc = "ext" if init.data_location == TensorProto.EXTERNAL else "inl"
        print(f"    [{loc}] {dtype_name(init.data_type):8s} {list(init.dims)} {init.name}")

    # External-data offsets
    print(f"  external-data offset sample (first 5):")
    for init in g.initializer[:5]:
        if init.data_location == TensorProto.EXTERNAL:
            ext_info = {kv.key: kv.value for kv in init.external_data}
            offset = ext_info.get("offset", "?")
            length = ext_info.get("length", "?")
            print(f"    {init.name}: offset={offset} length={length}")


def main():
    if not INT8.exists() or not FP32.exists():
        sys.exit(f"Missing inputs: {INT8} or {FP32}")

    int8 = onnx.load(str(INT8), load_external_data=False)
    fp32 = onnx.load(str(FP32), load_external_data=False)
    model_summary("int8 (shipping, 158 MB)", int8)
    model_summary("fp32 baseline (74s ceiling)", fp32)

    g8 = int8.graph
    g32 = fp32.graph

    # Compare scope distribution of initializers — does fp32 use different
    # naming conventions?
    print("\n=== Initializer name prefix analysis ===")
    def prefix_counts(inits, n=4):
        from collections import Counter
        c = Counter()
        for i in inits:
            parts = i.name.split("/")
            head = "/".join(parts[: min(n, len(parts))])
            c[head] += 1
        return c
    p8 = prefix_counts(g8.initializer, n=2)
    p32 = prefix_counts(g32.initializer, n=2)
    print("  int8 top prefixes:")
    for k, v in p8.most_common(8):
        print(f"    {v:5d}  {k!r}")
    print("  fp32 top prefixes:")
    for k, v in p32.most_common(8):
        print(f"    {v:5d}  {k!r}")

    # Look for /dequant_ pattern in int8 names
    dql_outputs = sum(1 for n in g8.node if n.op_type == "DequantizeLinear")
    print(f"\n  DequantizeLinear nodes in int8: {dql_outputs}")

    # Sample of int8 DQL output names (so we can plan how to rename in fold)
    print("  Sample DQL output names (these become initializer names after fold):")
    for n in g8.node[:30]:
        if n.op_type == "DequantizeLinear":
            print(f"    in={list(n.input)}")
            print(f"    out={list(n.output)}")
            break

    # Compare node-order regularity
    print("\n=== Node-order analysis ===")
    print(f"  int8: first 5 ops: {[n.op_type for n in g8.node[:5]]}")
    print(f"  fp32: first 5 ops: {[n.op_type for n in g32.node[:5]]}")
    print(f"  int8: last 5 ops: {[n.op_type for n in g8.node[-5:]]}")
    print(f"  fp32: last 5 ops: {[n.op_type for n in g32.node[-5:]]}")

    # Check for matching MatMul ops by name — are they named consistently?
    int8_matmul_names = [n.name for n in g8.node if n.op_type == "MatMul"]
    fp32_matmul_names = [n.name for n in g32.node if n.op_type == "MatMul"]
    print(f"\n  MatMul node-name overlap: {len(set(int8_matmul_names) & set(fp32_matmul_names))} of {len(int8_matmul_names)} int8 / {len(fp32_matmul_names)} fp32")

    # Check Conv ops too
    int8_conv = [n.name for n in g8.node if n.op_type == "Conv"]
    fp32_conv = [n.name for n in g32.node if n.op_type == "Conv"]
    print(f"  Conv node-name overlap: {len(set(int8_conv) & set(fp32_conv))} of {len(int8_conv)} int8 / {len(fp32_conv)} fp32")

    # Look at one MatMul's input names to understand wiring
    print("\n=== Sample MatMul wiring ===")
    for label, g in [("int8", g8), ("fp32", g32)]:
        for n in g.node:
            if n.op_type == "MatMul":
                print(f"  {label}: {n.name}")
                print(f"    inputs: {list(n.input)}")
                print(f"    output: {list(n.output)}")
                break

    # Identify initializers consumed by MatMul/Conv — these are the weights
    # whose name format may matter for ORT optimizer fusion patterns
    print("\n=== Weight names feeding Conv/MatMul ops ===")
    def weight_names(g, op_types):
        init_names = {i.name for i in g.initializer}
        out = []
        for n in g.node:
            if n.op_type in op_types:
                for inp in n.input:
                    if inp in init_names:
                        out.append((n.op_type, inp))
        return out

    int8_w = weight_names(g8, {"MatMul", "Conv"})
    fp32_w = weight_names(g32, {"MatMul", "Conv"})
    print(f"  int8: {len(int8_w)} weight refs; sample 5:")
    for op, name in int8_w[:5]:
        print(f"    [{op}] {name}")
    print(f"  fp32: {len(fp32_w)} weight refs; sample 5:")
    for op, name in fp32_w[:5]:
        print(f"    [{op}] {name}")


if __name__ == "__main__":
    main()
