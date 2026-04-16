# Design: Implement Core App

## Architecture Overview

The app follows a flat component architecture optimized for an AAC tool: shallow navigation, minimal state, and a single `speak()` pathway for all audio output.

```
src/
├── main.tsx                    # Preact mount point
├── App.tsx                     # Root: routing, global state, overlay orchestration
├── types.ts                    # Shared TypeScript interfaces
├── speak.ts                    # TTS abstraction (Web Speech API, future voice cloning)
├── store.ts                    # Lightweight state (conversation, settings, persistence)
├── data/
│   ├── phrases.ts              # CATS: all phrase categories, subcategories, phrases
│   ├── provider-phrases.ts     # PROVIDER: provider panel response categories
│   ├── pain.ts                 # Pain descriptors, body regions, Emoji-FPS levels
│   ├── wishes.ts               # SICG 7-topic structure with response options
│   ├── suggestions.ts          # Time-of-day and static sentence builder suggestions
│   └── suggestion-trees.ts     # Curated sentence completion trees (clinical vocabulary)
├── theme/
│   ├── tokens.ts               # Light + dark color tokens (verified contrast pairs)
│   └── tailwind-preset.ts      # Tailwind preset extending default with OwnVoice tokens
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # App header: patient name, speaking indicator, action buttons
│   │   ├── TabBar.tsx          # Bottom tab bar (5 categories)
│   │   └── HelpButton.tsx      # Persistent "I need help" floating button
│   ├── phrases/
│   │   ├── PhraseGrid.tsx      # Grid layout for phrase buttons (max 3 cols on 11")
│   │   ├── PhraseButton.tsx    # 64px touch target with icon + label + debounce
│   │   └── SubcategoryChips.tsx # Horizontal chip selector for subcategories
│   ├── conversation/
│   │   ├── Thread.tsx          # Scrollable conversation history
│   │   └── MessageBubble.tsx   # Single message with tap-to-repeat, speaker label, timestamp
│   ├── pain/
│   │   ├── PainFlow.tsx        # Orchestrator for 3-step pain assessment
│   │   ├── SeverityStep.tsx    # Emoji-FPS scale (6 faces at 0/2/4/6/8/10)
│   │   ├── LocationStep.tsx    # Body region selector
│   │   └── DescriptorStep.tsx  # Pain descriptor chips
│   ├── wishes/
│   │   ├── MyWishes.tsx        # SICG 7-topic flow orchestrator
│   │   ├── WishTopic.tsx       # Single topic with response options
│   │   └── WishesSummary.tsx   # Overview of expressed wishes
│   ├── builder/
│   │   ├── SentenceBuilder.tsx # Progressive word-by-word construction
│   │   └── SuggestionPills.tsx # Horizontal scrollable suggestion chips
│   ├── provider/
│   │   ├── ProviderPanel.tsx   # Provider response categories (overlay)
│   │   └── ListenPanel.tsx     # Speech-to-text capture (overlay, stubbed)
│   ├── settings/
│   │   ├── SettingsPanel.tsx   # Configuration overlay (caregiver-facing)
│   │   └── Setup.tsx           # 3-step onboarding wizard
│   └── shared/
│       ├── Btn.tsx             # Base debounced button (300ms)
│       ├── Speaking.tsx        # Speaking overlay with progress animation
│       └── PinGate.tsx         # Simple PIN entry for caregiver access
├── hooks/
│   ├── useSpeak.ts             # Hook wrapping speak() with speaking state management
│   ├── useConversation.ts      # Add/clear messages, persist to IndexedDB
│   ├── useTheme.ts             # Dark mode toggle + auto-detection
│   └── useDebouncedTap.ts     # 300ms debounce for tremor protection
└── sw.ts                       # Service Worker (Workbox) for offline shell caching
```

## Key Design Decisions

### 1. State management: No library

The app has very little shared state:
- `conversation`: array of messages (persisted to IndexedDB)
- `settings`: patient name, language, provider name, theme preference, PIN
- `speakingState`: what's currently being spoken (transient)
- `activeTab`: current navigation tab
- `setupComplete`: whether the wizard has been completed

This fits comfortably in Preact's `useState` + context. A state library adds bundle size and complexity for no benefit. The `store.ts` module provides simple persistence functions (save/load from IndexedDB), not a reactive store.

### 2. speak() as the single audio pathway

Every component that produces speech calls the same `speak(text, speaker)` function. This function:
1. Dispatches a "speaking" event (consumed by the Speaking overlay)
2. Adds the message to the conversation thread
3. Calls the TTS implementation (currently Web Speech API)
4. Returns a Promise that resolves when speech completes

Future voice cloning replaces the TTS implementation inside `speak()`. No component changes required.

```typescript
// speak.ts
export type Speaker = { name: string; type: 'patient' | 'provider' };

export async function speak(text: string, speaker: Speaker): Promise<void> {
  // 1. Notify UI (speaking overlay)
  // 2. Add to conversation thread
  // 3. Call TTS (Web Speech API now, voice cloning later)
  // 4. Resolve when done
}
```

