# Design: Add Unit Test Coverage

## Test Framework

**Vitest** — the native test runner for Vite projects. Zero-config with the existing `vite.config.ts`, shares the same transform pipeline (Preact JSX, TypeScript, path aliases).

### Dependencies

```
vitest                          — test runner + assertion library
@testing-library/preact         — component rendering + queries
@testing-library/jest-dom       — DOM assertions (toBeVisible, toHaveTextContent)
jsdom                           — browser environment for component tests
fake-indexeddb                  — in-memory IDB for store/persistence tests
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/OwnVoice.jsx",
        "src/__tests__/**",
        "src/env.d.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 95,
      },
    },
  },
});
```

### Setup File

`src/__tests__/setup.ts` configures the global test environment:

- Import `fake-indexeddb/auto` to polyfill IndexedDB for all tests
- Import `@testing-library/jest-dom` for DOM matchers
- Mock `speechSynthesis` globally (not available in jsdom)
- Mock `AudioContext` globally
- Mock `navigator.mediaDevices.getUserMedia` globally
- Reset all mocks between tests via `afterEach`

## Test File Organization

Tests live next to the source files they test:

```
src/
├── stores/
│   ├── uiStore.ts
│   ├── uiStore.test.ts          ← store tests
│   ├── settingsStore.ts
│   ├── settingsStore.test.ts
│   ├── conversationStore.ts
│   ├── conversationStore.test.ts
│   ├── idbStorage.ts
│   ├── idbStorage.test.ts
│   ├── resetAll.ts
│   └── resetAll.test.ts
├── hooks/
│   ├── useSpeakActions.ts
│   ├── useSpeakActions.test.ts
│   ├── useMicrophone.ts
│   ├── useMicrophone.test.ts
│   ├── useModels.ts
│   ├── useModels.test.ts
│   ├── useDebouncedTap.ts
│   ├── useDebouncedTap.test.ts
│   ├── useTheme.ts
│   └── useTheme.test.ts
├── models/
│   ├── modelManager.ts
│   ├── modelManager.test.ts
│   ├── audioCache.ts
│   ├── audioCache.test.ts
│   ├── bootModels.ts
│   ├── bootModels.test.ts
│   ├── ttsWorker.ts
│   ├── ttsWorker.test.ts
│   ├── sttWorker.ts
│   ├── sttWorker.test.ts
│   ├── llmWorker.ts
│   └── llmWorker.test.ts
├── data/
│   ├── phrases.ts
│   ├── phrases.test.ts
│   ├── suggestions.ts
│   ├── suggestions.test.ts
│   ├── suggestion-trees.ts
│   ├── suggestion-trees.test.ts
│   ├── wishes.ts
│   ├── wishes.test.ts
│   ├── pain.ts
│   ├── pain.test.ts
│   ├── provider-phrases.ts
│   └── provider-phrases.test.ts
├── theme/
│   ├── tokens.ts
│   └── tokens.test.ts
├── speak.ts
├── speak.test.ts
├── store.ts
├── store.test.ts
├── types.ts                     ← no test needed (type-only, no runtime)
├── App.tsx
├── App.test.tsx
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Header.test.tsx
│   │   ├── TabBar.tsx
│   │   ├── TabBar.test.tsx
│   │   ├── HelpButton.tsx
│   │   └── HelpButton.test.tsx
│   ├── phrases/
│   │   ├── PhraseButton.tsx
│   │   ├── PhraseButton.test.tsx
│   │   ├── PhraseGrid.tsx
│   │   ├── PhraseGrid.test.tsx
│   │   ├── SubcategoryChips.tsx
│   │   └── SubcategoryChips.test.tsx
│   ├── conversation/
│   │   ├── Thread.tsx
│   │   └── Thread.test.tsx
│   ├── pain/
│   │   ├── PainFlow.tsx
│   │   └── PainFlow.test.tsx
│   ├── wishes/
│   │   ├── MyWishes.tsx
│   │   └── MyWishes.test.tsx
│   ├── builder/
│   │   ├── SentenceBuilder.tsx
│   │   └── SentenceBuilder.test.tsx
│   ├── provider/
│   │   ├── ProviderPanel.tsx
│   │   ├── ProviderPanel.test.tsx
│   │   ├── ListenPanel.tsx
│   │   └── ListenPanel.test.tsx
│   ├── settings/
│   │   ├── SettingsPanel.tsx
│   │   ├── SettingsPanel.test.tsx
│   │   ├── Setup.tsx
│   │   └── Setup.test.tsx
│   └── shared/
│       ├── Btn.tsx
│       ├── Btn.test.tsx
│       ├── Speaking.tsx
│       ├── Speaking.test.tsx
│       ├── PinGate.tsx
│       └── PinGate.test.tsx
└── __tests__/
    └── setup.ts                 ← global test setup
```

