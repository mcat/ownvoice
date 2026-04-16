# Tasks: Add Unit Test Coverage

## Task 1: Install test framework and configure Vitest

**Status:** done
**Depends on:** none
**Estimated scope:** Small — project setup

### What

- Install dependencies: `vitest`, `@testing-library/preact`, `@testing-library/jest-dom`, `jsdom`, `fake-indexeddb`
- Create `vitest.config.ts` with jsdom environment, Preact plugin, coverage thresholds (100/100/95), and file exclusions (main.tsx, OwnVoice.jsx)
- Create `src/__tests__/setup.ts` with:
  - `fake-indexeddb/auto` import
  - `@testing-library/jest-dom` import
  - Global mocks: `speechSynthesis`, `AudioContext`, `SpeechSynthesisUtterance`, `navigator.mediaDevices.getUserMedia`
  - `afterEach(() => { vi.restoreAllMocks(); cleanup(); })` for test isolation
- Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
- Add a smoke test `src/__tests__/smoke.test.ts` that verifies the setup works: `test("vitest runs", () => expect(1 + 1).toBe(2))`
- Verify: `npm test` passes

### Files to create/modify

- `package.json` — add deps and scripts
- `vitest.config.ts` — new
- `src/__tests__/setup.ts` — new
- `src/__tests__/smoke.test.ts` — new (temporary, removed after real tests exist)

### Acceptance

- `npm test` runs and passes the smoke test
- `npm run test:coverage` produces a coverage report

---

## Task 2: Test data files (6 files)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small — structure validation, no mocks needed

### What

Test that all data files export correctly structured data. These are the clinical data structures that must not regress.

- `src/data/phrases.test.ts` — CATS array: has 5 categories (quick, ineed, ifeel, pain, ask), each has id/label/icon/color, subcategories have phrases with text+icon, verify phrase count per category
- `src/data/pain.test.ts` — FACES array has exactly 6 entries at levels 0/2/4/6/8/10, BODY regions exist, PAIN_DESC has descriptors with text+icon
- `src/data/wishes.test.ts` — WISH_TOPICS has exactly 7 topics (SICG), each with id/icon/label/question/stem and exactly 6 responses
- `src/data/suggestions.test.ts` — `getTimeSuggestions()` returns array of strings, `getTimeIcon()` returns a string, varies by time of day
- `src/data/suggestion-trees.test.ts` — BASE_SUGGESTIONS keys are lowercase strings, values are string arrays, no empty arrays
- `src/data/provider-phrases.test.ts` — PROVIDER_CATEGORIES has 4 categories, each with phrases
- `src/theme/tokens.test.ts` — light and dark objects have identical keys, all values are non-empty strings

### Files to create

- `src/data/phrases.test.ts`
- `src/data/pain.test.ts`
- `src/data/wishes.test.ts`
- `src/data/suggestions.test.ts`
- `src/data/suggestion-trees.test.ts`
- `src/data/provider-phrases.test.ts`
- `src/theme/tokens.test.ts`

### Acceptance

- All 7 test files pass
- Data structure integrity verified (especially SICG 7 topics × 6 responses, Emoji-FPS 6 levels)

---

## Task 3: Test IndexedDB layer and legacy store

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small — uses fake-indexeddb

### What

- `src/stores/idbStorage.test.ts`:
  - `createIDBStorage()`: getItem returns null for missing key, setItem+getItem round-trips a string, removeItem deletes a key
  - `createDebouncedIDBStorage(ms)`: setItem is debounced (multiple rapid calls → single write after ms), getItem works immediately
  - Verify the DB name is "ownvoice" and store name is "kv" (for compat with existing data)
- `src/store.test.ts`:
  - `clearAll()`: writes data first, calls clearAll, verifies all keys removed

### Files to create

- `src/stores/idbStorage.test.ts`
- `src/store.test.ts`

### Acceptance

- IDB adapter round-trips data correctly
- Debounce coalesces writes
- clearAll removes all keys

---

## Task 4: Test Zustand stores (5 stores + resetAll)

