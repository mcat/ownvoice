# Known issue: bzzt at speech onset (Chatterbox conditional_decoder)

## Symptom

A brief modulated tonal artifact ("bzzt") at the beginning of every GPU-synthesized utterance, at the same position every time. Roughly 60-100 ms duration, peaking in the 2-4 kHz band with harmonics audible up to ~11 kHz.

## Diagnosis

Verified to be in the **conditional_decoder model output**, not the wrapper code:

| Hypothesis tested | Method | Result |
|---|---|---|
| Padding (`?padShape=32`) introduces it | A/B with `?memdiag=true` only | Buzz present in both |
| Post-processing pipeline introduces it | `?nopost=true` (cache version v23 captures raw worker output) | Buzz present in raw audio |
| LM sampling vs greedy decoding | `?sample=true` flips USE_GREEDY | Identical buzz, both modes |
| Vocoder cold-start (absorb in silence prefix) | `?prefixSilence=N` prepends silence tokens | Buzz persists AND speech becomes unintelligible (model has positional prior on prompt position) |

The buzz tracks the **prompt → speech token transition** inside `conditional_decoder`. We cannot move that boundary without breaking the model's speaker conditioning.

## Mitigation status

**None ship as default.** Every JS-side mitigation either failed to address the buzz or introduced worse trade-offs.

Earlier "fixes" in the post-processing pipeline (commits 69a0c3e, 791ee27) addressed genuine bugs (500 Hz step-modulation from the noise gate; speech-as-noise-reference in spectral denoise) but did NOT eliminate the buzz. The previous buggy denoise was masking the buzz by over-attenuating high-frequency speech content; correcting the denoiser inadvertently made the buzz more audible while making speech objectively cleaner.

## Recommended response

1. Document the buzz as a known Chatterbox Multilingual limitation.
2. File an upstream issue with the Chatterbox maintainers (https://github.com/resemble-ai/chatterbox).
3. Wait for an upstream fix or evaluate alternative vocoders.
4. Keep the diagnostic flags (`?nopost=true`, `?sample=true`, `?padShape=N`) shipped — they cost nothing and are useful for the next investigation.

## Evidence files

- `docs/bimodal-data/chrome-padded-trail-2026-05-17.jsonl` — 133 synths post-padding
- `docs/bimodal-data/trail-2026-05-17.jsonl` — Safari baseline
- Audio sample for upstream reproduction: `/tmp/v23-raw.wav` (raw worker output with `?nopost=true&padShape=32`)
- FFT analysis: `/tmp/find-buzz-event.py`, `/tmp/buzz-in-speech.py`, `/tmp/spectral-envelope.py`

## What we shipped despite the buzz

- **`?padShape=32`** — decoder runs 4-10× faster (1.5-1.9s vs 6-20s bimodal range). Behind URL flag.
- **Noise gate gain smoothing** — eliminated a real 500 Hz step-modulation artifact.
- **Spectral denoise noise-profile fix** — quietest-frame estimation instead of first-20ms-which-is-actually-speech.
- **`isMemDiagEnabled` URL fallback** — survives Vite HMR clearing the global flag.
- **`?nopost=true`, `?sample=true`** diagnostic flags for future investigation.
- **4-probe diagnostic infrastructure** (PR #321, #323, #325, #326) — permanent memdiag trail + analyzer + per-op profiler.
