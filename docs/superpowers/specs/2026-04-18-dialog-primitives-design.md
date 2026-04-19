# Dialog primitives + polish

Status: approved via brainstorm 2026-04-18
Author: Claude (brainstorm with @mark)

## Problem

OwnVoice has seven overlay components (`MyWishes`, `SettingsPanel`, `Setup`, `PinGate`, `ProviderPanel`, `ListenPanel`, `Speaking`). Four of them are bottom sheets that each re-implement the same chrome inline: a fixed overlay, a click-closing backdrop, a rounded-top card with max height, a header row with a title and close button, a scrollable body, and an optional action bar. `useDialog` handles the *behavior* (focus trap via `inert`, Escape, focus restoration) but the *structure* is copy-pasted.

Concrete symptoms:

- Roughly 400–500 lines of duplicated overlay/card/backdrop styling across the four sheets.
- Z-indices are ad-hoc magic numbers: 100, 900, 900, 1000, 8000, 9000, 9999.
- Backdrop click-to-close is inconsistent: `MyWishes` uses parent `onClick` + `stopPropagation` on the card; `SettingsPanel` uses a dedicated absolute backdrop div with an `eslint-disable`.
- No entrance animation anywhere — sheets pop in instantly.
- `SettingsPanel.tsx` (729 lines) and `MyWishes.tsx` (561 lines) mix layout chrome with feature logic, making them hard to read and extend.

## Goals

1. Extract a shared `BottomSheet` primitive that the four bottom-sheet dialogs consume.
2. Introduce a single z-index token scale; delete every magic z number.
3. Add a consistent, motion-safe entrance/exit animation.
4. Along the way, decompose `SettingsPanel` into smaller focused section components.

## Non-goals

- **No drag-to-dismiss.** `CLAUDE.md` forbids gestures on the patient UI ("Single tap only. No double-tap, long-press, swipe, drag, or pinch."). `MyWishes` is patient-facing; splitting behavior across the four sheets would be worse than omitting the gesture.
- **No spring or dependency-backed animation.** CSS-only, honoring `prefers-reduced-motion`.
- **No migration of `PinGate` / `Setup` / `Speaking` to the primitive.** `PinGate` is centered (different shape); `Setup` renders before the app exists (not really a dialog); `Speaking` is a non-interactive toast. These three only consume the new z tokens.
- **No framework or styling-system change.** Continue using inline style objects with theme tokens, per the project's current convention.

## Scope

**In scope — migrated to the primitive:**

- `src/components/wishes/MyWishes.tsx`
- `src/components/settings/SettingsPanel.tsx`
- `src/components/provider/ProviderPanel.tsx`
- `src/components/provider/ListenPanel.tsx`

**In scope — consumes new z tokens only:**

- `src/components/shared/PinGate.tsx`
- `src/components/settings/Setup.tsx`
- `src/components/shared/Speaking.tsx`

## Design

### 1. New files

```
src/components/shared/
  BottomSheet.tsx          # primitive (compound component)
  BottomSheet.test.tsx     # unit tests
src/theme/
  z.ts                     # z-index scale
```

### 2. Modified files

```
src/components/wishes/MyWishes.tsx
src/components/settings/SettingsPanel.tsx
src/components/settings/sections/PatientInfoSection.tsx   # new, extracted from SettingsPanel
src/components/settings/sections/CareTeamSection.tsx      # new, extracted from SettingsPanel
src/components/settings/sections/AboutSection.tsx         # new, extracted from SettingsPanel
src/components/settings/sections/ResetSection.tsx         # new, extracted from SettingsPanel
src/components/provider/ProviderPanel.tsx
src/components/provider/ListenPanel.tsx
src/components/shared/PinGate.tsx                          # z token only
src/components/settings/Setup.tsx                          # z token only
src/components/shared/Speaking.tsx                         # z token only
src/theme/tokens.ts                                        # re-export z
```

### 3. Primitive API

`BottomSheet` is a compound component. Dot-subcomponents enforce the shared flex/scroll layout; their children are arbitrary so callers keep full control over content.

