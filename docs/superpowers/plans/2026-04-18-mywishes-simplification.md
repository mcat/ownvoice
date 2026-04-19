# My Wishes Dialog Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce visual density on the active-step screen of the My Wishes wizard by (1) consolidating compose templates into an unordered joiner, (2) replacing numbered-circle selection badges with checkmarks, (3) collapsing the topic header to the question only, and (4) removing the live sentence preview.

**Architecture:** Four small, sequential edits touching one component (`src/components/wishes/MyWishes.tsx`), one data module (`src/data/phraseRegistry.ts`), one locale file (`src/data/locales/en.ts`), and two test files. No new files, no refactors. TDD: update or add a test first, watch it fail (or verify it holds), then apply the change.

**Tech Stack:** Preact, TypeScript, Vitest + `@testing-library/preact`, inline style objects using `theme/tokens`.

**Related spec:** `docs/superpowers/specs/2026-04-18-mywishes-simplification-design.md`

---

## File Structure

- **Modify** `src/data/locales/en.ts` — replace three `wishes.compose.*` keys with a single `wishes.compose` key.
- **Modify** `src/data/phraseRegistry.ts` — simplify `composeWishSentence` to a single joiner shape.
- **Modify** `src/data/wishes.test.ts` — update the two-response test; leave others intact.
- **Modify** `src/components/wishes/MyWishes.tsx` — remove preview block, swap selection badge for checkmark, replace topic header with heading-only question.
- **Modify** `src/components/wishes/MyWishes.test.tsx` — decouple selection tests from preview text, update topic-header tests.

No other files touched. No new dependencies.

## Task 1: Consolidate compose templates (unordered multi-select)

**Files:**
- Modify: `src/data/locales/en.ts:201-203`
- Modify: `src/data/phraseRegistry.ts:326-350`
- Modify: `src/data/wishes.test.ts:65-73`

Order no longer implies ranking. The sentence templates collapse from three ("one", "two", "many") to one. The "and also" phrasing — which implied primary + secondary — is dropped.

- [ ] **Step 1: Establish a clean baseline**

Run: `npm test`
Expected: All suites pass as-is (baseline before any edits).

- [ ] **Step 2: Update the two-response compose test**

In `src/data/wishes.test.ts`, replace the existing "two responses" test (lines ~65-73):

```typescript
  it("composes sentence with two responses joined by 'and'", () => {
    const result = composeWishSentence("en", topic, [
      "Being with my family",
      "Being comfortable and free of pain",
    ]);
    expect(result).toBe(
      "What matters most to me is being with my family and being comfortable and free of pain.",
    );
  });
```

Leave the empty, one-response, three-or-more, lowercasing, and different-topic tests untouched — they continue to assert valid behavior.

- [ ] **Step 3: Run to confirm the updated test fails**

Run: `npx vitest run src/data/wishes.test.ts -t "two responses"`
Expected: FAIL — current output is `"What matters most to me is being with my family, and also being comfortable and free of pain."` (comma + "and also") instead of the new form.

- [ ] **Step 4: Replace the three compose keys with a single `wishes.compose` key**

In `src/data/locales/en.ts`, replace lines 201-203:

```typescript
  "wishes.compose.one": "{stem} is {first}.",
  "wishes.compose.two": "{stem} is {first}, and also {second}.",
  "wishes.compose.many": "{stem} is {rest}, and {last}.",
```

With:

```typescript
  "wishes.compose": "{stem} is {list}.",
```

`PhraseKey = keyof typeof en` updates automatically — no separate type edit.

- [ ] **Step 5: Simplify `composeWishSentence`**

In `src/data/phraseRegistry.ts`, replace the function (lines ~326-350):

```typescript
/** Compose a wish sentence using the locale's templates. */
export function composeWishSentence(
  locale: string,
  topic: WishTopic,
  selected: string[],
): string {
  if (!selected.length) return "";
  const items = selected.map((r) => r.toLowerCase());
  const list =
    items.length === 1
      ? items[0]
      : items.length === 2
        ? `${items[0]} and ${items[1]}`
        : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  return t("wishes.compose", locale)
    .replace("{stem}", topic.stem)
    .replace("{list}", list);
}
```

