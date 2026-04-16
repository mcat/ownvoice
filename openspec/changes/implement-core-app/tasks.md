# Tasks: Implement Core App

## Task 1: Project setup — TypeScript, Preact, Tailwind, Vite

**Status:** done
**Depends on:** none
**Estimated scope:** Foundation — must be right before anything else builds on it

### What

- Convert the project from React to Preact with TypeScript
- Install and configure: `preact`, `@preact/preset-vite`, `typescript`, `tailwindcss`, `@tailwindcss/vite`
- Update `vite.config.ts` with Preact plugin and dev server port 3000
- Update `tsconfig.json` with Preact JSX settings and strict mode
- Update `index.html`: add Atkinson Hyperlegible font link, PWA meta tags, Tailwind CSS import
- Add `src/main.tsx` mount point using Preact's `render()`
- Add `src/app.css` with Tailwind directives and base styles (scrollbar hide, tap highlight removal, keyframe animations)
- Remove React dependencies from `package.json`
- Verify `npm run dev` starts and renders a blank Preact app

### Files to create/modify

- `package.json` — swap react → preact, add tailwind + typescript deps
- `vite.config.ts` — new (replace any existing vite.config.js)
- `tsconfig.json` — new
- `tailwind.config.ts` — new, with OwnVoice theme preset
- `src/main.tsx` — new
- `src/app.css` — new
- `index.html` — update

### Acceptance

- `npm run dev` serves at localhost:3000
- `npm run build` succeeds with zero TypeScript errors
- Tailwind classes are processed (test with a `bg-blue-500` div)

---

## Task 2: Theme tokens and Tailwind preset

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small but critical — every subsequent component uses these tokens

### What

- Create `src/theme/tokens.ts` with complete light and dark color token objects
- Every foreground/background pair must be manually verified for contrast:
  - Phrase labels: target 7:1 (AAA)
  - All other text: minimum 4.5:1 (AA)
  - Patient bubble text on bubble background: verified
  - Provider bubble text on bubble background: verified
