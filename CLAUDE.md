# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OwnVoice is an in-patient AAC (Augmentative and Alternative Communication) web app that helps hospitalized patients who cannot speak communicate using their own voice. It runs entirely on-device as a PWA on iPads — no data leaves the tablet after initial load.

**Status:** v0.1 prototype (not for clinical use). Production target is TypeScript + Preact.

## Commands

```bash
npm run dev      # Start Vite dev server at http://localhost:3000 (auto-opens browser)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

No test runner, linter, or formatter is configured.

## Architecture

The entire prototype lives in a single file: **`src/OwnVoice.jsx`** (~1630 lines). This is intentional for rapid prototyping and will be decomposed for production.

### File layout
- `index.html` — PWA entry point with meta tags
- `src/main.jsx` — React mount point
- `src/OwnVoice.jsx` — All components, state, data, and styling
- `docs/PRD.md` — Full product requirements (voice cloning, SICG, latency tiers, 4-phase roadmap)
- `docs/DESIGN_GUIDELINES.md` — Accessibility standards, touch targets, contrast, cognitive load

### Key data structures in OwnVoice.jsx

- **`CATS`** — Phrase categories (Quick, I Need, I Feel, Pain, Ask). Two levels max: Tab → Phrase, or Tab → Subcategory → Phrase.
- **`T`** (theme) — Light/dark token object. All text colors are hardcoded per background (no opacity-based secondaries) to guarantee WCAG contrast.
- **`PROVIDER`** — Provider quick-response categories (responses, questions, directions, goals of care).
- **`BASE_SUGGESTIONS`** — Dictionary for contextual next-word completions in the Sentence Builder.

### Component structure (all in OwnVoice.jsx)

- **`OwnVoice`** — Root. Manages setup wizard, tab routing, overlay orchestration, global state via `useState`.
- **`Btn`** — Debounced button (300ms lock via `useRef`) to prevent double-fires from tremor.
- **`PhraseBtn`** — 64×64px touch target with icon + label.
- **`Speaking`** — Overlay showing speaker, text, and animated progress bar (duration: 1400ms + text.length × 55ms).
- **`Thread`** — Scrollable conversation history with tap-to-repeat.
- **`PainFlow`** — 3-step pain assessment: severity (Emoji-FPS) → body location → descriptor.
- **`SentenceBuilder`** — Word-by-word construction with contextual suggestions.
- **`MyWishes`** — 7-topic goals-of-care flow based on the SICG framework (clinically validated — preserve its structure).
- **`ProviderPanel`** / **`ListenPanel`** — Caregiver-facing components behind PIN gate.
- **`SettingsPanel`** / **`Setup`** — Configuration and onboarding wizard.

### Inline styling is intentional

All styles use inline objects with theme tokens from `T`. This is by design for the prototype (dynamic theming, no CSS deps, explicit dependencies). Production will move to CSS modules or equivalent.

## Accessibility Requirements

These are non-negotiable for this project:

- **Touch targets**: Minimum 64×64px for patient-facing buttons, 12px spacing between targets
- **Contrast**: Minimum 4.5:1 (WCAG AA), target 7:1 (AAA). Verify both light and dark themes independently.
- **No complex gestures**: Single tap only. No double-tap, long-press, swipe, drag, or pinch.
- **Pain scale colors**: Single-hue intensity ramp (indigo), not red-green, for colorblindness safety.
- **Font**: Atkinson Hyperlegible for patient-facing text; 18px minimum for patient content.
- **No italics** in patient interface. **No ALL CAPS** for phrases.

## Clinical Frameworks

- **Emoji-FPS** (Li et al., JMIR 2023) — Validated pain scale with 6 faces at 0/2/4/6/8/10. CC-BY 4.0.
- **SICG** (Ariadne Labs) — Serious Illness Conversation Guide, 7 topics for goals-of-care. CC-BY-NC-SA 4.0. Do not modify the clinical structure.

## Target Platform

iPad Pro (M5, 2025) with iPadOS 26+ and Safari 26. WebGPU via Metal is required for planned ONNX Runtime inference. Desktop/other browsers are not primary targets.
