# Storage Display Honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the misleading "Storage: X GB of Y GB used (Z%)" line in `DiagnosticsSection` with a three-row clinical-first display (manifest-known models on device, persistence status with "Last used: {relative}", origin usage framed as a browser estimate) plus the supporting infrastructure: extended `useStorageHealth` hook, `lastInteractionAt` in `settingsStore`, pointerdown listener, audit logging of persistence results, and locale updates across all 24 locales.

**Architecture:** Lead with information we can compute precisely (manifest sum from `offlineStore.expectedBytes`) and demote the privacy-padded `navigator.storage.estimate()` to a tertiary "estimate" line. Track user interaction in the persisted `settingsStore` via a 60s-throttled `recordInteraction()` action so the `Intl.RelativeTimeFormat`-rendered "Last used" line is honest from app launch. Surface persistence state via `navigator.storage.persisted()` and re-poll on a manual "Check protection status" tap.

**Tech Stack:** TypeScript + Preact + Zustand (with IDB persist middleware) + Vitest + `@testing-library/preact` + `Intl.RelativeTimeFormat` (browser-native).

**Spec:** `docs/superpowers/specs/2026-05-14-storage-display-honesty-design.md`

---

## File Map

**New files:**
- None — all changes modify existing files.

**Modified:**
- `src/hooks/useStorageHealth.ts` — add `persisted` field and `requestPersist()` callback
- `src/hooks/useStorageHealth.test.ts` — new tests
- `src/stores/settingsStore.ts` — add `lastInteractionAt` + `recordInteraction` action + hydration seed
- `src/stores/settingsStore.test.ts` — new tests
- `src/main-app.tsx` — install document-level pointerdown listener
- `src/audit/events.ts` — add `MODEL_PERSIST_RESULT` event constant
- `src/models/modelManager.ts` — capture `persist()` return value, emit audit event
- `src/data/locales/en.ts` — add 6 keys, remove 3 obsolete keys (canonical)
- `src/data/locales/{ar,da,de,el,es,fi,fr,he,hi,it,ja,ko,ms,nl,no,pl,pt,ru,sw,tl,tr,vi,zh}.ts` — same key changes, translated
- `src/components/settings/sections/DiagnosticsSection.tsx` — replace storage line with three-row block
- `src/components/settings/sections/DiagnosticsSection.test.tsx` — new tests for each row state

**Branch:** Continue on `spec/storage-display-honesty` (or branch a child off it). All work merges to `main` as a single PR.

---

## Task 1: Extend `useStorageHealth` with persistence tracking

**Files:**
- Modify: `src/hooks/useStorageHealth.ts:1-49`
- Test: `src/hooks/useStorageHealth.test.ts`

- [ ] **Step 1: Read the current hook and its existing test to understand the contract.**

Read `src/hooks/useStorageHealth.ts` and `src/hooks/useStorageHealth.test.ts` end-to-end. Note that the hook polls every 60s and exposes `usage`, `quota`, `percentUsed`, and a `warning` flag computed against an 85% threshold.

- [ ] **Step 2: Write failing tests for `persisted` and `requestPersist`.**

Append to `src/hooks/useStorageHealth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/preact";
import { useStorageHealth } from "./useStorageHealth";

describe("useStorageHealth — persistence", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("reports `persisted: true` when navigator.storage.persisted() resolves true", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted: vi.fn(async () => true),
        persist: vi.fn(async () => true),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(true));
  });

  it("reports `persisted: false` when navigator.storage.persisted() resolves false", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted: vi.fn(async () => false),
        persist: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(false));
  });

  it("reports `persisted: null` when navigator.storage.persisted is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        // No `persisted` method present.
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.usage).toBe(100));
    expect(result.current.persisted).toBeNull();
  });

  it("`requestPersist()` calls navigator.storage.persist() and re-polls persisted()", async () => {
    const persist = vi.fn(async () => true);
    const persisted = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
        persisted,
        persist,
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => expect(result.current.persisted).toBe(false));

    await act(async () => {
      await result.current.requestPersist();
    });

    expect(persist).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.persisted).toBe(true));
  });
});
```

- [ ] **Step 3: Run the new tests to verify they fail.**

```bash
npm test -- src/hooks/useStorageHealth.test.ts
```

Expected: the four new tests fail with messages like `expected undefined to be true` or `result.current.requestPersist is not a function`. Existing tests still pass.

- [ ] **Step 4: Extend the `StorageHealth` interface and hook to implement.**

Replace the contents of `src/hooks/useStorageHealth.ts` with:

