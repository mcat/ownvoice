# OwnVoice

In-patient AAC (Augmentative and Alternative Communication) web application with on-device voice cloning.

## Overview

OwnVoice gives hospitalized patients who cannot speak the ability to communicate with their care team and family using their own voice. It runs entirely on-device as a Progressive Web App — no data ever leaves the tablet.

### Key Features

- **Voice Cloning** — Recreates the patient's actual voice from a 3–10 second audio sample
- **Pre-Generated Audio** — Instant playback for common phrases (<50ms)
- **Pain Assessment** — Emoji-FPS validated pain scale (Li et al., JMIR 2023)
- **My Wishes** — Goals-of-care conversations powered by the Serious Illness Conversation Guide (Ariadne Labs)
- **Listen** — On-device speech-to-text captures what providers say to the patient
- **Progressive Sentence Builder** — Context-aware phrase completion powered by on-device LLM
- **Multi-Provider** — Multiple care team members with individual voice profiles and emoji

### Target Device

iPad Pro (M5) and iPad (A16) running iPadOS 26+ with Safari 26 (WebGPU via Metal).

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Performance benchmarking (`?bench=true`)

Append `?bench=true` to any URL (e.g. `http://localhost:3000/app/?bench=true`) to enable per-call TTS timing logs. Used to compare WASM vs WebGPU performance on real devices, particularly for iPad QA.

Two grep'able log lines appear in the browser console:

```
[OwnVoice:Bench] embed: ep=wasm load_ms=8421 infer_ms=12340 audio_s=6.00
[OwnVoice:Bench] synth: ep=webgpu tokens=27 lm_total_ms=540 lm_median_ms=18 lm_p95_ms=35 decode_ms=312 total_ms=890 audio_s=1.10 rtf=0.81
```

- `embed` — speech-encoder load + inference (one-shot, fires on actual enrollment, not the silent-buffer warmup).
- `synth` — per-phrase autoregressive LM + conditional-decoder timings; `rtf < 1` is faster than real-time.

Both lines are space-key-value formatted for easy spreadsheet import. Bench mode is purely additive — the flag is parsed once at boot and the worker-side timing collection is gated behind a `bench` flag in the init message; zero overhead in normal sessions.

## Enrollment denoise (DeepFilterNet3, always on)

