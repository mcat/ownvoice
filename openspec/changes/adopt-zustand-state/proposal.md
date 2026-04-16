# Proposal: Adopt Zustand for State Management

## What

Replace the current state management approach — 12+ `useState` hooks in `App.tsx`, prop-drilled through every component, with hand-rolled IndexedDB persistence — with Zustand stores. Three focused stores (`useSettingsStore`, `useConversationStore`, `useUIStore`) replace the prop-drilling chains and custom persistence code.

## Why

The original design chose "no state library" when the app was planned. Now that it's built, the reality is more complex than anticipated:

1. **App.tsx is a prop-drilling bottleneck.** `cfg`, `messages`, `speaking`, `speakerData`, `theme`, and overlay states are passed as props to 10+ child components (Header, TabBar, PhraseGrid, PainFlow, MyWishes, ProviderPanel, ListenPanel, SentenceBuilder, SettingsPanel, Thread). Adding a new feature means threading yet another prop through the tree.

2. **Hand-rolled IndexedDB persistence is fragile.** `store.ts` has 75 lines of raw IndexedDB boilerplate (`openDB`, `get`, `set`). `useConversation` reimplements debounced persistence with a `useRef` timer. Zustand's `persist` middleware handles this with IndexedDB storage in ~3 lines of configuration.

3. **Callbacks multiply with every feature.** `App.tsx` defines `speakAsPatient`, `speakAsProvider`, `addToThread`, `repeatSpeak`, `resetApp`, `handleTabSelect`, `handleSettingsOpen` — all wrapped in `useCallback` with dependency arrays that must be manually maintained. Zustand actions live in the store, eliminating callback prop chains.

4. **Zustand is tiny.** ~1KB gzipped. Smaller than the context providers + IndexedDB boilerplate it replaces. No impact on the <500KB bundle target.

5. **Zustand works with Preact.** It uses `useSyncExternalStore` under the hood, which Preact supports. No React-specific dependencies.

## Scope

### In scope

- Install `zustand` as a dependency
- Create `useSettingsStore` — patient config, providers, PIN, voice state, speaker data (persisted to IndexedDB)
- Create `useConversationStore` — message history with debounced IndexedDB persistence
- Create `useUIStore` — active tab, subcategory, overlay open/close states, speaking state (transient, not persisted)
- Migrate `App.tsx` from 12 `useState` calls to store selectors
- Remove prop-drilling of `cfg`, `messages`, `speaking`, `theme`, overlay states from all child components
- Update all components to import store hooks directly instead of receiving props
- Remove `useConversation` hook (replaced by `useConversationStore`)
- Remove `useSpeak` hook (speaking state moves to `useUIStore`, speak actions move to a store action)
- Simplify `store.ts` — remove hand-rolled get/set helpers, keep `clearAll()` as a composed action across stores
- Keep `useTheme` hook as-is (it manages a CSS class on the root element, which is a DOM side effect — not pure state)

### Out of scope

- Changing component structure or visual behavior — this is a pure refactor
- Adding new features
- Modifying the `speak.ts` audio pathway
- Changing the model manager, audio cache, or worker architecture
- Modifying the prototype (`OwnVoice.jsx`) — only the production codebase is affected

## Non-goals

- This is not a rewrite. Components keep their existing structure and behavior.
- No new UI. No new features. The app should be visually identical before and after.
- No devtools middleware in production — only enable for `import.meta.env.DEV`.

## Success criteria

- `npm run build` succeeds with zero TypeScript errors
- `App.tsx` has zero `useState` calls for app-level state (local component state like `confirmReset` in SettingsPanel is fine)
- No component receives `cfg`, `messages`, or overlay-toggle callbacks as props
- Settings and conversation persist across page reloads (same behavior as today)
- `resetApp` clears all stores and IndexedDB in one action
- Bundle size delta is < +2KB gzipped (Zustand is ~1KB, offset by removing boilerplate)
- All existing user flows work identically (phrase tap → speak → thread, pain flow, SICG, provider panel, setup, settings, reset)
