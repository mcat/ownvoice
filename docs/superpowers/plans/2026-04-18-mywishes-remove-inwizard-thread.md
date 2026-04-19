# Remove In-Wizard Thread from My Wishes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the local chat-like thread state and render block from the My Wishes dialog, keeping the global conversation integration intact.

**Architecture:** Single-file edit in `src/components/wishes/MyWishes.tsx`. Deletes the `WishMessage` interface, the `thread`/`threadRef` state, the auto-scroll `useEffect`, the in-wizard render block, and the `setThread` call in `handleShare`. Also prunes now-unused `useRef` / `useEffect` imports. `handleShare` keeps its `onAddToThread` and `onSpeak` calls unchanged, so the external-facing behavior is identical.

**Tech Stack:** Preact, TypeScript, Vitest + `@testing-library/preact`.

**Related spec:** `docs/superpowers/specs/2026-04-18-mywishes-remove-inwizard-thread-design.md`

---

## File Structure

- **Modify** `src/components/wishes/MyWishes.tsx` — remove thread state, effects, render block, and the per-Share `setThread` call. Prune unused imports.

No other files touched. No test changes — existing tests assert callback behavior (`onAddToThread`, `onSpeak`) and `aria-pressed`, none of which move.

## Task 1: Remove the in-wizard thread

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx`

No failing test to write first — the spec calls for zero test changes because nothing in the test file keys off the in-wizard thread rendering. The verification at the end is that the full test suite (686 tests at time of writing) remains green and `npm run build` succeeds.

- [ ] **Step 1: Establish baseline**

Run: `npm test`
Expected: 686/686 tests pass.

- [ ] **Step 2: Prune imports**

In `src/components/wishes/MyWishes.tsx`, replace line 1:

```typescript
import { useState, useRef, useEffect } from "preact/hooks";
```

With:

```typescript
import { useState } from "preact/hooks";
```

Rationale: once the thread state is gone, the file's only `useRef` and `useEffect` usages (both tied to `threadRef`/auto-scroll) vanish.

- [ ] **Step 3: Delete the `WishMessage` interface**

In `src/components/wishes/MyWishes.tsx`, delete lines 8-11:

```typescript
interface WishMessage {
  from: "patient" | "provider";
  text: string;
}
```

It is consumed only by the deleted `thread` state.

- [ ] **Step 4: Delete the thread state and the `threadRef`**

In `src/components/wishes/MyWishes.tsx`, delete these lines inside the component body:

```typescript
  const [thread, setThread] = useState<WishMessage[]>([]);
```

and:

```typescript
  const threadRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 5: Delete the auto-scroll `useEffect`**

In `src/components/wishes/MyWishes.tsx`, delete:

```typescript
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread.length]);
```

- [ ] **Step 6: Drop the `setThread(...)` call from `handleShare`**

In `src/components/wishes/MyWishes.tsx`, the current `handleShare` reads:

```typescript
  function handleShare() {
    if (!selected.length) return;
    const sentence = composeWishSentence(locale, topic, selected);
    setThread((prev) => [
      ...prev,
      { from: "provider", text: topic.question },
      { from: "patient", text: sentence },
    ]);
    onAddToThread(topic.question, "provider", "My Wishes");
    onSpeak(sentence);
    advance();
  }
```

Replace it with:

```typescript
  function handleShare() {
    if (!selected.length) return;
    const sentence = composeWishSentence(locale, topic, selected);
    onAddToThread(topic.question, "provider", "My Wishes");
    onSpeak(sentence);
    advance();
  }
```

- [ ] **Step 7: Delete the in-wizard thread render block**

In `src/components/wishes/MyWishes.tsx`, inside `<BottomSheet.Body>`, delete the entire conditional block (currently lines ~250-289):

```tsx
        {thread.length > 0 && (
          <div
            ref={threadRef}
            style={{
              maxHeight: "38vh",
              overflowY: "auto",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            {thread.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.from === "patient" ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 16,
                    lineHeight: 1.4,
                    backgroundColor:
                      msg.from === "patient" ? blueBg : t.activeBg,
                    color: msg.from === "patient" ? blue : t.sub,
                    fontWeight: msg.from === "patient" ? 500 : 400,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

```

(Delete the trailing blank line after `)}` as well, so the topic-header comment becomes the first child of `<BottomSheet.Body>`.)

- [ ] **Step 8: Typecheck and build**

Run: `npm run build`
Expected: `tsc --noEmit` passes (no `WishMessage`, `useRef`, `useEffect`, `thread`, `threadRef`, or `setThread` references remain) and Vite build succeeds.

If tsc complains about an unused import or variable, the step-by-step deletions above missed one — search the file for the offending name and remove the reference.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: All suites pass (686/686).

- [ ] **Step 10: Commit**

```bash
git add src/components/wishes/MyWishes.tsx
git commit -m "$(cat <<'EOF'
Remove in-wizard thread from My Wishes

The dialog-local chat thread duplicated context the main conversation
screen already holds and re-introduced the visual density we just
simplified away. The global conversation still receives the provider
question on Share via onAddToThread; the wizard is now a pure composer.
EOF
)"
```

## Verification

- [ ] `npm test` — 686/686 green.
- [ ] `npm run build` — clean.
- [ ] `npm run dev` and walk the wizard: tap through goals, Share; advance to worries, Share; confirm no past-question bubble appears above the current step. Confirm each Share still speaks the sentence. Confirm the completion screen still summarizes both answered topics. Confirm the main chat screen (outside the dialog) shows the provider questions in the global conversation.

## Risks

None material. The in-wizard thread was purely local UI state with no persistence, no consumers, and no coupling to other components or stores.