Every voice-clone enrollment — both microphone recording and uploaded audio file — is passed through a DeepFilterNet3 pre-filter before the speech encoder sees it. The denoiser is a 12 MB on-device ONNX model (combined-graph re-trace of upstream DF3, hosted at [mcat/ownvoice-denoiser](https://github.com/mcat/ownvoice-denoiser)) targeted at recovering identity cues from hospital-room ambient noise.

The denoiser worker is lazy-loaded on first enrollment, then memoised for the page lifetime. The model ships through the standard manifest + offlinePrimer + OPFS pathway, so once a clinician has run "Prepare for offline" the per-enrollment cost is just worker construction and ~600 frame inferences (RTF ~0.5 on desktop, ~1–2 on iPad — sub-second to a few seconds depending on recording length). Run `npm run assets:download` to populate the local model copy under `public/models/<MODELS_RELEASE>/denoiser/`.

Quality scores produced after this PR are tagged `qualityVersion: 3` to signal that the underlying audio distribution has shifted. Sub-score formulas and weights are unchanged from v2; thresholds remain v2-calibrated and will be recalibrated against a denoise-on field corpus.

## Voice-quality score: when to recalibrate

The voice-clone enrollment flow includes an advisory 0-100 quality score
(`src/models/voiceQuality.ts`) that nudges users toward better takes.
Its sub-score curves and weights are calibrated against specific
assumptions — when those assumptions change, the score drifts off the
thing it claims to measure. Recalibrate when any of these happen, in
descending order of impact:

1. **TTS / speech-encoder swap** (e.g., away from Chatterbox Multilingual).
   The weight on `pitchVariation` is justified by Chatterbox's frame-level
   conditioning; a different decoder may need different weights. **Always
   bumps `QUALITY_VERSION`.**
2. **Target population shift** away from ICU / post-trach / dysphonic
   patients. The `pitchVariation` curve is anchored on adult read-speech
   norms; the dysphonia guard threshold is empirical for weak phonation.
3. **Recording flow / script change.** The 15s target shapes `coverage`;
   the Rainbow Passage opener shapes the expected `voicedFraction`.
4. **Real-user telemetry** showing the score distribution doesn't match
   clinical perception (issue #169 already tracks this for `spectralTilt`).
5. **Score-vs-perception mismatch reports** from clinicians or QA.
6. **Microphone hardware shift** — weakest trigger; the score is
   *supposed* to penalise bad mics, so only recalibrate if a new device
   produces unfamiliar but actually-fine spectral character.

The recalibration playbook is in
`docs/superpowers/specs/2026-05-02-voice-quality-score-design.md` and
the auto-memory entry `project_voice_quality_recalibration.md`. The
calibration backstop test in
`src/models/voiceQuality.test.ts` (using
`sample-voices/mark-voice.wav`) is the empirical anchor for the current
mapping — if it fails, the algorithm is wrong, not the test.

## Deploying assets to R2

Large binaries (ONNX Runtime Web WASM + model weights) don't live in `dist/` — Cloudflare Pages has a 25 MiB per-file limit, and the postbuild stripper enforces it. Instead they're hosted in the Cloudflare R2 bucket `ownvoice-static` and proxied at runtime by `functions/ort/[[path]].ts` and `functions/models/[[path]].ts` so the service worker still sees same-origin `/ort/*` and `/models/*` URLs.

### When to upload

Upload whenever any of these change:

- **`ORT_VERSION`** in `src/models/assetVersions.ts` — bumped with the `onnxruntime-web` npm dep
- **`MODELS_RELEASE`** in `src/models/assetVersions.ts` — bumped when any model file changes
- **Adding/replacing files under `public/models/<release>/<group>/`** — also run `npm run manifest:regen` and commit the manifest diff

Bumping a constant in `assetVersions.ts` is the deploy trigger. The path layout under `public/` mirrors the R2 key layout, so dev, manifest, and prod all resolve to the same structure.

### Steps

```bash
# 1. Populate local copies from npm + HuggingFace (gitignored, build inputs only).
npm run assets:download

# 2. Regenerate manifest if you touched anything under public/models/.
npm run manifest:regen
npm run manifest:check

# 3. Export R2 credentials (one-time; see scripts/upload-r2-assets.mjs).
export CLOUDFLARE_ACCOUNT_ID=...
export R2_ACCESS_KEY_ID=...
export R2_SECRET_ACCESS_KEY=...

# 4. Upload. Idempotent — HEADs each key first and skips matching sizes.
npm run assets:upload              # incremental
npm run assets:upload -- --force   # re-upload everything
```

The upload script reads `ORT_VERSION` and `MODELS_RELEASE` straight from `src/models/assetVersions.ts` and writes to:

- `ort/<ORT_VERSION>/*.wasm`
- `models/<MODELS_RELEASE>/<group>/...` — only for **active model groups** (currently `chatterbox-multilingual`, `whisper-small`, `denoiser`). The `ACTIVE_GROUPS` filter in the upload script skips retired groups like `lfm2-1.2b-instruct` even if they exist locally.

### Pruning old R2 objects

`npm run assets:prune` removes any R2 object not referenced by `main` or any open PR branch, with a 24-hour grace window for in-flight uploads. It runs automatically on every successful production deploy and on a daily 04:17 UTC schedule (`.github/workflows/prune-r2.yml`); run it manually only when you need to reclaim space immediately.

```bash
npm run assets:prune:dry   # show what would be deleted
npm run assets:prune       # actually delete
```

### Deploy order

R2 assets are content-addressed by version, so old and new versions coexist:

1. **Upload R2 first** (`npm run assets:upload`) — old Pages build keeps working because its `ORT_VERSION` / `MODELS_RELEASE` still resolve.
2. **Then deploy Pages** — once the new bundle ships, it references the keys you just uploaded.
3. Prune runs later on the next scheduled tick.

Doing it in the other order risks a window where the new Pages bundle 404s on `/ort/*` or `/models/*`.

## Project Structure

```
ownvoice/
├── index.html              # Entry point
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx            # React mount
│   └── OwnVoice.jsx        # Full prototype (~1630 lines)
└── docs/
    ├── PRD.md               # Product Requirements Document
    └── DESIGN_GUIDELINES.md # Accessibility & design system
```

## Documentation

- **[PRD](docs/PRD.md)** — Full product requirements including technology architecture, voice cloning landscape, SICG integration, and 4-phase roadmap
- **[Design Guidelines](docs/DESIGN_GUIDELINES.md)** — Accessibility standards, contrast requirements, touch target specs, cognitive load principles, and clinical environment considerations

## Technology Stack

| Layer | Technology |
|---|---|
| UI | React (prototype) → TypeScript + Preact (production) |
| Build | Vite |
| TTS | ONNX Runtime Web (WebGPU EP) |
| Suggestions | On-device LLM (1–2B, q4) |
| STT | Whisper (small/medium, on-device) |
| Pain Scale | Emoji-FPS (CC-BY 4.0) |
| Goals of Care | SICG Framework (CC-BY-NC-SA 4.0) |
| Font | Atkinson Hyperlegible (Braille Institute) |

## Credits

- **Emoji-FPS** — Li et al., "Development of the Emoji Faces Pain Scale," JMIR 2023. CC-BY 4.0.
- **Serious Illness Conversation Guide** — Ariadne Labs (Brigham and Women's Hospital / Harvard T.H. Chan School of Public Health / Dana-Farber Cancer Institute). CC-BY-NC-SA 4.0.
- **Atkinson Hyperlegible** — Braille Institute of America.

## License

Prototype only. Not for clinical use without validation.