- Colors per DESIGN_GUIDELINES.md section 4.2:
  - Blue (#2563EB light / #3B82F6 dark): patient actions, primary interactive
  - Green (#059669): provider/care team, confirmation
  - Red (#DC2626): urgency, help button only
  - Indigo ramp (#C7D2FE → #3316A0): pain severity (colorblind-safe)
  - Neutrals: warm undertone in light mode
  - Dark bg: true dark #111113, text: warm off-white #F5F5F5
- No opacity-based text colors anywhere
- Configure Tailwind to expose these as `ov-*` utility classes
- Create `src/hooks/useTheme.ts`: dark mode toggle + auto-detection via `prefers-color-scheme`, stores preference in localStorage

### Files to create

- `src/theme/tokens.ts`
- `src/hooks/useTheme.ts`
- Update `tailwind.config.ts` with custom colors

### Acceptance

- Both light and dark token sets exported
- Every text/background pair passes contrast check
- `useTheme()` returns current theme + toggle function
- Dark mode applies `dark` class to root element

---

## Task 3: Types and data layer

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Mostly porting from prototype — types are new

### What

- Create `src/types.ts` with interfaces: `Phrase`, `Category`, `SubCategory`, `PainDescriptor`, `BodyRegion`, `WishTopic`, `WishResponse`, `Message`, `Speaker`, `Settings`, `SpeakingState`
- Create `src/data/phrases.ts` — port `CATS` from prototype with type annotations
- Create `src/data/provider-phrases.ts` — port `PROVIDER` from prototype
- Create `src/data/pain.ts` — port `PAIN_DESC`, `BODY`, Emoji-FPS levels (0/2/4/6/8/10 with emoji faces)
- Create `src/data/wishes.ts` — port `MyWishes` SICG 7-topic structure (preserve clinical structure exactly)
- Create `src/data/suggestions.ts` — port `SUGGEST` (time-of-day) and `BASE_SUGGESTIONS` (sentence builder)

### Files to create

- `src/types.ts`
- `src/data/phrases.ts`
- `src/data/provider-phrases.ts`
- `src/data/pain.ts`
- `src/data/wishes.ts`
- `src/data/suggestions.ts`

### Acceptance

- All data compiles with strict TypeScript (no `any`)
- Data matches prototype exactly (diff phrase texts to verify)
- SICG structure preserved: 7 topics, each with title and 6 response options

---

## Task 4: Core infrastructure — speak(), store, conversation hook

**Status:** done
**Depends on:** Task 3
**Estimated scope:** Core plumbing that everything depends on

### What

- Create `src/speak.ts`:
  - `speak(text: string, speaker: Speaker): Promise<void>`
  - Uses Web Speech API (`speechSynthesis.speak()`)
  - Emits custom events for speaking state (start, end, text, speaker)
  - Returns promise that resolves when utterance ends
  - Handles edge cases: synthesis not available, utterance interrupted
- Create `src/store.ts`:
  - IndexedDB helpers: `saveConversation()`, `loadConversation()`, `clearAll()`
  - `saveSettings()`, `loadSettings()`
  - Simple key-value on a single IndexedDB database
- Create `src/hooks/useSpeak.ts`:
  - Wraps `speak()` with Preact state: `isSpeaking`, `speakingText`, `speakingSpeaker`
  - Provides `speakPhrase(text)` and `speakAsProvider(text)` convenience methods
- Create `src/hooks/useConversation.ts`:
  - `messages` state, `addMessage()`, `clearMessages()`
  - Auto-persists to IndexedDB (debounced 500ms)
  - Loads from IndexedDB on mount
- Create `src/hooks/useDebouncedTap.ts`:
  - Returns `{ onTap, isLocked }` — 300ms lockout after each tap

### Files to create

- `src/speak.ts`
- `src/store.ts`
- `src/hooks/useSpeak.ts`
- `src/hooks/useConversation.ts`
- `src/hooks/useDebouncedTap.ts`

### Acceptance

- `speak("Hello", { name: "Patient", type: "patient" })` produces audible speech via Web Speech API
- Conversation persists across page reloads
- `clearAll()` removes all IndexedDB data
- Debounce prevents double-fire within 300ms

---

## Task 5: Shared components — Btn, PhraseButton, Speaking overlay

**Status:** done
**Depends on:** Task 2, Task 4
**Estimated scope:** The building blocks everything else uses

### What

- Create `src/components/shared/Btn.tsx`:
  - Base button with 300ms debounce via `useDebouncedTap`
  - CSS `:active` state for <50ms visual feedback
  - `touch-action: manipulation` to prevent browser delays
  - `-webkit-tap-highlight-color: transparent`
  - Props: `onTap`, `disabled`, `className`, `children`, `ariaLabel`
- Create `src/components/phrases/PhraseButton.tsx`:
  - Extends `Btn` with icon + label layout
  - Min 64×64px touch target (Tailwind: `min-w-16 min-h-16`)
  - 12px gap between adjacent buttons (Tailwind: `gap-3`)
  - Icon above text (or icon-only / text-only based on settings)
  - Bold Atkinson Hyperlegible, 16px min
  - On tap: calls `speak(phrase.text, patientSpeaker)`
  - Active state: scale down + color shift
- Create `src/components/shared/Speaking.tsx`:
  - Full-width overlay bar (not modal — no dead ends)
  - Shows speaker name ("Speaking as Margaret"), phrase text, animated progress bar
  - Duration: `1400ms + text.length * 55ms`
  - Auto-dismisses when speech completes
  - Uses `aria-live="polite"` for screen reader announcement
- Create `src/components/phrases/PhraseGrid.tsx`:
  - Responsive grid: 2 cols on smaller screens, 3 cols on 11"+ iPad
  - Max 12 visible without scrolling (per cognitive load guidelines)
  - Vertical scroll for overflow

### Files to create

- `src/components/shared/Btn.tsx`
- `src/components/phrases/PhraseButton.tsx`
- `src/components/shared/Speaking.tsx`
- `src/components/phrases/PhraseGrid.tsx`

### Acceptance

- PhraseButton renders at 64×64px minimum
- Tap produces speech + shows speaking overlay
- Double-tap within 300ms fires only once
- Visual feedback on `:active` is perceptible within 50ms
- Grid shows max 3 columns on iPad 11"

---

## Task 6: Layout — Header, TabBar, HelpButton

**Status:** done
**Depends on:** Task 2, Task 5
**Estimated scope:** The persistent chrome around every screen

### What

- Create `src/components/layout/Header.tsx`:
  - Patient name display (left)
  - Center: speaking indicator (when active)
  - Right: action buttons — sentence builder (keyboard icon), My Wishes (heart), Listen (ear), Provider (stethoscope), Settings (gear via long-press/two-finger tap)
  - Fixed position, never scrolls
  - Caregiver-facing buttons (settings) behind deliberate gesture
  - Dark mode toggle in header
- Create `src/components/layout/TabBar.tsx`:
  - 5 tabs: Quick, I Need, I Feel, Pain, Ask
  - Bottom-fixed, always visible (no dead ends)
  - Each tab: icon + label, active state with filled background + indicator
  - Active tab distinguishable without color (structural indicator)
  - Tab icons + colors match prototype's `CATS` definitions
- Create `src/components/layout/HelpButton.tsx`:
  - Persistent floating "I need help" button
  - Always visible on every screen (positioned above tab bar)
  - Min 80×80px touch target (critical action, per design guidelines)
  - Red (#DC2626) — urgency color used only here
  - On tap: speaks "I need help" + adds to conversation
  - Subtle pulse animation to indicate availability without being alarming

### Files to create

- `src/components/layout/Header.tsx`
- `src/components/layout/TabBar.tsx`
- `src/components/layout/HelpButton.tsx`

### Acceptance

- Tab bar renders at bottom, all 5 tabs visible
- Active tab has structural (non-color) indicator
- Help button floats above tab bar, visible on all screens
- Header doesn't scroll with content
- Settings icon requires deliberate gesture (not single tap)

---

## Task 7: App shell — Root component with tab routing

**Status:** done
**Depends on:** Task 5, Task 6
**Estimated scope:** Wiring everything together

### What

- Create `src/App.tsx`:
  - Root component managing: `activeTab`, `setupComplete`, overlay states
  - Renders: Header, main content area (tab views), TabBar, HelpButton, Speaking overlay
  - Tab routing: switch on `activeTab` to render the appropriate category view
  - Overlay rendering: Setup wizard (if not complete), Provider panel, Settings, My Wishes, Sentence Builder, Listen panel
  - Context providers: theme, conversation, speaking state, settings
  - Scroll position preservation per tab (useRef map)
  - On mount: load settings from IndexedDB, check setupComplete
- Create `src/components/phrases/SubcategoryChips.tsx`:
  - Horizontal row of chips for subcategory selection (I Need, I Feel)
  - Single tap to switch subcategory
  - Active chip has filled background
- Wire up category views:
  - Quick: PhraseGrid with 6 phrases (no subcategories)
  - I Need: SubcategoryChips (Comfort, Medical, People) + PhraseGrid
  - I Feel: SubcategoryChips (Physical, Emotional) + PhraseGrid
  - Pain: renders PainFlow component (Task 8)
  - Ask: PhraseGrid with 9 question phrases

### Files to create/modify

- `src/App.tsx` — new
- `src/components/phrases/SubcategoryChips.tsx` — new
- `src/main.tsx` — update to render App

### Acceptance

- App renders with all 5 tabs functional
- Switching tabs preserves scroll position
- Subcategory chips work for I Need and I Feel
- Tapping any phrase speaks it and adds to conversation
- Setup wizard shows on first launch

---

## Task 8: Pain flow (Emoji-FPS 3-step)

**Status:** done
**Depends on:** Task 5, Task 7
**Estimated scope:** Self-contained multi-step flow with clinical validation requirements

### What

- Create `src/components/pain/PainFlow.tsx`:
  - Orchestrates 3 steps: severity → location → descriptor
  - Shows progress breadcrumb ("Pain > Level 7 > Chest > describe it")
  - Back button at each step, escape to abandon flow
  - Partial completion is valid — exiting after severity still communicates something
  - `aria-describedby` announces "Step N of 3"
- Create `src/components/pain/SeverityStep.tsx`:
  - 6 emoji faces at levels 0, 2, 4, 6, 8, 10 (Emoji-FPS validated scale)
  - Large touch targets (80px+ — this is a critical interaction)
  - Single-hue indigo intensity ramp (NOT red-green, per colorblindness guidelines)
  - Numeric label on each level is primary information; color is reinforcement
  - No slider — discrete tap targets only
- Create `src/components/pain/LocationStep.tsx`:
  - Body region buttons: Head, Face, Neck, Chest, shoulders, arms, Stomach, back, legs
  - Grid layout, 64px targets
- Create `src/components/pain/DescriptorStep.tsx`:
  - Pain descriptors: Aching, Burning, Sharp, Throbbing, Cramping, Constant, Comes and goes, Numb, Pressure
  - Chip-style buttons
  - On selection: constructs and speaks full sentence: "I have [descriptor] pain in my [location], level [N] out of 10"

### Files to create

- `src/components/pain/PainFlow.tsx`
- `src/components/pain/SeverityStep.tsx`
- `src/components/pain/LocationStep.tsx`
- `src/components/pain/DescriptorStep.tsx`

### Acceptance

- Full flow: tap severity → tap location → tap descriptor → sentence spoken
- Sentence format: "I have sharp pain in my chest, level 8 out of 10"
- Back navigation works at every step
- Can abandon flow at any step without error
- Pain scale uses indigo ramp only (no red/green)
- All targets are 64px+ (severity targets 80px+)

---

## Task 9: Conversation thread with tap-to-repeat

**Status:** done
**Depends on:** Task 4, Task 5
**Estimated scope:** Central UI element visible alongside every category

### What

- Create `src/components/conversation/Thread.tsx`:
  - Scrollable list of messages
  - Auto-scrolls to bottom on new message
  - Never covers phrase buttons or navigation (positioned above tab bar content)
  - Shows when there are messages, collapses when empty
  - Patient messages: right-aligned, blue bubble
  - Provider messages: left-aligned, white/card bubble
  - Each message: speaker label + timestamp + text + repeat icon (↻)
- Create `src/components/conversation/MessageBubble.tsx`:
  - Speaker name on every message ("Margaret" / "Nurse Davis")
  - Timestamp (relative: "2m ago")
  - Tap-to-repeat: tapping re-speaks without adding duplicate to thread
  - Subtle ↻ icon indicates affordance
  - Visual feedback on repeat tap
  - Distinguishable without color: patient = right-aligned, provider = left-aligned

### Files to create

- `src/components/conversation/Thread.tsx`
- `src/components/conversation/MessageBubble.tsx`

### Acceptance

- Messages appear in correct order with speaker labels
- Patient and provider messages visually distinct (position + color)
- Tap-to-repeat speaks the message without adding a new entry
- Thread scrolls, never covers phrase buttons
- Thread persists across tab switches

---

## Task 10: My Wishes — SICG goals-of-care flow

**Status:** done
**Depends on:** Task 5, Task 7
**Estimated scope:** Clinically validated framework — structure must not be modified

### What

- Create `src/components/wishes/MyWishes.tsx`:
  - 7-topic overview: My Goals, My Worries, My Strength, What Brings Me Joy, About Treatment, My Family, My Hopes
  - Topics addressable in any order, all skippable
  - Running summary of expressed wishes (labeled with patient name)
  - Accessible via heart icon in header
  - Renders as full-screen inline view (not modal — no dead ends)
- Create `src/components/wishes/WishTopic.tsx`:
  - Topic title + 6 response options as PhraseButtons
  - Each response spoken immediately on tap
  - Multiple responses selectable per topic
  - Visual indicator for already-selected responses
- Create `src/components/wishes/WishesSummary.tsx`:
  - Overview showing all topics with selected responses
  - Patient's name as header ("Margaret's Wishes")
  - Each topic section shows selected responses or "Not yet discussed"

### Files to create

- `src/components/wishes/MyWishes.tsx`
- `src/components/wishes/WishTopic.tsx`
- `src/components/wishes/WishesSummary.tsx`

### Acceptance

- All 7 SICG topics render with correct titles and 6 responses each
- Topics accessible in any order
- Tapping a response speaks it and marks it selected
- Summary shows all expressed wishes
- Clinical structure matches SICG exactly (do not modify topic names or response options from wishes.ts)

---

## Task 11: Provider panel and Listen panel

**Status:** done
**Depends on:** Task 5, Task 7
**Estimated scope:** Caregiver-facing features behind PIN gate

### What

- Create `src/components/shared/PinGate.tsx`:
  - 4-digit numeric keypad
  - Inline rendering (not modal)
  - Default: no PIN set (passes through)
  - When PIN is set: requires entry before showing protected content
  - Caregiver-appropriate styling (standard touch targets, 14px+ text)
- Create `src/components/provider/ProviderPanel.tsx`:
  - Accessible via stethoscope icon in header (behind PIN gate if set)
  - 4 categories: Responses, Questions, Directions, Goals of Care
  - Category chips at top, phrase grid below
  - Each phrase spoken in provider's voice (Web Speech API with different voice if available)
  - Goals of Care section: SICG-aligned clinician prompts
  - Caregiver-facing: standard touch targets acceptable
- Create `src/components/provider/ListenPanel.tsx`:
  - Accessible via ear icon in header
  - Provider selector (when multiple providers configured)
  - Large mic button (currently non-functional — stubbed)
  - Editable text area for manual transcript entry
  - "Add to conversation" button posts as provider message
  - Placeholder text: "Speech-to-text coming soon. Type what was said."

### Files to create

- `src/components/shared/PinGate.tsx`
- `src/components/provider/ProviderPanel.tsx`
- `src/components/provider/ListenPanel.tsx`

### Acceptance

- Provider panel shows 4 categories with all phrases from prototype
- Provider phrases spoken in provider voice
- PIN gate blocks access when PIN is configured
- Listen panel allows manual text entry → posts as provider message
- Mic button present but shows "coming soon" state

---

## Task 12: Sentence Builder

**Status:** done
**Depends on:** Task 4, Task 5
**Estimated scope:** Complex UI, but LLM integration is stubbed

### What

- Create `src/components/builder/SentenceBuilder.tsx`:
  - Accessible via keyboard icon in header
  - Shows current built sentence prominently at top
  - Undo (←) and clear (✕) controls
  - 6-8 suggestion pills below (from static suggestions, not LLM)
  - Tapping a suggestion appends it to the sentence
  - "Speak" button to speak the built sentence at any point
  - "Type instead" toggle reveals standard keyboard input
  - Incomplete sentences are valid communications
  - Time-of-day context: morning/afternoon/evening starters from suggestions.ts
- Create `src/components/builder/SuggestionPills.tsx`:
  - Horizontal scrollable row of suggestion chips
  - Each chip is a tappable word/phrase
  - Updates after each selection (from BASE_SUGGESTIONS dictionary)

### Files to create

- `src/components/builder/SentenceBuilder.tsx`
- `src/components/builder/SuggestionPills.tsx`

### Acceptance

- Builder opens from header icon
- Tapping suggestions builds a sentence word-by-word
- "Speak" button speaks the built sentence
- Undo removes last word, clear resets
- "Type instead" shows keyboard input
- Suggestions update based on last selected word

---

## Task 13: Setup wizard and Settings panel

**Status:** done
**Depends on:** Task 4, Task 7
**Estimated scope:** Onboarding + configuration

### What

- Create `src/components/settings/Setup.tsx`:
  - 3-step wizard:
    1. Patient name + preferred language (13 languages)
    2. Voice setup (stubbed — shows placeholder for voice upload)
    3. Confirmation summary
  - Every step skippable
  - "Skip all →" link always visible
  - Progress indicator (step 1/2/3)
  - On completion: saves to IndexedDB, marks setup complete
  - Caregiver-facing: standard text sizes OK
- Create `src/components/settings/SettingsPanel.tsx`:
  - Accessible via gear icon (deliberate gesture: long-press or two-finger tap)
  - Behind PIN gate if PIN is set
  - Settings: patient name, language, provider name, theme (light/dark/auto), PIN setup, button size (standard/large), display mode (icons+text / icons only / text only)
  - Volume control (visible, not buried)
  - "New Patient" reset: confirmation required ("This will remove all data for [name]. Continue?")
  - Clears: conversation, names, voice models, settings

### Files to create

- `src/components/settings/Setup.tsx`
- `src/components/settings/SettingsPanel.tsx`

### Acceptance

- Setup wizard completes in 3 steps
- "Skip all" bypasses to working app with defaults
- Settings panel accessible via deliberate gesture only
- Patient reset clears all IndexedDB data
- Language selection shows all 13 languages
- Theme toggle works (light/dark/auto)

---

## Task 14: PWA manifest and Service Worker

**Status:** done
**Depends on:** Task 1, Task 7
**Estimated scope:** Small but important for offline operation

### What

- Create `public/manifest.json`:
  - App name: "OwnVoice"
  - Display: standalone
  - Orientation: any (patient may use portrait or landscape)
  - Theme color matching light/dark themes
  - Icons at required sizes (placeholder icons OK for now)
- Create `src/sw.ts` (or `public/sw.js`):
  - Cache-first strategy for app shell (HTML, JS, CSS)
  - Cache font files (Atkinson Hyperlegible)
  - Skip model files (handled separately via OPFS in future)
  - Registration in `main.tsx`
- Update `index.html`:
  - Link to manifest
  - Add `apple-mobile-web-app-capable` meta tags for iPadOS
  - Add `theme-color` meta tag

### Files to create

- `public/manifest.json`
- `src/sw.ts` or equivalent
- Update `index.html`

### Acceptance

- App installable as PWA on iPad (or shows install prompt in Safari)
- After first load, app works fully offline
- Lighthouse PWA audit passes basic checks

---

## Task 15: Integration and polish

**Status:** done
**Depends on:** Tasks 7-14
**Estimated scope:** Final wiring, testing, accessibility audit

### What

- Wire all overlays (Provider, Settings, My Wishes, Builder, Listen) into App.tsx
- Verify all phrase categories render correctly with data from data/ files
- Verify dark mode works end-to-end (all components, both themes)
- Verify conversation thread integrates with all speech sources (phrases, pain flow, SICG, builder, provider)
- Verify scroll position preservation across tab switches
- Verify speaking overlay appears for every speech action
- Verify 300ms debounce works on all tappable elements
- Test contextual suggestions (morning/afternoon/evening based on time)
- Run `npm run build` — verify clean TypeScript compilation, bundle size
- Manual accessibility check:
  - All touch targets 64px+ (80px+ for critical)
  - All text 18px+ for patient-facing
  - No italics, no ALL CAPS in patient interface
  - Tab order logical for Switch Control
  - `aria-label` on all interactive elements
  - `aria-live` on speaking indicator
  - Dark mode contrast verified

### Acceptance

- `npm run build` succeeds with zero errors
- All 5 categories function correctly
- Pain flow end-to-end
- SICG flow end-to-end
- Provider panel end-to-end
- Sentence builder end-to-end
- Setup → use → reset → setup cycle works
- Dark mode fully functional
- No complex gestures in patient interface
- Bundle size under 500KB (excluding future model files)

---

## Dependency Graph

```
Task 1 (project setup)
├── Task 2 (theme tokens) ─────────┐
├── Task 3 (types + data) ─────────┤
│   └── Task 4 (speak, store, hooks)┤
│       ├── Task 9 (thread) ────────┤
│       └── Task 12 (builder) ──────┤
├── Task 5 (shared components) ─────┤ (depends on 2 + 4)
│   ├── Task 6 (layout) ───────────┤
│   │   └── Task 7 (app shell) ────┤ (depends on 5 + 6)
│   │       ├── Task 8 (pain) ─────┤
│   │       ├── Task 10 (wishes) ──┤
│   │       ├── Task 11 (provider) ┤
│   │       └── Task 13 (settings) ┤
│   └── Task 14 (PWA) ─────────────┤
└── Task 15 (integration) ─────────┘ (depends on all)
```

## Parallel Execution Opportunities

These task groups can be worked on simultaneously by independent agents:

- **Group A:** Task 8 (pain) + Task 10 (wishes) + Task 12 (builder) — independent feature flows
- **Group B:** Task 9 (thread) + Task 11 (provider) — conversation-related components
- **Group C:** Task 13 (settings/setup) + Task 14 (PWA) — infrastructure

After Tasks 1-7 are complete sequentially, Groups A/B/C can run in parallel before Task 15 integrates everything.