```typescript
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export interface StorageHealth {
  usage: number | null;
  quota: number | null;
  percentUsed: number | null;
  /** True when usage/quota >= 0.85 — clinician should be warned. */
  warning: boolean;
  /**
   * Whether the origin holds persistent-storage permission.
   * - `true`: granted; storage is protected from eviction.
   * - `false`: not granted; the browser may evict under pressure.
   * - `null`: API unavailable; status unknown.
   */
  persisted: boolean | null;
  /**
   * Request persistent storage and re-poll `persisted()` so the returned
   * status reflects the new state without waiting for the next 60s tick.
   * Resolves to the post-request `persisted()` value.
   */
  requestPersist: () => Promise<boolean | null>;
}

const POLL_MS = 60_000;
const WARN_THRESHOLD = 0.85;

export function useStorageHealth(): StorageHealth {
  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const cancelledRef = useRef(false);

  const pollPersisted = useCallback(async (): Promise<boolean | null> => {
    if (!navigator.storage?.persisted) return null;
    const value = await navigator.storage.persisted();
    if (!cancelledRef.current) setPersisted(value);
    return value;
  }, []);

  const pollEstimate = useCallback(async () => {
    if (!navigator.storage?.estimate) return;
    const est = await navigator.storage.estimate();
    if (cancelledRef.current) return;
    setUsage(est.usage ?? 0);
    setQuota(est.quota ?? 0);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void pollEstimate();
    void pollPersisted();
    const id = setInterval(() => {
      void pollEstimate();
      void pollPersisted();
    }, POLL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [pollEstimate, pollPersisted]);

  const requestPersist = useCallback(async (): Promise<boolean | null> => {
    if (!navigator.storage?.persist) return null;
    await navigator.storage.persist();
    return pollPersisted();
  }, [pollPersisted]);

  const percentUsed =
    usage != null && quota != null && quota > 0 ? (usage / quota) * 100 : null;
  const warning =
    usage != null && quota != null && quota > 0 && usage / quota >= WARN_THRESHOLD;

  return { usage, quota, percentUsed, warning, persisted, requestPersist };
}
```

- [ ] **Step 5: Run tests and verify all pass.**

```bash
npm test -- src/hooks/useStorageHealth.test.ts
```

Expected: all existing tests still pass, all four new tests pass. Output pristine.

- [ ] **Step 6: Type-check the project.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean exit, no output.

- [ ] **Step 7: Commit.**

```bash
git add src/hooks/useStorageHealth.ts src/hooks/useStorageHealth.test.ts
git commit -m "feat(storage-health): expose persisted state and requestPersist()"
```

---

## Task 2: Add `lastInteractionAt` + `recordInteraction` to `settingsStore`

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Test: `src/stores/settingsStore.test.ts`

`★ Insight: throttle inside the action, not at the listener.` The Zustand IDB adapter is debounced 300ms; if the listener calls `recordInteraction()` on every pointerdown and the action always writes, the IDB write rate would be capped at one every 300ms regardless. By gating *inside* the action (`if Date.now() - lastInteractionAt > 60_000`), the store skips re-renders too — so consumers like `DiagnosticsSection` don't re-render dozens of times per minute as the user taps. Single source of truth for the throttle decision.

- [ ] **Step 1: Read the existing settingsStore to understand the persisted-state shape and the `onRehydrateStorage` hook.**

Read `src/stores/settingsStore.ts` end-to-end. Note the persisted state interface (`SettingsPersistedState`), the `migrate` function, and the `onRehydrateStorage` callback at the bottom.

- [ ] **Step 2: Write failing tests for the new field and action.**

Append to `src/stores/settingsStore.test.ts`:

```typescript
describe("settingsStore — lastInteractionAt", () => {
  beforeEach(() => {
    useSettingsStore.setState({ lastInteractionAt: null });
  });

  it("starts with `lastInteractionAt: null` before any interaction", () => {
    expect(useSettingsStore.getState().lastInteractionAt).toBeNull();
  });

  it("`recordInteraction()` sets `lastInteractionAt` to now when previously null", () => {
    const before = Date.now();
    useSettingsStore.getState().recordInteraction();
    const after = Date.now();
    const value = useSettingsStore.getState().lastInteractionAt;
    expect(value).not.toBeNull();
    expect(value!).toBeGreaterThanOrEqual(before);
    expect(value!).toBeLessThanOrEqual(after);
  });

  it("`recordInteraction()` is a no-op when called within 60s of the previous call", () => {
    const t0 = Date.now() - 5_000;
    useSettingsStore.setState({ lastInteractionAt: t0 });
    useSettingsStore.getState().recordInteraction();
    expect(useSettingsStore.getState().lastInteractionAt).toBe(t0);
  });

  it("`recordInteraction()` updates when called more than 60s after the previous call", () => {
    const t0 = Date.now() - 120_000;
    useSettingsStore.setState({ lastInteractionAt: t0 });
    useSettingsStore.getState().recordInteraction();
    expect(useSettingsStore.getState().lastInteractionAt).toBeGreaterThan(t0);
  });
});
```

