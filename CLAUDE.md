# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OwnVoice is an in-patient AAC (Augmentative and Alternative Communication) web app that helps hospitalized patients who cannot speak communicate using their own voice. It runs entirely on-device as a PWA on iPads — no data leaves the tablet after initial load.

**Status:** v0.1 prototype (not for clinical use). Production target is TypeScript + Preact.

## Commands

```bash
npm run dev            # Start Vite dev server at http://localhost:3000 (auto-opens browser)
npm run build          # Type-check then production build → dist/
npm run preview        # Preview production build locally
npm test               # Run Vitest once
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Vitest with coverage
npm run manifest:regen # Refresh public/models-manifest.json from disk sizes
npm run manifest:check # Verify manifest is in sync with disk (CI-safe)
```

**After adding/replacing any file under `public/models/**`:** run `npm run manifest:regen` and commit the diff. The `manifestIntegrity` vitest covers drift automatically in CI.

Stack: TypeScript + Preact + Vite + Vitest. ESLint with `typescript-eslint` and `eslint-plugin-jsx-a11y`.

## Architecture

The app is decomposed into focused modules. Colocated `*.test.ts(x)` files live alongside their source.

### File layout
- `index.html` — Homepage entry (`/`); minimal head, no PWA registration
- `app/index.html` — App entry (`/app/`); PWA manifest link + service-worker registration with scope `/app/`
- `src/main-app.tsx` — Preact mount point for the app at `/app/`; wires theme side effects
- `src/main-homepage.tsx` — Preact mount point for the homepage at `/`; loads the placeholder/research surfaces (built as a separate Vite entry to keep ML deps out of the homepage bundle)
- `src/homepage/` — Homepage components (currently `PlaceholderApp.tsx`; expanded by Plan C)
- `src/App.tsx` — Root component for the app: setup gate, tab routing, overlay orchestration
- `src/speak.ts` — Single audio pathway. Priority: cloned-TTS (GPU → WASM) → Web Speech → confirmation tone. Owns the Web Audio post-processing pipeline (DC removal, biquads, spectral denoise, gate, normalize, limiter, fade).
- `src/store.ts` — Legacy IndexedDB helper (`clearAll()` only). State lives in Zustand stores below.
- `src/types.ts` — Shared TypeScript types (`Speaker`, `AppSettings`, `Category`, etc.)
- `src/components/**` — UI components grouped by feature (builder, conversation, layout, pain, phrases, provider, settings, shared, wishes)
- `src/data/phraseRegistry.ts` — Single source of truth for all speakable text. `t(key, locale)` resolves a phrase; `getCategories`, `getProviderCategories`, `getEmojiFPS`, `getWishTopics`, `composePainSentence`, `composeWishSentence`, `getAllSpeakablePhrases` expose structure.
- `src/data/locales/` — Per-locale string tables (currently `en.ts`). Statically imported so language switching works offline.
- `src/hooks/` — `useTheme`, `useSpeakActions`, `useMicrophone`, `useModels`, `useDebouncedTap`
- `src/models/` — On-device inference: `modelManager.ts` (worker lifecycle, OPFS model storage), `ttsEngine.ts` (WebGPU main-thread Chatterbox Multilingual), `ttsWorker.ts` / `sttWorker.ts` / `llmWorker.ts` (WASM fallbacks), `audioCache.ts` (OPFS-backed pre-generated phrase audio), `bootModels.ts`, `multilingualTokenizer.ts` (BPE + per-language preprocessors)
- `src/stores/` — Zustand stores: `settingsStore`, `conversationStore`, `uiStore`; plus `idbStorage.ts` (Zustand IDB adapter) and `resetAll.ts` (wipes every persistent layer)
- `src/theme/` — Theme tokens and palette
- `docs/PRD.md` — Full product requirements (voice cloning, SICG, latency tiers, 4-phase roadmap)
- `docs/DESIGN_GUIDELINES.md` — Accessibility standards, touch targets, contrast, cognitive load

### State management

- **`settingsStore`** — Persisted to IndexedDB (`ov-settings`). Holds `cfg: AppSettings` and the extracted `speakerData` (Chatterbox Multilingual speech-encoder outputs: condEmb, promptToken, speakerEmbeddings, speakerFeatures). `_hasHydrated` gates the render until rehydration completes.
- **`conversationStore`** — In-memory thread of `Message`s (patient/provider, text, time, label).
- **`uiStore`** — Transient navigation: current tab, subcategory index, open overlays, active provider, `speaking` state.
- **`resetAll()`** — Wipes IndexedDB, OPFS audio-cache, OPFS model weights, service-worker caches, `localStorage`, and in-memory stores. Called from SettingsPanel.

### Data flow for speech

1. Patient taps a phrase → `useSpeakActions.speakAsPatient(text)` → adds message, sets `speaking` overlay, calls `speak(text, speaker)`.
2. `speak()` tries in order: GPU Chatterbox Multilingual (if `speaker.embedding` and `isGPUReady()`) → WASM TTS worker → Web Speech API → confirmation tone. Post-processes raw PCM before playback. Provider speech runs in `patientLang`; patient speech runs in `caregiverLang`.
3. Provider taps use `speakAsProvider` — no embedding, so always Web Speech or tone.

### Offline storage

OPFS is the authoritative store for model weights after the primer runs. The service worker intercepts `/models/*` fetches and serves directly from OPFS (single copy of the bytes). `public/models-manifest.json` is the source of truth for expected files + byte sizes; `src/models/resumableDownload.ts` streams downloads with `Range:` resumption; `src/models/integrityCheck.ts` validates ONNX magic + size on boot.

- **`loadManifest()` → `ModelsManifest`** — fetched once on boot (`cache: "no-store"`)
- **`primeOffline(manifest)`** — async generator yielding `PrimerEvent`s; invoked from Settings "Prepare for offline"
- **`verifyAllOnBoot()`** — cheap parallel integrity pass run at app start; populates `offlineStore.verified`
- **SW strategy split** — stale-while-revalidate for `/`, `/index.html`, `/src/*`, `/models-manifest.json`; OPFS proxy for `/models/*`; cache-first-immutable for everything else. Bump `CACHE_NAME` in `public/sw.js` on every SW change.

Clinicians use the "Prepare for offline" button in Settings before shifts to guarantee offline readiness. `navigator.storage.persist()` is called once by `ModelManager.init` to protect the whole origin from eviction.

### Inline styling is intentional (for now)

Components use inline style objects with tokens from the `theme` module. This keeps theming dynamic and dependency-free. Production may move to CSS modules or equivalent.

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
