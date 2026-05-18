# [DRAFT] Chatterbox Multilingual — modulated tonal artifact at speech onset

Posting target: https://github.com/resemble-ai/chatterbox/issues/new

---

## Title

Modulated tonal artifact at speech onset in `conditional_decoder` output (2-4 kHz, harmonics audible to 11 kHz)

## Body

### Summary

The Chatterbox Multilingual `conditional_decoder` produces a brief modulated tonal artifact ("bzzt") at the beginning of every utterance, in approximately the same time-position regardless of input phrase. We've been chasing this in a WebGPU ONNX deployment and have ruled out every wrapper-side cause we could think of — it appears to be in the model itself.

### Environment

- Model: `chatterbox-multilingual` (the v0.x.y release with the `conditional_decoder.onnx` file at ~268 MB)
- Runtime: ONNX Runtime Web 1.25.1 (WebGPU EP, fallback WASM)
- Browsers tested: Chrome 140 on macOS, Safari 26 on macOS — same artifact in both
- Sample rate: 24 kHz int16 PCM

### What we hear

A "bzzt" sound at the very start of every synthesized utterance. Time-position is consistent (always ~17-18% into the audio when prompt+speech+silence tokens are decoded together). Duration ~60-100 ms. Modulated character (not a pure tone).

### What we measure

FFT analysis of raw decoder output:

- Spectral peak at **2706 Hz** during the buzz window
- Harmonics audible up through 11 kHz (decreasing energy)
- Position within the file is **consistent across phrases** (different text, same artifact location)

### What we ruled out

| Hypothesis | Test | Result |
|---|---|---|
| Wrapper pre-processing of input | Skip our padding/preprocessing | Buzz present |
| Wrapper post-processing of output | Cache raw worker output directly | Buzz present |
| LM token choice | Greedy (argmax) vs sampling (rep_penalty + temp + top-k + top-p) | Identical buzz |
| Vocoder cold-start in first frames | Prepend N silence tokens before prompt | Buzz persists; speech also garbles (silence-before-prompt breaks speaker conditioning) |
| Specific prompt token causing artifact | Same speakerData across phrases produces same artifact at proportionally similar position | Consistent — points to the prompt → speech transition |

The buzz tracks the **prompt → speech token transition** inside the decoder. Our hypothesis is that the model has a discontinuity at the boundary where it transitions from rendering the reference prompt audio to generating new speech tokens, and this discontinuity manifests as a brief tonal burst.

### Reproduction

Audio file attached: `chatterbox-onset-bzzt.wav` (1.33 s, raw decoder output before any post-processing).

The bzzt is audible at 0.220-0.280 s. Bandpass-filtering to 2000-4000 Hz isolates it cleanly.

Decoder input pattern that triggers it:

```
speech_tokens = [...promptTokens(250), ...speechTokens(N), SILENCE_TOKEN, SILENCE_TOKEN, SILENCE_TOKEN]
```

Where `promptTokens` is the standard Chatterbox 250-token speaker reference and `speechTokens` is the LM output.

### Diagnostic context

This isn't blocking our shipping product, but it does color our voice-clone output noticeably. Happy to provide more samples, FFT plots, or the full diagnostic chain we ran. Our internal writeup is at [link to docs/known-issue-onset-bzzt.md once public].

Thanks for the great work on Chatterbox — Multilingual is a meaningful step up for our use case.
