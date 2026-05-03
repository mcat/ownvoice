# Sample voices

Voice clips used for development and testing.

## `mark-voice.wav` (committed)

Calibration fixture for the voice-quality scoring tests in
`src/models/voiceQuality.test.ts`. The file is a 13-15s read of the
opening of the Rainbow Passage at 48 kHz mono 16-bit. The calibration
test loads it, resamples to 24 kHz, and asserts that a healthy adult
read scores at least 80 overall and ≥ 70 on `pitchVariation`. If a
threshold or weight change in `voiceQuality.ts` breaks this assertion,
the algorithm is wrong, not the test.

## Other files (gitignored)

Other voice samples and the `cloned-fp16-validation/` subdirectory are
local-only artefacts. They stay out of the repo via the
`sample-voices/*` rule with explicit negations only for the fixture
and this README. See `.gitignore`.
