# ORT-Web WebGPU shape dispatch: why some `decTokens` shapes are 3× faster

Primary-source dive into `onnxruntime-web` 1.25.1 (under `node_modules/onnxruntime-web/lib/wasm/jsep/`). Goal: explain Chatterbox `conditional_decoder` bimodal latency across `[1, decTokens]`, `decTokens ∈ [309, 337]`.

## 1. Pipeline cache mechanism

The WebGPU EP keeps a per-session `Map<key, Artifact>` (`program-manager.ts:21-27`). The cache key is (`backend-webgpu.ts:95-115`):

```
<PROGRAM_NAME>[<HINT>]:<is1DimDispatch>:<INPUT_INFO_0>|...
```

Per-input info comes from `getProgramInputTensorInfoDependencyKey` (`backend-webgpu.ts:46-86`). Each kernel declares `inputDependencies` ∈ {`none`, `type`, `rank`, `dims`}. **If the kernel does not set `inputDependencies`, the backend defaults to `'dims'`** (`backend-webgpu.ts:112`) — the exact shape is baked into the key.

On miss (`backend-webgpu.ts:626-630`), `programManager.build()` (`program-manager.ts:93-123`) calls `device.createShaderModule` + `device.createComputePipeline`. Pipeline creation is synchronous and triggers WGSL→native (MSL/DXIL/SPIR-V). A single MatMul pipeline can take 60-300 ms on Apple silicon; a decoder with hundreds of nodes spends seconds in compile.

### What recompiles per shape

| Op | `inputDependencies` | Shape in `hint`? | Recompile per `decTokens`? |
|---|---|---|---|
| MatMul packed (`3rd-party/matmul_packed_webgpu.ts:487, 540`) | `['rank',…]` | `elementsPerThread`, `isVec4` | Conditionally — §2 |
| Naive MatMul (`matmul-shaders.ts:175`) | `['rank',…]` | `components`, `aComponents`, `outputNumber` | Conditionally |
| Conv-grouped (`conv-grouped.ts:53, 254`) | `['rank',…]` | `components`, `outputNumber`, `xNumber` | Conditionally |
| Attention / MHA / Softmax / LayerNorm / Where / Transpose / Slice / Concat / Expand / Tile / Gather | `'type'` or `'rank'` | small constants | **No** |
| **`BiasAdd` (`bias-add.ts:53`)** | **none → `'dims'`** | none | **Yes** |
| **`BiasSplitGelu` (`bias-split-gelu.ts:61`)** | **none → `'dims'`** | none | **Yes** |
| **`Range` (`range.ts:56`)** | **none → `'dims'`** | none | **Yes** |

`BiasAdd` and `BiasSplitGelu` are common post-MatMul fusions in vocoders — if `conditional_decoder.onnx` lowers any bias to these, every fresh `decTokens` rebuilds those pipelines.

## 2. Does this match the bimodality?

Partly, but not cleanly. A pure cache-miss story predicts *first run* of each shape slow, subsequent runs fast. The user has **3/3 runs at 326 fast and 7/7 runs at other shapes slow** — every invocation, not just first. That points away from "cold compile" and toward **shape-dependent execution-time cost**.

Three runtime-shape effects in ORT-Web kernels:

- **`isVec4` gate** (`matmul_packed_webgpu.ts:463`): `dimInner % 4 === 0 && dimBOuter % 4 === 0`. Picks a different shader (`makeMatMulPackedVec4Source` vs `makeMatMulPackedSource`, line 531). With `decTokens` on `M` only, this stays constant — unless an internal reshape puts seq-length on K/N.
- **`elementsPerThread`** (line 466): `dimAOuter <= 8 ? [4,1,1] : [4,4,1]`. Threshold 8; doesn't trip in `[309,337]` on M.
- **Workgroup-tail divergence**: dispatch = `Math.ceil(M / wgSize / elementsPerThread)` (line 469-472). Trailing partial workgroup adds a tail cost. Shapes that round to `8×4=32` (e.g. 320, 352) avoid tail predication; `326 = 2×163` does not.

**The 326-fast-in-both-browsers result is not fully explained by the cache mechanism.** Safari's fast cohort {316, 326, 328} is exactly the even values; Chrome's fast cohort is just {326}. Two different patterns. The plausible Chatterbox-specific explanation: an internal scratch tensor (mel rate, upsample factor, conv kernel) aligns at 326. Verifying this needs the ONNX graph, not the runtime.

## 3. Ranked hypotheses

1. **Pipeline cache miss on first sight of each shape**, driven by ops defaulting to `'dims'` (`BiasAdd`, `BiasSplitGelu`, `Range`). Predicts first-run-only slowdown — **doesn't fit every-run-slow**.
2. **Runtime kernel-execution shape sensitivity** (vec4 path, workgroup-tail divergence, bounds branching). Fits per-invocation persistence; doesn't explain cross-browser convergence at 326.
3. **Coincidental graph-internal alignment at 326** — Chatterbox-specific. Unfalsifiable from runtime evidence alone.

## 4. Falsifier — run this before any code change

Set `ort.env.logLevel='verbose'` in the worker. The backend emits `[artifact] key: …` lines on every cache miss (`backend-webgpu.ts:630`). For one slow + one fast shape:

- Many `[artifact]` events on **every** run → cache-miss-per-run (an op downstream of `decTokens` is receiving varying shapes via `'dims'` dependency).
- Zero `[artifact]` events on run 2+ but timing still slow → runtime shape sensitivity, not cache.

Pair with `ort.env.webgpu.profiling = { mode: 'default' }` for per-kernel timing — identifies which kernel diverges between 325 and 326.

## 5. Mitigations, ranked

1. **Bucket `decTokens` to a multiple of 32 (or power of 2)** before the decoder call. Pad with the model's pad token, trim the output mel by the original length. Cheapest mitigation; flattens all three hypotheses simultaneously.
2. **Pre-warm one decoder shape per bucket** at boot, behind the existing "Prepare for offline" flow.
3. **`freeDimensionOverrides`** on `InferenceSession.create()` — only effective if `conditional_decoder.onnx` declares `decTokens` as a named symbolic dim (inspect with Netron); set it to the chosen bucket so ORT specializes the graph.
4. **`enableGraphCapture: true`** — explicitly *does not* work with dynamic decoder shapes per ORT docs. Skip.
5. **`preferredOutputLocation: 'gpu-buffer'`** — orthogonal to this bug, but worth setting later for post-processing.
6. **Capture `[artifact] key:` log lines for one slow + one fast run** and attach to the issue — load-bearing evidence before any further work.

## References

- `node_modules/onnxruntime-web/lib/wasm/jsep/backend-webgpu.ts` (cache key)
- `node_modules/onnxruntime-web/lib/wasm/jsep/webgpu/program-manager.ts` (pipeline build)
- `node_modules/onnxruntime-web/lib/wasm/jsep/webgpu/ops/3rd-party/matmul_packed_webgpu.ts` (vec4 / elementsPerThread)
- ORT docs: <https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html>, <https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html>
- PR microsoft/onnxruntime#24078 — example of K-divisibility shader selection.
