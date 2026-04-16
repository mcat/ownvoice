# Design: Adopt Zustand for State Management

## Overview

Three Zustand stores replace the current `App.tsx` state monolith and two custom hooks (`useConversation`, `useSpeak`). Each store has a clear boundary:

| Store | State | Persisted? | Why separate |
|-------|-------|-----------|--------------|
| `useSettingsStore` | Patient config, providers, PIN, voice state, speaker data | Yes (IndexedDB) | Survives page reloads, cleared on patient reset |
| `useConversationStore` | Message history | Yes (IndexedDB, debounced) | High-frequency writes, independent lifecycle |
| `useUIStore` | Active tab, subcategory, overlay booleans, speaking state | No | Transient per-session state, no persistence needed |

The existing `useTheme` hook stays as-is — it manages a DOM side effect (toggling the `dark` class on `<html>`) that doesn't belong in a Zustand store. Components that need theme tokens continue calling `useTheme()` directly.

## Store Definitions

### useSettingsStore

Replaces: `cfg` state in `App.tsx`, `loadSettings`/`saveSettings` from `store.ts`, `speakerData` state, `saveSpeakerData`/`loadSpeakerData`.

```typescript
// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, Provider } from '../types';

interface SettingsState {
  // null until setup is complete
  cfg: AppSettings | null;
  speakerData: unknown | null;

  // Actions
  setCfg: (cfg: AppSettings) => void;
  updateCfg: (partial: Partial<AppSettings>) => void;
  setSpeakerData: (data: unknown) => void;
  reset: () => void;
}
```

**Persistence:** Uses Zustand `persist` middleware with a custom IndexedDB storage adapter. The adapter wraps the same `ownvoice` database but through Zustand's storage interface, so we get automatic hydration on mount and writes on every state change. Settings are small (<1KB) and change infrequently, so no debouncing is needed.

**Speaker data:** Stored in the same store because it's conceptually part of the patient's voice configuration. The `persist` middleware handles IndexedDB structured clone of typed arrays natively.

### useConversationStore

Replaces: `useConversation` hook, `loadConversation`/`saveConversation` from `store.ts`.

```typescript
// src/stores/conversationStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Message } from '../types';

interface ConversationState {
  messages: Message[];

  // Actions
  addMessage: (text: string, from: 'patient' | 'provider', label: string) => void;
  clear: () => void;
}
```

**Persistence:** Uses `persist` middleware with IndexedDB storage. To preserve the existing debounced-write behavior (avoid hammering IndexedDB on rapid phrase taps), the custom storage adapter wraps `setItem` in a 500ms debounce — matching the current `useConversation` implementation.

**Timestamp formatting:** The `addMessage` action generates the timestamp (`new Date().toLocaleTimeString(...)`) internally, same as the current hook.

### useUIStore

Replaces: `tab`, `sub`, `builderOpen`, `wishesOpen`, `providerOpen`, `listenOpen`, `settingsOpen`, `pinEntryOpen`, `activeProvIdx` state, and `speaking` from `useSpeak`.

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand';
import type { SpeakingState } from '../types';

interface UIState {
  tab: string;
  sub: number;
  builderOpen: boolean;
  wishesOpen: boolean;
  providerOpen: boolean;
  listenOpen: boolean;
  settingsOpen: boolean;
  pinEntryOpen: boolean;
  activeProvIdx: number;
  speaking: SpeakingState | null;

  // Actions
  setTab: (tab: string) => void;
  setSub: (sub: number) => void;
  toggleBuilder: () => void;
  openOverlay: (name: 'wishes' | 'provider' | 'listen' | 'settings' | 'pinEntry') => void;
  closeOverlay: (name: 'wishes' | 'provider' | 'listen' | 'settings' | 'pinEntry') => void;
  closeAllOverlays: () => void;
  setActiveProvIdx: (idx: number) => void;
  setSpeaking: (state: SpeakingState | null) => void;
  resetUI: () => void;
}
```

**Not persisted.** Tab position and overlay states are ephemeral — on reload, you start at the Quick tab with no overlays open. This is the current behavior.

**The `openOverlay` / `closeOverlay` pattern** replaces 5 separate `setXxxOpen` setters. A single function keyed by overlay name reduces boilerplate while keeping the store API explicit.

## IndexedDB Storage Adapter

A single shared adapter used by both persisted stores:

```typescript
// src/stores/idbStorage.ts
import { type StateStorage } from 'zustand/middleware';

const DB_NAME = 'ownvoice';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

export function createIDBStorage(): StateStorage {
  // Reuses the same DB and object store as the current store.ts
  // getItem / setItem / removeItem backed by IndexedDB
}

export function createDebouncedIDBStorage(ms: number): StateStorage {
  // Same as above but setItem is debounced by ms
}
```

This replaces `store.ts`'s raw IndexedDB helpers. The `clearAll()` function becomes a composed action:

```typescript
// src/stores/resetAll.ts
export function resetAll() {
  useSettingsStore.getState().reset();
  useConversationStore.getState().clear();
  useUIStore.getState().resetUI();
  clearAudioCache();
  getModelManager().clearAll();
}
```

## Component Migration Pattern

### Before (prop-drilled)

```tsx
// App.tsx
<Header
  cfg={cfg}
  theme={theme}
  t={t}
  isBuilderOpen={builderOpen}
  onToggleBuilder={() => setBuilderOpen(b => !b)}
  onOpenWishes={() => setWishesOpen(true)}
  onOpenListen={() => setListenOpen(true)}
  onOpenProvider={() => setProviderOpen(true)}
  onOpenSettings={handleSettingsOpen}
  onToggleTheme={toggleTheme}
