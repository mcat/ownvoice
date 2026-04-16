# Tasks: Adopt Zustand for State Management

## Task 1: Install Zustand and create IndexedDB storage adapter

**Status:** done
**Depends on:** none
**Estimated scope:** Small — foundation for all stores

### What

- Install `zustand` as a dependency (`npm install zustand`)
- Create `src/stores/idbStorage.ts`:
  - `createIDBStorage()` — implements Zustand's `StateStorage` interface (`getItem`, `setItem`, `removeItem`) backed by the existing `ownvoice` IndexedDB database and `kv` object store
  - `createDebouncedIDBStorage(ms)` — same interface but `setItem` is debounced by `ms` milliseconds
  - Reuses the same DB_NAME (`ownvoice`), DB_VERSION (1), and STORE_NAME (`kv`) as the current `store.ts` so existing persisted data is automatically picked up
- Verify: `npm run build` succeeds

### Files to create/modify

- `package.json` — add `zustand`
- `src/stores/idbStorage.ts` — new

### Acceptance

- `zustand` appears in `package.json` dependencies
- `createIDBStorage()` returns a valid `StateStorage` object
- Build succeeds

---

## Task 2: Create useUIStore (transient state)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Medium — most state fields, but no persistence

### What

- Create `src/stores/uiStore.ts`:
  - State: `tab` (default `"quick"`), `sub` (default `0`), `builderOpen`, `wishesOpen`, `providerOpen`, `listenOpen`, `settingsOpen`, `pinEntryOpen` (all default `false`), `activeProvIdx` (default `0`), `speaking` (default `null`)
  - Actions: `setTab(tab)` (also resets `sub` to 0 and closes builder), `setSub(sub)`, `toggleBuilder()`, `openOverlay(name)`, `closeOverlay(name)`, `closeAllOverlays()`, `setActiveProvIdx(idx)`, `setSpeaking(state)`, `resetUI()` (restores all defaults)
  - No persistence middleware — all state is transient
- Migrate `App.tsx`:
  - Remove `useState` for: `tab`, `sub`, `builderOpen`, `wishesOpen`, `providerOpen`, `listenOpen`, `settingsOpen`, `pinEntryOpen`, `activeProvIdx`
  - Remove `handleTabSelect` callback (replaced by `setTab` action)
  - Replace all references with `useUIStore` selectors
- Migrate `Header.tsx`:
  - Remove `isBuilderOpen`, `onToggleBuilder`, `onOpenWishes`, `onOpenListen`, `onOpenProvider`, `onOpenSettings` props
  - Import `useUIStore` and call `toggleBuilder()`, `openOverlay('wishes')`, etc. directly
- Migrate `TabBar.tsx`:
  - Remove `activeTab`, `onSelect` props
  - Import `useUIStore` for `tab` and `setTab`
- Update `Speaking.tsx` usage in `App.tsx`:
  - Read `speaking` from `useUIStore` instead of `useSpeak` hook

### Files to create/modify

- `src/stores/uiStore.ts` — new
- `src/App.tsx` — remove 9 useState calls, use store
- `src/components/layout/Header.tsx` — remove 6 callback props, use store
- `src/components/layout/TabBar.tsx` — remove `activeTab`/`onSelect` props, use store

### Acceptance

- `App.tsx` has no `useState` for tab, sub, or overlay booleans
- Header and TabBar have no callback props for navigation/overlays
- Tab switching, overlay open/close, builder toggle all work as before
- No visual or behavioral changes

---

## Task 3: Create useSettingsStore (persisted)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Medium — IndexedDB persistence adds complexity

### What

- Create `src/stores/settingsStore.ts`:
  - State: `cfg` (`AppSettings | null`, default `null`), `speakerData` (`unknown | null`, default `null`)
  - Actions: `setCfg(cfg)`, `updateCfg(partial)` (merges partial into existing cfg), `setSpeakerData(data)`, `reset()` (sets both to null)
  - Uses `persist` middleware with `createIDBStorage()` adapter
  - Persistence key: `"settings"` in the `ownvoice` IndexedDB
  - `partialize` option to persist only `cfg` and `speakerData` (not actions)
- Migrate `App.tsx`:
  - Remove `useState` for `cfg` and `speakerData`
  - Remove `loadSettings` call on mount (handled by `persist` hydration)
  - Remove `loadSpeakerData` / `saveSpeakerData` calls
  - Remove `handleSpeakerDataCreated` callback
  - Replace `setCfg` with `useSettingsStore.getState().setCfg`