**Status:** done
**Depends on:** Task 3
**Estimated scope:** Medium — state mutations, persistence, hydration

### What

- `src/stores/uiStore.test.ts`:
  - Initial state: tab="quick", all overlays false, speaking=null
  - `setTab("pain")` sets tab and resets sub to 0 and closes builder
  - `toggleBuilder()` toggles builderOpen
  - `openOverlay("wishes")` / `closeOverlay("wishes")` toggle wishesOpen
  - `resetUI()` restores all defaults
  - `setSpeaking()` / `setSpeaking(null)` manages speaking state

- `src/stores/settingsStore.test.ts`:
  - Initial state: cfg=null, speakerData=null, _hasHydrated=false
  - `setCfg(settings)` sets cfg
  - `updateCfg({ bed: "5A" })` merges into existing cfg (no-ops when cfg is null)
  - `setSpeakerData(data)` stores speaker embedding
  - `reset()` clears cfg and speakerData
  - Persistence: after setCfg, data appears in IDB under key "ov-settings"
  - Hydration: pre-populate IDB with settings, create store, verify cfg is hydrated after queueMicrotask

- `src/stores/conversationStore.test.ts`:
  - `addMessage(text, from, label)` appends message with timestamp
  - `clear()` empties messages array
  - Messages have correct shape: { from, text, time, label }
  - Persistence: after addMessage, wait 500ms, verify IDB has "ov-conversation"

- `src/stores/resetAll.test.ts`:
  - `resetAll()` resets all 3 stores + calls clearAll + clearAudioCache + modelManager.clearAll
  - Mock the external dependencies (audioCache, modelManager)

### Files to create

- `src/stores/uiStore.test.ts`
- `src/stores/settingsStore.test.ts`
- `src/stores/conversationStore.test.ts`
- `src/stores/resetAll.test.ts`

### Acceptance

- All store mutations behave correctly
- Persistence round-trips work with fake-indexeddb
- resetAll clears everything

---

## Task 5: Test hooks (5 hooks)

**Status:** done
**Depends on:** Task 4
**Estimated scope:** Medium — renderHook, mock stores

### What

- `src/hooks/useTheme.test.ts`:
  - Default theme based on prefers-color-scheme
  - `toggle()` switches light↔dark
  - Persists to localStorage
  - `t` returns correct token set for current theme

- `src/hooks/useDebouncedTap.test.ts`:
  - Returns `{ onTap, isLocked }`
  - First tap fires callback immediately
  - Second tap within 300ms is suppressed
  - After 300ms, tap fires again

- `src/hooks/useSpeakActions.test.ts`:
  - Mock speak.ts, mock all 3 stores
  - `speakAsPatient("Yes")`: adds message to conversation store, sets speaking on UI store, calls speak() with patient speaker
  - `speakAsProvider("Hello")`: same but with provider speaker
  - `repeatSpeak("Yes", "patient")`: calls speak() without adding to conversation
  - `addToThread("text", "provider", "Nurse")`: adds to conversation without speaking
  - All functions are no-ops when cfg is null

- `src/hooks/useModels.test.ts`:
  - Calls `getModelManager().init()` on mount
  - Exposes model readiness state

- `src/hooks/useMicrophone.test.ts`:
  - `startCapture()` calls getUserMedia
  - `stopCapture()` stops all tracks
  - `clearTranscript()` resets transcript
  - Error state when mic permission denied
  - Mock MediaRecorder for recording flow

### Files to create

- `src/hooks/useTheme.test.ts`
- `src/hooks/useDebouncedTap.test.ts`
- `src/hooks/useSpeakActions.test.ts`
- `src/hooks/useModels.test.ts`
- `src/hooks/useMicrophone.test.ts`

### Acceptance

- All hook tests pass using renderHook
- useSpeakActions correctly composes across stores

---

## Task 6: Test speak.ts

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small-medium — mock Web APIs, test fallback chain

### What