## Mocking Strategy

### IndexedDB — `fake-indexeddb`

Imported in `setup.ts` via `fake-indexeddb/auto`. All store tests and `idbStorage` tests get a real in-memory IDB. No manual mocking needed — the polyfill provides a complete implementation including transactions, key ranges, and versioning.

### Web APIs — Global Mocks in setup.ts

```typescript
// speechSynthesis
global.speechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
};

// AudioContext
global.AudioContext = vi.fn(() => ({
  createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array()) })),
  createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null, buffer: null })),
  createOscillator: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: "", frequency: { value: 0 } })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } })),
  destination: {},
  currentTime: 0,
  state: "running",
  resume: vi.fn(),
  close: vi.fn(),
  decodeAudioData: vi.fn(),
  sampleRate: 24000,
}));
```

### ONNX Runtime — Per-worker vi.mock

Each worker test file mocks `onnxruntime-web` at the module level:

```typescript
vi.mock("onnxruntime-web", () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      run: vi.fn().mockResolvedValue({ output: { data: new Float32Array(16000) } }),
    }),
  },
  Tensor: vi.fn((type, data, dims) => ({ type, data, dims })),
  env: { wasm: {} },
}));
```

The worker tests then exercise the message protocol:
1. Send `{ type: "init" }` → expect `{ type: "ready" }` response
2. Send `{ type: "synthesize", text, embedding }` → expect `{ type: "audio", data, sampleRate }`
3. Send invalid message → expect `{ type: "error" }`

### OPFS — Mock for audioCache tests

`navigator.storage.getDirectory()` is mocked to return an in-memory file system stub. Cache tests verify put/get/clear logic without real OPFS.

### Zustand Store Testing

Stores are tested by calling actions directly on the store instance, not through hooks:

```typescript
import { useSettingsStore } from "./settingsStore";

beforeEach(() => {
  // Reset store to initial state between tests
  useSettingsStore.setState({ cfg: null, speakerData: null, _hasHydrated: false });
});

test("setCfg updates cfg", () => {
  useSettingsStore.getState().setCfg({ patientName: "Test", ... });
  expect(useSettingsStore.getState().cfg?.patientName).toBe("Test");
});
```

For persistence tests, `fake-indexeddb` provides the IDB backend. We verify the persist middleware writes and reads correctly by:
1. Setting state
2. Waiting for the async IDB write (via `vi.advanceTimersByTime` for debounced stores)
3. Creating a new store instance and verifying it hydrates the saved state

### Component Testing

Components are rendered with `@testing-library/preact`'s `render()`. Zustand stores are pre-set with test state via `setState()` before rendering. User interactions use `fireEvent.click()`.

```typescript
import { render, screen, fireEvent } from "@testing-library/preact";
import { useSettingsStore } from "../../stores/settingsStore";
import { Header } from "./Header";

test("shows patient name", () => {
  useSettingsStore.setState({ cfg: { patientName: "Eleanor", ... }, _hasHydrated: true });
  render(<Header cfg={useSettingsStore.getState().cfg!} />);
  expect(screen.getByText("Eleanor")).toBeInTheDocument();
});
```

### Hook Testing

Hooks are tested using `renderHook` from `@testing-library/preact`:

```typescript
import { renderHook, act } from "@testing-library/preact";
import { useTheme } from "./useTheme";

test("toggles theme", () => {
  const { result } = renderHook(() => useTheme());
  expect(result.current.theme).toBe("light");
  act(() => result.current.toggle());
  expect(result.current.theme).toBe("dark");
});
```

## Test Categories and What They Verify

| Category | Files | What Tests Verify |
|----------|-------|-------------------|
| Stores | 5 stores + idbStorage + resetAll | State mutations, persistence round-trips, hydration, cross-store reset |
| Hooks | 5 hooks | Return values, side effects, callback stability, store integration |
| speak.ts | 1 file | 3-tier fallback chain, error handling, audio playback, timeout behavior |
| Workers | 3 workers | Message protocol (init→ready, request→response, error handling), ONNX mock integration |
| Model layer | modelManager, audioCache, bootModels | Singleton lifecycle, cache hit/miss, progress callbacks, worker registration |
| Data files | 6 data modules | Structure integrity (category IDs, phrase counts, SICG 7 topics × 6 responses, pain scale 6 levels), export shapes |
| Theme | tokens.ts | Both palettes export all required keys, no missing tokens |
| Components | 18 components + App.tsx | Rendering, user interaction, prop forwarding, accessibility attributes, conditional rendering |

## Performance Target

All tests run in < 30 seconds. Vitest's parallel execution + jsdom (faster than browser) + mocked IDB/OPFS keeps individual tests under 50ms.