- Migrate `SettingsPanel.tsx`:
  - Remove `cfg`, `onUpdate` props
  - Import `useSettingsStore` for `cfg` and `updateCfg`
- Migrate `ProviderPanel.tsx`:
  - Remove `cfg`, `activeProvIdx`, `onSelectProvider` props (activeProvIdx already in uiStore from Task 2)
  - Import `useSettingsStore` for `cfg`
- Migrate `ListenPanel.tsx`:
  - Remove `providers`, `activeProvIdx`, `onSelectProvider` props
  - Import from stores
- Migrate `MyWishes.tsx`:
  - Remove `patientName` prop
  - Read from `useSettingsStore(s => s.cfg?.patientName)`
- Migrate `Setup.tsx`:
  - Remove `onDone` prop
  - Call `useSettingsStore.getState().setCfg(...)` directly on completion

### Files to create/modify

- `src/stores/settingsStore.ts` — new
- `src/App.tsx` — remove cfg/speakerData useState, remove IDB load calls
- `src/components/settings/SettingsPanel.tsx` — remove cfg/onUpdate props
- `src/components/provider/ProviderPanel.tsx` — remove cfg prop
- `src/components/provider/ListenPanel.tsx` — remove providers prop
- `src/components/wishes/MyWishes.tsx` — remove patientName prop
- `src/components/settings/Setup.tsx` — remove onDone prop

### Acceptance

- Settings persist across page reloads (same as current behavior)
- Speaker data persists across reloads
- Setup wizard sets config via store
- Settings panel reads/updates config via store
- No `cfg` prop passed from App.tsx to any child component

---

## Task 4: Create useConversationStore (persisted with debounce)

**Status:** done
**Depends on:** Task 1
**Estimated scope:** Small — straightforward store with debounced persistence

### What

- Create `src/stores/conversationStore.ts`:
  - State: `messages` (`Message[]`, default `[]`)
  - Actions: `addMessage(text, from, label)` (appends with timestamp), `clear()` (resets to `[]`)
  - Uses `persist` middleware with `createDebouncedIDBStorage(500)` adapter
  - Persistence key: `"conversation"` in the `ownvoice` IndexedDB
- Migrate `App.tsx`:
  - Remove `useConversation()` hook call
  - Replace `messages`, `addMessage`, `clearMessages` with store selectors
- Migrate `Thread.tsx`:
  - Remove `messages` and `onRepeat` props
  - Import `useConversationStore` for `messages`
  - `onRepeat` callback moves to `useSpeakActions` hook (Task 5)
- Migrate `SentenceBuilder.tsx`:
  - Remove `messages` prop
  - Import `useConversationStore(s => s.messages)` directly

### Files to create/modify

- `src/stores/conversationStore.ts` — new
- `src/App.tsx` — remove useConversation hook call
- `src/components/conversation/Thread.tsx` — remove messages/onRepeat props
- `src/components/builder/SentenceBuilder.tsx` — remove messages prop

### Acceptance

- Conversation persists across page reloads with 500ms debounce
- Messages appear in Thread without prop drilling
- SentenceBuilder reads conversation context directly
- Rapid phrase taps don't cause excessive IndexedDB writes

---

## Task 5: Create useSpeakActions hook and resetAll

**Status:** done
**Depends on:** Task 2, Task 3, Task 4
**Estimated scope:** Medium — composes across all three stores

### What

- Create `src/hooks/useSpeakActions.ts`:
  - `speakAsPatient(text)` — reads cfg + speakerData from settingsStore, calls addMessage on conversationStore, sets speaking on uiStore, calls `speak()` from `speak.ts`
  - `speakAsProvider(text)` — similar but reads activeProvIdx from uiStore, provider from settingsStore
  - `repeatSpeak(text, from)` — speaks without adding to conversation
  - `addToThread(text, from, label?)` — adds to conversation without speaking
  - Preserves the exact speaking overlay duration formula: `Math.max(1400, text.length * 55)`
- Create `src/stores/resetAll.ts`:
  - `resetAll()` — calls `reset()` on settingsStore, `clear()` on conversationStore, `resetUI()` on uiStore, `clearAudioCache()`, `getModelManager().clearAll()`
  - Replaces the `resetApp` callback in `App.tsx`