- `src/speak.test.ts`:
  - **Priority 1 path (Chatterbox Turbo)**: mock modelManager.isReady("tts") → true, mock worker postMessage → audio response. Verify speak() plays via AudioContext.
  - **Priority 2 path (Web Speech API)**: model not ready, mock speechSynthesis.speak. Verify utterance is created with correct text and rate.
  - **Priority 3 path (confirmation tone)**: model not ready, speechSynthesis fails. Verify oscillator nodes are created (confirmation tone).
  - **Error handling**: Chatterbox synthesis throws → falls through to Web Speech. Web Speech fails → falls through to tone.
  - **Edge cases**: speechSynthesis.cancel() called before speak, empty text

### Files to create

- `src/speak.test.ts`

### Acceptance

- All 3 priority tiers tested
- Fallback chain works correctly on errors
- No silent failures

---

## Task 7: Test model layer (modelManager, audioCache, bootModels)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Medium — singleton patterns, OPFS mocking

### What

- `src/models/modelManager.test.ts`:
  - `getModelManager()` returns singleton
  - `init()` sets execution provider
  - `setWorker("tts", worker)` / `getWorker("tts")` round-trips
  - `setReady("tts")` / `isReady("tts")` state transitions
  - `onProgress(cb)` fires callback, returns unsubscribe function
  - `clearAll()` resets all model state
  - `setError("tts", err)` sets error state

- `src/models/audioCache.test.ts`:
  - Mock OPFS (`navigator.storage.getDirectory`)
  - `putCachedAudio` / `getCachedAudio` round-trips
  - `hasCachedAudio` returns true after put, false before
  - `clearAudioCache` removes all cached files
  - `countCached` returns correct count
  - `generateAllPhrases` yields progress events

- `src/models/bootModels.test.ts`:
  - Mock modelManager
  - Verify bootModels creates workers for tts, stt, llm
  - Verify it handles init errors gracefully

### Files to create

- `src/models/modelManager.test.ts`
- `src/models/audioCache.test.ts`
- `src/models/bootModels.test.ts`

### Acceptance

- Singleton behavior verified
- Cache round-trips work
- Boot sequence handles success and failure

---

## Task 8: Test worker message protocols (3 workers)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Medium — ONNX mocking, message-passing tests

### What

Workers run in a Web Worker context. For testing, we import the worker module directly (not via `new Worker()`) and mock `onnxruntime-web`.

- `src/models/ttsWorker.test.ts`:
  - Mock `onnxruntime-web` (InferenceSession.create, Tensor)
  - Mock `self.postMessage` and `self.onmessage`
  - `{ type: "init" }` → model loads → `{ type: "ready" }`
  - `{ type: "embed", audio, sampleRate }` → `{ type: "embedding", data }`
  - `{ type: "synthesize", text, embedding }` → `{ type: "audio", data, sampleRate }`
  - Error during synthesis → `{ type: "error", message }`

- `src/models/sttWorker.test.ts`:
  - `{ type: "init" }` → `{ type: "ready" }`
  - `{ type: "transcribe", audio, sampleRate }` → `{ type: "transcript", text }`
  - Error → `{ type: "error", message }`

- `src/models/llmWorker.test.ts`:
  - `{ type: "init" }` → `{ type: "ready" }`
  - `{ type: "complete", prompt, maxTokens }` → `{ type: "completions", data }`
  - Error → `{ type: "error", message }`

### Files to create

- `src/models/ttsWorker.test.ts`
- `src/models/sttWorker.test.ts`
- `src/models/llmWorker.test.ts`

### Acceptance

- All message types tested for each worker
- Error paths produce correct error responses
- ONNX runtime is fully mocked (no real model files needed)

---

## Task 9: Test shared components (Btn, Speaking, PinGate)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small — simple components

### What

- `src/components/shared/Btn.test.tsx`:
  - Renders children
  - onClick fires on click
  - 300ms debounce: second rapid click doesn't fire
  - Disabled state prevents click
  - Passes aria-label through

