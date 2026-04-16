# Proposal: Implement Core App

## What

Decompose the single-file React prototype (`src/OwnVoice.jsx`, 1629 lines) into a production-quality TypeScript + Preact + Tailwind CSS application with proper component architecture, theme system, accessibility infrastructure, and all features described in the PRD.

## Why

The prototype validates the UX patterns, phrase library, and interaction design, but it cannot ship:

1. **Single file is unmaintainable.** 1629 lines mixing data, components, styling, and state makes iteration dangerous. A nurse-reported bug in the pain flow shouldn't require reading through the sentence builder.
2. **React → Preact.** The PRD specifies Preact (3KB vs 40KB). In a PWA that must load fast on hospital WiFi and run offline, bundle size matters.
3. **Inline styles → Tailwind.** The prototype uses inline style objects with a theme token object `T`. This works for prototyping but doesn't support responsive design, dark mode via media queries, or efficient style deduplication.
4. **No TypeScript.** The prototype is plain JSX. TypeScript catches the kind of bugs (wrong prop passed, missing phrase field) that are costly when your user is a scared patient who can't speak.
5. **No offline support.** The PRD requires full offline operation via Service Worker. The prototype has none.
6. **Missing features.** The prototype is missing: Sentence Builder (progressive word-by-word construction with on-device LLM suggestions), Listen panel (speech-to-text capture), Drawing canvas, and the complete Settings panel.

## Scope

### In scope (this change)

- Project setup: TypeScript, Preact, Tailwind CSS, Vite configuration
- Component decomposition with proper file structure
- Theme system (light/dark) with verified color tokens per DESIGN_GUIDELINES.md
- All 5 phrase categories with subcategory navigation
- Pain flow (Emoji-FPS 3-step: severity → location → descriptor)
- Conversation thread with tap-to-repeat
- Provider panel with PIN gate
- My Wishes (SICG 7-topic goals-of-care flow)
- Setup wizard (3-step, every step skippable)
- Settings panel with patient reset
- Speaking overlay with progress animation
- Bottom tab bar navigation
- Persistent "I need help" button
- Time-of-day contextual suggestions
- Dark mode (auto + manual toggle)
- Web Speech API TTS (fallback/default voice)
- PWA manifest and basic Service Worker for offline shell caching
- Full accessibility compliance per DESIGN_GUIDELINES.md

### Out of scope (future changes)

- Voice cloning / ONNX Runtime integration (Phase 1 technical validation)
- Pre-generated audio cache architecture (Tier 1/2/3)
- On-device LLM for sentence builder suggestions (stubbed with static suggestions)
- On-device Whisper STT (Listen panel stubbed with manual text input)
- Drawing canvas (deferred to separate change)
- Frequency-based phrase adaptation (v2)
- Situational profiles (v2)
- Switch access / eye tracking / dwell selection (v2)
- EHR integration (Phase 4)
- Analytics pipeline

### Stubbed for future integration

- **Sentence Builder:** Full UI implemented with word-by-word construction, but suggestions come from the existing static `BASE_SUGGESTIONS` dictionary (not an LLM). The LLM integration point is a clearly defined async function interface.
- **Listen panel:** Full UI with provider selector, editable transcript area, and "Add to conversation" button. Mic button is present but uses a placeholder — the Whisper model integration is a separate change.
- **TTS:** All phrase playback goes through a `speak()` function that uses Web Speech API. This function is the single integration point for future voice cloning — swap its implementation, and all 150+ phrases use the cloned voice.

## Non-goals

- This is not a visual redesign. The prototype's UX patterns (tab navigation, phrase cards, pain flow steps, SICG topics) are validated and should be preserved.
- This is not a feature expansion. We implement what the prototype demonstrates plus the features the PRD describes for Phase 2. No new features.
- No backend, no server, no API calls. Everything runs on-device.

## Success criteria

- `npm run build` produces a working production build under 500KB (excluding future model files)
- All phrase categories render with correct touch targets (64px min, 12px spacing)
- Pain flow completes end-to-end producing a spoken sentence
- My Wishes flow allows selecting responses across all 7 SICG topics
- Provider panel accessible via deliberate gesture, behind PIN gate
- Dark mode toggles correctly with independently verified contrast ratios
- Setup wizard completes in under 60 seconds (3 steps, all skippable)
- Patient reset clears all data
- App loads offline after first visit (Service Worker caches shell)
- No complex gestures anywhere in patient-facing interface (single tap only)
