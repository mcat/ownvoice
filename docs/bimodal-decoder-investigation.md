# Bimodal decoder latency investigation

Status: 2026-05-17 — four-probe instrumentation landed in PR #323. **First data capture completed 2026-05-17** (18 complete synths, see `docs/bimodal-data/analysis-2026-05-17.json`). Hypotheses 1 (shape) and 2/4 (queue) are now empirically falsified; Hypothesis 3 (memory / internal WebGPU state) is the surviving suspect.

## What we know

`conditional_decoder` on the WebGPU EP shows a roughly 50/50 bimodal split: ~3.5-4.5s "fast" mode vs ~10-12s "slow" mode, with the same model, same speaker embeddings, and similar input lengths. The slow-mode delta is ~6s and is roughly constant — it doesn't scale with audio length. PR #321's LM-vs-decoder split confirmed the LM is metronome-steady at 2.3-2.9s, so the entire bimodality lives in the decoder ONNX session run.

The first 9 fresh-boot synths from PR #321's capture:

| Synth | Queue (ms) | LM (ms) | Decoder (ms) | Mode |
|------:|-----------:|--------:|-------------:|------|
|     1 |          8 |    2627 |         3510 | fast |
|     2 |          6 |    2653 |    **10183** | slow |
|     3 |          8 |    2471 |         3983 | fast |
|     4 |          6 |    2938 |    **11718** | slow |
|     5 |       5228 |    2539 |    **12462** | slow (+ queue delay) |
|     6 |          8 |    2349 |         4418 | fast |
|     7 |          6 |    2354 |         4544 | fast |
|     8 |          5 |    2460 |    **11955** | slow |
|     9 |          7 |    2269 |    **11660** | slow |

5/9 slow, 4/9 fast. No obvious pattern by index.

## Hypotheses ruled out

| Hypothesis | Falsified by |
|------------|-------------|
| Main-thread allocation churn during synthesis | PR #309 (transferable speakerData) — bimodality persists |
| Worker-side defensive Float32Array copies | PR #316 (elided copies) — bimodality persists |
| Decoder weight precision (fp32 vs fp16) | PR #318 (fp16 decoder ship) — bimodality persists |
| WebGPU adapter capability mis-detection | PR #319 (adapter limits probe) — adapter looks healthy |
| Multi-tab log pollution faking the pattern | PR #321 (per-tab log id) — bimodality persists in single-tab capture |
| LM autoregressive complexity / KV cache growth | PR #321 (LM/decoder split) — LM is steady 2.3-2.9s across all synths |

## Surviving hypotheses

1. **WebGPU shader cache miss on new input shapes.** ORT-Web maintains its own pipeline cache keyed on op + input shape; dynamic decoder input lengths force recompile-on-first-use. Each new `decTokens` value pays the compile cost once. Predicts: decoder time correlates with whether `decTokens` has been seen before in this session.
2. **WebGPU queue congestion / Metal scheduling pressure.** Slow synths wait behind queued work from prior submits (LM, prior decoder calls, encoder warmup). Predicts: `onSubmittedWorkDone()` settles slowly on slow runs and fast on fast runs.
3. **Memory pressure forces buffer-pool re-allocation.** Each decoder run allocates intermediate tensors; under pressure these may spill to a slower path. Predicts: bimodality worsens later in a session as OPFS / GPU memory accumulates.
4. **Encoder / LM ongoing background work bleeds in.** The encoder is loaded but only invoked on enrollment; the LM finishes synthesis but may have lingering GPU work that gets accounted to the decoder's time slice. Predicts: queue-settle time before decoder.run shows multi-second values on slow synths.

Hypotheses 2 and 4 share a queue-congestion mechanism — they predict the same Probe 3a signal.

## What the next data collection will tell us

After PR #323 lands and a session captures ≥30 synths with `?memdiag=true`, the analyzer output discriminates:

