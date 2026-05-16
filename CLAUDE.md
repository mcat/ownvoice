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
tail -f logs/dev.log   # Live browser-console mirror created by `npm run dev` (see "Debugging from the terminal")
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
- `src/models/` — On-device inference: `modelManager.ts` (worker lifecycle, OPFS model storage), `ttsEngine.ts` (WebGPU main-thread Chatterbox Multilingual), `ttsWorker.ts` / `sttWorker.ts` (WASM fallbacks), `denoiserWorker.ts` (DeepFilterNet3 enrollment cleanup), `audioCache.ts` (OPFS-backed pre-generated phrase audio), `bootModels.ts`, `multilingualTokenizer.ts` (BPE + per-language preprocessors)
- `src/dev/logSink.ts` — Dev-only sink that mirrors `console.*` and uncaught errors to `logs/dev.log` via the `logSinkPlugin` middleware in `vite.config.ts`. Imported as a side effect from both Preact entry points and from each bundled worker (`ttsWorker`, `sttWorker`, `denoiserWorker`), so logs from every JS context end up in a single tail-able file. Tree-shaken in prod.
- `src/stores/` — Zustand stores: `settingsStore`, `conversationStore`, `uiStore`; plus `idbStorage.ts` (Zustand IDB adapter) and `resetAll.ts` (wipes every persistent layer)
- `src/theme/` — Theme tokens and palette
- `docs/PRD.md` — Full product requirements (voice cloning, SICG, latency tiers, 4-phase roadmap)
- `docs/DESIGN_GUIDELINES.md` — Accessibility standards, touch targets, contrast, cognitive load

### State management

- **`settingsStore`** — Persisted via Zustand to IndexedDB database `ownvoice`, object store `kv`, row key `ov-settings` (see `src/stores/idbStorage.ts`). Holds `cfg: AppSettings` and the extracted `speakerData` (Chatterbox Multilingual speech-encoder outputs: condEmb, promptToken, speakerEmbeddings, speakerFeatures). `_hasHydrated` gates the render until rehydration completes.
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
- **SW strategy split** — service worker is scoped to `/app/` (registered with `scope: "/app/"`; granted via the `Service-Worker-Allowed: /app/` header on `/sw.js` from `public/_headers`). Within scope: stale-while-revalidate for `/app/`, `/app/index.html`, `/src/*` (dev-mode module fetches), and `/models-manifest.json`; OPFS proxy for `/models/*`; cache-first-immutable for everything else. Bump `CACHE_NAME` in `public/sw.js` on every SW change.

Clinicians use the "Prepare for offline" button in Settings before shifts to guarantee offline readiness. `navigator.storage.persist()` is called once by `ModelManager.init` to protect the whole origin from eviction.

### Asset hosting (R2 + Pages Functions)

Large assets (ORT WASM, model weights) are hosted in the Cloudflare R2 bucket `ownvoice-static`. Pages Functions at `functions/ort/[[path]].ts` and `functions/models/[[path]].ts` proxy R2 reads to same-origin URLs (`/ort/*`, `/models/*`) so the existing service worker continues to OPFS-proxy them without changes.

- **Asset versioning** lives in `src/models/assetVersions.ts`. `ORT_VERSION` (npm version of `onnxruntime-web`) and `MODELS_RELEASE` (human-readable label) drive the path segments in R2 and locally. Bumping a constant is the trigger for a new upload.
- **Local layout mirrors R2**: `public/ort/v<X>/*.wasm` and `public/models/<release>/<group>/...`. Same path structure as the R2 keys, so dev URLs, manifest:check, and R2 reads all resolve consistently.
- **Download**: `npm run assets:download` (`scripts/download-assets.sh`) populates `public/ort/` and `public/models/` from npm/HuggingFace. Both directories are gitignored — they're build inputs, not source.
- **Upload**: `npm run assets:upload` syncs local files to R2 at the matching keys. Idempotent.
- **Prune**: `npm run assets:prune` (`--dry-run` variant available) removes any R2 object not referenced by main or any open PR's branch, with a 24-hour grace for in-flight uploads. Runs automatically via `.github/workflows/prune-r2.yml` on every successful production deploy plus a daily 04:17 UTC schedule.
- **Build output**: `dist/` does NOT contain WASM or model files. The postbuild stripper (`scripts/strip-dist-large.mjs`) removes anything over 20 MiB as a safety net against the Cloudflare Pages 25 MiB per-file limit; the `/ort/*` and `/models/*` Pages Functions serve them at runtime from R2.

### Inline styling is intentional (for now)

Components use inline style objects with tokens from the `theme` module. This keeps theming dynamic and dependency-free. Production may move to CSS modules or equivalent.

### Debugging from the terminal

**When investigating any runtime bug — failed boot, worker error, unexpected console output — read `logs/dev.log` first.** It's the source of truth Claude can actually see; the DevTools console is invisible from here.

`npm run dev` truncates `logs/dev.log` on each start and then appends every browser `console.log/info/warn/error/debug/dir` call, plus uncaught errors and unhandled rejections, from the main thread *and* from each bundled worker. Each line is `<iso-ts> [LEVEL] [main|worker:<name>] <message>`.

Typical workflow:

```bash
# In one terminal:
npm run dev

# In another (or via Claude's Read/Bash):
tail -f logs/dev.log              # follow live
grep "\[OwnVoice:TTS" logs/dev.log  # filter by existing module prefix
grep "ERROR\|UNCAUGHT" logs/dev.log # surface errors only
```

**For iPad capture:** run `npm run dev -- --host`, point the iPad at `http://<laptop-ip>:3000/app/`, and the same file fills up with its logs. This is currently the only Claude-visible surface for iPad-Safari-only bugs (e.g. the unresolved boot race in PRs #254/#255/#257).

The endpoint is dev-only — production builds tree-shake the sink and `/__log` doesn't exist on Pages. Plain JS workers in `public/` (e.g. `public/stt-gpu-worker.js`) bypass Vite and are NOT captured — their logs stay in the worker DevTools console.

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

## Known issues — do not chase

**Console errors on Safari reload.** After a manual reload (Cmd+R, address-bar refresh, or `Cmd+Option+R`), the `/app/` document logs:

```
Cannot load .../assets/{stt,tts}Worker-*.js due to access control checks.
[OwnVoice:{TTS,STT}:GPU] Init error: "Load failed"
Fetch API cannot load .../ort/.../*.{mjs,wasm} due to access control checks.
```

This is a WebKit bug, not an OwnVoice bug. `new Worker(httpUrl)` on reloaded Safari documents fails regardless of timing or gesture; `fetch()` to the same URL succeeds. Reproduced on desktop Safari too — not iPad-specific. **Six distinct fix approaches were empirically falsified**: defer 3-8s, retry-with-backoff (300/600/900ms), COEP-off, user-gesture wall with real System Events click at t+60s, blob workers, and `Cache-Control: no-store` on worker scripts (the predr.ag workaround for WebKit #245346). Full journey in PRs #254, #255, and #257 (all closed without merging) and in `docs/webkit-bug/`. Errors are non-fatal — the app self-recovers and previously-cloned voices synthesize correctly. **Do not spend further engineering cycles on this in app code; the fix has to come from WebKit.**