```tsx
<BottomSheet
  onClose={close}
  heightVh={92}              // number in [40, 100] or the literal "auto"
  zIndex={z.sheet}           // optional; defaults to z.sheet
  initialFocusRef={ref}      // optional override of useDialog's default focus target
>
  <BottomSheet.Header>
    <BottomSheet.Title>My Wishes</BottomSheet.Title>
    <BottomSheet.CloseButton aria-label="Close" />
    {/* Any additional children: progress indicator, drag handle, "Done" link, etc. */}
  </BottomSheet.Header>
  <BottomSheet.Body>
    {/* scrollable region */}
  </BottomSheet.Body>
  <BottomSheet.Actions>
    {/* optional pinned footer */}
  </BottomSheet.Actions>
</BottomSheet>
```

Responsibilities:

- `BottomSheet` (root) owns: fixed positioning, backdrop, card container (rounded-top, max-height, flex column), `useDialog` wiring (focus trap, Escape, inert siblings), entrance/exit animation, z-index.
- `BottomSheet.Header` has `flex-shrink: 0` and `border-bottom: 1px solid t.border`. Children laid out as a flex row by default (title on the left, close button on the right) with a slot below for custom content like progress bars.
- `BottomSheet.Body` has `flex: 1; min-height: 0; overflow-y: auto`. This is where the bulk of the duplicated scroll chrome currently lives.
- `BottomSheet.Actions` has `flex-shrink: 0; border-top: 1px solid t.border; display: flex; gap: 12px`. Optional — `SettingsPanel` doesn't render it.
- `BottomSheet.Title` renders `<h2 id={titleId}>` with the `titleId` supplied by context (primitive internally calls `useId`).
- `BottomSheet.CloseButton` defaults to an X glyph inside a 64×64 touch target per AAA rules. Accepts an `aria-label` and forwards other `button` props.

Context: the primitive uses Preact context to share `titleId` (so `Title` can wire up `aria-labelledby`) and `onClose` (so `CloseButton` works without caller plumbing).

### 4. Behavior

**Close paths.** Backdrop click, Escape (via `useDialog`), CloseButton tap all route through a single internal handler inside the primitive. The primitive passes *its own* handler to `useDialog`, not the caller's `onClose` — this lets the primitive intercept Escape, set an internal `closing` state, play the exit animation, and only then invoke the caller's `onClose`. The caller therefore sees a single close event after the animation has completed, keeping unmount ordering simple.

For `prefers-reduced-motion: reduce` the internal `closing` state is skipped and the caller's `onClose` fires on the same tick as the click/key event.

**Animation.** 220ms ease-out slide (`translateY(100%) → 0`) on entry; reverse on exit. 180ms backdrop fade paired with it. Gated on `@media (prefers-reduced-motion: reduce)` — reduced-motion collapses to instant open/close and skips the exit-state hold. CSS-only via keyframes or transitions; no dependency.

**Backdrop.** A dedicated absolute-positioned `<div>` below the card, click handler closes. No more `onClick` + `stopPropagation` pattern on the card. Backdrop is `aria-hidden` and not focusable.

**Focus.** `useDialog` already manages focus trap, initial focus, and focus restoration. The primitive uses it verbatim; the `initialFocusRef` prop lets callers override the default target (e.g., `ListenPanel` wants to focus the Start/Stop button).

**Scroll.** `Body` is the only scroll container. Header and Actions are pinned. Scroll position is isolated per instance. When `Body` content overflows horizontally (chip rows, voice pickers), the caller adds the `overflow-x: auto` + inner padding pattern already used in the app (see recent PRs on focus-ring clipping).

### 5. Z-index scale — `src/theme/z.ts`

```ts
export const z = {
  speaking: 100,      // non-interactive "now speaking" toast
  sheet: 1000,        // BottomSheet default (MyWishes, ProviderPanel, ListenPanel)
  sheetStacked: 1100, // stacked sheet (SettingsPanel when layered over PinGate flow)
  pin: 1200,          // PinGate (centered dialog)
  setup: 1300,        // first-run wizard (pre-app)
} as const;

export type ZToken = typeof z[keyof typeof z];
```

