# RESOLVED: bzzt at speech onset (fp16 decoder conversion)

## Resolution

**Root cause: `convert_float_to_float16`'s output keeps both weights AND
arithmetic at fp16.** The CFM ODE flow integration runs across 12
`mid_blocks` and compounds fp16 precision error step by step — no
amount of static block-list expansion stops the accumulation, because
the flow itself runs through fp16 arithmetic.

**Fix: fp16 weights / fp32 compute.** Quantize each
Conv/MatMul/ConvTranspose/Gemm weight initializer to fp16 (the storage
saving), then insert a `Cast(fp16→fp32)` node right before the
consuming op, so every arithmetic operation, activation, and RNG draw
runs at full fp32 precision. The output is mathematically near-identical
to fp32 — only loss is fp16's ~3-digit precision on the weight values
themselves, which lands well below perceptual threshold.

**Implementation:** `scripts/convert-decoder-fp16-weights-only.py` (NEW
in this fix). 683 weight initializers quantized; 683 Cast nodes
inserted. Output size 275.7 MB (vs fp32 515.3 MB, 46.5% reduction).
Mechanical drift vs fp32 dropped to 1.2% (compared to the failed v2
block-list approach at 9.9% and v3 at 15.8%). User listen-test on
WebGPU EP via the production post-processing pipeline confirmed clean
onsets.

**Shipped as:** `MODELS_RELEASE = "2026-05-20"`.

## What didn't work (preserved for the next person)

Three iterations on the same "expand the fp16 conversion block-list"
pattern all failed:

| Attempt | Block list addition | Result |
|---|---|---|
| 2026-05-17 (PR #318) | STFT, istft, f0_upsamp | buzzy (rolled back #327) |
| 2026-05-18 v2 | +m_source +Cast roundtrip removal | mechanical drift 9.9%, user heard buzz |
| 2026-05-19 v3 | +down_blocks, up_blocks, f0_predictor | worst-case 2-4 kHz onset ratio REGRESSED 1.73 → 4.77 |

Per superpowers:systematic-debugging Phase 4.5 (3+ failures on the same
architectural pattern = wrong pattern), this is the signal to question
the pattern. The pattern was wrong: blocking specific subgraphs from
fp16 conversion doesn't prevent fp16-error compounding across the CFM
flow steps. The fix had to be "no fp16 arithmetic in the synthesis
path at all," not "no fp16 in specific subgraphs."

## Diagnostic chain from the original investigation

This took a long session to land. The diagnostic chain (preserved for
the next person debugging audio):

| Hypothesis | Method | Result |
|---|---|---|
| Padding (`?padShape=32`) caused it | A/B with `?memdiag=true` only | Buzz present in both |
| Post-processing pipeline caused it | `?nopost=true` to bypass | Buzz present in raw worker output |
| LM sampling vs greedy | `?sample=true` | Identical buzz |
| Vocoder "cold start" in first frames | `?prefixSilence=N` to absorb | Buzz persists, AND speech becomes unintelligible (model has positional prior on prompt) |
| Gate gain stepping (500 Hz mod) | Fixed gate to interpolate gain | Reduced buzz 3× but didn't eliminate. Reverted (production listeners actually like the buggy gate's incidental HF roll-off) |
| Denoise using speech as noise reference | Fixed denoise to use quietest frames | Made buzz LOUDER (uncovered the model artifact the buggy denoise had been masking). Reverted |
| fp16 decoder conversion (full fp16 arithmetic) | Symlink fp32 bytes into 2026-05-17 path | **Buzz gone** ✓ |
| Block /m_source/ NSF harmonic source | v2 attempt | Buzz persisted (validator blind spot) |
| Block /m_source/ + /down_blocks/ + /up_blocks/ | v3 attempt | Worse, not better — proved the pattern wrong |
| **fp16 weights with fp32 compute** | v4 attempt — Cast(fp16→fp32) before each Conv/MatMul | **Buzz gone, ships as 2026-05-20** ✓ |

## Files (current)

- `scripts/convert-decoder-fp16-weights-only.py` — the working approach
- `scripts/convert-decoder-fp16.py` — the original block-list approach
  (kept in tree but does not produce clean audio for this vocoder)
- `scripts/perceptual-validate-fp16-decoder.py` — phoneme-onset gate; documented to have blind spots (see [[feedback_perceptual_validator_blind_spots]] in memory)
- `scripts/validate-fp16-decoder.mjs` — mechanical smoke-test (graph integrity, magnitude sanity)
- `src/models/assetVersions.ts` — `MODELS_RELEASE`

## Diagnostic infrastructure that helped

Permanent additions from this session that can be reused for future audio investigations:

- **FFT analysis scripts** in `/tmp/`: `find-buzz-event.py`, `buzz-in-speech.py`, `spectral-envelope.py`, `make-band-isolates.py`, `compare-spectra.py`, `detect-onset-tone.py`
- **`?nopost=true`** URL flag (audioCache.ts) — skip postProcessAudio at cache-write time to isolate the source of audible artifacts
- **`?sample=true`** URL flag (tts-gpu-worker.js + ttsEngine.ts) — flip LM from greedy to sampling at runtime
- **`?padShape=N`** URL flag (tts-gpu-worker.js + ttsEngine.ts) — pad decoder input to a multiple of N for shape-experiments (yielded the 4-10× decoder speedup)
- **memdiag trail + analyzer** (PR #321/#323/#325/#326) — generic stage-event capture for any future timing/lifecycle investigation
- **OPFS audio dump via dev-log POST** (used in this session) — write each cache file's bytes as hex chunks to `/__log`, reconstruct as WAV in shell. Reusable any time you need to grab live-synth audio out of a running browser.