- Migrate `App.tsx`:
  - Remove `speakAsPatient`, `speakAsProvider`, `addToThread`, `repeatSpeak`, `resetApp` callbacks
  - Replace with `useSpeakActions()` hook
  - Wire remaining component props:
    - `PhraseGrid.onTap` → `speakAsPatient`
    - `PainFlow.onSelect` → `speakAsPatient`
    - `HelpButton.onTap` → `() => speakAsPatient("I need help")`
    - `MyWishes.onSpeak` → `speakAsPatient`
    - `ProviderPanel.onSend` → `speakAsProvider`
    - `SettingsPanel.onReset` → `resetAll`
- Migrate `Thread.tsx`:
  - Import `useSpeakActions` for `repeatSpeak`

### Files to create/modify

- `src/hooks/useSpeakActions.ts` — new
- `src/stores/resetAll.ts` — new
- `src/App.tsx` — remove callback definitions, use useSpeakActions
- `src/components/conversation/Thread.tsx` — use useSpeakActions for repeat

### Acceptance

- Tapping a phrase speaks it, shows overlay, and adds to conversation
- Provider phrases speak in provider voice
- Tap-to-repeat in Thread re-speaks without adding duplicate
- Reset clears all stores, audio cache, and model manager
- Speaking overlay shows for exact same duration as before

---

## Task 6: Remove legacy hooks and store.ts, clean up props

**Status:** done
**Depends on:** Task 5
**Estimated scope:** Small — deletion and cleanup

### What

- Delete `src/hooks/useConversation.ts` — fully replaced by `useConversationStore`
- Delete `src/hooks/useSpeak.ts` — speaking state in `useUIStore`, speak logic in `useSpeakActions`
- Simplify `src/store.ts`:
  - Remove `loadConversation`, `saveConversation`, `loadSettings`, `saveSettings`, `loadSpeakerData`, `saveSpeakerData`, `get`, `set`, `openDB`
  - Keep only `clearAll()` as a legacy shim that calls `resetAll()`, or remove entirely if nothing imports it
- Clean up component prop interfaces:
  - Remove unused Props interface fields that were migrated to stores
  - Remove unused imports
  - Verify all components compile with `npm run build`
- Verify `App.tsx` has zero `useState` for app-level state (only `useTheme`, `useSpeakActions`, and store selectors remain)
- Add devtools middleware to all stores (gated behind `import.meta.env.DEV`)

### Files to delete/modify

- `src/hooks/useConversation.ts` — delete
- `src/hooks/useSpeak.ts` — delete
- `src/store.ts` — delete or reduce to re-export
- All component files — remove stale prop interface fields and imports

### Acceptance

- `npm run build` succeeds with zero TypeScript errors
- No imports of deleted hooks anywhere in the codebase
- `App.tsx` has zero `useState` for app-level state
- Devtools middleware active in development mode
- All user flows work identically to before migration

---

## Task 7: End-to-end verification

**Status:** done
**Depends on:** Task 6
**Estimated scope:** Small — manual testing, no code changes expected

### What

Verify every user flow works identically to the pre-migration state:

- **Setup:** Complete 3-step wizard → config saved to store → app loads
- **Phrases:** Tap phrase on each tab (Quick, I Need, I Feel, Ask) → speaks + appears in thread
- **Pain flow:** Severity → location → descriptor → sentence spoken
- **Sentence Builder:** Open → tap suggestions → speak built sentence
- **My Wishes:** Open → select responses across topics → summary shows selections
- **Provider Panel:** Open (with PIN if set) → tap provider phrase → speaks as provider
- **Listen Panel:** Open → type text → add to conversation as provider message
- **Settings:** Open → edit name → save → verify name updated
- **Voice:** Add/remove patient voice in settings → badge updates in header
- **Theme:** Toggle dark/light → all components re-render with correct tokens
- **Conversation persistence:** Reload page → messages still present
- **Settings persistence:** Reload page → patient name and config preserved
- **Reset:** Reset app → all data cleared → setup wizard appears
- **Bundle size:** `npm run build` → verify dist size is within ±2KB of pre-migration

### Acceptance

- All flows above work without regression
- Build succeeds
- Bundle size delta < ±2KB gzipped

---

## Dependency Graph

```
Task 1 (install + IDB adapter)
├── Task 2 (useUIStore)        ─┐
├── Task 3 (useSettingsStore)  ─┤
├── Task 4 (useConversationStore)┤
│                               ├── Task 5 (useSpeakActions + resetAll)
│                               │   └── Task 6 (cleanup)
│                               │       └── Task 7 (verification)
```

## Parallel Execution Opportunities

Tasks 2, 3, and 4 are **fully independent** — they create separate stores and migrate different sets of components. They can be worked on simultaneously after Task 1 completes.

Task 5 depends on all three stores existing, then Task 6 and 7 are sequential.