Note: the third parameter is renamed `ranked` → `selected` to reflect that order is no longer semantically meaningful; update the JSDoc if any references remain.

- [ ] **Step 6: Run the compose test file**

Run: `npx vitest run src/data/wishes.test.ts`
Expected: PASS — all tests including the updated two-response test and the existing three-or-more test (which produces `"... being with my family, being comfortable and free of pain, and going home."` — identical to the previous template output).

- [ ] **Step 7: Run the full test suite to confirm no component regressions**

Run: `npm test`
Expected: PASS — `MyWishes.test.tsx` uses single-item selection in every Share-path assertion, where the output is unchanged.

- [ ] **Step 8: Typecheck**

Run: `npm run build`
Expected: Build succeeds. The old `"wishes.compose.one"` / `"wishes.compose.two"` / `"wishes.compose.many"` keys are no longer referenced, and the new `"wishes.compose"` key is in the `PhraseKey` union.

- [ ] **Step 9: Commit**

```bash
git add src/data/locales/en.ts src/data/phraseRegistry.ts src/data/wishes.test.ts
git commit -m "$(cat <<'EOF'
Consolidate wish compose templates; drop ranking semantics

Selections in the My Wishes wizard are now unordered. The three
per-arity templates (one/two/many) collapse to a single "{stem} is
{list}." shape with the joiner implemented in JS. The "and also"
phrasing — which implied primary + secondary — is gone.
EOF
)"
```

## Task 2: Remove the live sentence preview from the active-step screen

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx:105-106` (`preview` variable) and `:310-326` (preview render block)
- Modify: `src/components/wishes/MyWishes.test.tsx:42-50` and `:169-183`

The blue preview box competes with the selected buttons below it. Selected-state on the buttons is the only in-progress state the patient needs; the sentence is heard when Share fires.

- [ ] **Step 1: Decouple the selection test from preview text**

In `src/components/wishes/MyWishes.test.tsx`, replace the test at lines ~42-50:

```typescript
  it("toggling a response marks it as selected", () => {
    render(<MyWishes {...baseProps} />);
    const firstResponse = SICG_TOPICS[0].responses[0];
    const btn = screen.getByText(firstResponse).closest("button")!;
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
```

And the deselect test at lines ~169-183:

```typescript
  it("tapping a selected response deselects it", () => {
    render(<MyWishes {...baseProps} />);
    const firstResponse = SICG_TOPICS[0].responses[0];
    const btn = screen.getByText(firstResponse).closest("button")!;
    // Select
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "true");
    // Deselect by tapping again
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
```

- [ ] **Step 2: Run the updated tests — they should still pass against the current implementation**

Run: `npx vitest run src/components/wishes/MyWishes.test.tsx -t "selected"`
Expected: PASS — `aria-pressed` is already wired on the current implementation (see `MyWishes.tsx:344`). This is a refactor step that loosens coupling before removal.

- [ ] **Step 3: Remove the `preview` variable**

In `src/components/wishes/MyWishes.tsx`, delete lines 105-106:

```typescript
  const preview =
    selected.length > 0 ? composeWishSentence(locale, topic, selected) : "";
```

- [ ] **Step 4: Remove the preview render block**

In `src/components/wishes/MyWishes.tsx`, delete the block at lines ~310-326 (the `{preview && ( ... )}` conditional):

```tsx
        {/* Live sentence preview */}
        {preview && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              backgroundColor: blueBg,
              color: blue,
              fontSize: 17,
              fontWeight: 500,
              marginBottom: 16,
              lineHeight: 1.4,
            }}
          >
            {preview}
          </div>
        )}
