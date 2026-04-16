# Proposal: Add Unit Test Coverage

## What

Set up Vitest as the test framework and write unit tests for every source file in the production codebase (`src/`), targeting 100% line coverage across stores, hooks, utilities, model layer, data files, and Preact components.

## Why

1. **Zero tests exist.** The project has ~4,300 lines of testable logic and 18 components with no test runner, no test files, and no coverage tooling. Every change is validated manually.

2. **State management just changed.** The Zustand migration (stores, `useSpeakActions`, `resetAll`) introduced new persistence middleware, cross-store composition, and async hydration. Tests lock in the correct behavior before further development.

3. **Clinical safety.** OwnVoice is an AAC tool for hospitalized patients. The pain flow (Emoji-FPS), goals-of-care (SICG), and phrase library are clinically validated structures. Regressions in these flows could cause a patient to communicate the wrong pain level or wish. Tests are the safety net.

4. **Model layer complexity.** The TTS/STT/LLM workers use a message-passing protocol with error handling, timeouts, and fallback logic. The `speak()` function has a 3-tier priority chain (Chatterbox Turbo → Web Speech API → confirmation tone). These code paths are hard to exercise manually.

5. **Pre-production readiness.** The PRD targets production deployment. No CI pipeline can gate merges without tests.

## Scope

### In scope

- Install and configure Vitest with Preact support, jsdom environment, and coverage reporting
- Add `npm test` and `npm run test:coverage` scripts
- Test all 5 Zustand stores: state mutations, actions, persistence (mocked IDB), hydration, `resetAll`
- Test all 5 custom hooks: `useSpeakActions`, `useMicrophone`, `useModels`, `useDebouncedTap`, `useTheme`
- Test `speak.ts`: 3-tier fallback logic, Web Speech API mocking, audio buffer playback, error paths
- Test `store.ts`: `clearAll()` IndexedDB operation
- Test `idbStorage.ts`: `createIDBStorage()` and `createDebouncedIDBStorage()` with fake-indexeddb
- Test all 3 worker files (ttsWorker, sttWorker, llmWorker): mock ONNX Runtime, test message protocol (init → ready, synthesis → audio, errors, timeouts)
- Test `modelManager.ts`: singleton lifecycle, worker registration, progress callbacks, `clearAll`
- Test `audioCache.ts`: OPFS cache put/get/clear, embedding fingerprinting, `generateAllPhrases`
- Test `bootModels.ts`: model loading orchestration
- Test all 6 data files: structure validation, expected phrase counts, category IDs, SICG topic integrity
- Test all 18 Preact components: rendering, user interaction (tap → speak, tab switch, pain flow steps, setup wizard flow), prop behavior
- Test `App.tsx`: routing logic (setup → main app), overlay toggling, hydration guard
- Configure coverage thresholds in vitest.config: 100% lines, 100% functions, 95% branches
- Add vitest.config.ts with path aliases matching vite.config.ts

### Out of scope

- E2E / integration tests (Playwright, Cypress)
- Visual regression testing
- Performance benchmarks
- Testing the prototype file (`OwnVoice.jsx`)
- Testing `main.tsx` (just a render call)

## Non-goals

- This change does not modify any production code. Tests adapt to the code, not the other way around.
- No test-driven refactoring. If a module is hard to test, we mock its dependencies rather than restructuring it.
- No CI pipeline setup (that's a separate change).

## Success criteria

- `npm test` runs all tests and passes
- `npm run test:coverage` reports 100% line coverage, 100% function coverage, ≥95% branch coverage for all files in `src/` (excluding `main.tsx` and `OwnVoice.jsx`)
- No production source files are modified
- All tests run in < 30 seconds on a dev machine