Ordering rationale: Speaking is a passive toast and stays below everything. Regular sheets sit above the main app. A stacked sheet (SettingsPanel opened after PinGate auth) sits above the regular sheet layer. PinGate sits above sheets so the PIN prompt can appear over a partially-torn-down SettingsPanel during unlock. Setup sits above everything — the app hasn't booted yet when it shows.

`src/theme/tokens.ts` re-exports `z` so callers import from a single place.

### 6. SettingsPanel decomposition

`SettingsPanel` today mixes BottomSheet chrome, four top-level sections, and a large care-team form inline. After the migration, `SettingsPanel.tsx` becomes a thin orchestrator (~250 lines) that renders `<BottomSheet>` plus four section components:

- `PatientInfoSection.tsx` (~120 lines) — name, bed, language display, patient voice, backup voice.
- `CareTeamSection.tsx` (~150 lines) — provider list, per-provider voice, add/remove, emoji picker.
- `AboutSection.tsx` (~25 lines) — static content.
- `ResetSection.tsx` (~80 lines) — reset button + confirmation state machine.

Each section receives props for its state and callbacks. No new store or effect coupling.

### 7. Migration order

Staged to validate the API incrementally and keep each PR reviewable.

1. **Foundation** — add `BottomSheet.tsx`, `BottomSheet.test.tsx`, `src/theme/z.ts`; re-export from `tokens.ts`.
2. **ProviderPanel** migrates first — smallest and simplest, proves the API.
3. **ListenPanel** — similar shape to Provider.
4. **MyWishes** — custom header with progress indicator and step count; stress test for `BottomSheet.Header`'s custom-children slot.
5. **SettingsPanel** — migrate to BottomSheet *and* decompose into section components in the same change (the decomposition is required to make the migration tractable).
6. **PinGate / Setup / Speaking** — consume `z` tokens only; no primitive adoption.
7. **Cleanup** — delete any residual duplicated chrome styles.

### 8. Testing

**New `BottomSheet.test.tsx`:**

- Renders header, body, and actions in the correct order.
- Escape key calls `onClose` (verifies `useDialog` integration).
- Backdrop click calls `onClose`.
- CloseButton click calls `onClose`.
- Non-backdrop clicks inside the card do not call `onClose`.
- Custom `initialFocusRef` receives focus when the sheet opens.
- `prefers-reduced-motion: reduce` skips the exit animation (close is instant).
- Title renders inside `<h2 id={…}>` and the card has `aria-labelledby` pointing to it.
- Custom children inside `Header` render and can be interactive.

**Existing tests for migrated dialogs stay.** The primitive's API surface to `App.tsx` is identical (`onClose`, content children), so `MyWishes.test.tsx`, `SettingsPanel.test.tsx`, `ProviderPanel.test.tsx`, `ListenPanel.test.tsx` should continue to pass without modification. Where a test depended on exact DOM structure of the old chrome, the test updates to the new primitive's structure — but behavior assertions (opens, closes on Escape, speaks on Share, etc.) stay identical.

**Type checking.** `npm run build` runs `tsc` first; any missed prop renames surface there. `z` is exported as a `const`-asserted object so invalid tokens fail at compile time.

### 9. Error handling

No new error paths. The primitive is a pure render layer on top of `useDialog`, which already handles the invariant that exactly one dialog should mount at a time. If two sheets somehow mount simultaneously they'll stack correctly by z-index; this is not a regression from current behavior.

### 10. Net effect

- ~400-500 lines of duplicated overlay/card/backdrop chrome deleted.
- Single source of truth for z-index ordering.
- Consistent 220ms slide-up animation across all four sheets, respecting reduced-motion.
- Zero new dependencies.
- `SettingsPanel.tsx` drops from 729 lines to ~250 lines + four focused section files.
- `MyWishes.tsx` drops from 561 lines to an estimated ~420 lines.
- No behavioral change visible to end users other than the added entrance animation.

## Open questions

None at this time. All API, behavior, migration-order, and scope questions were resolved during brainstorming on 2026-04-18.

## References

- `src/hooks/useDialog.ts` — existing focus/escape/inert behavior the primitive reuses verbatim.
- `CLAUDE.md` — accessibility constraints (touch-target size, no gestures).
- `docs/DESIGN_GUIDELINES.md` — contrast, cognitive load, font rules.