- [ ] **Step 3: Run the new tests to verify they fail.**

```bash
npm test -- src/stores/settingsStore.test.ts
```

Expected: the four new tests fail with `recordInteraction is not a function` / `lastInteractionAt does not exist on the state`.

- [ ] **Step 4: Add the field and action to the store.**

In `src/stores/settingsStore.ts`:

1. Add `lastInteractionAt: number | null` to both the in-memory state interface and the `SettingsPersistedState` interface used by the persist middleware.

2. Default it to `null` in the initial state object.

3. Add the action inside the `create` body, alongside the existing actions:

```typescript
const INTERACTION_THROTTLE_MS = 60_000;

// ...inside the store creator:
recordInteraction: () => {
  const { lastInteractionAt } = get();
  const now = Date.now();
  if (
    lastInteractionAt != null &&
    now - lastInteractionAt < INTERACTION_THROTTLE_MS
  ) {
    return;
  }
  set({ lastInteractionAt: now });
},
```

(`get` is the second argument to the Zustand state-creator — if not already destructured, change the signature from `(set) =>` to `(set, get) =>`.)

4. Update the `onRehydrateStorage` hook to seed `lastInteractionAt = Date.now()` when the rehydrated value is null. Find the existing `onRehydrateStorage: () => { ... }` block and add this branch:

```typescript
onRehydrateStorage: () => (state) => {
  // ...existing logic...
  if (state && state.lastInteractionAt == null) {
    state.lastInteractionAt = Date.now();
  }
},
```

5. Update the `migrate` function so older persisted shapes get `lastInteractionAt: null` (the rehydrate hook above will then seed it). No version bump needed — adding an optional field is backward-compatible at the migration layer; the hook handles it.

- [ ] **Step 5: Run tests and verify they pass.**

```bash
npm test -- src/stores/settingsStore.test.ts
```

Expected: all new tests pass; all existing tests still pass.

- [ ] **Step 6: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit.**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat(settings): track lastInteractionAt with 60s-throttled action"
```

---

## Task 3: Install document-level pointerdown listener in `main-app.tsx`

**Files:**
- Modify: `src/main-app.tsx`

`★ Insight: a pure side-effect listener doesn't need its own unit test.` The throttle and write logic live inside `recordInteraction()` (tested in Task 2). The listener is a one-line bridge — its only job is "call `recordInteraction()` on every pointerdown". Testing that wiring would require simulating DOM events at the module-init layer, which is fragile and low-value. Browser verification at the end of the plan covers the integration.

- [ ] **Step 1: Read `src/main-app.tsx` to find where the Preact root is mounted.**

Note the mount call (likely `render(<App />, document.getElementById('app')!)` or similar).

- [ ] **Step 2: Add the listener immediately before the render call.**

Add this block:

```typescript
import { useSettingsStore } from "./stores/settingsStore";

// Record any genuine user gesture as a "last interaction" for the
// Diagnostics "Last used" line. recordInteraction() is internally
// throttled to 60s so this is cheap even under rapid tapping.
document.addEventListener(
  "pointerdown",
  () => useSettingsStore.getState().recordInteraction(),
  { passive: true },
);
```

- [ ] **Step 3: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 4: Verify the dev server boots without console errors.**

```bash
npm run dev &
```

Open `http://localhost:3000/app/` in a browser, open DevTools, click anywhere in the app, then check `useSettingsStore.getState().lastInteractionAt` is set. Kill the dev server.

- [ ] **Step 5: Commit.**

```bash
git add src/main-app.tsx
git commit -m "feat(app): record pointerdown as user interaction"
```

---

## Task 4: Capture `persist()` result + emit `MODEL_PERSIST_RESULT` audit event

**Files:**
- Modify: `src/audit/events.ts`
- Modify: `src/models/modelManager.ts:40-55`

- [ ] **Step 1: Add the new event constant.**

In `src/audit/events.ts`, add to the `EVENT` object (alphabetically near the other `MODEL_*` entries):

