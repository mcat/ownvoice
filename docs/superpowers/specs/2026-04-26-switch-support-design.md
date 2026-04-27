# Switch Device Support — OS Switch Control Compatibility

**Status:** Draft for review
**Date:** 2026-04-26
**Scope:** Make OwnVoice usable for patients who navigate via iPadOS Switch Control (and equivalent: macOS Switch Control, Android Switch Access). Markup-only — no in-app scanner. Verifiable on a MacBook without a real iPad or external switch device.

---

## 1. Summary

OwnVoice already commits to switch-device compatibility in its design guidelines: `docs/DESIGN_GUIDELINES.md:241` requires every interactive element to be properly labeled and focusable for iPadOS Switch Control, and the v2-tier roadmap (`DESIGN_GUIDELINES.md:246`) names "External switch hardware" as a deferred capability. The runtime infrastructure for the *passive* accommodation — `cfg.assistiveInput` widening focus rings to AAA contrast and stretching button debounce — is already shipping (`useAssistiveInput.ts`, `app.css:127-134`, `Btn.tsx:25-26`).

What hasn't shipped: the **markup contract** that makes Switch Control's Group Mode actually useful. iOS Switch Control derives its scan grouping from the accessibility tree's container roles (`role="group"`, `role="radiogroup"`, `role="tablist"`, `role="toolbar"`, etc.). Without those roles, the OS falls back to flat item-mode scanning — every phrase tile, every pain face, every chip becomes a separate stop. For an AAC patient making a single selection, this means 12–24 switch presses where 3–5 would suffice.

This spec lands the markup contract. Three classes of change:

- **13 high-impact container role additions** on grid and chip-row clusters. Patient-facing surfaces (PhraseGrid, PainFlow, SubcategoryChips, MyWishes, HeaderNav, Quick suggestions) are the primary scan-cleanliness target. Provider-direction surfaces (ProviderPanel, ListenPanel, Setup, CareTeamSection) get the same role hygiene as an incidental screen-reader benefit; if PR review prefers, the provider-direction changes can be split into a follow-up.
- **7 moderate role additions** for list semantics and smaller groupings.
- **4 hardening fixes** for non-actionable wrappers and live regions.

The single highest-leverage change is on **PhraseGrid**, the most-tapped surface in the app. PhraseGrid moves from no role to true `role="grid"` + emitted `<div role="row">` wrappers + `role="gridcell"` on each PhraseButton. This unlocks Switch Control's row-column scan path on the grid: for a 24-tile grid, median switch presses to a target drop from ~12 (linear) to ~7 (row-column), a ~40% reduction. See §4.1 H1 for the trade-off (the WAI-ARIA grid pattern's keyboard expectations) and how we resolve it.

Plus the testing infrastructure to verify it without owning an iPad: a Vitest assertion suite that walks the rendered DOM for the specific failure modes Wandke (2020) describes, and a manual macOS Switch Control protocol that proxies for iPadOS via the shared WebKit accessibility tree.

This is a single-PR-cluster initiative (3 PRs, ~25 files). No new user-facing features — it's the markup that makes the existing `assistiveInput` mode actually work for switch users.

## 2. Context

### 2.1 The Wandke 2020 paper

`docs/The-Importance-of-Switch-Testing.pdf` is Daman Wandke's 2020 ICT Accessibility Symposium paper. Three of its findings are directly testable failure modes that keyboard-only a11y testing won't catch:

1. **Switch focus ≠ keyboard focus.** iOS Switch Control places focus stops on non-actionable wrapper elements (e.g., a `<div>` wrapping a `<button>`). Keyboard testing skips these; switch users hit them. Mitigation: keep wrappers semantically inert (no roles, no event handlers) or mark them `aria-hidden`.
2. **Scrolling is one-screen-at-a-time.** Floating menus and headers can permanently occlude content behind them — Switch Control can't do partial scrolls. Mitigation: assert no fixed-position elements overlap scrollable regions at the scroll-snap-stop boundary.
3. **`aria-hidden="true"` hides from Switch Access too.** Switch and VoiceOver share the OS Accessibility API. Mitigation: assert no focusable element has an `aria-hidden` ancestor.

### 2.2 Constraints