/>

// Header.tsx — 11 props
interface HeaderProps {
  cfg: AppSettings; theme: ThemeName; t: ThemeTokens;
  isBuilderOpen: boolean;
  onToggleBuilder: () => void; onOpenWishes: () => void;
  onOpenListen: () => void; onOpenProvider: () => void;
  onOpenSettings: () => void; onToggleTheme: () => void;
}
```

### After (store selectors)

```tsx
// App.tsx — no props to Header
<Header />

// Header.tsx — 0 drilled props, reads stores directly
export function Header() {
  const cfg = useSettingsStore(s => s.cfg);
  const { builderOpen, toggleBuilder, openOverlay } = useUIStore(
    s => ({ builderOpen: s.builderOpen, toggleBuilder: s.toggleBuilder, openOverlay: s.openOverlay })
  );
  const { theme, toggle: toggleTheme, t } = useTheme();
  // ...
}
```

### Props that remain as props

Not everything moves to stores. Component-specific callbacks that involve **composition** (calling multiple actions together) stay as props from `App.tsx`:

- `onTap` on `PhraseGrid` / `PhraseButton` — these call `speakAsPatient` which composes `addMessage` + `speakText`. This composition stays in `App.tsx` as a thin helper, or moves to a `useSpeakActions` convenience hook that composes across stores.
- `onSend` on `SentenceBuilder` — composes speak + close overlay.
- `onDone` on `Setup` — sets the initial config.

Theme tokens (`t`) no longer need to be prop-drilled. Components call `useTheme()` directly. Since `useTheme` is a hook (not a store), this doesn't add subscription overhead — it's the same pattern as today but without the intermediary prop.

## Composed Actions Hook

Actions that span multiple stores (speak-as-patient, speak-as-provider, reset) live in a convenience hook:

```typescript
// src/hooks/useSpeakActions.ts
export function useSpeakActions() {
  const cfg = useSettingsStore(s => s.cfg);
  const speakerData = useSettingsStore(s => s.speakerData);
  const addMessage = useConversationStore(s => s.addMessage);
  const setSpeaking = useUIStore(s => s.setSpeaking);

  const speakAsPatient = useCallback((text: string) => {
    if (!cfg) return;
    addMessage(text, 'patient', cfg.patientName);
    const speaker: Speaker = { name: cfg.patientName, type: 'patient', embedding: speakerData ?? undefined, lang: cfg.patientLang };
    setSpeaking({ text, from: 'patient' });
    speakFn(text, speaker);
    setTimeout(() => setSpeaking(null), Math.max(1400, text.length * 55));
  }, [cfg, speakerData, addMessage, setSpeaking]);

  // speakAsProvider, repeatSpeak similarly

  return { speakAsPatient, speakAsProvider, repeatSpeak };
}
```

This hook replaces the `speakAsPatient`, `speakAsProvider`, `addToThread`, `repeatSpeak` callbacks currently defined in `App.tsx`. Components that need these (PhraseGrid, PainFlow, MyWishes, etc.) call `useSpeakActions()` instead of receiving callback props.

## Migration Strategy

**Incremental, one store at a time.** Each store can be introduced independently:

1. First `useUIStore` — purely transient state, no persistence, lowest risk.
2. Then `useSettingsStore` — adds persistence middleware, replaces `cfg` prop drilling.
3. Then `useConversationStore` — replaces `useConversation` hook and debounced persistence.
4. Finally, remove the old `useConversation` and `useSpeak` hooks, and simplify `store.ts`.

At each step the app remains fully functional — old and new patterns coexist until migration is complete.

## What Gets Deleted

After full migration:

- `src/hooks/useConversation.ts` — replaced by `useConversationStore`
- `src/hooks/useSpeak.ts` — speaking state moves to `useUIStore`, speak logic to `useSpeakActions`
- `src/store.ts` — raw IndexedDB helpers replaced by `idbStorage.ts` adapter; `clearAll` replaced by `resetAll.ts`

## What Stays Unchanged

- `src/hooks/useTheme.ts` — DOM side effect, not pure state
- `src/hooks/useDebouncedTap.ts` — per-button ref-based logic, not global state
- `src/hooks/useModels.ts` — model lifecycle management, separate concern
- `src/hooks/useMicrophone.ts` — device API interaction, not app state
- `src/speak.ts` — audio pathway, unchanged
- All data files in `src/data/` — static constants
- All model files in `src/models/` — worker/manager architecture

## Bundle Impact

- Zustand core: ~1KB gzipped
- Zustand persist middleware: ~0.5KB gzipped
- Removed: `useConversation` (~0.4KB), `useSpeak` (~0.3KB), `store.ts` IndexedDB helpers (~0.8KB)
- **Net delta: approximately +0KB to -0.5KB** — effectively neutral.
