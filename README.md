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
