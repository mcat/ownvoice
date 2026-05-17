#!/usr/bin/env python3
"""Quick inspection of the conditional_decoder ONNX graph to identify DSP-like
subgraphs that need blocking from fp16 conversion (cf. the resampler chains
in the encoder)."""
import sys
import re
from collections import Counter, defaultdict
from pathlib import Path

import onnx

p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    "public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx"
)
m = onnx.load(str(p))
g = m.graph

# Op type counts
print(f"=== ONNX graph: {p.name} ===")
print(f"nodes={len(g.node)}, initializers={len(g.initializer)}, inputs={len(g.input)}, outputs={len(g.output)}")
print()

print("=== Op type counts ===")
ops = Counter(n.op_type for n in g.node)
for op, c in ops.most_common():
    print(f"  {op:30s} {c}")
print()

# Find Cast nodes that go to/from int64 (DSP-like marker)
print("=== int64-related Cast chains (DSP candidates) ===")
casts = [n for n in g.node if n.op_type == "Cast"]
for n in casts:
    to_attr = next((a for a in n.attribute if a.name == "to"), None)
    if to_attr and to_attr.i in (7, 11, 12):  # int64=7, double=11, uint32=12
        # int64
        if to_attr.i == 7:
            print(f"  Cast→int64 at {n.name} (inputs: {list(n.input)})")
print()

# Find scope prefixes (everything between leading / and the next /)
print("=== Top-level scope prefixes (first segment after leading /) ===")
scopes = Counter()
for n in g.node:
    if n.name.startswith("/"):
        parts = n.name.split("/")
        if len(parts) >= 2:
            scopes[parts[1]] += 1
for s, c in scopes.most_common():
    print(f"  /{s}/  {c} nodes")
print()

# Find Mel / spectrogram / FFT / DSP-like ops
print("=== Possibly DSP-flavored ops (FFT/STFT/DFT/Mel-related) ===")
dsp_ops = {"DFT", "STFT", "MelWeightMatrix", "AudioToFrame"}
for n in g.node:
    if n.op_type in dsp_ops:
        print(f"  {n.op_type} at {n.name}")
print("  (none found above means no SPL/spectral DSP layers)" if not any(n.op_type in dsp_ops for n in g.node) else "")
print()

# Resampler-like name patterns?
print("=== Resampler-like name patterns ===")
patterns = [r"resampl", r"upsamp", r"downsamp", r"interp", r"stft", r"dft"]
for pat in patterns:
    rx = re.compile(pat, re.IGNORECASE)
    hits = [n for n in g.node if rx.search(n.name)]
    print(f"  {pat:12s} → {len(hits)} hits")
    if hits and len(hits) <= 5:
        for n in hits:
            print(f"      {n.name} [{n.op_type}]")
print()

# Inputs / outputs
print("=== Graph inputs ===")
for inp in g.input:
    tt = inp.type.tensor_type
    dims = [d.dim_value or d.dim_param or "?" for d in tt.shape.dim]
    print(f"  {inp.name}: dtype={tt.elem_type} dims={dims}")
print()
print("=== Graph outputs ===")
for out in g.output:
    tt = out.type.tensor_type
    dims = [d.dim_value or d.dim_param or "?" for d in tt.shape.dim]
    print(f"  {out.name}: dtype={tt.elem_type} dims={dims}")