```

Leave the `composeWishSentence` import in place — `handleShare` (line 72), `handleShareAll` (line 99), and the completion-screen render (line 138) continue to use it.

- [ ] **Step 5: Run the full test file**

Run: `npx vitest run src/components/wishes/MyWishes.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/wishes/MyWishes.tsx src/components/wishes/MyWishes.test.tsx
git commit -m "$(cat <<'EOF'
Remove live sentence preview from My Wishes active step

The blue preview box duplicated the selected-state feedback on the
response buttons. Selection state is the in-progress signal; the
sentence is heard on Share.
EOF
)"
```

## Task 3: Replace the numbered selection badge with a checkmark

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx:336-380` (the response button render)

No test edits — tests key off response text and `aria-pressed`, neither of which move.

- [ ] **Step 1: Replace the response-button render block**

In `src/components/wishes/MyWishes.tsx`, replace the `topic.responses.map(...)` block (lines ~336-380):

```tsx
          {topic.responses.map((response) => {
            const isSelected = selected.includes(response);

            return (
              <Btn
                key={response}
                onClick={() => toggleResponse(response)}
                aria-pressed={isSelected}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? blue : t.border}`,
                  backgroundColor: isSelected ? blueBg : t.card,
                  fontSize: 18,
                  color: t.text,
                  textAlign: "left",
                  minHeight: 64,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: `2px solid ${isSelected ? blue : t.border}`,
                    backgroundColor: isSelected ? blue : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isSelected ? "✓" : ""}
                </div>
                <span>{response}</span>
              </Btn>
            );
          })}
```

Changes vs. the previous block:
- `const selIdx = ...` is dropped; only `isSelected` is needed.
- Badge content: `isSelected ? selIdx + 1 : ""` → `isSelected ? "✓" : ""`.
- Badge `color` is always `"#fff"` (it's only visible when the fill is blue).
- `aria-hidden="true"` on the badge — it's decorative; `aria-pressed` on the button is the accessible selection state.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/wishes/MyWishes.test.tsx`
Expected: PASS — behavior is unchanged, only presentation moves.

- [ ] **Step 3: Visual sanity check**

Run: `npm run dev`
Manually open the app, clone a voice (or use Web Speech fallback), tap **My Wishes**, tap two responses. Confirm each selected row shows a filled blue circle with a white ✓, unselected rows show a hollow neutral circle, and the ✓ glyph is centered. Close the dev server.

If the visual check reveals an issue (e.g., the Unicode ✓ renders at the wrong vertical baseline in Safari), stop and report before committing.

- [ ] **Step 4: Commit**

```bash
git add src/components/wishes/MyWishes.tsx
git commit -m "$(cat <<'EOF'
Swap numbered selection badge for checkmark in My Wishes

Selections are no longer ordered, so the numbered circle implied a
rule users don't need to track. A filled circle with ✓ is a quieter
affirmative; redundant shape+color state is retained for a11y.
EOF
)"
```

