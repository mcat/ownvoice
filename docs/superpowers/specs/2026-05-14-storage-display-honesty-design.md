# Storage display honesty — design

**Status:** approved by user 2026-05-14. Implementation plan to follow.
**Scope:** the "Storage:" line in `DiagnosticsSection`, the `useStorageHealth` hook, and how persistence + eviction risk are surfaced to clinicians.

## Context

`DiagnosticsSection` today reads `navigator.storage.estimate()` and renders
`Storage: 1.58 GB of 11.58 GB used (14%)`. Every term in that sentence is
misleading:

- `usage` is privacy-padded with random noise (per the StorageManager spec) and
  counts everything in the origin — IndexedDB, Service Worker caches, the audio
  pre-gen cache, and OPFS model weights all summed indistinguishably.
- `quota` is a per-origin allocation the browser can shrink under disk
  pressure; on iPadOS 26 Safari (our target) it's rounded aggressively and
  unpredictable.
- The `%` figure implies a fixed device capacity it doesn't represent.
- The whole metric answers "what fraction of my origin allocation am I using"
  — a question no clinician asks before a shift.

The clinical question the screen should answer is **"Are the voice models on
this device right now, and will they still be here next shift?"** That is a
manifest + `navigator.storage.persisted()` question, not an `estimate()`
question.

## Information architecture

Replace the existing storage line with three rows ordered by clinical priority:

### Row 1 — Models on this device (primary)