- **Hardware:** No iPad available. Development happens on a MacBook Pro with macOS Safari (production-target proxy via shared WebKit accessibility tree) and macOS Chrome (breadth check via Blink).
- **No external switch hardware** to be acquired in this milestone (= testing tier A1 from the brainstorm). Documented as the A2/A3 verification deferrals below.
- **Patient population is heterogeneous.** ICU patients range from temporarily intubated (24h, full motor capacity) to long-term ALS or post-stroke (severe motor impairment, possibly head/cheek-switch only). The OS-level path serves all of them via whatever switch hardware they bring; this spec doesn't gate access on a particular hardware assumption.

### 2.3 Out of scope

- **In-app scanner.** A bespoke 1-switch / 2-switch scanner that drives the same ARIA tree from inside the PWA was considered (Phase B in the brainstorm). Deferred — to be revisited if OS Switch Control coverage proves insufficient after real-patient testing.
- **Hardware verification (= tier A2).** A one-time end-of-phase pass with a real Bluetooth switch (e.g., AbleNet Blue2, ~$169) paired to an iPad. Required before clinical deployment but not in this milestone.
- **External switch users (= tier A3).** Paid usability sessions with switch users via Fable / Applause Accessibility / Knowbility AIR. Required before any clinical claim per the "nothing about us, without us" principle Wandke cites — but premature for v0.1.
- **Provider-direction surfaces.** Caregivers tap directly; no switch path needed. ProviderPanel, ListenPanel, all settings sheets (PIN-gated, staff-direction) are excluded from the patient scan-cleanliness test bar. They still get any role additions that benefit screen-reader users incidentally.
- **iPadOS-only behaviors.** "Screen as switch" mode (iOS-only), BLE switch pairing flow, AAA-contrast verification on the LiquidRetina XDR. Documented in the manual protocol as deferred to A2.
- **Inverse scanning, held-press scanning, sip-and-puff calibration, eye gaze, Morse-code switch input.** Low ROI for the v0.1 ICU population; OS-level Switch Control already supports the hardware variants users bring.
- **`role="grid"` on grids other than PhraseGrid.** PainFlow's severity/location/descriptor grids are single-selection (radio semantics are more truthful than grid for "pick one of N"); the row-column win at 6/9-tile sizes is small. Setup language and emoji pickers are also single-selection. PhraseGrid is the only surface where `role="grid"` is used (see H1).

## 3. Approach

### 3.1 The ARIA tree is the contract

The accessibility tree — the structured representation the OS builds from the DOM's roles, properties, and labels — is the single source of truth for every consumer that matters here:

- **iPadOS / macOS Switch Control** uses it to decide grouping in Group Mode and scan order in Item Mode.
- **VoiceOver and TalkBack** use it for screen-reader navigation (same API on iOS).
- **Vitest + jsdom + axe-core** can walk it programmatically for regression assertions.
- **A future in-app scanner**, if we build one, would consume the same tree.

Phase A's job is to make the tree correct. Every other consumer benefits without parallel state.

### 3.2 What "correct" means concretely

Three properties:

1. **Every cluster of ≥3 actionable children has a container role** (`group`, `radiogroup`, `tablist`, `toolbar`, `list`, `log`, or `nav`). Switch Control's Group Mode treats roled containers as drill-in stops; flat clusters become flat scans.
2. **Single-selection clusters use `radiogroup` + `radio`/`aria-checked`** rather than `aria-pressed` on free-floating buttons. This communicates "1 of N" to AT correctly and gives Switch Control the right semantic to announce.
3. **No focusable element has an `aria-hidden` ancestor**, and **no non-actionable wrapper carries an event handler that the OS surfaces as actionable.** Wandke flags 1 and 3.

Plus one hardening property:

4. **No fixed-position element occludes scrollable content at the scroll-snap-stop boundary.** Wandke flag 2.

### 3.3 macOS Switch Control as iPadOS proxy

The shared-WebKit guarantee: macOS Safari and iPad Safari both emit a single accessibility tree definition derived from the same WebKit a11y mapping. So scan-order, focus-stops, and grouping behavior measured under macOS Switch Control on macOS Safari is a faithful proxy for iPadOS Switch Control on iPad Safari.

The asymmetry: macOS Chrome emits a *different* tree (Blink ≠ WebKit). It's a useful breadth check (catches bugs that hit Chrome users) but is not a reliable iPadOS predictor. Manual protocol prioritizes Safari.

