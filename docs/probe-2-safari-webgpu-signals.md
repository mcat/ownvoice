# Probe 2: Safari WebGPU Runtime Diagnostics

Question: Can we sample anything at decoder-start to discriminate "GPU queue congested" vs "shader cache miss" on Safari 26 / iPadOS 26?

## 1. `GPUQueue.onSubmittedWorkDone()` — available, usable

Standardized in the WebGPU spec; resolves on the queue timeline after all prior submits finish. Safari 26 ships the full GPUQueue interface, so it works.

Usable as a queue-depth proxy: before issuing the decoder submit, call `q.onSubmittedWorkDone()` and measure how long it takes to resolve. That settle time is "time to drain everything in front of me." Caveats: it resolves on the host timeline (microtask after the GPU signals), so JS jitter and event-loop scheduling add ~1-2 ms noise — fine for our 6 s delta. Inserting a probe submit before decoder start does not change subsequent latency in Dawn/WebKit. No Safari-specific bug reports for this API.

Refs: [W3C WebGPU §22.1](https://www.w3.org/TR/webgpu/), [MDN onSubmittedWorkDone](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/onSubmittedWorkDone), [gpuweb#3762](https://github.com/gpuweb/gpuweb/issues/3762).

## 2. `adapter.info` — almost nothing useful

Returns `{ vendor, architecture, device, description, isFallbackAdapter, subgroupMinSize, subgroupMaxSize }`. No `memoryHeaps`, no queue depth, no cache state. Safari deliberately keeps it minimal for fingerprinting. iPadOS 26 adds no new diagnostic fields ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapterInfo), [WebKit standards positions #392](https://github.com/WebKit/standards-positions/issues/392)).

## 3. `performance.measureUserAgentSpecificMemory()` — NOT implemented in Safari

Chromium-only as of 2026-05; WebKit standards position remains open (#392). `performance.memory` is also absent. Memory-side instrumentation has to use the same OPFS tombstone pattern we already use for OOM detection ([MEMORY.md: project_safari_memory_apis](file:///Users/mark/.claude/projects/-Users-mark-IdeaProjects-ownvoice/memory/MEMORY.md)).

## 4. Error scopes — error-only, no "pressure" signal

`popErrorScope()` returns `null` or a `GPUError` (validation/out-of-memory/internal). The `uncapturederror` event fires only for actual errors. WebGPU has no "device under pressure" event; no internal queue-depth or thermal hooks ([MDN GPUDevice uncapturederror](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/uncapturederror_event)).

## 5. `GPUPipelineCache` — NOT in the WebGPU spec at all

There is no developer-controllable `GPUPipelineCache` in the W3C spec. Pipeline/shader caching is described only as *implicit* implementation behavior; the spec explicitly notes it as a fingerprinting concern, not a hand-off API ([WebGPU explainer §4.5](https://gpuweb.github.io/gpuweb/explainer/)). Safari doesn't expose one because nothing exists to expose. Cross-session shader caches in WebKit are internal and undocumented; we can't pre-warm them from JS.

For ONNX Runtime specifically, ORT-Web maintains its *own* in-process pipeline cache keyed on op + input shape. Dynamic input shapes (decoder kv-cache growth, variable text length) force recompile-on-first-use. Static shapes let `enableGraphCapture` pin pipelines ([ORT perf docs](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)).

## 6. `timestamp-query` — effectively unavailable on Apple Silicon

The spec defines an optional `timestamp-query` feature, but it's unimplementable on TBDR GPUs in a useful way: Apple Silicon returns `false` for Metal's `atDrawBoundary`/`atDispatchBoundary`/`atBlitBoundary` sampling points ([gpuweb#2046](https://github.com/gpuweb/gpuweb/issues/2046)). Safari 26 does not advertise `timestamp-query` on iPadOS adapters. No per-pass GPU timing from JS.

## 7. External tooling — limited

- **Safari Web Inspector**: WebGPU tab supports object/state inspection but no profiler timeline. brendan-duncan's [webgpu_inspector](https://github.com/brendan-duncan/webgpu_inspector) extension runs in Safari but mostly mirrors Chrome features and isn't a sampling profiler.
- **Xcode Instruments / Metal System Trace**: works only via USB-C tethered iPad with developer mode + a wrapping WKWebView app. Gives true Metal command-buffer timing, kernel residency, and GPU occupancy. This is the only ground-truth path for per-decoder-run breakdown on iPad.
- **ORT-Web profiling**: `ort.env.webgpu.profiling = { mode: 'default', ondata }` logs per-op timings to console. On Safari this uses `performance.now()` deltas around dispatches (since timestamp-query is absent), so it measures host-observed wall time, not GPU-side time. Still discriminates which op grew — likely sufficient to localize the bimodality to specific kernels in `conditional_decoder`.

## Punchline

**Single most likely usable signal: `GPUQueue.onSubmittedWorkDone()` settle time, sampled right before the decoder submit.** It's the only standardized, Safari-implemented probe that distinguishes "queue had work piled in front of me" from "queue was empty." If it consistently resolves <50 ms on both fast and slow runs, queue congestion is falsified and the bimodality is shader-cache / first-shape compile cost. If slow runs correlate with multi-second settles, the upstream LM submit is bleeding into the decoder window.

**Pair it with ORT-Web's per-op profiler** (`ort.env.webgpu.profiling`) to see *which* decoder kernels grew on the slow runs. If a specific kernel's time roughly doubles only on first-of-shape, that's a recompile signature even without GPU timestamps. If all kernels scale uniformly, it's a queue/throttling story.

**No programmatic alternative for shader-cache state.** If both probes come back ambiguous, the next step is Xcode Instruments + Metal System Trace via a tethered iPad with a thin WKWebView host — the only way to see Metal command-buffer scheduling and shader-compile events directly.
