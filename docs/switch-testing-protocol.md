# Switch-Device Testing Protocol

Manual-verification companion to the Vitest a11y assertion suite (`src/test/a11yAssertions.ts`). Walks a tester through enabling macOS Switch Control as a proxy for iPadOS Switch Control and exercising every patient-facing surface.

**When to run:** Before merging any PR that touches patient-surface markup or layout.

## Why macOS Switch Control proxies for iPadOS

macOS Safari and iPad Safari both emit a single accessibility tree definition derived from the same WebKit a11y mapping. Scan-order, focus-stops, and grouping behavior measured under macOS Switch Control on macOS Safari is a faithful proxy for iPadOS Switch Control on iPad Safari. Chrome on macOS uses Blink's a11y tree (different from WebKit), so it's a useful breadth check but not a reliable iPadOS predictor — prioritize Safari.

What's lost without an iPad: iPadOS-specific gestures (irrelevant — switch users don't gesture), "screen as switch" mode (iOS-only), BLE pairing flow (requires hardware), AAA-contrast focus-ring legibility on the LiquidRetina XDR display. Documented as deferred to A2 (hardware verification) under the "Hardware verification" section at the end.

## Setup (one-time, ~5 minutes)

1. Open System Settings → Accessibility → Switch Control.
2. Click **Switches** → **+** → choose **External**. When prompted to press the switch, press **Spacebar**. Set the **Action** to **Select Item**.
3. Optional (for 2-switch testing): add a second switch bound to the **J** key, action **Move To Next Item**.
4. Toggle Switch Control on. The Switch Control Home menu appears as a floating panel.
5. Set Switch Control's scan style to **Item Mode**. Group Mode is also worth testing later.

## Per-surface checklist

For each patient surface, navigate to it in the running dev server (`npm run dev`), then run the steps below. Record pass/fail in the YAML scratchpad at the bottom of this doc and copy-paste into the PR description.

### Quick tab (default landing screen)

1. **Group Mode → drill in:** Switch Control should treat the time-of-day suggestions row as a single drill-in stop labeled "Time-of-day suggestions". Inside, scanning each chip individually.
2. **Group Mode → drill in:** The PhraseGrid for the Quick tab should appear as a drill-in stop labeled with the category name. Drilling in should reveal **rows** as inner stops; each row should drill into its cells.
3. **Item Mode:** Item-mode scan should produce stops in DOM order: header buttons → tabs → suggestions → grid cells → bottom nav.
4. **Wandke flag 1:** No focus stop should land on a non-actionable wrapper (a div, span, or other non-interactive element).
5. **Wandke flag 2:** Scrolling the phrase grid via Switch Control's scroll command should not leave any cells stuck behind the bottom tab bar or top header.

### Comfort tab (subcategories + grid)

1. SubcategoryChips row should appear as a drill-in stop labeled "Subcategory in Comfort" (or similar). Inside, each chip is a radio with its label.
2. PhraseGrid below should drill in by row → cell.
3. Switching subcategory should re-focus the grid.

### Pain wizard

1. Breadcrumb at top of Pain tab should announce as a navigation landmark labeled "Pain wizard steps".
2. Severity step's 6-emoji grid should drill in as a "Pain severity" radiogroup; each face is a labeled radio with `aria-checked`.
3. After selecting a severity, location step's grid drills in as "Pain location" radiogroup.
4. After selecting location, descriptor step's grid drills in as "Pain descriptor" radiogroup.

### My Wishes

1. Progress indicator at top of sheet announces as a navigation landmark labeled "Wishes wizard progress".
2. Question heading is read.
3. Response options below drill in as a labelled group (group label = the question text). Each response is a button with `aria-pressed` for multi-select.
4. The Share / Skip action buttons sit OUTSIDE the response group.

### Sentence Builder

1. Pillbox input + suggestion pills + speak button: each in its own logical region.
2. Suggestion pill rows scan cleanly without extra wrapper stops.

## Browser matrix

Run the per-surface checklist on:

- **macOS Safari** (production proxy via shared WebKit) — required.
- **macOS Chrome** (Blink breadth check) — recommended; if results diverge from Safari, file the divergence.

## Hardware verification (deferred — tier A2)

The following can only be verified with real hardware. Documented for the future clinical-readiness milestone:

- iPadOS Switch Control behavior with a real Bluetooth switch (e.g., AbleNet Blue2 ~$169 paired to an iPad).
- Screen-as-switch mode interactions (iOS-only).
- BLE switch pairing flow.
- AAA-contrast focus-ring legibility on the LiquidRetina XDR display.

## YAML scratchpad

Copy-paste into the PR description. One block per browser tested.

```yaml
- date: 2026-MM-DD
  tester: <name>
  build: <git sha>
  browser: macOS Safari 26.x
  results:
    quick_tab:
      group_mode_drill_in: pass
      item_mode_dom_order: pass
      wandke_flag_1_wrappers: pass
      wandke_flag_2_scroll: pass
    comfort_tab:
      subcategory_radiogroup: pass
      phrasegrid_row_column: pass
      sub_switch_grid_reset: pass
    pain_wizard:
      breadcrumb_nav: pass
      severity_radiogroup: pass
      location_radiogroup: pass
      descriptor_radiogroup: pass
    my_wishes:
      progress_nav: pass
      response_group: pass
      actions_outside_group: pass
    sentence_builder:
      regions: pass
      suggestion_rows: pass
  divergences: none
```