```typescript
MODEL_PERSIST_RESULT:    "model.persist.result",
```

- [ ] **Step 2: Read the modelManager `init()` block at lines 40-55.**

Note the current call: `if (navigator.storage?.persist) { await navigator.storage.persist(); }`. The return value is discarded.

- [ ] **Step 3: Capture the result and log it.**

Replace the `if (navigator.storage?.persist)` block with:

```typescript
if (navigator.storage?.persist) {
  const granted = await navigator.storage.persist();
  log({
    name: EVENT.MODEL_PERSIST_RESULT,
    [ATTR.GRANTED]: granted,
  });
}
```

Check `src/audit/attrs.ts` for an existing `GRANTED` attribute. If absent, add one with the snake-case value `"granted"`.

- [ ] **Step 4: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 5: Verify existing modelManager tests still pass.**

```bash
npm test -- src/models/modelManager.test.ts
```

Expected: all green. Adjust any mock that asserted the persist call signature if necessary.

- [ ] **Step 6: Commit.**

```bash
git add src/audit/events.ts src/audit/attrs.ts src/models/modelManager.ts
git commit -m "feat(audit): log persistence grant result on model manager boot"
```

---

## Task 5: Add new locale keys to `en.ts` and remove obsolete ones

**Files:**
- Modify: `src/data/locales/en.ts`

**Learning-mode contribution:** The clinical wording for the **"Storage not protected"** warning is where your domain knowledge matters most in this whole plan. The default I'll propose is fine, but a clinician scanning Settings pre-shift may parse a different phrasing more quickly. You write the final string — 5–10 words. See Step 3 below.

`★ Insight: the codebase uses a flat key map with `.replace("{name}", value)` for interpolation rather than ICU MessageFormat or i18next.` This is intentional — the existing `composePainSentence` / `composeWishSentence` helpers already string-template against the same flat map. Sticking with the pattern keeps the new keys consistent with `ui.audio_cache.rebuilding` (`"Rebuilding: {current} / {total}"`) and avoids pulling in a runtime library.

- [ ] **Step 1: Remove the three obsolete keys.**

In `src/data/locales/en.ts`, delete these three lines (each is a single entry in the flat map):

```typescript
"ui.provider.settings.offline.storage_prefix": "Storage: ",
"ui.provider.settings.offline.storage_of": " of ",
"ui.provider.settings.offline.storage_used": " used",
```

Keep `ui.provider.settings.offline.storage_low` and `ui.provider.settings.offline.clear_audio_cache` — they're still used.

- [ ] **Step 2: Add the new keys.**

In the same `ui.provider.settings.offline.*` namespace, add these entries:

```typescript
"ui.provider.settings.offline.models_on_device": "Voice & speech models: {bytes} on device",
"ui.provider.settings.offline.storage_protected": "Storage protected — models will stay on this device",
"ui.provider.settings.offline.storage_last_used": "Last used: {relative}",
"ui.provider.settings.offline.check_protection_button": "Check protection status",
"ui.provider.settings.offline.origin_usage_estimate": "Origin usage: ~{used} used of ~{total} available (estimate)",
```

- [ ] **Step 3: Decide the `storage_not_protected` wording (LEARNING-MODE CONTRIBUTION).**

This is the warning copy a clinician sees when storage isn't persistent. The string should:
1. Name the risk in plain language (models may be removed)
2. Point at the mitigation (add to Home Screen) — for iPadOS Safari this is the *actual* fix
3. Stay under ~80 characters so it doesn't wrap awkwardly on iPad portrait

The placeholder default is:

```typescript
"ui.provider.settings.offline.storage_not_protected": "Storage not protected — add this app to Home Screen to keep models on the device",
```

Write the final wording yourself. Consider: do clinicians read "Home Screen" as the iPad action, or do they need "add to your iPad's Home Screen"? Is "Storage not protected" the right framing or should it lead with the action? Add the chosen string to `en.ts` under the key `ui.provider.settings.offline.storage_not_protected`.

- [ ] **Step 4: Update the `PhraseKey` type if it's a closed string union.**

Search for `export type PhraseKey` in `src/data/locales/en.ts`. If it's a union of literal keys, add the five (or six, including the warning copy you wrote) new keys to it. If it's `keyof typeof <map>`, the type updates automatically.

- [ ] **Step 5: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean. If existing consumers reference removed keys via the typed map, the type-check will fail — that's expected and Task 6 will fix the only consumer.

- [ ] **Step 6: Commit.**