What's lost without an iPad: iPadOS-specific gestures (irrelevant — switch users don't gesture), screen-as-switch mode (iOS-only), BLE pairing flow (requires hardware). Documented; deferred to A2.

## 4. Markup audit findings

The following changes are derived from a complete read of every component in `src/components/`. Each item gives the file path, the current state, the recommended change, and the rationale.

### 4.1 High-impact container roles

| # | File:line | Current | Add |
|---|-----------|---------|-----|
| H1 | `PhraseGrid.tsx:27-43` | `<div style={{display:'grid'}}>` flat list of `<PhraseButton>` children | `role="grid"` + `aria-label={categoryLabel}` (new prop, supplied by caller). Chunk the `phrases` array by column count and emit each chunk inside a `<div role="row">`. Add `role="gridcell"` to each `<PhraseButton>` (or wrap each in a `role="gridcell"` div). Add roving-tabindex arrow-key handling per the WAI-ARIA Authoring Practices grid pattern (~30 LOC); only one cell is in the tab order at a time, arrow keys move focus, Home/End jump to row edges. |
| H2 | `PainFlow.tsx:215-234` (severity grid, 6 emoji faces) | unstyled grid | `role="radiogroup" aria-labelledby={severityHeadingId}`; tiles → `role="radio" aria-checked` |
| H3 | `PainFlow.tsx:309-321` (location grid) | unstyled grid | `role="radiogroup" aria-labelledby={locationHeadingId}`; tiles → `role="radio" aria-checked` |
| H4 | `PainFlow.tsx:381-394` (descriptor grid) | unstyled grid | `role="radiogroup" aria-labelledby={descriptorHeadingId}`; tiles → `role="radio" aria-checked` |
| H5 | `SubcategoryChips.tsx:36-79` | flat row, no container role | `role="radiogroup" aria-label={subcategoryFieldLabel}`; chips → `role="radio" aria-checked` |
| H6 | `App.tsx:387-411` (time-of-day suggestions on Quick tab) | unstyled flex row | `role="group" aria-label={t("ui.patient.suggestions.time_of_day")}` |
| H7 | `ProviderPanel.tsx:133-148` (provider chip row) and `ListenPanel.tsx:159-179` (same row) | `aria-pressed` per chip, no container | `role="radiogroup" aria-label="Speaking as"`; chips → `role="radio" aria-checked` (drop `aria-pressed`) |
| H8 | `ProviderPanel.tsx:150-162` (section chip row) | `aria-pressed` per chip, no container | `role="radiogroup" aria-label="Phrase category"`; chips → `role="radio" aria-checked` |
| H9 | `ProviderPanel.tsx:164-175` (phrase list under selected category) | unstyled `<div>` | `role="group" aria-labelledby={activeSectionLabelId}` |
| H10 | `MyWishes.tsx:272-322` (multi-select responses) | `<div>` of `<Btn aria-pressed>` | wrap in `role="group" aria-labelledby={topicQuestionH2Id}`. Keep `aria-pressed` on children (multi-select). |
| H11 | `HeaderNav.tsx:78` | flat `<div>` of action buttons | `role="toolbar" aria-label="Patient actions"` |
| H12 | `PainFlow.tsx:129` (breadcrumb), `MyWishes.tsx:223-250` (SICG progress), `Setup.tsx:266-299` (setup steps) | `<div>` containing step indicators with `aria-current="step"` | wrap each in `<nav aria-label="..."` (wizard-step pattern). |
| H13 | `Setup.tsx:475-511` (language grid), `Setup.tsx:711-751` and `CareTeamSection.tsx:238-271` (emoji pickers) | unstyled grids | `role="radiogroup" aria-labelledby={labelDivId}`; buttons → `role="radio" aria-checked`. Label `<div>` needs `id` to anchor `aria-labelledby`. |

Patient-facing surfaces in **bold** matter most for Phase A: PhraseGrid, PainFlow, SubcategoryChips, MyWishes, HeaderNav, Quick suggestions row.

#### H1 deep-dive: why `role="grid"` on PhraseGrid (and only there)

PhraseGrid is the most-tapped surface in the app. Its DOM today is a flat list of `<PhraseButton>` children inside a CSS grid container — visually arranged in rows and columns, but the rows exist only as a CSS-grid layout artifact, not in the markup. iOS Switch Control's Group Mode, looking at the accessibility tree alone, sees one container with N actionable children — no rows. So even with `role="group"` it would scan all 24 cells linearly inside the drill-in.

