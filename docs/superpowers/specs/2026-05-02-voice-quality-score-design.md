# Voice Enrollment Quality Score

## Problem

The voice-enrollment flow has a hard-gate that rejects audio below a floor
(`src/models/enrollmentAudio.ts:64-72` — duration < 1.5s or SNR < 6 dB).
Anything above the floor is accepted unconditionally. This produces two failure
modes that the gate cannot catch and that the app cannot recover from once a
clone is saved:

1. The recording is signal-clean but speech-poor — a flat monotone read, a
   short read that ends early, or a recording made with a thin laptop mic.
   The encoder dutifully embeds the recording's prosody and timbre, the clone
   sounds the way the recording sounds, and the user has no signal that
   they could have done better.
2. The recording is degraded in ways the gate doesn't measure — clipping,
   loudness drift, room boom — and the clone reproduces those artefacts
   verbatim.

Cloning quality cares about signal *fidelity* and speech *expressiveness*, not
just whether the file is well-formed. The hard gate covers neither.

## Goals

1. Show the user, before they commit to a take, an advisory 0-100 score that
   reflects how well their recording will clone.
2. When the score is low, surface a single concrete tip that targets the
   weakest dimension — actionable, not diagnostic.
3. Cover both enrollment paths (record and upload) on the existing
   `processAndCapture` chokepoint with no new branches.
4. Persist the score with the speaker record so future work can build on it
   (clone-health dashboards, re-enrollment prompts) without a schema migration.
5. Never punish the target population. ICU patients with weak phonation
   (post-tracheostomy, post-extubation) must not be told their voice scores
   poorly when the issue is that the algorithm cannot measure their voice.

Non-goals: replacing the hard gate, gating uploads on score, building a
clone-health view in Settings, or running neural quality models in-browser.

## Decisions log

Five answers from the brainstorming session, in order:

| Q | Decision |
|---|---|
| Purpose | Informational badge. The hard gate stays as the floor; the score is advisory. |
| Dimensions | Signal hygiene + expressiveness. Both axes; the latter is what moves clone quality past the gate. |
| Display | Single number + label + one targeted tip when score is low. No breakdown card on the enrollment screen. |
| Persistence | Persisted to IDB alongside `SpeakerData`, with a `qualityVersion` tag. |
| Upload-flow UX | Score on saved-state for both flows; preview-time score only for recordings. Uploads do not get a new preview step. |

These foreclose other options. The score must be computable from raw audio
alone (no encoder run); the score lives on the preview screen *before* the
user accepts; the badge appears on the saved-state card for both flows.

## Architecture

The score is computed by a new module `src/models/voiceQuality.ts`, which
exports a single synchronous entry point:

```ts
function scoreVoiceSample(rawAudio: Float32Array, sampleRate: number): VoiceQualityResult;
```

Pitch tracking (one of the inputs) lives in a separate module
`src/models/pitchTracker.ts` so it can be tested in isolation against
synthetic sine waves. A small `QualityBadge` component
(`src/components/shared/QualityBadge.tsx`) renders the same shape on both
the recording-preview screen and the saved-state card.

Files added:

- `src/models/voiceQuality.ts` — entry point, sub-score logic, aggregation
- `src/models/voiceQuality.test.ts` — unit tests + calibration backstop
- `src/models/pitchTracker.ts` — autocorrelation F0 estimator
- `src/models/pitchTracker.test.ts` — unit tests against synthetic input
- `src/components/shared/QualityBadge.tsx` — presentational badge
- `src/components/shared/QualityBadge.test.tsx` — render tests
- `sample-voices/mark-voice.wav` — calibration fixture (negate the
  directory's `.gitignore` entry for this single file only)
- `sample-voices/README.md` — documents the fixture

Files modified:

- `src/types.ts` — add `VoiceQualityResult`; add optional `quality` to
  `SpeakerData`
- `src/components/shared/VoiceCapture.tsx` — call `scoreVoiceSample` from
  preview-render `useEffect` and from `processAndCapture`; thread `quality`
  through `onCapture`
- `src/stores/settingsStore.ts` — extend the hydration pass with a
  `isValidQualityResult` guard
- `src/data/locales/en.ts` — twelve new phrase keys for labels and tips
- `.gitignore` — negate `sample-voices/mark-voice.wav`

## Data model

```ts
export interface VoiceQualityResult {
  /** Overall 0-100 weighted score. */
  score: number;
  /** Per-dimension 0-100 sub-scores. `pitchVariation` is null when the
   *  pitch tracker's confidence is too low to report a meaningful value;
   *  the aggregate ignores that dimension and renormalises remaining weights. */
  breakdown: {
    snr: number;
    clipping: number;
    coverage: number;
    voicedFraction: number;
    pitchVariation: number | null;
    loudnessConsistency: number;
    spectralTilt: number;
  };
  /** Direction of spectral-tilt deviation, used by the tip selector. */
  spectralTiltDirection: "boomy" | "tinny" | "neutral";
  /** Bumped when the algorithm or weights change. */
  qualityVersion: number;
}

export interface SpeakerData {
  // ...existing fields...
  quality?: VoiceQualityResult; // optional: legacy speakers do not have it
}
```

The score's coarse label (`good | ok | poor`) is computed at render time by
`labelFor(score)` and is *not* stored. Threshold tuning is a presentation-only
change and does not bump `qualityVersion`. The same reasoning applies to the
tip string.

`qualityVersion` starts at `1`. Bumped when any sub-score's mapping changes,
when weights change, or when sub-scores are added or removed. The persisted
value is what was current at write time; old records keep their old version
(forward-compat only — no migration, no rescoring).

## Scoring algorithm

All seven sub-scores run on the raw decoded audio at 24 kHz, *not* on the
output of `preprocessEnrollment`. Pre-processing (high-pass, peak normalise,
silence trim) is designed to clean the signal for the encoder; running the
score against the cleaned signal would mask exactly the artefacts the score
is meant to surface.

| Sub-score | Mapping (raw → 0-100) | Source |
|---|---|---|
| `snr` | 6 dB→0, 15 dB→50, 25 dB→90, 35 dB→100 | LibriTTS 32 dB filter (Zen 2019); Hi-Fi TTS (Bakhturina 2021); x-vector vs ECAPA degradation curves (Loweimi 2024) |
| `clipping` | 0%→100, 0.05%→80, 0.5%→30, ≥2%→0 | ElevenLabs PVC −3 dBTP guidance; cloning replicates distortion verbatim |
| `coverage` | <2 s→0, 2-6 s→0-60 linear, 6-12 s→60-95, ≥12 s→100 | ECAPA short-duration plateau (Loweimi 2024; ERes2NetV2) |
| `voicedFraction` | 40%→0, 60%→40, 75%→80, ≥85%→100 | Heuristic — literature silent at this granularity |
| `pitchVariation` | 1 ST→0, 2 ST→40, 2.5 ST→70, 3.5 ST→90, ≥4.5 ST→100 | Neutral read speech ~2.7 ST (women) / ~3.4 ST (men) — Traunmüller & Eriksson; eksss; ASHA |
| `loudnessConsistency` | CV<0.25→100, 0.5→70, 1.0→30, ≥1.5→0 | RMS coefficient of variation; LRA disqualified for <1 min clips per EBU TECH 3342 |
| `spectralTilt` | Bell-shaped around α = −3 dB (see below) | LEWITT proximity-effect docs; broadcast mic norms |

`spectralTilt` is computed as the high-band/low-band log-energy ratio on the
long-term average spectrum across voiced frames:

```
lowEnergy  = sum |X[k]|^2  for k in   80-1000 Hz
highEnergy = sum |X[k]|^2  for k in 1000-5000 Hz
alphaDb = 10 * log10(highEnergy / lowEnergy)
delta = alphaDb - (-3)        // target tilt: -3 dB

|delta| ≤  3 dB → 100
|delta| =  7 dB →  70
|delta| = 12 dB →  30
|delta| ≥ 18 dB →   0
```

`spectralTiltDirection` is `"boomy"` when `delta < -5`, `"tinny"` when
`delta > +5`, `"neutral"` otherwise. The tip selector reads this field
directly to choose between the boomy and tinny tip strings.

### Aggregation

```
score = 0.20 * snr
      + 0.20 * clipping
      + 0.25 * pitchVariation
      + 0.15 * voicedFraction
      + 0.10 * loudnessConsistency
      + 0.05 * coverage
      + 0.05 * spectralTilt
```

Weights bias toward dimensions that move clone quality. Pitch variation
takes the highest weight because Chatterbox conditions on frame-level
features (`cond_emb`, `prompt_token`) — prosody preservation feeds the LM
directly, not just the pooled x-vector. SNR's floor is already protected by
the hard gate, so its weight is dialled below clipping's. Coverage shares
the lowest weight with `spectralTilt` because it correlates strongly with
`voicedFraction` in practice — both penalise short reads.

Aggregation handles `null` sub-scores generically:

```ts
function aggregate(breakdown: Breakdown): number {
  const active = entriesOf(breakdown).filter(([, v]) => v !== null);
  const totalWeight = active.reduce((s, [k]) => s + DEFAULT_WEIGHTS[k], 0);
  const weighted = active.reduce((s, [k, v]) => s + DEFAULT_WEIGHTS[k] * v, 0);
  return weighted / totalWeight;
}
```

Any sub-score may be `null` (unmeasurable for this take); aggregation
redistributes that sub-score's weight proportionally across the remaining
dimensions. The dysphonia guard (next section) is one consumer of this
mechanism, not a special case.

### Dysphonia guard

The biggest design correction during research came from understanding the
target population. ICU patients post-tracheostomy or post-extubation
present with breathy phonation, weak voicing, and noisy F0 (PMC4874525,
GRBAS-scored cohorts). On dysphonic voice, autocorrelation pitch tracking
fails non-randomly: fewer voiced frames are detected and the F0 estimates
that *are* produced are noisy. The pitch tracker reads "monotone" not
because the patient is monotone but because it cannot find a periodic
signal.

Without a guard, `pitchVariation` would systematically punish the exact
population the app exists to serve.

The guard:

```ts
const medianVoicingConfidence = median(peakHeights[voicedMask]);
const f0Suppressed = medianVoicingConfidence < 0.45;

if (f0Suppressed) {
  breakdown.pitchVariation = null;
}
// aggregation handles the redistribution automatically.
```

`peakHeights` is the per-frame normalised autocorrelation peak height that
the pitch tracker already computes to decide voiced vs unvoiced. The 0.45
threshold is itself a heuristic; the implementation must include a synthetic
test that verifies the guard fires on amplitude-modulated noise bursts
(simulating dysphonic phonation) and does *not* fire on clean periodic
speech.

When the guard fires, the persisted record carries `pitchVariation: null`
verbatim. The badge component renders "—" for that dimension; the tip
selector excludes it from the lowest-sub-score search. Future readers of
the record can distinguish "we measured pitch variation and it was bad"
(`0`) from "we couldn't measure pitch variation reliably" (`null`).

### Pitch tracker design

Lives in `src/models/pitchTracker.ts`:

- 30 ms windows, 10 ms hop, on the raw audio downsampled to 8 kHz
  (autocorrelation only needs to resolve down to ~70 Hz for adult-male F0;
  8 kHz is sufficient and ~3× cheaper than 24 kHz)
- 70-500 Hz bandpass before autocorrelation to suppress harmonics and DC
- Voiced-frame gate: peak autocorrelation value above 0.3 of the zero-lag
  value (standard YIN/autocorr threshold)
- Returns: `{ f0Hz: Float32Array, voiced: Uint8Array, peakHeights: Float32Array }`
  per frame
- Approximately 80 lines; testable against `Math.sin(2π·f·t)` synthetic
  inputs at known frequencies

`spectralTilt` reuses the pitch tracker's voiced mask so the LTAS averaging
runs over voiced frames only. The FFT for `spectralTilt` runs at the full
24 kHz sample rate — high-frequency content is precisely what the tilt
metric needs, and the 8 kHz downsampled signal would discard it.

### Label thresholds

```
score >= 80 → "good"
score >= 50 → "ok"
otherwise   → "poor"
```

Pure function, called at render time, not persisted.

### Tip selection

Pure function `tipFor(breakdown, spectralTiltDirection): PhraseKey | null`,
called at render time. Returns `null` when `score >= 80`. Otherwise picks
the lowest sub-score and maps to the corresponding tip key:

| Lowest sub-score | Tip key |
|---|---|
| `snr` | `ui.voice_quality.tip.snr` |
| `clipping` | `ui.voice_quality.tip.clipping` |
| `coverage` | `ui.voice_quality.tip.coverage` |
| `voicedFraction` | `ui.voice_quality.tip.voiced_fraction` |
| `pitchVariation` | `ui.voice_quality.tip.pitch_variation` |
| `loudnessConsistency` | `ui.voice_quality.tip.loudness` |
| `spectralTilt`, direction `boomy` | `ui.voice_quality.tip.tilt_boomy` |
| `spectralTilt`, direction `tinny` | `ui.voice_quality.tip.tilt_tinny` |

`null` sub-scores are skipped during the lowest-search; if the dysphonia
guard fired, the tip will not propose "read more naturally."

Tip strings live in `src/data/locales/en.ts` (English authoritative source
under the existing per-locale loading pattern). Other locales fall back to
English until translated, matching the rest of the app.

## Component integration

### Single chokepoint

Both flows already converge at
`VoiceCapture.processAndCapture(blob)` (`src/components/shared/VoiceCapture.tsx:445-489`).
Scoring slots in alongside the existing two steps:

```ts
async function processAndCapture(blob: Blob) {
  setCloneStatus("extracting");
  setError(null);
  try {
    const rawAudio = await decodeAudio(blob);
    const prep = preprocessEnrollment(rawAudio, 24000);
    if (!prep.acceptable) { /* existing reject path */ return; }

    const quality = scoreVoiceSample(rawAudio, 24000);

    const embedding = await extractEmbedding(rawAudio);
    setSavedBlob(blob);

    if (embedding) {
      setCloneStatus("ready");
      onCapture(blob, embedding, quality);
    } else {
      setCloneStatus("model-loading");
      onCapture(blob, undefined, quality);
    }
  } catch (err) { /* existing catch */ }
}
```

`scoreVoiceSample` is synchronous, runs on the raw `Float32Array`, and
completes in well under 100 ms — invisible against the encoder's load and
infer time. It runs *after* the hard gate, so audio that will be rejected
is never scored.

### Recording preview

The recording flow has a preview screen (playback + accept/discard). The
score must be visible there, *before* the user accepts. The preview
component runs an effect that decodes and scores in the background:

```ts
useEffect(() => {
  if (!previewBlob) { setPreviewQuality(null); return; }
  let cancelled = false;
  (async () => {
    const audio = await decodeAudio(previewBlob);
    const result = scoreVoiceSample(audio, 24000);
    if (!cancelled) setPreviewQuality(result);
  })();
  return () => { cancelled = true; };
}, [previewBlob]);
```

When the user accepts, `processAndCapture` re-decodes and re-scores. The
double work is intentional: every persisted score is the output of running
the current algorithm against the persisted audio. Caching the preview
result and skipping the second score would create a class of edge cases
where preview and persisted disagree (e.g., after a `qualityVersion` bump
between preview and accept). The combined cost is two `decodeAudioData`
calls and two `scoreVoiceSample` calls — well under 200 ms total.

### Upload flow

Uploads bypass the preview screen by design (Q5). Score is computed inside
`processAndCapture` and shown only on the saved-state card. If the score
is poor, the clinician uses the existing `Remove → re-upload` path
(two clicks). No new UI state.

### Saved-state card

Both flows surface the same `QualityBadge` on the saved-state card,
alongside the existing "Voice clone active" indicator. The card uses the
component's `compact` variant — score + label, no tip line, to respect
the card's existing visual density. The full tip is only shown on the
recording preview screen.

`QualityBadge` reads `speakerData.quality` from `settingsStore` directly.
The store is the single source of truth; there is no separate local state
for the saved-state badge. The preview-screen badge is the only place that
holds quality in component-local state, because the value is computed
before any store write. Once the user accepts and `onCapture` propagates
to the store, every consumer renders from the same source.

### Persistence

`SpeakerData` already round-trips through `idbStorage.ts` as JSON. The new
`quality` field is composed of primitives (numbers, strings, nullables) and
needs no special handling beyond the type addition. Legacy speakers without
a `quality` field render no badge; the component returns `null` when
`quality` is `undefined`.

Hydration adds an `isValidQualityResult` guard. Records that fail the
guard drop only the `quality` field; the rest of `SpeakerData` (embeddings,
features, prompt tokens) survives intact.

### Phrase registry entries

Twelve new keys in `src/data/locales/en.ts`:

```
ui.voice_quality.title                "Voice quality"
ui.voice_quality.label.good           "Good"
ui.voice_quality.label.ok             "OK"
ui.voice_quality.label.poor           "Needs improvement"
ui.voice_quality.tip.snr              "Try recording in a quieter spot."
ui.voice_quality.tip.clipping         "Move a bit further from the microphone."
ui.voice_quality.tip.coverage         "Try reading for a bit longer."
ui.voice_quality.tip.voiced_fraction  "Try to keep talking for the full recording."
ui.voice_quality.tip.pitch_variation  "Try reading more naturally — let your voice rise and fall."
ui.voice_quality.tip.loudness         "Try to keep your volume steady."
ui.voice_quality.tip.tilt_boomy       "Try moving slightly further from the microphone."
ui.voice_quality.tip.tilt_tinny       "This mic sounds thin — if you have another, try it."
```

### Visual treatment

`QualityBadge` uses a single-hue intensity ramp on the project's primary
indigo, per the accessibility convention in `CLAUDE.md` ("Pain scale
colors: Single-hue intensity ramp (indigo), not red-green, for
colorblindness safety."). `good` is the full-saturation primary; `ok` is
the mid-saturation variant; `poor` is the muted variant. The badge is
informational, not alarming — no red, no warning glyph.

Atkinson Hyperlegible at 18 px minimum for any patient-facing text in the
badge, matching the existing standard.

## Error handling and edge cases

| # | Condition | Handling |
|---|---|---|
| 1 | Decode failure (corrupt upload) | Existing `processAndCapture` catch path runs; `scoreVoiceSample` is never called. No new failure mode. |
| 2 | Multi-channel upload (stereo) | Implementation must verify and, if needed, downmix to mono before scoring. The existing `decodeAudio` may already do this; the implementation plan must include an audit step. |
| 3 | Sample rate ≠ 24 kHz on upload | `decodeAudio` already creates `AudioContext({ sampleRate: 24000 })`; the WebAudio API resamples for free. No new code. |
| 4 | All-silent audio | Rejected by the existing hard gate (`durationSec < 1.5s` after trim). Scoring never runs. |
| 5 | Audio with zero voiced frames | Pitch tracker returns an empty voiced mask. `medianVoicingConfidence` is undefined; the dysphonia guard fires; `pitchVariation = null`. Aggregation handles redistribution automatically. |
| 6 | All-clipped audio | The hard gate does not catch this — clipping does not change the 10/90 RMS ratio meaningfully. `clipping` sub-score returns near 0; the aggregate score is low; the tip steers the user to retake. This is the failure mode the score exists for. |
| 7 | `qualityVersion` mismatch on read | Forward-compat only. Badge renders score + label normally. The tip selector returns `null` because the lowest-sub-score lookup may reference a sub-score that no longer exists in the current schema. |
| 8 | Corrupted `quality` shape in IDB | Hydration guard `isValidQualityResult` drops just the field. Rest of `SpeakerData` survives. |
| 9 | Rapid re-capture during preview scoring | Preview `useEffect` `cancelled` flag (above) guards against stale `setPreviewQuality` from an aborted decode. |
| 10 | NaN / Infinity in any sub-score | Each sub-score function clamps before mapping. F0 stdev with <2 voiced frames returns `null`. Defensive backstop in `aggregate`: any non-finite value coerces to `0`. |
| 11 | Memory on long uploads | Out of scope. Tracked in #167. |

### Hydration guard

The validator lives alongside the type in `voiceQuality.ts` (so the
schema and its runtime check stay co-located) and is imported into
`settingsStore.ts` for use in the Zustand `onRehydrateStorage` pass:

```ts
function isValidQualityResult(x: unknown): x is VoiceQualityResult {
  if (!x || typeof x !== "object") return false;
  const q = x as Partial<VoiceQualityResult>;
  if (typeof q.score !== "number" || !Number.isFinite(q.score)) return false;
  if (typeof q.qualityVersion !== "number") return false;
  if (!q.breakdown || typeof q.breakdown !== "object") return false;
  const b = q.breakdown;
  const numericKeys = ["snr", "clipping", "coverage", "voicedFraction",
                       "loudnessConsistency", "spectralTilt"] as const;
  for (const k of numericKeys) {
    if (typeof b[k] !== "number" || !Number.isFinite(b[k])) return false;
  }
  if (b.pitchVariation !== null && typeof b.pitchVariation !== "number") return false;
  if (!["boomy", "tinny", "neutral"].includes(q.spectralTiltDirection as string)) return false;
  return true;
}
```

Hand-rolled rather than zod — consistent with the existing
`idbStorage.ts` and `settingsStore.ts`, which do their own JSON
round-trips without runtime-types dependencies. Adding zod for one
validator would import a new dependency for a single use site.

### Quality version policy

`QUALITY_VERSION` is bumped when:

- A sub-score's raw → 0-100 mapping changes (different SNR breakpoints,
  different F0 anchors).
- Aggregation weights change.
- A sub-score is added or removed.

Not bumped when:

- Label thresholds change (presentation only).
- Tip strings change (i18n).
- Tip-selector logic changes (presentation only).

On read, the badge does not rescore; it displays whatever was persisted.
No re-evaluation banner. Clinical UI clutter is the bigger risk than label
drift.

## Testing strategy

| Area | File | What it covers |
|---|---|---|
| Pitch tracker correctness | `pitchTracker.test.ts` | Sine-wave inputs at known F0; voicing-confidence threshold; edge cases (silence, zero-length, sub-window-length) |
| Sub-score monotonicity | `voiceQuality.test.ts` | Each of seven dimensions: synthetic input variation → score moves in the expected direction |
| Aggregation | `voiceQuality.test.ts` | Weighted sum matches expected; null sub-score redistributes correctly; multiple nulls compose |
| Dysphonia guard | `voiceQuality.test.ts` | Synthesised weak-periodicity input fires the guard; clean periodic input does not |
| Spectral tilt direction | `voiceQuality.test.ts` | Low-pass-filtered synthetic → `boomy`; high-pass-filtered → `tinny`; flat → `neutral` |
| Calibration backstop | `voiceQuality.test.ts` | `sample-voices/mark-voice.wav` (committed via gitignore-negation) → `score ≥ 80`, `pitchVariation ≥ 70`, dysphonia guard does not fire |
| Badge rendering | `QualityBadge.test.tsx` | Score + label + tip for good/ok/poor; renders "—" for `null` `pitchVariation`; compact mode hides tip; tip routes to correct phrase key, including spectral-tilt direction |
| Preview-time scoring | extends `VoiceCapture.test.tsx` | Recording preview shows badge after blob arrives; rapid retake cancels stale scoring; "Use this take" propagates `quality` through `onCapture` |
| Upload flow | extends `VoiceCapture.test.tsx` | Upload calls `processAndCapture`, `quality` is included in the `onCapture` payload, saved-state card shows the compact badge |
| Persistence round-trip | extends `settingsStore.test.ts` | Save speaker with `quality` → reload from IDB → `quality` reads back identical; corrupted `quality` shape → field dropped, rest of `SpeakerData` intact |
| Hydration guard | `settingsStore.test.ts` | Each malformed shape (missing field, wrong type, NaN, bad direction) is rejected; valid records survive |

The calibration backstop is a hard test, not a `skipIf`. The fixture
`sample-voices/mark-voice.wav` is committed via a gitignore negation so CI
runs the same calibration the author runs locally. If a healthy adult
reading the Rainbow Passage scores below 80 on the chosen thresholds, the
algorithm is wrong, not the test.

## Out of scope

Tracked as separate GitHub issues; the implementation plan does not depend
on any of them:

- **#167** — Voice clone: cap upload duration at ~30 s
- **#168** — Voice quality: surface persisted quality in Settings
  (clone-health view, Q1 option D from the brainstorm)
- **#169** — Voice quality: calibrate `spectralTilt` thresholds against a
  real-user corpus
- **#170** — Voice quality: log `qualityVersion` to detect score-rev
  adoption (depends on an analytics layer that does not yet exist)

## References

Cited during the threshold review:

- LibriTTS (Zen et al. 2019), arXiv:1904.02882
- Hi-Fi TTS (Bakhturina et al., Interspeech 2021)
- x-vector vs ECAPA-TDNN comparative degradation (Loweimi et al.,
  Interspeech 2024)
- ECAPA-TDNN ZS-TTS exploration, arXiv:2506.20190
- ERes2NetV2 short-duration speaker verification, arXiv:2406.02167
- Snyder et al. x-vector (ICASSP 2018)
- F0 distribution in American spontaneous speech (eksss)
- Traunmüller & Eriksson, "Frequency range of voice fundamental"
- ASHA child F0 norms (Boucher et al., AJSLP 2014)
- EBU TECH 3342 (LRA reliability for clips < 1 min)
- EBU R 128 (loudness normalisation)
- DNSMOS / DNSMOS Pro / NISQA / NISQA-s / UTMOS — all evaluated and rejected
  as too heavy for in-browser sub-100 ms scoring on iPad Safari
- ElevenLabs PVC documentation (peak ≤ −3 dBTP, RMS −23 to −18 dB)
- Coqui XTTS technical notes (3-10 s reference; clean from artefacts)
- Tracheostomy / dysphonia phonation (PMC4874525)
- LEWITT proximity-effect documentation
