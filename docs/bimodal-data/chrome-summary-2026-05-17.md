# Chrome A/B test — 2026-05-17

**Setup**: Chrome 140 (M-series Mac), localhost:3000/app/?memdiag=true with the user's voice clone transplanted from Safari IndexedDB via clipboard → /tmp file → fetch+IDB injection. Pre-gen ran automatically; the dev-log captured 11 synths in raw form. (The memdiag trail itself was empty because the global flag came unset mid-session — separate bug to investigate.)

## Per-synth breakdown (from dev log)

| # | decTokens | LM (s) | Total (s) | Decoder ≈ (s) | Mode |
|--:|----------:|-------:|----------:|--------------:|:----|
| 1 | 337 | 4.2 | 23.8 | ~19.6 | slow |
| 2 | 325 | 3.1 | 20.1 | ~17.0 | slow |
| 3 | 326 | 3.1 | 9.8 | ~6.7 | **fast** |
| 4 | 309 | 2.5 | 18.0 | ~15.5 | slow |
| 5 | 326 | 3.9 | 10.5 | ~6.6 | **fast** |
| 6 | 321 | 3.8 | 20.1 | ~16.3 | slow |
| 7 | 331 | 3.1 | 20.2 | ~17.1 | slow |
| 8 | 326 | 2.9 | 9.4 | ~6.5 | **fast** |
| 9 | 333 | 3.2 | 20.2 | ~17.0 | slow |
| 10 | 318 | 2.7 | 8.6 | ~5.9 | **fast** |
| 11 | 323 | 2.9 | 18.2 | ~15.3 | slow |

## Observations

1. **Bimodal pattern reproduces in Chrome.** 7/11 slow, 4/11 fast.
2. **Chrome slow mode is ~50% slower than Safari's** — 15-20s decoder vs Safari's 10-12s.
3. **Shape pattern flips between browsers.** In Chrome, `decTokens=326` was fast 3/3 times. In Safari (PR #325 capture), `decTokens=323` was slow 4/4 and `decTokens=316` was fast 2/2 — a different cohort entirely.
4. **The pattern is NOT random per-shape.** Within a session, the same shape behaves consistently fast or consistently slow. This contradicts the earlier Pearson R = 0.052 finding from Safari, because Pearson conflates a categorical relationship (some shapes fast, others slow, but not by magnitude) with absence of correlation.

## Implication

The bug is **browser-agnostic** (lives in ORT-Web's WebGPU EP), but the specific shape → mode mapping is browser-specific. Both browsers exhibit a "blessed cohort of shapes" effect where some inputs hit a fast path and others don't, but which shapes are blessed differs by browser.

Since Chrome reproduces the bug AND has better diagnostics (timestamp-query, measureUserAgentSpecificMemory, frame capture, GPU process tracing), all subsequent investigation should move to Chrome.

## Revising the previous conclusion

PR #325 concluded "shape hypothesis falsified" based on Pearson R = 0.052. That conclusion is now **partially wrong**:
- It's correct that shape-time is not LINEARLY correlated (longer ≠ slower).
- It's wrong that shape doesn't matter at all. There's a categorical effect: certain shapes hit a "blessed" fast path; others don't.
- The correct statistic was not Pearson on (decTokens, decMs) but a per-shape group-by analysis: do same-shape synths cluster?

In the Safari data: yes they do. `decTokens=323` had 4 synths all between 8855-11112ms (range narrower than slow-vs-fast). `decTokens=316` had 2 synths at 3489 and 4394ms (both fast). The Pearson calculation missed this because shape changes don't predict TIME, but they do predict MODE.

## Next probe

1. **Fix the memdiag flag persistence bug** in Chrome — it's getting unset between boot and pre-gen, which prevents trail capture.
2. **Wire ORT-Web per-op profiler with `timestamp-query`** in Chrome only. Capture per-kernel times.
3. **Capture N ≥ 30 synths** with full trail + per-op timings.
4. The discriminator now: in a fast-mode vs slow-mode synth, does a single kernel double, or do all kernels scale uniformly?
   - Single kernel doubling → ORT's pipeline cache miss on that specific kernel for that shape; targeted fix is to pre-warm.
   - Uniform scaling → some external throttle (memory pressure, GPU clock state); deeper Metal-side debugging needed.

## Re-examining Safari data

In the Safari N=18 capture, sorted by `decTokens` ascending:

| decTokens | times (ms) | mode |
|----------:|-----------|------|
| 313 | 10283 | slow |
| 316 | 3489, 4394 | **fast** (2/2) |
| 317 | 10264 | slow |
| 319 | 11003 | slow |
| 321 | 10791 | slow |
| 323 | 8855, 9935, 9968, 11112, 11399, 9763 | slow (6/6) |
| 325 | 11399, 10450, 9557, 9763 | slow (4/4) |
| 326 | 5094 | fast (1/1) |
| 328 | 4514 | fast (1/1) |
| 331 | 9641 | slow |

Safari pattern: shapes 316, 326, 328 hit fast path; shapes 313, 317, 319, 321, 323, 325, 331 don't.

Chrome pattern: shape 326 hits fast path; nearly all others (309, 318, 321, 323, 325, 331, 333, 337) don't.

Shape 326 is fast in BOTH browsers (despite different absolute times). That's a strong hint: this is an ORT-Web shape-dispatch quirk where some shapes route to a fast path.

## Action

Move forward in Chrome. ORT per-op profiler is the next instrument.