`role="grid"` plus emitted `<div role="row">` wrappers plus `role="gridcell"` on each cell gives Switch Control's Group Mode a 2-level structure: drill into the grid → drill into a row → select a cell. For a 4-row × 6-column grid:

- **Without grid roles:** median ~12 advances to reach an arbitrary target.
- **With grid + row + gridcell:** median ~3 row-advances + ~3 cell-advances = ~6, and the patient can short-circuit on entering the right row by selecting any cell with single-direction movement.

The cost is the WAI-ARIA grid keyboard pattern: roving tabindex (one cell in tab order at a time), arrow-key cell-to-cell movement, Home/End for row edges. ~30 LOC of keyboard handling in PhraseGrid. Without it, AT users hear "grid" announced but arrow keys don't navigate — degraded but not broken (Tab still enters and exits the grid; mouse/touch and Switch Control are unaffected).

This trade-off is worth taking only on PhraseGrid because (a) it's the highest-volume target in the app and (b) the row-column payoff scales with grid size. The other grids in this spec stay as `radiogroup` (single-selection semantics fit better at 6–9 tiles).

### 4.2 Moderate role additions

| # | File:line | Add | Rationale |
|---|-----------|-----|-----------|
| M1 | `Thread.tsx:69-134` (conversation message list) | `role="log" aria-label="Conversation"` on the scroll container at L70 | `log` is the W3C role for an auto-updating chronological feed; implies polite live-region semantics so new messages get announced. |
| M2 | `SettingsPanel.tsx:74-118` | `role="group" aria-label="Settings"` on the column wrapper | iPadOS-style settings list. Could alternatively use `role="list"` + `role="listitem"`. |
| M3 | `ResetSheet.tsx:107-141` | `role="group" aria-label="Reset actions"` | 3 destructive actions; group cuts scan from 3 stops to 1 drill-in. |
| M4 | `FallbackVoicePicker.tsx:323-388` (Recommended + Other voice lists) | `role="list" aria-label="Recommended voices"` and `role="list" aria-label="Other voices"`; voices → `role="listitem"`. Also: each voice button → `aria-pressed={isSelected}` so the ✓ has a non-visual equivalent. | Switch users currently get no audible signal for "selected voice"; visual only. |
| M5 | `CareTeamSection.tsx:152-204` | wrap each provider row in `role="group" aria-labelledby={providerNameId}` | Scopes the embedded VoiceCapture controls to "Maria's voice" semantically. |
| M6 | `ListenPanel.tsx:181-213` | `role="group" aria-label="Voice capture"` around mic + status + textarea (excluding Submit) | Lets Switch skip past the cluster as one drill-in if the patient is just reviewing. |
| M7 | `PatientsScreen.tsx:199` | add `aria-label="Patients"` to the existing `<ul>` | Implicit list role exists; missing accessible name. |

### 4.3 Hardening fixes