```bash
git add src/data/locales/en.ts
git commit -m "i18n(en): add storage-honesty keys, remove obsolete storage breakdown"
```

---

## Task 6: Replace storage block in `DiagnosticsSection.tsx` with the three rows

**Files:**
- Modify: `src/components/settings/sections/DiagnosticsSection.tsx:394-410`
- Test: `src/components/settings/sections/DiagnosticsSection.test.tsx`

`★ Insight: `expectedBytes === 0` is the "no primer has run yet" signal, NOT "models occupy zero bytes."` In PR #260 we made `expectedBytes` the manifest sum, set by `beginPrimerRun()` and reset to 0 by `reset()`. A fresh install before "Prepare for offline" was ever tapped reads 0 — which Row 1 must distinguish from a normal post-primer state via a copy/glyph change.

- [ ] **Step 1: Write failing tests for the three rows.**

Append to `src/components/settings/sections/DiagnosticsSection.test.tsx`:

```typescript
describe("DiagnosticsSection — storage rows", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    installStorageEstimate(500, 10_000);
  });

  // -------- Row 1: Models on device --------

  it("Row 1 shows manifest-bytes when all models verified and expectedBytes > 0", async () => {
    useOfflineStore.getState().setModelVerified("tts", "verified");
    useOfflineStore.getState().setModelVerified("stt", "verified");
    useOfflineStore.getState().beginPrimerRun(1_500_000_000);
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByText(/Voice & speech models: 1\.40 GB on device/i)).toBeTruthy();
  });

  it("Row 1 shows 'not yet downloaded' fallback when expectedBytes is 0", () => {
    render(<DiagnosticsSection t={light} />);
    expect(screen.getByText(/models not yet downloaded/i)).toBeTruthy();
  });

  // -------- Row 2: Storage protection --------

  it("Row 2 shows 'protected' copy when persisted=true and no Last-used line", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => true),
        persist: vi.fn(async () => true),
      },
      configurable: true,
      writable: true,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Storage protected/i)).toBeTruthy());
    expect(screen.queryByText(/Last used/i)).toBeNull();
  });

  it("Row 2 shows 'not protected' copy + 'Last used: today' when persisted=false", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => false),
        persist: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });
    useSettingsStore.setState({ lastInteractionAt: Date.now() });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Storage not protected/i)).toBeTruthy());
    expect(screen.getByText(/Last used: today/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /check protection status/i })).toBeTruthy();
  });

  it("Row 2 formats 'Last used: 3 days ago' for a known lastInteractionAt", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        persisted: vi.fn(async () => false),
      },
      configurable: true,
      writable: true,
    });
    useSettingsStore.setState({
      lastInteractionAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Last used: 3 days ago/i)).toBeTruthy());
  });

  it("Row 2 is hidden entirely when navigator.storage.persisted is absent", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })),
        // No persisted/persist methods
      },
      configurable: true,
      writable: true,
    });
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => expect(screen.getByText(/Origin usage/i)).toBeTruthy());
    expect(screen.queryByText(/Storage protected/i)).toBeNull();
    expect(screen.queryByText(/Storage not protected/i)).toBeNull();
  });

  // -------- Row 3: Origin usage estimate --------

  it("Row 3 renders '(estimate)' framing and no headline %", async () => {
    render(<DiagnosticsSection t={light} />);
    await waitFor(() => {
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/Origin usage:.*\(estimate\)/i);
      expect(text).not.toMatch(/\(\d+%\)/);
    });
  });

  it("Row 3 still triggers the 'Clear audio cache' warning when usage > 85% of quota", async () => {
    installStorageEstimate(9000, 10_000);
    render(<DiagnosticsSection t={light} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /clear audio cache/i })).toBeTruthy(),
    );
  });
});
```

- [ ] **Step 2: Run the new tests to verify they fail.**

```bash
npm test -- src/components/settings/sections/DiagnosticsSection.test.tsx
```