| Analyzer output | Implication | Next experiment |
|-----------------|-------------|------------------|
| `queueSettleAnalysis.slowMean ≫ fastMean` | Hypothesis 2/4 supported — queue congestion is the cause | Serialize queue before decoder (already prototyped in Probe 3a); confirm bimodality disappears |
| `queueSettleAnalysis.slowMean ≈ fastMean` (<50ms both) | Hypotheses 2/4 falsified | Look at length correlation |
| `lengthCorrelation.pearsonR > 0.5` | Hypothesis 1 (shader-cache miss) supported | Pre-warm decoder at multiple lengths at first idle moment |
| `lengthCorrelation.pearsonR < 0.2` AND queue similar | Hypotheses 1/2/4 all falsified | Investigate Hypothesis 3 (memory pressure); add OPFS-usage and worker-state proxies to the slow-vs-fast comparison |
| Histogram is multi-modal (3+ peaks) | Earlier framing is wrong | Re-cluster by mode count; treat as a different problem |

## Remediation candidates (ranked by expected impact)

### A. Decoder-input padding to fixed shape
**If** Hypothesis 1 is confirmed: ORT-Web's `enableGraphCapture` pins pipelines when input shapes are static. Padding `decoderTokens` to a small set of canonical lengths (e.g., 256 / 384 / 512 / 768) compiles 4 pipelines total instead of N. Audio output is unchanged because the silence padding token is benign at any position.

- **Cost**: ~50 LOC in the worker; one-time decoder warmup at each canonical length.
- **Risk**: longer-than-768-token inputs need a fallback (rare per existing decoder length logs).

### B. Serialize the queue before decoder.run
**If** Hypothesis 2/4 is confirmed: the same `await dev.queue.onSubmittedWorkDone()` pattern already prototyped in Probe 3a, but unconditional (not gated on memdiag). Cost is whatever the queue settle time was — that time is already being paid in the bimodal slow mode, so making it explicit and consistent moves it from random to predictable.

- **Cost**: 5 LOC.
- **Risk**: average-case slight latency increase if queue is often non-empty when fast runs would happen.

### C. Process-time decoder warmup at boot
**Always-applicable but uncertain effect**: run a throwaway decoder.run during `handleInit` with a representative input. If WebKit implicitly caches across calls, subsequent first-real-synth benefits. If it doesn't, this is a no-op (small boot cost).

- **Cost**: ~30 LOC + 3-5s added to cold boot. Skippable if a previously-cloned speaker isn't in IndexedDB.
- **Risk**: low. Worst case is "boot a bit slower."

### D. ORT-Web profiling-driven per-op investigation
**If** A-C are inconclusive: enable `ort.env.webgpu.profiling = { mode: "default", ondata }` for a session, look at the per-kernel breakdown. If a specific kernel doubles on slow runs, that's a recompile signature pointing at a specific shader. Targeted fix: split that kernel's input axes or pin its shape.

- **Cost**: instrumentation only; remediation TBD.
- **Risk**: profiling on Safari uses host wall time, so kernel boundaries are noisier than on Chrome.

### E. Out-of-app: Xcode Instruments + Metal System Trace
**If** all in-app probes are ambiguous: tethered iPad with a thin WKWebView host + Instruments. The only ground-truth surface for Metal command-buffer scheduling and shader-compile events on real hardware.

- **Cost**: 1-2 days of infra; iPad developer mode required.
- **Risk**: zero risk to app code; just expensive to set up.

## Recommended path

1. Merge PR #323. Land instrumentation.
2. Capture a 30-50 synth session with `?memdiag=true`. Run the analyzer.
3. Branch on the analyzer's discriminator:
   - Queue-driven → ship Remediation B (unconditional queue serialize).
   - Shape-driven → ship Remediation A (padding + graph capture).
   - Both falsified → run Remediation D (ORT profiler) for the next session; investigate Hypothesis 3.
4. Whatever ships, re-run the analyzer on a post-remediation session and confirm the bimodal split collapses (histogram becomes unimodal or the slow tail loses mass).

## Pending data

The analyzer accepts trails from the Settings → Diagnostics → "Download trail" button. Once data is captured, paste/share the JSONL and we'll run the discriminator together.

