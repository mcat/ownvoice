#!/usr/bin/env python3
"""
Patch the seed attribute on every RandomNormal/RandomUniform/*Like op in
a decoder model. Makes runs deterministic so the perceptual validator's
fp32-vs-fp16 ratios stop swinging from RNG-state-interleaving variance.

Usage:
    python3 scripts/seed-rng-ops.py \\
        --input  public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx \\
        --output /tmp/seeded/fp32_decoder.onnx \\
        --seed 42
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import onnx
from onnx import AttributeProto

RNG_OPS = {"RandomNormal", "RandomUniform", "RandomNormalLike", "RandomUniformLike"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--seed", type=float, default=42.0)
    args = parser.parse_args()

    model = onnx.load(str(args.input))
    touched = 0
    for n in model.graph.node:
        if n.op_type not in RNG_OPS:
            continue
        # Remove any existing seed attr
        new_attrs = [a for a in n.attribute if a.name != "seed"]
        seed_attr = onnx.helper.make_attribute("seed", float(args.seed))
        new_attrs.append(seed_attr)
        del n.attribute[:]
        n.attribute.extend(new_attrs)
        touched += 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Determine if model has external data
    has_ext = any(
        i.data_location == 1 and i.data_location is not None
        for i in model.graph.initializer
    )

    if has_ext:
        data_file = args.output.name + "_data"
        onnx.save(
            model, str(args.output),
            save_as_external_data=True,
            all_tensors_to_one_file=True,
            location=data_file,
        )
    else:
        onnx.save(model, str(args.output))

    print(f"Seeded {touched} RNG op(s) with seed={args.seed}")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
