# Remove In-Wizard Thread from My Wishes Dialog

**Date:** 2026-04-18
**Status:** Design approved, awaiting implementation plan

## Problem

The My Wishes wizard keeps a local chat-like thread of past question/answer pairs and renders them above the current step once the patient has tapped Share at least once. This duplicates context the main conversation screen already holds, and — like the live preview we just removed — it re-introduces visual density on a screen we simplified specifically to reduce it.

## Goals

- Remove the in-wizard thread state and display from the My Wishes dialog.
- Preserve every external-facing effect of Share: the provider question is still pushed to the **global** conversation thread (via `onAddToThread`), the composed sentence is still spoken (via `onSpeak`), and the wizard still advances to the next step.

## Non-goals

- No changes to the global conversation thread or `conversationStore`. The main chat screen continues to receive the provider question on every Share.
- No changes to the completion screen, which reads from `selections` and is not coupled to the in-wizard thread.
- No changes to any callback shapes or prop contract on `MyWishes`.

## Design

Single-file edit to `src/components/wishes/MyWishes.tsx`:

- Remove the `WishMessage` interface — only consumed by the deleted state.
- Remove the `thread` / `setThread` `useState` and the `threadRef`.
- Remove the `useEffect` that auto-scrolled the thread to the bottom.
- Remove the `setThread(...)` call inside `handleShare`. The function's remaining behavior — `onAddToThread(topic.question, "provider", "My Wishes")`, `onSpeak(sentence)`, and `advance()` — is unchanged.
- Remove the `{thread.length > 0 && (...)}` render block from `BottomSheet.Body`.
- Drop `useRef` and `useEffect` from the `preact/hooks` import if no other usages remain in the file.

## Tests

The existing test file asserts:
- `onAddToThread` is called with the right args when Share is tapped.
- `onSpeak` receives a string containing the lowercased response text.
- `aria-pressed` reflects selection state.
- Skip advances to the next topic.
- The completion screen aggregates answered topics.

None of these depend on the in-wizard thread rendering. **No test changes required.** The full suite should continue to pass (686/686).

## Risks

- **None material.** The in-wizard thread was purely local UI state with no persistence, no consumers, and no coupling to other components or stores.

## What stays the same

- `MyWishes` prop contract (`onSpeak`, `onAddToThread`, `onClose`, `t`, `theme`, `patientName`, `locale`).
- Completion screen behavior.
- Step indicator, progress bar, topic header, response buttons, Share/Skip, close handling.
- Global conversation-thread integration.
