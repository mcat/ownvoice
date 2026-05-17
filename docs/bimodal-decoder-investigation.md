# Bimodal decoder latency investigation

Status: 2026-05-17 — four-probe instrumentation landed in PR #323; data capture pending.

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
