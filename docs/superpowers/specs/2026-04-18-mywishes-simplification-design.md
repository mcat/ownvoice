# My Wishes Dialog Simplification

**Date:** 2026-04-18
**Status:** Design approved, awaiting implementation plan

## Problem

The active-step screen of the My Wishes wizard has too many elements competing for attention. On one screen a patient sees: a sheet title, a close button, a "Step N of 7" text, a 7-segment progress bar, a large emoji, a bold topic label, a subtitle question, a blue-filled live sentence preview, six or more response buttons (each with a numbered selection badge), a primary Share button, and a secondary Skip button.

For ICU patients who may be cognitively fogged, this density is the product's biggest usability problem on this screen. The user-facing report: "it feels like there's too much going on here."

## Goals

- Reduce the number of competing visual zones on the active-step screen.
- Preserve every existing capability: step progression, multi-select, skip, sharing-as-utterance, completion summary, share-all.
- Keep the component's accessibility guarantees intact (64px touch targets, 4.5:1 contrast, redundant state encoding via shape + color).

## Non-goals

- No changes to the completion screen. Emojis and topic labels remain there — scannability matters in summary views.
- No changes to the SICG topic content or the clinical framing.
- No changes to the step indicator (both the "Step N of 7" text and the 7-segment bar remain). The user intentionally scoped this out.
- No refactor of the in-wizard thread history (the prior-answers block shown on steps 2+). It was not flagged as noisy.
- No migration to CSS modules or away from inline styles. Follow the existing convention.

## Design

Four targeted edits, each addressing one source of noise.

### 1. Selections become unordered

The current UI encodes selection *order* via numbered circles (1, 2, …). Dropping ordering is both the simplest visual change and the change with the furthest-reaching implications, because `composeWishSentence` currently uses order to produce "X, and also Y" (primary + secondary) vs. "X, Y, and Z".

After the change, `composeWishSentence` treats the selection array as a set. The spoken sentence uses a single shape:

- 1 item: `"{stem} is {first}."` — e.g., *"What matters most to me is being with my family."*
- 2 items: `"{stem} is {first} and {second}."` — e.g., *"What matters most to me is being with my family and being comfortable and free of pain."*
- 3+ items: `"{stem} is {list-with-oxford-and}."`

Implementation: the three locale keys `wishes.compose.one` / `compose.two` / `compose.many` collapse to a single `wishes.compose` template of the form `"{stem} is {list}."`. The join logic lives in `composeWishSentence` and handles 1 / 2 / 3+ cases.

The "and also" phrasing (which implied ranking) is removed.

### 2. Selection indicator becomes a checkmark

Replace the numbered-circle badge at the start of each response button with a simple checkmark icon:

- Selected: filled blue circle with a white ✓ glyph inside.
- Unselected: hollow circle with a neutral border.

Redundant state encoding (shape + color) is preserved — required by the project's accessibility standards and especially important for ICU patients.

### 3. Topic header is just the question

On the active-step screen only:

- Remove the large emoji.
- Remove the bold topic label (`My Goals`, `My Worries`, …).
- Keep the question as the single topic anchor, centered, with generous top margin.

The sheet title "My Wishes" and the step indicator already tell the user where they are. The question tells them what to do. The emoji and the label were restating the same information.

The completion screen's summary cards continue to use emoji + label — they serve scanning there, not orientation.

### 4. Live sentence preview is removed

Delete the blue-filled preview box that built up as selections were tapped. The patient hears the sentence when they tap Share; a visual echo during selection was duplicated feedback. The selected-state buttons are the canonical in-progress state.

The `preview` local variable and its render block come out. `composeWishSentence` is no longer called at render time on the active-step screen — only inside `handleShare` and on the completion screen.

## Component changes

**`src/components/wishes/MyWishes.tsx`**

Active-step render only:

- Delete the `preview` variable and the preview render block (lines ~105-106, ~311-326 in current file).
- Replace the topic header block (~294-308) with a single centered question element.
- Replace the numbered-circle badge inside each response button (~359-376) with a checkmark/hollow-circle treatment. Drop the `selIdx` computation; use only the boolean `isSelected`.

Logic changes:

- `toggleResponse` simplifies — it no longer needs to preserve insertion order for ranking purposes. A plain add/remove on the array is fine (and already does this). No code change here beyond semantic clarification.
- `handleShare` — no change; `composeWishSentence` accepts the same `string[]` and returns the new unordered sentence shape.

Completion screen: **no change**.

**`src/data/phraseRegistry.ts`**

Replace the three-branch `composeWishSentence` with a single path:

```
export function composeWishSentence(locale, topic, selected): string {
  if (!selected.length) return "";
  const stem = topic.stem;
  const items = selected.map((s) => s.toLowerCase());
  const list =
    items.length === 1 ? items[0]
    : items.length === 2 ? `${items[0]} and ${items[1]}`
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  return t("wishes.compose", locale).replace("{stem}", stem).replace("{list}", list);
}
```

**`src/data/locales/en.ts`**

Remove keys: `wishes.compose.one`, `wishes.compose.two`, `wishes.compose.many`.
Add key: `wishes.compose` with value `"{stem} is {list}."`.

Type union `PhraseKey` updates accordingly (remove three entries, add one).

## Tests

**`src/components/wishes/MyWishes.test.tsx`**

Two tests currently assert the preview renders:

- `"toggling a response selects it and shows a preview"` — rename to `"toggling a response selects it"` and assert selection state via `aria-pressed="true"` on the response button instead of looking for preview text.
- `"tapping a selected response deselects it"` — same shift: assert `aria-pressed` flips back to `false`, not that preview text disappears.

The Share-path test continues to assert that `onSpeak` receives a string containing the lowercased response text; it doesn't care about ordering.

All other tests remain valid.

No new tests needed — every capability retained is already covered.

## Risks and open questions

- **Translation fan-out:** the compose-key consolidation requires the same shape in every locale file. Only `en.ts` exists today, so this is a one-file change now, but it sets the contract for future locales.
- **Sentence grammar in other languages:** "X and Y" joining may not translate cleanly to languages with different list conjunctions or case systems. Accepted tradeoff for v0.1 — revisit when a second locale lands.
- **Loss of ranking information:** if a future clinical reviewer wants to know which goal was primary, we no longer capture that. The SICG guide itself doesn't prescribe ranking within a topic, so this is consistent with the framework.

## What stays the same

- `BottomSheet` primitive and its slots (`Header`, `Title`, `CloseButton`, `Body`, `Actions`).
- Progress indicator (text + 7-segment bar) — unchanged.
- Thread-history block on steps 2+ — unchanged.
- Completion screen — unchanged.
- `onAddToThread`, `onSpeak`, `onClose` callback shapes — unchanged.
- Store interactions — none; this component is self-contained.
