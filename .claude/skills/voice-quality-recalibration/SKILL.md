---
name: voice-quality-recalibration
description: Use in the OwnVoice project (in-patient AAC app) when a change might invalidate the voice-clone enrollment quality score's calibration. Triggers include TTS/speech-encoder swap (changes to ttsWorker.ts, ttsEngine.ts, modelManager.ts, multilingualTokenizer.ts, or the model files in public/models/), recording flow changes (recordingScripts.ts, RECORD_DURATION in VoiceCapture.tsx), edits to the score itself (voiceQuality.ts, pitchTracker.ts, fft.ts), changes to the target user population description in CLAUDE.md, or work tied to GitHub issue #169. Surfaces the recalibration triggers and playbook so the score doesn't silently drift off the thing it claims to measure.
---

# Voice-quality score recalibration check

The OwnVoice voice-clone enrollment quality score (`src/models/voiceQuality.ts`)
is calibrated against specific assumptions about the encoder, the user
population, and the recording flow. When you're working on something that
could break those assumptions, surface the calibration question to the user
*before* they merge — silent drift is the failure mode this skill exists to
prevent.

## When to invoke this skill (per the description)

The skill description above is what the harness matches against. In short:
any work that touches the TTS encoder, the recording script, the score
module itself, the target population, or that's tagged against issues
#167-#170 should pause briefly to consider whether the calibration story
still holds.

## What to do

1. **Identify which trigger fired.** The six recalibration triggers, ordered
   by impact:

   | Trigger | What changes | Bumps `QUALITY_VERSION`? |
   |---|---|---|
   | TTS / speech-encoder swap | All sub-scores potentially; weight bias on `pitchVariation` (currently 0.25) is justified specifically by Chatterbox's frame-level conditioning | Yes, always |
   | Population shift (ICU → other) | F0 curve anchors, dysphonia guard threshold (`0.45`) | Yes |
   | Recording flow / script change | `coverage` curve, `voicedFraction` expected range | Yes |
   | Real-user telemetry drift | Whatever the corpus shows is mis-mapped | Curve changes yes; label-only changes no |
   | Score-vs-perception mismatch | Whichever sub-score the audit identifies | Yes if the mapping moves |
   | Mic hardware shift | Possibly `spectralTilt` center (currently α=−3 dB target); usually the score is correctly catching bad mics | Only if the curve moves |

2. **Surface the question to the user.** Don't silently recalibrate.
   Phrase it concretely:
   > "This change touches [X]. Per the recalibration triggers in the README
   > section 'Voice-quality score: when to recalibrate', we may need to
   > re-evaluate the voice-quality score thresholds. Run the calibration
   > test now? Or defer?"

3. **Run the calibration test on demand:**
   ```bash
   npx vitest run src/models/voiceQuality.test.ts -t "calibration" 2>&1 | tail -15
   ```
   The fixture is `sample-voices/mark-voice.wav` (committed via gitignore
   negation). If the test fails, surface `result.breakdown` so the user
   can see which sub-score is responsible.

4. **If a calibration adjustment is needed, follow the playbook:**
   - Edit the piecewise-linear breakpoints in `src/models/voiceQuality.ts`
     (the relevant `score*` function).
   - Update the spec at
     `docs/superpowers/specs/2026-05-02-voice-quality-score-design.md`
     (the threshold table is canonical).
   - Update the matching synthetic sub-score test in
     `src/models/voiceQuality.test.ts` so the new curve is documented in
     test assertions, not just code.
   - Re-run the full calibration test plus the changed sub-score's tests.
   - **Bump `QUALITY_VERSION`** in `voiceQuality.ts` if the score
     *mapping* (not just label thresholds) changed. Old persisted scores
     keep their old version — no migration runs.
   - Record the recalibration with its date and reason in the spec's
     History section, so the reasoning survives in the repo rather than in
     one machine's local agent memory.

## What NOT to do

- **Don't recalibrate to make a bad clone score well.** The score
  detecting a degraded recording or a bad mic is the score *working*,
  not failing.
- **Don't bump `QUALITY_VERSION` for label-threshold tweaks** (the
  `good`/`ok`/`poor` cutoffs in `labelFor`). Those are presentation-only
  and don't change persisted records.
- **Don't migrate old persisted scores** when bumping
  `QUALITY_VERSION`. The forward-compat policy in the spec is "freeze
  the score at write time, let it age in place." Re-evaluating saved
  clones would create a "your voice quality dropped from 82 to 71"
  notification that's both confusing and not actionable.
- **Don't weaken the calibration test assertions** to make them pass.
  If `mark-voice.wav` no longer scores ≥80, the algorithm is wrong, not
  the test. The plan and spec are explicit about this.

## References inside this project

- Spec: `docs/superpowers/specs/2026-05-02-voice-quality-score-design.md`
- Plan: `docs/superpowers/plans/2026-05-02-voice-quality-score.md`
- README section: "Voice-quality score: when to recalibrate"
- Open follow-up issues: #167 (upload duration cap), #168 (Settings
  clone-health view), #169 (`spectralTilt` corpus calibration), #170
  (`qualityVersion` telemetry)
- The historical recalibration that prompted this skill: PR #171,
  commit `eaeb175` — `voicedFraction` curve moved from
  `0.4/0.6/0.75/0.85` to `0.4/0.55/0.7/0.8` after the calibration
  backstop revealed real reads have ~67% raw voiced fraction (not the
  85%+ the original synthetic-vowel curve assumed).