Source: `offlineStore.expectedBytes` (the manifest sum, exact — same field that
landed in PR #260 as the progress-bar denominator). Falls back to a placeholder
when `expectedBytes === 0` (no primer has run yet).

```
✓ Voice & speech models: 1.43 GB on device
```

Colors and glyphs follow the existing verification state:

- All models verified → `✓` in `t.text`
- Any model `needs-retry` → `⚠️` in `warnColor` (`#DC2626`)
- Never run → `…` in `t.muted` with copy "Models not yet downloaded"

Each glyph is wrapped in `<span aria-hidden="true">` so screen readers
announce only the surrounding text — the same pattern used by the existing
"✓ Models verified" confirmation button and consistent with the
`eslint-plugin-jsx-a11y` rules already configured in this repo.

### Row 2 — Storage protection (secondary)

Source: `navigator.storage.persisted()`. Hidden entirely when the API is
unavailable.

```
🔒 Storage protected — models will stay on this device
```

or

```
⚠️ Storage not protected — models may be removed after ~7 days of disuse
   Approximately {days} days remaining
   [ Check protection status ]
```

The countdown line and the action button are only shown in the unprotected
state. See "Persistence and the 7-day countdown" below for the timer
mechanics.

The action button copy is **"Check protection status"** — not "Request
protection" — because `navigator.storage.persist()` does not prompt the user
on Safari; it returns the result of a heuristic check. The button is a "ask
again now" trigger, not a user-facing toggle.

### Row 3 — Browser-reported origin usage (tertiary)

Same `t.muted` styling as today, but the copy is explicit about the
estimate:

```
Origin usage: ~1.6 GB used of ~11.6 GB available (estimate)
```

The `%` figure is removed from the headline. The 85% threshold is still
computed internally to trigger the low-storage warning state and the existing
"Clear audio cache" recovery flow — that behavior is unchanged.

## Persistence and the 7-day countdown

WebKit ITP and analogous policies in other browsers evict storage from
origins that have not received user interaction for ~7 days unless the origin
holds `persisted()` permission. Surfacing this risk requires three pieces:

1. **A persistence probe.** `useStorageHealth` polls
   `navigator.storage.persisted()` alongside `estimate()` and exposes
   `persisted: boolean | null` (null when the API is absent).

2. **A user-interaction timestamp.** Add `lastInteractionAt: number | null` to
   `settingsStore` (already persisted to IndexedDB via the zustand IDB
   adapter). Update via a document-level `pointerdown` listener installed at
   app boot, throttled to once per minute to avoid write storms. The
   timestamp records that *something* user-driven happened — not which
   action — which is precisely what WebKit's eviction heuristic counts.

3. **A countdown derivation.** When `persisted === false`, render
   `Math.max(0, Math.ceil((lastInteractionAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / DAY_MS))`.
   When the value reaches 0, the copy changes to "Storage may have been
   cleared — re-verify on next use" and the "Check existing models" button
   carries elevated visual prominence. Frame the 7 days as *approximate* in
   the UI copy — different browsers apply different rules, and the spec
   doesn't promise precision we can't deliver.

The countdown is a defensive display: it only matters on browsers that do
ITP-style eviction *and* refuse persistence. On Chrome desktop with
persistence granted, Row 2 reads "Storage protected" and the countdown line
never appears.

## Background re-request of persistence

`ModelManager.init` already calls `navigator.storage.persist()` once per
boot (see `src/models/modelManager.ts:49-50`). Two improvements:

- **Capture the return value** so the boot log includes whether persistence
  was granted this session. Use the existing `log()` audit logger.
- **Re-poll after manual trigger.** When the user taps "Check protection
  status," call `persist()` and immediately re-poll `persisted()` so the
  status row reflects the new state without waiting for the 60-second poll
  tick. The hook exposes a `requestPersist(): Promise<boolean>` function for
  the component to call.

No periodic re-request beyond boot — Safari's denial is sticky within a
session and re-asking on a timer would waste cycles with no benefit.

## Code changes

### `src/hooks/useStorageHealth.ts`

- Extend `StorageHealth` with `persisted: boolean | null`.
- Poll `navigator.storage.persisted()` on the same 60-second cadence as
  `estimate()`.
- Return a `requestPersist(): Promise<boolean>` callback that calls
  `navigator.storage.persist()` then re-polls `persisted()`.

### `src/stores/settingsStore.ts`

- Add `lastInteractionAt: number | null` to the persisted state (default
  `null`).
- Add a `recordInteraction()` action that sets `lastInteractionAt = Date.now()`
  — called by the boot-time pointerdown listener.

### `src/main-app.tsx`

- Install a document-level `pointerdown` listener that calls
  `useSettingsStore.getState().recordInteraction()`, throttled to once per
  minute (a simple "if (Date.now() - lastInteractionAt > 60_000) update" guard
  inside the action keeps this in one place).

### `src/components/settings/sections/DiagnosticsSection.tsx`

- Replace the existing storage line (lines 394–410 of the current file) with
  the three-row block above.
- Pull `expectedBytes` from `useOfflineStore` for Row 1.
- Pull `persisted`, `requestPersist`, and existing `usage`/`quota` from
  `useStorageHealth` for Rows 2 and 3.
- Pull `lastInteractionAt` from `useSettingsStore` for the countdown.
- Existing "Clear audio cache" warning button stays gated on the same
  `> 85%` rule against `usage / quota`.

### `src/models/modelManager.ts`

- Capture the `persist()` return value and emit a structured boot log entry
  (existing `EVENT` enum already has `MODEL_BOOT_START`; add an
  `MODEL_PERSIST_RESULT` event with `granted: boolean`).

### Locale keys (`src/data/locales/*.ts`)

Add five new keys with `{value}` placeholder slots, in the existing
`ui.provider.settings.offline.*` namespace:

| Key | en.ts wording |
|-----|---------------|
| `models_on_device` | `Voice & speech models: {bytes} on device` |
| `storage_protected` | `Storage protected — models will stay on this device` |
| `storage_not_protected` | `Storage not protected — models may be removed after ~7 days of disuse` |
| `storage_days_remaining` | `Approximately {days} days remaining` |
| `check_protection_button` | `Check protection status` |
| `origin_usage_estimate` | `Origin usage: ~{used} used of ~{total} available (estimate)` |

(The {bytes}, {days}, {used}, {total} placeholders use the existing
`.replace("{name}", value)` pattern already used by the audio-cache
"Rebuilding: {current}/{total}" string.)

**Remove** the three keys made obsolete by Row 3's reframing, in all 24
locale files:

- `ui.provider.settings.offline.storage_prefix`
- `ui.provider.settings.offline.storage_of`
- `ui.provider.settings.offline.storage_used`

Translation execution for the 23 non-en locales is part of the
implementation. The wording is short and parametric; machine translation
plus a contrast check (RTL languages: Arabic, Hebrew) is sufficient.

The existing `storage_low` key (currently rendered as a suffix when
`usage / quota > 0.85`) stays in the codebase and continues to append to
Row 3 in the warning state, e.g. `Origin usage: ~9.0 GB used of ~10.5 GB
available (estimate) — running low`. Keeping the suffix avoids re-touching
every locale for an existing phrase, and it pairs with the existing "Clear
audio cache" button below for the recovery flow.

## Tests

### `src/hooks/useStorageHealth.test.ts`

- `persisted` mirrors `navigator.storage.persisted()`.
- `persisted` is null when the API is absent.
- `requestPersist()` calls `persist()` then re-polls `persisted()`.

### `src/stores/settingsStore.test.ts`

- `recordInteraction()` updates `lastInteractionAt` when called more than 60s
  after the last update.
- `recordInteraction()` is a no-op when called within 60s.

### `src/components/settings/sections/DiagnosticsSection.test.tsx`

- Row 1 renders verified-state copy when all models are verified, the
  needs-retry copy when any are not, and the never-run copy when
  `expectedBytes === 0`.
- Row 2 renders the protected copy, the unprotected copy + countdown, or is
  absent when `persisted === null`.
- Countdown shows the right day count for known `lastInteractionAt` values
  and rolls to the "may have been cleared" copy at day 0.
- Row 3 renders the `(estimate)` framing and never shows a headline `%`.
- The 85% low-storage threshold still triggers the existing "Clear audio
  cache" button.

## Migration notes

- The three removed locale keys are referenced only in `DiagnosticsSection`
  — confirmed by grep over `src/`. Removing them from every locale file in
  the same change is safe and avoids dangling translations.
- `lastInteractionAt` is new state; existing IndexedDB rows will hydrate with
  `null` and the boot listener will write the first value on the next
  pointerdown. Until then the countdown row falls back to "Approximately 7
  days remaining" using `now()` as the implicit anchor.

## Risks

- **24-locale translation churn.** Five new keys × 23 non-en locales = 115
  strings. Mitigate by keeping the strings short and parametric, and by
  generating drafts with machine translation, then asking the user to spot
  check Arabic, Hebrew, Japanese, Korean, and Chinese for layout fit.
- **WebKit eviction rules drift.** The 7-day figure is heuristic, not
  contractual. Framing as "approximately" hedges this. If WebKit publishes a
  longer/shorter window, the constant is in one place
  (`PERSISTENCE_GRACE_DAYS` in the hook).
- **Manifest sum vs disk reality.** Row 1's "1.43 GB on device" is the
  manifest sum, not the actual OPFS file sizes. They should match when
  verification is green; if a file is partial, integrity check flips the
  model to `needs-retry` and Row 1 reflects that via the ⚠️ glyph and copy
  change. No need to read OPFS sizes separately.

## Effort estimate

~1 engineering day. One PR. ~250 lines net counting tests; +100–150 lines of
locale string updates (largely mechanical).

## Followups (genuinely out of scope here)

- Surfacing a richer "models last verified" age signal beyond the existing
  timestamp at the bottom of the section.
- A "device storage health" banner at app boot (not just inside Settings).
- Replacing the 60-second poll with an event-driven update from the audit
  logger when a known storage-affecting action completes.