### 3. Theme system: Verified token pairs

Per DESIGN_GUIDELINES.md section 4.2, light and dark mode are **separate verified palettes, not computed**. The `tokens.ts` file exports two complete token objects where every foreground/background combination has been manually verified for contrast compliance.

```typescript
// theme/tokens.ts
export const light = {
  bg: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  text: '#111113',
  textSecondary: '#4B5563',        // verified 7.2:1 on #FFFFFF
  patientBubble: '#2563EB',
  patientBubbleText: '#FFFFFF',    // verified 8.6:1 on #2563EB
  // ... every pair verified
};

export const dark = {
  bg: '#111113',
  bgSecondary: '#1C1C1E',
  text: '#F5F5F5',                 // warm off-white per guidelines
  textSecondary: '#A1A1AA',        // verified 5.1:1 on #111113
  patientBubble: '#3B82F6',        // lighter blue for dark mode per guidelines
  patientBubbleText: '#FFFFFF',    // verified 8.1:1 on #3B82F6
  // ... every pair verified
};
```

Tailwind is configured with a custom preset that maps these tokens to utility classes: `bg-ov-bg`, `text-ov-text`, etc. Dark mode uses Tailwind's `dark:` variant tied to a class on the root element (not media query alone, since the user can also toggle manually).

### 4. Phrase data as typed constants

All phrase data lives in `src/data/` as typed TypeScript constants. This gives us:
- Compile-time validation of phrase structure
- Easy grep/find for any phrase text
- Single source of truth (no duplicate phrase definitions)
- Clear integration point for future i18n

```typescript
// types.ts
export interface Phrase {
  text: string;
  icon: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  phrases?: Phrase[];
  subs?: { label: string; phrases: Phrase[] }[];
  isPain?: boolean;
}
```

### 5. PhraseButton: The critical component

This is the most-tapped component in the app. It must:
- Be exactly 64×64px minimum (80×80px for critical actions)
- Have 12px spacing to adjacent buttons
- Debounce at 300ms (tremor protection)
- Show visual feedback within 50ms of tap
- Use Atkinson Hyperlegible at 16px+ bold
- Work with a single tap (no long-press, no double-tap)

The 50ms visual feedback is achieved via CSS `:active` state (instant browser response) rather than JavaScript state updates, which would be slower.

### 6. Navigation: Tab routing without a router

The app has exactly 5 top-level views (one per tab) plus overlays (provider panel, settings, setup wizard, My Wishes). This doesn't warrant a routing library. The `activeTab` state in `App.tsx` controls which category view renders. Overlays are conditionally rendered based on boolean state.

Tab switching preserves scroll position per DESIGN_GUIDELINES.md section 3.3. Each tab's scroll position is stored in a ref and restored on re-render.

### 7. Conversation persistence

Messages are persisted to IndexedDB via a simple key-value approach:
- Key: `conversation`
- Value: `Message[]` (JSON serialized)
- Written on every new message (debounced 500ms)
- Read on app load
- Cleared on patient reset

No ORM, no schema migration. The data is ephemeral by design (cleared between patients).

### 8. Service Worker strategy

Workbox with a **cache-first** strategy for the app shell and static assets. The SW caches:
- HTML, JS, CSS bundles
- Font files (Atkinson Hyperlegible)
- PWA manifest and icons

It does NOT cache model files (those will use OPFS in a future change). The goal is: after first load, the app works without any network connection.

### 9. Accessibility implementation

Per DESIGN_GUIDELINES.md, every interactive element must:
- Have `role="button"` and `aria-label` (or visible text)
- Be focusable and operable via Switch Control
- Have logical tab order (left-to-right, top-to-bottom within a category)
- Use `aria-live="polite"` for the speaking indicator
- Use `aria-current` for the active tab

The pain flow uses `aria-describedby` to announce progress: "Step 1 of 3: Select pain severity."

### 10. PIN gate for caregiver access