## Task 4: Collapse the topic header to the question only

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx:294-308` (topic header block)
- Modify: `src/components/wishes/MyWishes.test.tsx:22-27` ("renders the first topic") and `:75-81` ("tapping Skip advances")

The emoji and topic label on the active step repeated information already present in the sheet title and progress indicator. On the completion screen the emoji + label are retained — they serve scanning there, not orientation.

- [ ] **Step 1: Update the "renders the first topic" test**

In `src/components/wishes/MyWishes.test.tsx`, replace the test at lines ~22-27:

```typescript
  it("renders the first topic's question and hides the label on the active step", () => {
    render(<MyWishes {...baseProps} />);
    expect(screen.getByText("My Wishes")).toBeInTheDocument();
    expect(screen.getByText(SICG_TOPICS[0].question)).toBeInTheDocument();
    // The label (e.g., "My Goals") appears only on the completion screen's
    // summary cards, not on the active-step header.
    expect(screen.queryByText(SICG_TOPICS[0].label)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Update the "tapping Skip advances" test**

Replace the test at lines ~75-81:

```typescript
  it("tapping Skip advances to the next topic", () => {
    render(<MyWishes {...baseProps} />);
    fireEvent.click(screen.getByText("Skip"));
    // Now on topic 2 — My Worries. Assert via the question (not the label,
    // which no longer renders on the active step).
    expect(screen.getByText(SICG_TOPICS[1].question)).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run to confirm at least one test fails**

Run: `npx vitest run src/components/wishes/MyWishes.test.tsx -t "renders the first topic"`
Expected: FAIL — current implementation still renders `"My Goals"` in the active-step header, so the `queryByText(...).not.toBeInTheDocument()` assertion fails.

- [ ] **Step 4: Replace the topic header block**

In `src/components/wishes/MyWishes.tsx`, replace the block at lines ~294-308:

```tsx
        {/* Topic header */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{topic.icon}</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: t.text,
              marginBottom: 4,
            }}
          >
            {topic.label}
          </div>
          <div style={{ fontSize: 18, color: t.sub }}>{topic.question}</div>
        </div>
```

With:

```tsx
        {/* Topic header — question only; emoji & label are used on the
            completion screen, not here. */}
        <h2
          style={{
            marginTop: 16,
            marginBottom: 24,
            textAlign: "center",
            fontSize: 20,
            fontWeight: 600,
            color: t.text,
            lineHeight: 1.35,
          }}
        >
          {topic.question}
        </h2>
```

Rationale for `<h2>`: the question is the landmark prompt for the step. Promoting it from a `div` to a heading gives screen readers a real anchor. The sheet title sits at the dialog level, so `h2` is the right depth.

- [ ] **Step 5: Run the component tests**

Run: `npx vitest run src/components/wishes/MyWishes.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Typecheck and build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Visual sanity check**

Run: `npm run dev`
Open **My Wishes**. Confirm: no emoji, no "My Goals" label — only the question, centered, with breathing room above the response buttons. Tap **Skip** once and confirm topic 2 shows its question ("What are your biggest worries?") with the same treatment. Advance through all 7 steps skipping each; confirm the completion screen still shows the emoji + label on each summary card (unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/components/wishes/MyWishes.tsx src/components/wishes/MyWishes.test.tsx
git commit -m "$(cat <<'EOF'
Collapse My Wishes active-step header to question only

The emoji and topic label repeated information already conveyed by
the sheet title and step indicator. On the completion screen the
emoji + label are retained — they aid scanning in a summary view,
which isn't the same job.

The question is now an <h2> for screen-reader landmark behavior.
EOF
)"
```

## Verification

After all four tasks land:

- [ ] Run `npm test` — every suite green.
- [ ] Run `npm run build` — build succeeds, no type errors.
- [ ] Run `npm run dev` and walk through My Wishes end-to-end: select 0 responses and skip; select 1 and share; select 3 and share; confirm the spoken sentence for 3 selections uses the pattern `"What matters most to me is X, Y, and Z."` (no "and also"). Confirm the completion summary still shows emoji + label on each card.
- [ ] Confirm no existing behavior is missing: Share requires ≥1 selection, Skip always advances, Close works, completion "Share all wishes again" re-speaks every answered topic.

## Risks and open questions

- **Pre-existing grammar bug, out of scope.** Several topic stems (`"I am worried about"`, `"About my treatment"`, `"About my family"`, `"I hope"`) produce grammatically broken sentences when joined with the `"{stem} is {list}."` template ("I am worried about is suffering..."). The existing test `src/data/wishes.test.ts:91-94` already asserts the broken grammar, meaning this has been present before this change. This plan does not fix it — per the spec's scope boundary. Recommend a follow-up ticket.
- **Unicode ✓ glyph rendering on iPadOS Safari** — if the checkmark renders at an off-baseline in the target Safari version, Task 3's visual sanity check will catch it. Fallback would be an inline SVG; add only if needed.
- **Completion screen unchanged by design.** The summary cards there still use emoji + label + composed sentence. If that screen later needs the same decluttering treatment, that's a separate design pass.
