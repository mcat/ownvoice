# TTS boot profiling — session report (2026-05-19)

This is the handoff document for a future engineer (human or LLM) continuing the work of speeding up the cold-boot path until the app is ready to clone voices and generate cloned-voice TTS. Read this end-to-end before re-running any experiments.

## TL;DR

- The bottleneck is **WebGPU shader compilation in `ort.InferenceSession.create()` for `conditional_decoder.onnx`**. It takes 150–312 s per cold boot on M5 macOS, dominating total time-to-ready.
- The graph has **24,480 nodes** including **546 `DequantizeLinear` ops** (from the int8-weights/fp32-compute conversion shipped in PR #336). Each unique input shape to a `DequantizeLinear` produces a unique WGSL kernel that ORT-Web compiles at session creation. That's the structural cause.
- We tried 15+ approaches at the app/JS layer. Under the constraints (int8 decoder for size, WebGPU EP for synth speed, no eager-parallel workers for memory peak), the only changes that landed are: `graphOptimizationLevel: "disabled"` on the decoder session (~15–20 % marginal win, high variance) and createSession timing instrumentation.
- Real breakthrough requires either changing the model or persisting the WebGPU pipeline cache across reloads — both blocked by current constraints or by ORT-Web SDK limitations.

## Baseline timings (cold boot, OPFS-primed, browser pipeline cache cold)

Session-start → `[OwnVoice] GPU TTS: ready`, single fresh page load on dev server (`npm run dev`), no enrollment in flight:

| Step | Time (s) |
|---|---|
| WebGPU adapter ready + model manager init | 0.3 |
| STT WebGPU ready (encoder 66 MB + decoder 233 MB + warmup) | ~4 |
| TTS-GPU embed_tokens (WASM EP) | 0.4 |
| TTS-GPU language_model_q4 (WebGPU EP, 337 MB) | 0.8 |
| **TTS-GPU conditional_decoder (WebGPU EP, 158 MB)** | **150–312** |
| TTS-GPU warmup pass | 0.1 |
| **Total to "GPU TTS: ready"** | **155–320** |

The single high-variance line is the decoder. Repeat runs on the same machine span 155 s to 312 s depending on browser pipeline cache state; the long tail correlates with concurrent ORT activity (enrollment in flight, second tab) and with the cache being freshly cleared. The 150 s figure is the floor.

For comparison, on the same EP and similar size:

- `language_model_q4`: 337 MB external data, ~1000 nodes, 0.18 s `ort-create`.
- STT decoder: 233 MB external data, similar transformer ops, ~2.7 s `ort-create`.

So conditional_decoder is 700× slower than the LM despite similar weight size. The difference is graph topology, not bytes.

## Code locations

- `public/tts-gpu-worker.js` — GPU TTS worker (plain JS, imports ORT from `/ort/v1.25.1/`). `createSession` is now instrumented; `conditionalDecoderSession` uses `graphOptimizationLevel: "disabled"`.
- `src/models/ttsWorker.ts` — Vite-bundled WASM TTS worker. Hosts the `speech_encoder` used during enrollment (cloning), plus fallback synth path. `createSession` is instrumented.
- `src/App.tsx` — boot orchestrator. Currently serial: STT → GPU TTS → conditional WASM TTS (only when needed). Memory-peak constraint per PR #298 forbids eager parallelization.
- `src/components/shared/VoiceCapture.tsx:304-307` — triggers `bootTTSWasm()` when the Voice step mounts with `hasVoice=true`. Idempotent.
- `src/models/voiceProcessor.ts:53` — calls `bootTTSWasm()` when there's a pending voice blob.
- `public/models/2026-05-23/chatterbox-multilingual/conditional_decoder.onnx` (+ `.onnx_data`) — int8 weights, fp32 compute, 24,480 nodes, 546 DequantizeLinear. Shipped in PR #336.

## Experiment matrix (full results)

All measurements on M5 macOS, Chrome with COEP, `npm run dev` server, single page reload, no enrollment, OPFS already primed.

| # | Decoder file | EP | `graphOptimizationLevel` | `ort-create` (s) | Notes |
|---|---|---|---|---|---|
| 0 | int8 (shipping) | WebGPU+WASM | all | 188.5 | Baseline |
| 1 | int8 | WASM only | all | 99.0 | Per-synth ~14× slower; rejected |
| 2 | int8 | WASM only | basic | 180.5 | Worse — op-fusion helps WASM dispatch |
| 3 | int8 | WASM only | all | 98.7 | Repeat of #1; consistent |
| 4 | int8 (hybrid: WASM at boot, WebGPU lazy-upgrade) | both | all | 99.0 init / 188 upgrade | User rejected: "hedges instead of fixing root cause" |
| 5 | int8 | WebGPU+WASM | basic | 157.5 | ~31 s saved |
| 6 | int8 | WebGPU+WASM | disabled | 153.0 | ~37 s saved, slightly better than basic |
| 7 | fp32 baseline (2026-04-29, 533 MB) | WebGPU+WASM | all | 73.67 | **61 % faster than baseline**. Rejected for size. |
| 8 | fp32 baseline | WebGPU+WASM | basic | 73.69 | Same as #7; opt level doesn't matter on fp32. |
| 9 | int8 + parallel STT/TTS at App.tsx | WebGPU+WASM | disabled | 151.6 | -3 s wall clock, reverted for memory safety |
| 10 | fp16-weights (2026-05-20, 276 MB) | WebGPU+WASM | all | 146.4 | 22 % faster than int8; rejected for +118 MB |
| 11 | int8 | WebGPU+WASM | disabled (ORT 1.26.0) | 190.2 | **Worse** than 1.25.1 + opt=disabled |
| 12 | Pre-folded DequantizeLinear (fp32-equivalent, 533 MB) | WebGPU+WASM | all | 180.4 | **Structural twin of #7 but loaded slow**. See "Unexplained" below. |
| 13 | int8 + opt=disabled + URL-load `createSession` (no pre-fetch) | WebGPU+WASM | disabled | 155.7 | URL vs pre-fetched ArrayBuffer: ~noise |
| 14 | int8 + opt=disabled + parallel WASM TTS at boot | WebGPU+WASM | disabled | ~159 / cloning at 6 s | Cloning ready 30× faster but ~300 MB memory peak; reverted per user concern |

Final retained config: int8 + WebGPU + opt=disabled + URL-load. Numbers 5, 6, 9, 13, 14 are within the same noise band; pipeline cache state matters more than `opt` level on cold loads.

## Unexplained: the pre-folded fp32 anomaly (experiment #12)

The most interesting finding. I built `conditional_decoder` by:
1. Loading the int8 ONNX (`/tmp/ortopt/conditional_decoder.onnx` + `_data`).
2. Evaluating every `DequantizeLinear` (all 546 — all-constant inputs).
3. Replacing each with a fp32 initializer reusing the DQL output name.
4. Removing the DQL nodes.
5. Saving via `onnx.save(..., save_as_external_data=True, location="conditional_decoder.onnx_data", all_tensors_to_one_file=True, size_threshold=1024)`.

The resulting model:

```
nodes=23934 initializers=1629
opset=[('', 17)] ir_version=8
op types: [('MatMul', 4585), ('Add', 4507), ('Mul', 3358), ('Transpose', 3170), ('Reshape', 2404)]
dtypes: Counter({1: 1591, 7: 37, 6: 1})
storage: Counter({'ext': 1395, 'inline': 234})
```

That is **bitwise-equivalent in topology** to the fp32 baseline (`public/models/2026-04-29/chatterbox-multilingual/conditional_decoder.onnx`):

```
nodes=23934 initializers=1629
opset=[('', 17)] ir_version=8
op types: [('MatMul', 4585), ('Add', 4507), ('Mul', 3358), ('Transpose', 3170), ('Reshape', 2404)]
dtypes: Counter({1: 1591, 7: 37, 6: 1})
storage: Counter({'ext': 1395, 'inline': 234})
```

Same op counts, same op types, same dtypes, same storage distribution. Both 533 MB on disk.

**Yet:** fp32 baseline loads in 73.67 s; pre-folded loads in 180.4 s. Consistently. Same browser, same dev server, comparable cache state.

I couldn't account for this. Hypotheses:

1. **Initializer naming** — fp32 baseline uses PyTorch names (`down_blocks.0.blocks.0.weight`); my pre-folded reuses DQL output names (`/down_blocks/blocks.0/Conv/dequant_weight`). Some ORT-Web optimizer might pattern-match on names for fusion. Worth testing: rename initializers to match baseline.
2. **Initializer ORDER in the external data file** — Python `onnx.save` packed initializers in evaluation order, not the original PyTorch order. ORT-Web's WebGPU EP may use external-data offsets as part of some cache key.
3. **Raw byte representation** — `numpy_helper.from_array(fp32)` may produce a slightly different `TensorProto.raw_data` layout (alignment, padding) than the PyTorch export. ORT might hash the raw bytes for de-duplication.

If a future engineer can resolve this, **`opt=all` + a client-side or build-time dequant-fold yields 74 s with zero size cost** — the fp32 baseline timing while shipping the 158 MB int8 weights on disk. This is the single biggest potential win remaining.

Suggested next probes:

- **Diff the two `.onnx` files at the protobuf level** (`onnx.checker`, `protoc --decode`). Identify any field that differs.
- **Rename initializers in the pre-folded model** to match PyTorch baseline names. Test.
- **Re-export from PyTorch directly** with the int8→fp32 dequant baked in (instead of post-hoc Python folding). Test.
- **Inspect ORT-Web verbose logs** during both loads. Look for `[artifact] key:` lines (see `docs/probe-ort-shape-dispatch.md`) — comparison should reveal whether different kernels are being compiled.

## Constraints summary (do not relitigate these)

The user has explicitly ruled out:

- **Larger weight files.** Decoder must stay at the current ~158 MB int8 footprint. fp32 (533 MB) and fp16 (276 MB) are out.
- **WASM-only synth path.** The 14× per-synth slowdown is unacceptable.
- **Hybrid approaches** that load WASM first and upgrade to WebGPU in background. The user wants the WebGPU path to be faster, not hedged.
- **Parallel boot of WASM TTS with GPU TTS at the App.tsx level.** PR #298 serialized these for a memory-peak reason ("doubling the boot-window peak"). Older iPads with 2 GB renderer caps would be at risk. WASM TTS is correctly lazy via `VoiceCapture.tsx` and `voiceProcessor.ts`.

The user is OK with:

- App-level changes that don't affect memory peak.
- Build-time / offline preprocessing of the existing decoder.onnx, as long as the on-disk size doesn't grow.
- Instrumentation and observability changes.

## What's in production right now (post-PR #339)

- `graphOptimizationLevel: "disabled"` on `conditional_decoder` in `public/tts-gpu-worker.js`. Modest perf, zero memory cost.
- `createSession` ort-create timing in both workers' logs (search `[OwnVoice:TTS:GPU] createSession`, `[OwnVoice:TTS] createSession` in `logs/dev.log`).
- Comment in `src/App.tsx` documenting why WASM TTS stays lazy.

## Where to start if you're picking this up

Highest-EV next experiment: **figure out why the pre-folded model loads in 180 s instead of 74 s.** If you can fix that, you get a 75 % reduction in time-to-ready while honoring the size constraint. The Python folding script is essentially:

```python
import onnx
from onnx import numpy_helper, helper
import numpy as np

m = onnx.load("path/to/int8/conditional_decoder.onnx")
g = m.graph

init_by_name = {init.name: init for init in g.initializer}
foldable = [n for n in g.node if n.op_type == "DequantizeLinear"
            and all(inp in init_by_name for inp in n.input)]

new_inits = []
for n in foldable:
    x = numpy_helper.to_array(init_by_name[n.input[0]])
    scale = numpy_helper.to_array(init_by_name[n.input[1]])
    zp = numpy_helper.to_array(init_by_name[n.input[2]]) if len(n.input) > 2 \
         else np.array(0, dtype=x.dtype)
    axis = next((a.i for a in n.attribute if a.name == "axis"), 1)
    if scale.ndim == 1 and x.ndim > 1:
        shape = [1] * x.ndim; shape[axis] = scale.shape[0]
        scale = scale.reshape(shape)
        if zp.ndim == 1: zp = zp.reshape(shape)
    fp32 = (x.astype(np.float32) - zp.astype(np.float32)) * scale.astype(np.float32)
    new_inits.append(numpy_helper.from_array(fp32, name=n.output[0]))

# ...remove DQL nodes, prune unused old initializers, rebuild graph, save with
# save_as_external_data=True, location="conditional_decoder.onnx_data".
```

Place the result at `public/models/2026-05-23-folded/chatterbox-multilingual/` and override the worker URL temporarily to test. The full version of the script was ad-hoc; recreate it cleanly when you pick this up.

Second-priority: **dig into ORT-Web's WebGPU artifact cache key.** The doc at `docs/probe-ort-shape-dispatch.md` already lays out the cache mechanism (it's per-session, in-memory, keyed by op + shape). The 150–312 s variance is partly the browser's lower-level pipeline cache, which we don't directly control. Persisting this across reloads would dramatically improve UX but isn't exposed by the ORT-Web API.

## Useful artifacts left behind

- `logs/dev.log` (truncated on each `npm run dev` restart) — every experiment in this session is timestamped here. Search by `t:<session>` to bracket a single page load.
- `/tmp/inspectdec/` — has the fp32 baseline copies used during graph inspection.
- `scripts/inspect-decoder-graph.py` — existing util; useful for quick op-type counts on any decoder variant.
- `scripts/convert-decoder-fp16-weights-only.py` and `scripts/convert-decoder-int8-weights-only.py` — the production conversion scripts that generated the current shipping decoder; reference if you need to re-derive the int8.

## Process notes

- The dev-log sink (`logs/dev.log`) is the only Claude-visible browser surface in this codebase. Without it, none of this profiling would have been tractable. Search by `[OwnVoice:TTS:GPU]` for GPU worker output and `[OwnVoice:TTS]` for WASM worker output. The `t:<id>` tag bracketing a session in the log is the most useful filter.
- WebGPU pipeline cache state dominates timings. To get clean measurements, kill the dev server, restart, and capture exactly one cold page load before drawing conclusions. Don't compare runs across different cache states.
- `gh pr merge` may be blocked by Claude Code's auto-mode safety classifier even with explicit user authorization. Surface to the user if it happens.