## 2026-05-17 capture results

Drove 30 phrase taps on desktop Safari 26 (M-series Mac, fresh tab, audio cache cleared, memdiag enabled). 18 complete synths landed in the trail with the new instrumentation.

| metric | value |
|--------|------:|
| decoder min | 3489 ms |
| decoder p10 | 4394 ms |
| decoder median | 9968 ms |
| decoder p90 | 11112 ms |
| decoder max | 11399 ms |
| fast (<6500 ms) | 4 / 18 |
| slow (≥6500 ms) | 14 / 18 |
| Pearson R (decTokens × decMs) | **0.052** |
| Mean queueSettleMs (slow) | **0 ms** |
| Mean queueSettleMs (fast) | **0 ms** |

### Hypothesis 1 (shape) — falsified

`decTokens` ranged 313-331 (a 6% spread, dominated by the fixed 250-token speaker prompt; the variable speech-token tail is small). Within that narrow range, the Pearson R between input length and decoder time is **0.052** — essentially zero correlation.

Concretely, synths with identical input shapes show wildly different times:

| Synth | decTokens | decMs | Mode |
|------:|----------:|------:|------|
| 8  | 323 | 9968 | slow |
| 10 | 323 | 8855 | slow |
| 14 | 323 | 11112 | slow |
| 17 | 323 | 9935 | slow |
| 22 | 316 | 3489 | fast |
| 20 | 316 | 4394 | fast |
| 21 | 317 | 10264 | slow |

Shader-cache-miss on new shapes is not the cause. Same-shape inputs hit both modes.

### Hypothesis 2 / 4 (queue congestion / encoder bleed-in) — falsified

`onSubmittedWorkDone()` settled in **0-1 ms on every single synth**, slow or fast. The GPU command queue is reliably empty by the time the decoder is about to submit. There's no queued work from prior LM submits, encoder warmup, or background tasks bleeding into the decoder's measured time.

### Heap-watermark proxy signals — invariant

OPFS usage, hot-cache size, worker states, pending-synths counter — all identical between fast and slow synths. As Probe 2's research warned, Safari exposes no GPU-memory or device-pressure signal from JavaScript; the proxy signals we *can* sample don't discriminate.

### What's left

Hypothesis 3 (internal WebGPU buffer-pool churn / Metal scheduling) is the surviving candidate. The bimodality is real, lives entirely inside the `conditional_decoder` ORT session, doesn't depend on input shape, and isn't queue-driven. That places it in the WebGPU/Metal stack at a layer we cannot directly observe from JS.

There's also a tantalizing temporal pattern: of the 18 captured synths, fast ones appeared at indices 7, 12, 20, 22 — roughly every 5-8 synths apart. Could be coincidence with N=18, but consistent with a periodic-flush or buffer-pool-rotation mechanism.

## Next steps (revised)

1. **Remediation D in the original menu (ORT-Web per-op profiler)** is now the highest-priority next probe. With queue and shape eliminated, the question becomes "*which* kernel inside `conditional_decoder` has bimodal time?" If a single kernel doubles on slow runs, that's a targeted fix path. If all kernels scale uniformly, it's a more global scheduling/throttling story.

2. **Larger-N capture** to confirm the periodic-fast pattern. If N=50+ shows a consistent ~5-8 synth fast cadence, that's a strong signal for an internal flush rhythm we can characterize.

3. **Remediation C (boot-time decoder warmup) is now low priority** — the shader-cache theory it was designed to test has been falsified by the same-shape-different-time data. The warmup might still help by some other mechanism, but it's no longer the leading bet.

4. **Iterate on Hypothesis 3 instrumentation**: add buffer-pool counters if ORT exposes them, or use the per-op profiler's emission timing to detect compute-vs-memory phase shifts.

## Issue thread

Findings filed at [#324](https://github.com/mcat/ownvoice/issues/324). Trail JSONL + analyzer output at `docs/bimodal-data/*` for reproducibility.