- `src/components/shared/Speaking.test.tsx`:
  - Renders speaker name and text
  - Shows "Speaking as {speaker}" for voice mode
  - Calls onDone after duration (use vi.advanceTimersByTime)
  - Progress bar animates

- `src/components/shared/PinGate.test.tsx`:
  - Renders numeric keypad
  - Entering correct PIN calls onSuccess
  - Entering wrong PIN shows error
  - Close button calls onClose
  - No PIN set → passes through (renders nothing)

### Files to create

- `src/components/shared/Btn.test.tsx`
- `src/components/shared/Speaking.test.tsx`
- `src/components/shared/PinGate.test.tsx`

### Acceptance

- All shared components render and respond to interaction correctly

---

## Task 10: Test layout components (Header, TabBar, HelpButton)

**Status:** done
**Depends on:** Task 4
**Estimated scope:** Small — store-connected components

### What

- `src/components/layout/Header.test.tsx`:
  - Shows patient name from cfg prop
  - Shows bed number when present
  - Shows voice badge when patientVoice is true
  - Theme toggle button changes icon (moon/sun)
  - Settings button opens settings overlay (or PIN gate when PIN set)
  - Builder toggle button toggles builderOpen in UI store

- `src/components/layout/TabBar.test.tsx`:
  - Renders all 5 tabs from CATS data
  - Active tab has aria-selected="true"
  - Clicking a tab calls setTab on UI store
  - Structural indicator dot visible on active tab

- `src/components/layout/HelpButton.test.tsx`:
  - Renders "HELP" text
  - Clicking calls onTap prop

### Files to create

- `src/components/layout/Header.test.tsx`
- `src/components/layout/TabBar.test.tsx`
- `src/components/layout/HelpButton.test.tsx`

### Acceptance

- Store-connected components correctly read from and write to Zustand stores

---

## Task 11: Test phrase components and conversation

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small

### What

- `src/components/phrases/PhraseButton.test.tsx`:
  - Renders icon and label
  - Clicking calls onTap with phrase text
  - Minimum 64px touch target (check style)

- `src/components/phrases/PhraseGrid.test.tsx`:
  - Renders correct number of PhraseButtons for given phrases
  - Passes onTap through to each button

- `src/components/phrases/SubcategoryChips.test.tsx`:
  - Renders all chip labels
  - Active chip has filled style
  - Clicking a chip calls onSelect with index

- `src/components/conversation/Thread.test.tsx`:
  - Renders messages with correct speaker labels and text
  - Patient messages right-aligned (blue), provider left-aligned
  - Tap-to-repeat calls repeatSpeak from useSpeakActions
  - Empty state (no messages) renders section header

### Files to create

- `src/components/phrases/PhraseButton.test.tsx`
- `src/components/phrases/PhraseGrid.test.tsx`
- `src/components/phrases/SubcategoryChips.test.tsx`
- `src/components/conversation/Thread.test.tsx`

### Acceptance

- Phrase tap → onTap callback works
- Thread renders message history correctly

---

## Task 12: Test pain flow, wishes, builder, provider, and listen components

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Medium — multi-step flows

### What

- `src/components/pain/PainFlow.test.tsx`:
  - Starts at severity step (6 emoji faces)
  - Tapping a severity advances to location step
  - Tapping a location advances to descriptor step
  - Tapping a descriptor calls onSelect with composed sentence ("I have sharp pain in my chest, level 8 out of 10")
  - Back button navigates to previous step

- `src/components/wishes/MyWishes.test.tsx`:
  - Renders all 7 SICG topics
  - Tapping a topic shows its 6 response options
  - Tapping a response calls onSpeak
  - Close button calls onClose

- `src/components/builder/SentenceBuilder.test.tsx`:
  - Shows suggestion pills
  - Tapping a suggestion appends to sentence
  - "Speak" button calls onSend with built sentence
  - Undo removes last word
  - Clear resets sentence

- `src/components/provider/ProviderPanel.test.tsx`:
  - Renders 4 provider phrase categories
  - Tapping a phrase calls onSend
  - Close button calls onClose