| # | File:line | Fix | Why |
|---|-----------|-----|-----|
| D1 | `BottomSheet.tsx:140-144` (backdrop div with onClick) | add `aria-hidden="true"` and `tabIndex={-1}` | Wandke flag 1: divs with click handlers can become Switch focus stops despite being non-actionable. The backdrop is passive dismissal only. |
| D2 | `PinGate.tsx:167-173` (3×4 keypad grid) | wrap in `role="group" aria-label="PIN keypad"` | 12 keypad keys + Cancel currently scan as 13 stops; group makes the keypad one drill-in. |
| D3 | `Thread.tsx:69` (after M1's `role="log"`) | add `aria-relevant="additions text"` | Defensive against re-render flooding the live region. |
| D4 | `Speaking.tsx:82` | add `aria-atomic="true"` to the existing `role="status" aria-live="polite"` | Re-announces the whole label on phrase change rather than diff-merging — better for non-English where partial diffs can produce gibberish. |

Wizard step indicators (`PainFlow`, `MyWishes`, `Setup`) already combine visible step counters with `aria-current="step"`; the only change there is H12 (wrapping the breadcrumb in `<nav>`). `SentenceBuilder` has no explicit steps. Listed in §4.4 below for completeness.

### 4.4 What's already correct

These nine sites pass review and should not be touched. Listed so the spec is complete (and so future changes know what they're coexisting with):

| File:line | Why correct |
|-----------|-------------|
| `TabBar.tsx:64` `<nav aria-label="Primary">` + `aria-current="page"` | Comment at L62-63 explicitly justifies rejecting `role="tablist"` (would force arrow-key roving). Right call for primary nav. |
| `BottomSheet.tsx:148-150` `role="dialog" aria-modal="true" aria-labelledby` | Textbook modal dialog. |
| `PinGate.tsx:88-90` same dialog pattern + `role="alert" aria-live="assertive"` for errors at L154-155 | Correct. |
| `ConfirmDialog.tsx:81` dialog + manual focus trap | Tab/Shift-Tab cycling, Escape-to-cancel. Solid. |
| `KebabMenu.tsx` whole component | `role="menu"`, `role="menuitem"`, `aria-haspopup`, `aria-expanded`, `aria-controls`, roving tabindex, Tab-out closes. Textbook. |
| `AccessibilitySection.tsx:124-132` `<button role="switch" aria-checked aria-label>` | Correct toggle. |
| `LanguagePicker.tsx:86-90` `role="radiogroup"` + `role="radio" aria-checked` | Correct. |
| `Speaking.tsx:82-85` `role="status" aria-live="polite"` (will get `aria-atomic` per D4) | Correct. |
| `WarningToast.tsx:144` `role="alertdialog" aria-live="assertive"` | Correct for timed urgent dialog with controls. |
| `PainFlow.tsx:127`, `MyWishes.tsx:218-222`, `Setup.tsx:277` (visible "step N of M" + `aria-current="step"`) | Wizard step indicators are already correct semantically; H12 only adds the `<nav>` wrapper. |

### 4.5 Notable absences (nothing to fix)

- **No nested-button anti-patterns.** PhraseButton, SuggestionChip, SubcategoryChips all render `<Btn>` directly inside non-actionable flex/grid wrappers. Wandke flag 1 doesn't bite.
- **Decorative chevrons are properly hidden.** `PatientPill.tsx:88-90`, `SettingsNavRow.tsx:26+40`, etc. all use `aria-hidden="true"` on visual chevrons.
- **No `aria-hidden="true"` on focusable elements.** Wandke flag 3 is clean.

## 5. Testing toolchain

### 5.1 Vitest assertion suite (CI-runnable)

New helpers in `src/test/a11yAssertions.ts`. Each helper takes a rendered container and either passes or returns a list of violations:

- **`assertNoAriaHiddenAncestorOnFocusables(container)`** — query all `[tabindex]:not([tabindex="-1"]), button:not([disabled]), a[href], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]`; for each, walk ancestors and fail if any has `aria-hidden="true"`. Catches Wandke flag 3.
- **`assertFocusOrderMatchesDomOrder(container, expectedSelectors)`** — query expected focusables in DOM order; assert tabindex values produce the same order. Catches subtle ordering regressions when layout changes shift visual order without DOM order.
- **`assertNoFixedOcclusionAtScrollStop(container)`** — find scrollable regions; for each, verify no element with `position: fixed` overlaps the bottom-of-scroll boundary box. Catches Wandke flag 2 (floating menu hides content during one-screen scroll).
- **`assertGroupContainersHaveLabels(container)`** — every `[role="group"], [role="radiogroup"], [role="toolbar"], [role="tablist"], [role="grid"]` must have `aria-label` or `aria-labelledby`. Prevents unlabeled drill-in stops.
- **`assertSingleSelectionUsesRadiogroup(container)`** — heuristic: clusters of buttons where exactly one has `aria-pressed="true"` warn that `radiogroup` + `aria-checked` would be more accurate. Suggestion-grade, not error-grade.
- **`assertGridStructure(container)`** — for any `[role="grid"]`: verify direct children include `[role="row"]` elements, each row contains `[role="gridcell"]` children, and the grid itself has an accessible name. Catches structural drift in PhraseGrid (e.g., a refactor that drops the row wrappers).

Each top-level patient screen gets a `*.a11y.test.tsx` file calling these helpers against a fresh render. Adds ~5 test files for ~15 minutes of total compute. PhraseGrid additionally gets a roving-tabindex test (`assertRovingTabindex`) verifying that exactly one cell has `tabindex="0"` at any time and that arrow keys move it.

### 5.2 Manual macOS Switch Control protocol

New file `docs/switch-testing-protocol.md`. Walks a tester through:

1. **Setup:** System Settings → Accessibility → Switch Control. Enable. In the Switch Control panel, add a switch bound to a key (default: Space → "Select Item"). Optional: bind a second key (default: J → "Move To Next Item") for 2-switch testing.
2. **Per-surface checklist:** for each patient surface (Quick tab, Comfort phrases, Pain wizard, Wishes, Sentence Builder), record:
   - Group Mode drills correctly into each cluster (PhraseGrid, severity grid, etc.)
   - For PhraseGrid specifically: Group Mode shows row-column structure — drilling into the grid presents N rows; selecting a row drills into its cells.
   - Item Mode produces stops in expected DOM order (no extra wrapper stops)
   - No focus stop lands on a non-actionable div (Wandke flag 1)
   - No element scrolls behind a floating header / footer (Wandke flag 2)
3. **Browser matrix:** macOS Safari (production proxy), macOS Chrome (Blink breadth check). Document any divergence.
4. **Pass/fail recording:** YAML scratchpad at the bottom of the doc; copy-paste run records into PR descriptions.

Run before merging any PR that touches patient-surface markup or layout.

### 5.3 Deferred verification (= tier A2)

`docs/switch-testing-protocol.md` ends with a "Hardware verification" section listing the iPad-specific things this milestone can't catch:

- iPadOS Switch Control behavior with a real Bluetooth switch (AbleNet Blue2 or equivalent)
- Screen-as-switch mode interactions
- BLE pairing UX
- AAA-contrast focus rings on LiquidRetina XDR

Marked as the gate for clinical-readiness, not v0.1.

## 6. Done definition

- All §4 changes shipped. Every container in §4.1 and §4.2 has the recommended role + label. All §4.3 hardening fixes applied.
- PhraseGrid renders rows/cells per H1 deep-dive: `role="grid"` + `role="row"` wrappers + `role="gridcell"` cells + roving-tabindex arrow-key handling.
- `*.a11y.test.tsx` exists for every patient-surface screen. All assertions pass in CI, including `assertGridStructure` and `assertRovingTabindex` for PhraseGrid.
- `docs/switch-testing-protocol.md` exists. The author has run it once on macOS Safari + macOS Chrome and recorded pass/fail in the doc, including the PhraseGrid row-column drill-in check.
- `DESIGN_GUIDELINES.md:428` checklist item ("Has this screen been tested with iPadOS Switch Control?") is updated to point to the protocol doc as the proxy verification step.

## 7. Files & PR plan

### 7.1 PR-1 — Markup + assertions

~25 component files. Most changes are container role + `aria-label` additions. PhraseGrid is the one structural change — chunking the `phrases` array into row groups and adding roving-tabindex handling (~40 LOC; see H1 deep-dive). Plus the new test helpers and per-screen a11y tests.

**Modified:** the 25 components named in §4.1, §4.2, §4.3 — PhraseGrid carries the structural change, the rest are pure-markup edits.
**New:** `src/test/a11yAssertions.ts`, `src/components/**/__tests__/*.a11y.test.tsx`.

### 7.2 PR-2 — Manual protocol doc

Tiny PR. Just `docs/switch-testing-protocol.md` and a one-line update to `DESIGN_GUIDELINES.md:428`.

### 7.3 PR cadence

Per `feedback_pr_merge_cadence`: each PR pushes branch + opens PR + stops. No auto-merge. Real review checkpoints before main.

## 8. Open questions

- **Provider chip rows: `radiogroup` migration vs. `aria-pressed` retention.** Migrating drops `aria-pressed` in favor of `role="radio" aria-checked`. This is more accurate but changes how AT announces state ("pressed" → "selected"). Worth a one-line release note, otherwise no user impact.
- **`Thread` as `role="log"` vs `role="list"`.** `log` brings live-region announcement of new messages. Could be excessive in noisy clinical environments. If the clinical team flags it, fall back to `role="list"` + `role="listitem"` and drop the live-region behavior.
- **PhraseGrid arrow-key behavior at row edges.** WAI-ARIA APG offers two conventions: wrap to the next/previous row, or stop at the edge. Wrap is better for keyboard power-users (faster traversal); stop-at-edge is better for AAC patients (predictable boundaries). Recommend stop-at-edge with Home/End jumping to row edges and PageUp/PageDown jumping between rows — but defer to implementation if the grid pattern's APG example differs meaningfully.