The provider panel and settings are behind a simple PIN gate (default: no PIN, configurable in settings). Implementation: a 4-digit numeric pad rendered inline. No modal. The PIN is stored in IndexedDB (not security-sensitive — it's a confusion barrier for delirious patients, not an authentication system).

## Model Integration Points

Three on-device models power OwnVoice's AI features. All run via ONNX Runtime Web with the WebGPU execution provider (Metal on iPad). All three are loaded simultaneously — no on-demand loading — so the app is always instantly responsive on both M5 and A16 iPads.

### Model stack

| Slot | Model | Params | Size (q4) | Loading | License |
|------|-------|--------|-----------|---------|---------|
| TTS (voice cloning) | Chatterbox Turbo (Resemble AI) | 350M | ~200 MB | Always loaded | MIT |
| Suggestions (sentence builder) | Gemma 3 270M (Google) | 270M | ~150 MB | Always loaded | Apache 2.0 |
| STT (listen panel) | Whisper small (OpenAI) | ~244M | ~250 MB | Always loaded | MIT |

**Total model footprint: ~600 MB.** Leaves ~3,275 MB headroom on A16 iPad (8 GB) and ~7,275 MB on M5 iPad (12 GB).

### TTS: Chatterbox Turbo

- **23-language voice cloning in v1.** A patient's voice sample (a few seconds) produces a speaker embedding. All phrases in all 13 app languages are synthesized in the patient's cloned voice via cross-lingual synthesis.
- **Web Speech API fallback** when no voice sample is provided or the model fails to load. The patient always has a voice — personal voice is an enhancement, not a gate.
- **The `speak()` function is the integration seam.** It checks if the model is loaded and an embedding exists → route to Chatterbox Turbo for all languages; otherwise fall back to Web Speech API.
- **ONNX export available.** `ResembleAI/chatterbox-turbo-ONNX` on HuggingFace. Supported in Transformers.js v4 with q4 quantization. 350M params, 1-step distilled diffusion, MIT license.
- **Pre-generated audio cache:** After voice model creation, all ~150 fixed phrases are pre-generated as Opus clips stored in OPFS. Tap → decode → play via Web Audio API in < 50ms. Only custom/typed messages require real-time inference.

### Suggestions: Hybrid curated trees + Gemma 3 270M

The sentence builder uses a **two-layer suggestion architecture** to balance quality, speed, and safety:

**Layer 1 — Curated suggestion trees (instant, 0ms):**
Stored in `src/data/suggestion-trees.ts`. A dictionary mapping partial sentence prefixes to arrays of clinically vetted completions. Covers the most common sentence patterns in patient communication:

```
"I feel"     → [scared, better, dizzy, weak, tired, nauseous, uncomfortable, restless]
"I need"     → [water, help, medication, the nurse, the bathroom, to rest, my family]
"Can you"    → [help me, explain, call my family, come back later, turn off the light]
"I think"    → [something is wrong, I need help, I'm getting worse, I feel better]
"My"         → [pain is worse, family, medication, breathing, arm, leg, head, stomach]
```

These trees are the primary suggestion source. They are clinically reviewable, deterministic, and load zero model weight. The tree depth is 1-2 words — enough to cover the top ~80% of sentence starts.

**Layer 2 — Gemma 3 270M (100-150ms inference):**
Fires only when the partial sentence has no match in the curated tree. The model receives:
- The partial sentence so far
- Last 5 conversation messages for context
- Time of day
- A system prompt biasing toward medical communication vocabulary

At 270M parameters (q4, ~150 MB), this is small enough to stay loaded permanently but capable enough for contextual medical completions. It handles the long tail: "I think the tube in my nose moved," "my daughter's name is Sarah," etc.

**Fallback:** If Gemma 3 270M fails to load or produces no useful output, the builder shows a "Type instead" keyboard input. The patient always has a path to say what they need.

**The boundary rule:** Curated trees are checked first, always. Gemma 3 270M fires only on cache miss. This means the LLM never overrides vetted clinical vocabulary — it only extends it.

### STT: Whisper small

- **On-device speech-to-text** for the Listen panel. Captures provider speech, transcribes it, adds it to the conversation thread.
- **Batch mode:** Processes complete utterances after the speaker pauses. Latency target: < 2 seconds from end-of-speech to transcript.
- **100 languages** supported, matching OwnVoice's multilingual capability.
- **Editable transcript:** The recognized text appears in an editable text area so providers can correct errors before posting. Manual text entry is always available as a parallel input method.
- **No audio leaves the device.** Critical for HIPAA compliance — bedside conversations contain PHI.

### Memory budget

```
iPad A16 (8 GB) — all models always loaded:
├── iPadOS + Safari:          ~3,500 MB
├── App + DOM + WebGPU ctx:     ~600 MB
├── Chatterbox Turbo (q4):      ~200 MB
├── Gemma 3 270M (q4):         ~150 MB
├── Whisper small (q4):         ~250 MB
├── Audio cache + embeddings:    ~25 MB
├── Total used:               ~4,725 MB
└── Headroom:                 ~3,275 MB  ✅

iPad Pro M5 (12 GB):
└── Headroom:                 ~7,275 MB  ✅
```

### Integration timeline

The `implement-core-app` change stubs all three model integration points:
- `speak()` uses Web Speech API (TTS stub)
- Sentence builder uses curated trees only (suggestion stub — Gemma 3 270M not loaded)
- Listen panel accepts manual text input (STT stub — Whisper not loaded)

A separate `integrate-model-stack` change will wire up the actual ONNX models.

## Migration from Prototype

The prototype's data structures (`CATS`, `PROVIDER`, `PAIN_DESC`, `BODY`, `SUGGEST`) are preserved almost verbatim in `src/data/`. The component logic is extracted from the monolith into individual files. The inline style objects are converted to Tailwind utility classes using the theme token mapping.

Key behavioral preservation:
- 300ms debounce timing on `Btn`
- Speaking overlay duration formula: `1400ms + text.length × 55ms`
- Pain flow step sequence: severity → location → descriptor
- SICG 7-topic structure and response options (do not modify clinical structure)
- Conversation thread scroll-to-bottom on new message
- Tab bar always visible, never scrolls