Expected: all seven new tests fail (component doesn't yet render the new copy). Existing tests still pass.

- [ ] **Step 3: Add the helper for relative time formatting.**

At the top of `DiagnosticsSection.tsx` (below the existing `formatBytes`), add:

```typescript
const DAY_MS = 24 * 60 * 60 * 1000;

function formatLastUsed(lastInteractionAt: number | null, locale: string): string {
  if (lastInteractionAt == null) return "";
  const daysSince = Math.floor((Date.now() - lastInteractionAt) / DAY_MS);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -daysSince,
    "day",
  );
}
```

`★ Insight: `Intl.RelativeTimeFormat` is locale-aware out of the box.` We don't need per-locale plural rules ("1 day ago" vs "2 days ago") in our locale files. The browser handles "today" / "yesterday" / "N days ago" — and the corresponding forms in every supported language — natively. The `numeric: "auto"` option is what flips "in 0 days" to "today" and "in -1 day" to "yesterday". Pass a negative number because the format is forward-looking by default.

- [ ] **Step 4: Replace the storage block.**

In `DiagnosticsSection.tsx`, find the existing block (currently lines ~394-410 — the `<div>` containing `formatBytes(health.usage)` and `formatBytes(health.quota)`). Replace it with:

```tsx
{(() => {
  const modelsOnDeviceText = expectedBytes > 0
    ? resolvePhrase("ui.provider.settings.offline.models_on_device", caregiverLang)
        .replace("{bytes}", formatBytes(expectedBytes))
    : resolvePhrase("ui.provider.settings.offline.models_not_yet_downloaded", caregiverLang);

  const modelsGlyph = expectedBytes > 0
    ? (anyNeedsRetry ? "⚠️" : "✓")
    : "…";
  const modelsColor = expectedBytes > 0
    ? (anyNeedsRetry ? warnColor : t.text)
    : t.muted;

  return (
    <>
      {/* Row 1 — Models on device */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
          color: modelsColor,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <span aria-hidden="true">{modelsGlyph} </span>
        {modelsOnDeviceText}
      </div>

      {/* Row 2 — Storage protection (hidden when API absent) */}
      {health.persisted !== null && (
        <div
          style={{
            marginTop: 8,
            color: health.persisted ? t.text : warnColor,
            fontSize: 14,
          }}
        >
          <div>
            <span aria-hidden="true">{health.persisted ? "🔒 " : "⚠️ "}</span>
            {health.persisted
              ? resolvePhrase("ui.provider.settings.offline.storage_protected", caregiverLang)
              : resolvePhrase("ui.provider.settings.offline.storage_not_protected", caregiverLang)}
          </div>
          {!health.persisted && lastInteractionAt != null && (
            <div style={{ marginTop: 4, fontSize: 13, color: t.sub }}>
              {resolvePhrase("ui.provider.settings.offline.storage_last_used", caregiverLang)
                .replace("{relative}", formatLastUsed(lastInteractionAt, caregiverLang))}
            </div>
          )}
          {!health.persisted && (
            <Btn
              onClick={() => health.requestPersist()}
              style={{
                marginTop: 6,
                padding: "6px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: "transparent",
                color: t.text,
                fontFamily: "inherit",
              }}
            >
              {resolvePhrase("ui.provider.settings.offline.check_protection_button", caregiverLang)}
            </Btn>
          )}
        </div>
      )}

      {/* Row 3 — Origin usage estimate */}
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: health.warning ? warnColor : t.muted,
        }}
      >
        {resolvePhrase("ui.provider.settings.offline.origin_usage_estimate", caregiverLang)
          .replace("{used}", formatBytes(health.usage))
          .replace("{total}", formatBytes(health.quota))}
        {health.warning && resolvePhrase("ui.provider.settings.offline.storage_low", caregiverLang)}
      </div>
    </>
  );
})()}
```

- [ ] **Step 5: Pull the new selectors into the component.**

Near the top of `DiagnosticsSection()`, alongside the existing `useOfflineStore` selectors, add:

```typescript
const expectedBytes = useOfflineStore((s) => s.expectedBytes);
const lastInteractionAt = useSettingsStore((s) => s.lastInteractionAt);
```

(`expectedBytes` may already be imported from PR #260 — verify and don't duplicate. `useSettingsStore` is already imported elsewhere in the file.)

- [ ] **Step 6: Add the `models_not_yet_downloaded` key to `en.ts` if not already present from Task 5.**

This key wasn't in the Task 5 list. Append to `src/data/locales/en.ts`:

```typescript
"ui.provider.settings.offline.models_not_yet_downloaded": "Models not yet downloaded",
```

- [ ] **Step 7: Run all DiagnosticsSection tests.**

```bash
npm test -- src/components/settings/sections/DiagnosticsSection.test.tsx
```

Expected: all new tests pass, all pre-existing tests still pass.

- [ ] **Step 8: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 9: Commit.**

```bash
git add src/components/settings/sections/DiagnosticsSection.tsx \
        src/components/settings/sections/DiagnosticsSection.test.tsx \
        src/data/locales/en.ts
git commit -m "feat(diagnostics): clinical-first storage display"
```

---

## Task 7: Propagate the locale changes to the other 23 locales

**Files:**
- Modify: `src/data/locales/ar.ts`, `da.ts`, `de.ts`, `el.ts`, `es.ts`, `fi.ts`, `fr.ts`, `he.ts`, `hi.ts`, `it.ts`, `ja.ts`, `ko.ts`, `ms.ts`, `nl.ts`, `no.ts`, `pl.ts`, `pt.ts`, `ru.ts`, `sw.ts`, `tl.ts`, `tr.ts`, `vi.ts`, `zh.ts`

`★ Insight: locale files are flat key maps with identical key sets.` There's no auto-fallback to `en` for missing keys at runtime in this codebase — `resolvePhrase()` returns the key itself if not found, which would render as raw `ui.provider.settings.offline.models_on_device` in the wrong language. So every locale needs every key. Use machine translation for the first draft and reserve human review for the RTL and CJK locales.

- [ ] **Step 1: Verify a manifest-style check on all 24 locales for missing keys.**

```bash
node -e '
const fs = require("fs");
const path = require("path");
const dir = "src/data/locales";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts") && !f.includes(".test."));
const keysOf = (file) => {
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  return new Set([...src.matchAll(/"([^"]+)":/g)].map(m => m[1]));
};
const en = keysOf("en.ts");
for (const f of files) {
  if (f === "en.ts") continue;
  const set = keysOf(f);
  const missing = [...en].filter(k => !set.has(k));
  if (missing.length) console.log(f, "missing:", missing.length, "keys");
}
'
```

Expected before this task: each of the other 23 locales is missing the 7 new keys.

- [ ] **Step 2: For each locale, add translations for the seven new keys and remove the three obsolete keys.**

The keys to add (with placeholder slots intact):
- `ui.provider.settings.offline.models_on_device` ("Voice & speech models: {bytes} on device")
- `ui.provider.settings.offline.models_not_yet_downloaded` ("Models not yet downloaded")
- `ui.provider.settings.offline.storage_protected` ("Storage protected — models will stay on this device")
- `ui.provider.settings.offline.storage_not_protected` (your en.ts wording from Task 5 Step 3)
- `ui.provider.settings.offline.storage_last_used` ("Last used: {relative}")
- `ui.provider.settings.offline.check_protection_button` ("Check protection status")
- `ui.provider.settings.offline.origin_usage_estimate` ("Origin usage: ~{used} used of ~{total} available (estimate)")

To remove from each locale:
- `ui.provider.settings.offline.storage_prefix`
- `ui.provider.settings.offline.storage_of`
- `ui.provider.settings.offline.storage_used`

Recommended workflow: dispatch a `general-purpose` agent per group of locales (e.g. 3 groups of 8 locales) with the en.ts source strings and an instruction to produce translations preserving the `{bytes}`, `{relative}`, `{used}`, `{total}` placeholders verbatim. For RTL languages (`ar`, `he`) the placeholder order may need adjustment so the bytes value reads naturally — the en.ts ordering is "label then number" which works in most languages; in RTL the runtime BiDi algorithm handles direction.

- [ ] **Step 3: Re-run the missing-key check.**

```bash
node -e '
const fs = require("fs");
const path = require("path");
const dir = "src/data/locales";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts") && !f.includes(".test."));
const keysOf = (file) => {
  const src = fs.readFileSync(path.join(dir, file), "utf8");
  return new Set([...src.matchAll(/"([^"]+)":/g)].map(m => m[1]));
};
const en = keysOf("en.ts");
let bad = 0;
for (const f of files) {
  if (f === "en.ts") continue;
  const set = keysOf(f);
  const missing = [...en].filter(k => !set.has(k));
  if (missing.length) { bad++; console.log(f, "missing:", missing); }
}
if (!bad) console.log("All locales in sync with en.ts.");
'
```

Expected: `All locales in sync with en.ts.`

- [ ] **Step 4: Type-check.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 5: Spot-check RTL rendering for `ar` and `he`.**

In the dev server with `?lang=ar` (or whatever the locale switcher requires per the existing testing pattern in this repo), open Settings → App Diagnostics and visually confirm the new rows render right-to-left without truncation. Repeat for `he`.

- [ ] **Step 6: Commit.**

```bash
git add src/data/locales/
git commit -m "i18n: translate storage-honesty keys, remove obsolete keys (23 locales)"
```

---

## Task 8: Browser verification + PR

**Files:** None.

- [ ] **Step 1: Start the dev server.**

```bash
npm run dev
```

- [ ] **Step 2: Walk through every Row 1 state.**

In Chrome at `http://localhost:3000/app/`:
- Open Settings → App Diagnostics.
- Verify Row 1 reads `✓ Voice & speech models: 1.43 GB on device` (or similar, depending on the manifest sum).
- Trigger Force redownload, watch Row 1 stay correct mid-primer (use the synthetic-state JS injection technique from PR #260 if needed).
- Programmatically set `useOfflineStore.getState().reset()` to confirm the "Models not yet downloaded" fallback.

- [ ] **Step 3: Walk through every Row 2 state.**

- Default: Chrome on localhost typically grants persistence — confirm `🔒 Storage protected — models will stay on this device` renders.
- Synthetically force `persisted=false`: in DevTools console, `(await import('/src/hooks/useStorageHealth.ts')).useStorageHealth` is module-private; instead temporarily mock `navigator.storage.persisted` via `Object.defineProperty(navigator.storage, 'persisted', { value: async () => false })` and reload. Confirm the warning row, the "Last used" line, and the "Check protection status" button.
- Click "Check protection status" and confirm it does not crash.

- [ ] **Step 4: Walk through Row 3.**

Confirm `Origin usage: ~X.X GB used of ~Y.Y GB available (estimate)`. No headline `%`. The 85% warning still triggers the "Clear audio cache" button if you can artificially raise usage (not easily — accept the unit-test coverage here).

- [ ] **Step 5: Stop the dev server.**

```bash
# Kill the dev server task
```

- [ ] **Step 6: Run the full test suite once.**

```bash
npm test
```

Expected: all green (modulo the pre-existing flaky `recovery.bench.test.ts` perf gate noted in earlier PRs).

- [ ] **Step 7: Run lint and typecheck.**

```bash
npx tsc -p tsconfig.json --noEmit
```

Expected: clean.

- [ ] **Step 8: Push and open a PR.**

```bash
git push -u origin spec/storage-display-honesty
gh pr create --title "feat(diagnostics): storage display honesty" --body "$(cat <<'EOF'
## Summary

Replaces the misleading "Storage: X GB of Y GB used (Z%)" line in App
Diagnostics with a three-row clinical-first display.

- **Row 1 — Models on device** (`✓ Voice & speech models: 1.43 GB on
  device`) sourced from the exact manifest sum in
  `offlineStore.expectedBytes`. No browser fuzzing.
- **Row 2 — Storage protection** with a backward-looking "Last used:
  {relative}" line driven by `Intl.RelativeTimeFormat` over a
  `settingsStore.lastInteractionAt` updated by a document-level
  pointerdown listener (throttled 60s). A "Check protection status"
  button calls `navigator.storage.persist()` and re-polls
  `persisted()`. Hidden entirely when the API is absent.
- **Row 3 — Origin usage** kept around but reframed as an explicit
  "(estimate)" with no headline percentage. The 85% warning still
  triggers the existing "Clear audio cache" recovery flow.

The previous "X% of Y" display invented a precision the platform doesn't
expose — `estimate()` is privacy-padded and counts everything in the
origin, and `quota` floats with disk pressure. This change leads with
the value we actually know (manifest sum) and is honest about the rest.

## Spec & plan

- Spec: `docs/superpowers/specs/2026-05-14-storage-display-honesty-design.md`
- Plan: `docs/superpowers/plans/2026-05-14-storage-display-honesty.md`

## Test plan

- [ ] `npm test` — all green (existing + new tests for hook, store, and component)
- [ ] `npx tsc -p tsconfig.json --noEmit` — clean
- [ ] Browser-verified at `/app/` Settings → App Diagnostics
- [ ] Locale parity check across all 24 locales

EOF
)"
```

- [ ] **Step 9: Stop. Do not merge.** Per the team's PR cadence preference, leave the PR open for review.

---

## Self-review checklist (for the agent executing this plan)

Before declaring the plan done:

1. **Spec coverage:** Walk the spec's section list — every Row, the persistence row, the countdown-replacement, the i18n table, the tests section, the migration notes. Each maps to a Task above.
2. **Placeholder scan:** Search this plan for "TBD"/"TODO"/"add appropriate"/"similar to". Should find none.
3. **Type consistency:** `expectedBytes`, `lastInteractionAt`, `persisted`, `requestPersist` names match across Tasks 1, 2, and 6.
4. **Glyph + color consistency:** Row 1 uses `t.text` / `warnColor` / `t.muted` matching the existing DiagnosticsSection palette. Row 2 uses `warnColor` only in the unprotected state. Row 3 keeps the existing `t.muted` / `warnColor` behavior.
