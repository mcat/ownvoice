# RESOLVED: bzzt at speech onset (fp16 decoder conversion)

## Resolution

**Root cause: the fp16 `conditional_decoder` shipped in #287/#317/#318 introduced an audible artifact at speech onset.** The conversion script (`scripts/convert-decoder-fp16.py`) reduced precision in a way that produces a modulated 2-4 kHz "bzzt" with harmonics up through ~11 kHz at the start of every synthesized utterance.

**Resolved by**: rolling `MODELS_RELEASE` back to `"2026-04-29"` (fp32 decoder, 540 MB).

## How the bug shipped

PR #318's description claimed `"fp32 and fp16 sound indistinguishable"` based on a single rainbow-sentence A/B test ("The rainbow appears..."). That test is a held-vowel reading with smooth onsets — the bzzt is at speech ONSET, so a vowel-held sentence didn't surface it. The mechanical validation script `scripts/validate-fp16-decoder.mjs` checks for non-NaN, non-Inf, audio-typical magnitude, non-constant, and sample-count match — none of which catch perceptual onset artifacts.

## Diagnostic chain

This took a long session to land. The diagnostic chain (preserved for the next person debugging audio):

| Hypothesis | Method | Result |
|---|---|---|
| Padding (`?padShape=32`) caused it | A/B with `?memdiag=true` only | Buzz present in both |
| Post-processing pipeline caused it | `?nopost=true` to bypass | Buzz present in raw worker output |
| LM sampling vs greedy | `?sample=true` | Identical buzz |
| Vocoder "cold start" in first frames | `?prefixSilence=N` to absorb | Buzz persists, AND speech becomes unintelligible (model has positional prior on prompt) |
| Gate gain stepping (500 Hz mod) | Fixed gate to interpolate gain | Reduced buzz 3× but didn't eliminate. Reverted (production listeners actually like the buggy gate's incidental HF roll-off) |
| Denoise using speech as noise reference | Fixed denoise to use quietest frames | Made buzz LOUDER (uncovered the model artifact the buggy denoise had been masking). Reverted |
| **fp16 decoder conversion** | Symlink fp32 bytes into 2026-05-17 path | **Buzz gone** ✓ |

## Path forward for fp16

The fp16 conversion is a real memory win (-272 MB of retained heap). To re-attempt:

1. Improve `scripts/convert-decoder-fp16.py` to preserve fp32 precision in layers responsible for the onset transient. Likely candidates: any layer near input embedding, attention layers in the first block, the first ConvTranspose.
2. Replace the rainbow-sentence A/B with a phoneme-coverage suite: include words starting with /p/, /t/, /k/, /b/, /d/, /g/, /s/, /sh/, /a/, /i/, /u/, /m/, /n/, /r/, /l/, /w/. The bzzt may be more audible on plosive/sibilant onsets than on smooth vowel starts.
3. Run side-by-side WAV comparisons with FFT on the first 200 ms of audio across many phrases — if any phoneme shows 2-4 kHz energy above the fp32 baseline, the conversion is still lossy.

## Files

- `scripts/convert-decoder-fp16.py` — conversion script (PR #317)
- `scripts/validate-fp16-decoder.mjs` — mechanical smoke-test (PR #317) — needs perceptual-quality test added
- `src/models/assetVersions.ts` — `MODELS_RELEASE` (currently reverted to `2026-04-29`)

## Diagnostic infrastructure that helped

Permanent additions from this session that can be reused for future audio investigations:

- **FFT analysis scripts** in `/tmp/`: `find-buzz-event.py`, `buzz-in-speech.py`, `spectral-envelope.py`, `make-band-isolates.py`
- **`?nopost=true`** URL flag (audioCache.ts) — skip postProcessAudio at cache-write time to isolate the source of audible artifacts
- **`?sample=true`** URL flag (tts-gpu-worker.js + ttsEngine.ts) — flip LM from greedy to sampling at runtime
- **`?padShape=N`** URL flag (tts-gpu-worker.js + ttsEngine.ts) — pad decoder input to a multiple of N for shape-experiments (yielded the 4-10× decoder speedup)
- **memdiag trail + analyzer** (PR #321/#323/#325/#326) — generic stage-event capture for any future timing/lifecycle investigation