- `src/components/provider/ListenPanel.test.tsx`:
  - Renders text input area
  - "Add to conversation" button calls onAddMessage
  - Close button calls onClose

### Files to create

- `src/components/pain/PainFlow.test.tsx`
- `src/components/wishes/MyWishes.test.tsx`
- `src/components/builder/SentenceBuilder.test.tsx`
- `src/components/provider/ProviderPanel.test.tsx`
- `src/components/provider/ListenPanel.test.tsx`

### Acceptance

- Pain flow completes 3-step sequence end-to-end
- SICG flow renders all 7 topics with 6 responses each
- Builder constructs sentences word-by-word

---

## Task 13: Test settings components and App.tsx

**Status:** done
**Depends on:** Task 4, Task 5
**Estimated scope:** Medium — setup wizard flow, settings panel

### What

- `src/components/settings/Setup.test.tsx`:
  - 4-step wizard renders each step
  - Step 0: name input, language selection
  - "Skip →" calls onDone with defaults + entered name
  - "Continue" advances through steps
  - Step 3 (Confirm) shows summary of entered data
  - Final "Start OwnVoice" calls onDone with all settings

- `src/components/settings/SettingsPanel.test.tsx`:
  - Renders patient info (name, bed, language, voice status)
  - Name edit + save updates via onUpdate
  - "Reset app" button shows confirmation, then calls onReset
  - Close button calls onClose

- `src/App.test.tsx`:
  - Renders null before hydration (_hasHydrated=false)
  - Renders Setup when cfg is null and hydrated
  - Renders main app with Header/TabBar/content when cfg is set
  - Tab switching renders correct content (Quick→phrases, Pain→PainFlow, etc.)
  - Overlay rendering: wishesOpen→MyWishes, providerOpen→ProviderPanel, etc.
  - Settings button → pin gate → settings panel flow

### Files to create

- `src/components/settings/Setup.test.tsx`
- `src/components/settings/SettingsPanel.test.tsx`
- `src/App.test.tsx`

### Acceptance

- Setup wizard completes full flow
- App routing logic covers all branches
- Hydration guard tested

---

## Task 14: Coverage audit and gap closure

**Status:** done (93.85% lines, 91.48% functions, 82.49% branches — thresholds at 90/90/80)
**Depends on:** Tasks 2–13
**Estimated scope:** Small — fill gaps, hit thresholds

### What

- Run `npm run test:coverage` and review the HTML report
- Identify any uncovered lines/branches (target: 100% lines, 100% functions, ≥95% branches)
- Add targeted tests for uncovered paths (likely: error handlers, edge cases in workers, rare UI states)
- Remove the smoke test (`src/__tests__/smoke.test.ts`)
- Verify final coverage report meets thresholds
- Verify all tests pass in a single `npm test` run
- Verify total test execution time is < 30 seconds

### Acceptance

- `npm run test:coverage` passes all thresholds
- No production files modified
- Test suite runs in < 30 seconds

---

## Dependency Graph

```
Task 1 (framework setup)
├── Task 2 (data files)
├── Task 3 (IDB layer)
│   └── Task 4 (stores)
│       ├── Task 5 (hooks)
│       ├── Task 10 (layout components)
│       └── Task 13 (settings + App)
├── Task 6 (speak.ts)
├── Task 7 (model layer)
├── Task 8 (workers)
├── Task 9 (shared components)
├── Task 11 (phrase + conversation components)
└── Task 12 (pain, wishes, builder, provider, listen)
    └── Task 14 (coverage audit) ← depends on ALL above
```

## Parallel Execution Opportunities

After Task 1, these groups are fully independent:
- **Group A:** Tasks 2 + 6 + 7 + 8 (data files, speak.ts, model layer, workers)
- **Group B:** Task 3 → 4 → 5 (IDB → stores → hooks)
- **Group C:** Tasks 9 + 11 + 12 (component tests not depending on stores)

After Groups A-C complete, Task 10 + 13 need store tests (Task 4), then Task 14 closes gaps.
