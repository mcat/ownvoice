# Switch Device Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the markup contract the spec defines so iPadOS Switch Control can scan-group OwnVoice's patient surfaces correctly. Verifiable on a MacBook with macOS Safari/Chrome — no iPad or external switch hardware required.

**Architecture:** Two PRs. PR-1 adds container ARIA roles across ~25 components (one structural change to PhraseGrid, the rest pure-markup), introduces a Vitest assertion helper module, and adds per-screen `*.a11y.test.tsx` files. PR-2 adds the manual macOS Switch Control protocol doc. The accessibility tree becomes the single source of truth: Vitest, macOS Switch Control, and any future in-app scanner all consume it.

**Tech Stack:** TypeScript + Preact + Vite + Vitest. `@testing-library/preact` for component tests. WAI-ARIA grid pattern for PhraseGrid. No new runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-26-switch-support-design.md`](../specs/2026-04-26-switch-support-design.md). Read §3.2 ("What 'correct' means concretely") and §4 (the audit findings) before starting.

---

## Out of scope (per spec §2.3)

- In-app scanner (Phase B in the brainstorm — explicitly cut)
- Hardware verification with a real Bluetooth switch (= tier A2)
- External switch users via Fable / Applause / Knowbility AIR (= tier A3)
- `role="grid"` on grids other than PhraseGrid (PainFlow + Setup pickers stay `radiogroup`)
- iPadOS-only behaviors (screen-as-switch, BLE pairing flow)
- Provider-direction surfaces' scan-cleanliness verification (markup gets fixed for screen-reader benefit; no Switch Control verification bar)

---

## File Structure

### New files

- `src/test/a11yAssertions.ts` — six Vitest assertion helpers (one per spec §5.1 bullet) plus `assertGridStructure` and `assertRovingTabindex` for PhraseGrid.
- `src/test/a11yAssertions.test.ts` — unit tests for the helpers themselves.
- `src/components/phrases/PhraseGrid.a11y.test.tsx` — PhraseGrid grid/row/cell + roving tabindex.
- `src/components/pain/PainFlow.a11y.test.tsx` — PainFlow severity/location/descriptor radiogroups.
- `src/components/wishes/MyWishes.a11y.test.tsx` — Wishes responses group + progress nav.
- `src/App.a11y.test.tsx` — top-level patient view a11y assertions across the patient surfaces from a single render.
- `docs/switch-testing-protocol.md` — manual macOS Switch Control protocol (PR-2).

### Modified files (PR-1 markup)

- `src/components/phrases/PhraseGrid.tsx` — structural: chunk into rows, add `role="grid"` + `role="row"` + `role="gridcell"` + roving-tabindex arrow-key handling.
- `src/components/phrases/PhraseButton.tsx` — accept and forward `role` and `tabIndex` props.
- `src/components/phrases/SubcategoryChips.tsx` — `role="radiogroup"` + `role="radio"` + `aria-checked`.
- `src/components/pain/PainFlow.tsx` — three grids → `role="radiogroup"` + `role="radio"`; breadcrumb → `<nav>`. Heading ids for `aria-labelledby`.
- `src/components/conversation/Thread.tsx` — `role="log"` + `aria-live="polite"` + `aria-relevant="additions text"`.
- `src/components/wishes/MyWishes.tsx` — multi-select group around responses + progress `<nav>`.
- `src/components/layout/HeaderNav.tsx` — `role="toolbar"` on the wrapper.
- `src/components/provider/ProviderPanel.tsx` — provider chip row, section chip row, phrase list groupings.
- `src/components/provider/ListenPanel.tsx` — provider chip row → `radiogroup`; mic cluster → `group`.
- `src/components/settings/Setup.tsx` — language grid + emoji picker → `radiogroup`; step indicators → `<nav>`.
- `src/components/settings/sections/CareTeamSection.tsx` — emoji picker + provider list groupings.
- `src/components/settings/SettingsPanel.tsx` — settings list grouping.
- `src/components/settings/ResetSheet.tsx` — actions group.
- `src/components/shared/FallbackVoicePicker.tsx` — recommended/other voice lists + selected `aria-pressed`.
- `src/components/shared/BottomSheet.tsx` — backdrop `aria-hidden` + `tabIndex={-1}`.
- `src/components/shared/PinGate.tsx` — keypad group.
- `src/components/shared/Speaking.tsx` — `aria-atomic="true"`.
- `src/components/patients/PatientsScreen.tsx` — `<ul aria-label>`.
- `src/App.tsx` — Quick suggestions row group; pass `aria-label` prop to PhraseGrid.

### Modified files (PR-2 doc)

- `docs/DESIGN_GUIDELINES.md:428` — checklist item update.

---

## Phase 1 — Test infrastructure (PR-1)

### Task 1: Scaffold the assertion helpers module + test-fixture builder

**Files:**
- Create: `src/test/a11yAssertions.ts`
- Create: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the file scaffold**

Create `src/test/a11yAssertions.ts`:

```ts
// Vitest assertion helpers for accessibility regressions. Each helper
// takes a rendered DOM container and either returns void (pass) or
// throws an Error with a descriptive message listing every offending
// element (fail). See spec §5.1.

const FOCUSABLE_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  'button:not([disabled])',
  'a[href]',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
].join(", ");

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className
    ? `.${el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`
    : "";
  const role = el.getAttribute("role");
  const label = el.getAttribute("aria-label");
  const text = el.textContent?.trim().slice(0, 40);
  const parts = [tag + id + cls];
  if (role) parts.push(`role="${role}"`);
  if (label) parts.push(`aria-label="${label}"`);
  if (text) parts.push(JSON.stringify(text));
  return parts.join(" ");
}
```

Create `src/test/a11yAssertions.test.ts` with a fixture builder using DOMParser (so we never assign to `.innerHTML` directly):

```ts
import { describe, it, expect } from "vitest";

/**
 * Build a DOM subtree from an HTML string for use in helper unit tests.
 * Uses DOMParser so we never touch `Element.innerHTML` (project lint
 * pattern). Returns the wrapping div; query inside it as needed.
 */
export function buildRoot(htmlString: string): Element {
  const parsed = new DOMParser().parseFromString(
    `<!doctype html><html><body><div id="root">${htmlString}</div></body></html>`,
    "text/html",
  );
  return parsed.getElementById("root")!;
}

describe("buildRoot test fixture builder", () => {
  it("parses a simple element", () => {
    const root = buildRoot(`<button>X</button>`);
    expect(root.querySelector("button")?.textContent).toBe("X");
  });
});
```

- [ ] **Step 2: Run the fixture-builder test, expect PASS**

Run: `npm test -- a11yAssertions.test.ts`
Expected: 1 pass.

- [ ] **Step 3: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): scaffold a11yAssertions module + DOMParser-based fixture builder"
```

### Task 2: `assertNoAriaHiddenAncestorOnFocusables` (Wandke flag 3)

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertNoAriaHiddenAncestorOnFocusables } from "./a11yAssertions";

describe("assertNoAriaHiddenAncestorOnFocusables", () => {
  it("passes when no focusable has aria-hidden ancestor", () => {
    const root = buildRoot(`<button>Click me</button>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root)).not.toThrow();
  });

  it("fails when a focusable button has an aria-hidden ancestor", () => {
    const root = buildRoot(`<div aria-hidden="true"><button>Click me</button></div>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root))
      .toThrow(/aria-hidden ancestor/);
  });

  it("ignores aria-hidden on the focusable itself", () => {
    // Self aria-hidden on a focusable is a separate failure mode (axe-core
    // catches it). This helper specifically checks ANCESTOR aria-hidden,
    // which is the Wandke-paper flag-3 pattern.
    const root = buildRoot(`<button aria-hidden="true">Click me</button>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- a11yAssertions.test.ts`
Expected: 3 failures with "assertNoAriaHiddenAncestorOnFocusables is not a function".

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
/**
 * Assert no focusable element has an `aria-hidden="true"` ancestor.
 *
 * Wandke (2020) flag 3: iOS Switch Control / Android Switch Access share
 * the OS Accessibility API with VoiceOver / TalkBack. `aria-hidden=true`
 * removes the subtree from the a11y tree entirely — switch users cannot
 * reach focusables underneath it, even though they're still keyboard-
 * tabbable.
 */
export function assertNoAriaHiddenAncestorOnFocusables(root: Element): void {
  const violations: string[] = [];
  const focusables = root.querySelectorAll(FOCUSABLE_SELECTOR);
  for (const focusable of focusables) {
    let ancestor: Element | null = focusable.parentElement;
    while (ancestor && ancestor !== root) {
      if (ancestor.getAttribute("aria-hidden") === "true") {
        violations.push(
          `${describe(focusable)} has aria-hidden ancestor ${describe(ancestor)}`,
        );
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `aria-hidden ancestor on ${violations.length} focusable element(s):\n  ${violations.join("\n  ")}`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertNoAriaHiddenAncestorOnFocusables"
```

### Task 3: `assertFocusOrderMatchesDomOrder`

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertFocusOrderMatchesDomOrder } from "./a11yAssertions";

describe("assertFocusOrderMatchesDomOrder", () => {
  it("passes when no element has positive tabindex", () => {
    const root = buildRoot(`
      <button>A</button>
      <button>B</button>
      <button>C</button>
    `);
    expect(() => assertFocusOrderMatchesDomOrder(root)).not.toThrow();
  });

  it("fails when a positive tabindex disrupts DOM order", () => {
    const root = buildRoot(`
      <button tabindex="2">A</button>
      <button>B</button>
      <button tabindex="1">C</button>
    `);
    expect(() => assertFocusOrderMatchesDomOrder(root))
      .toThrow(/positive tabindex/);
  });

  it("allows roving tabindex (one 0, rest -1)", () => {
    const root = buildRoot(`
      <button tabindex="0">A</button>
      <button tabindex="-1">B</button>
      <button tabindex="-1">C</button>
    `);
    expect(() => assertFocusOrderMatchesDomOrder(root)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
/**
 * Fail if any element uses a positive tabindex (>= 1), which disrupts
 * DOM-order traversal in ways that surprise switch users. tabindex="0"
 * (in tab order) and tabindex="-1" (programmatically focusable, not in
 * tab order) are both fine.
 */
export function assertFocusOrderMatchesDomOrder(root: Element): void {
  const violations: string[] = [];
  const all = root.querySelectorAll("[tabindex]");
  for (const el of all) {
    const v = el.getAttribute("tabindex");
    if (v == null) continue;
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 1) {
      violations.push(`${describe(el)} has positive tabindex="${v}"`);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `positive tabindex on ${violations.length} element(s) (use 0 or -1):\n  ${violations.join("\n  ")}`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertFocusOrderMatchesDomOrder"
```

### Task 4: `assertGroupContainersHaveLabels`

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertGroupContainersHaveLabels } from "./a11yAssertions";

describe("assertGroupContainersHaveLabels", () => {
  it("passes when group has aria-label", () => {
    const root = buildRoot(`<div role="group" aria-label="Comfort phrases"></div>`);
    expect(() => assertGroupContainersHaveLabels(root)).not.toThrow();
  });

  it("passes when group has aria-labelledby pointing to existing element", () => {
    const root = buildRoot(`
      <h2 id="h">Pain Severity</h2>
      <div role="radiogroup" aria-labelledby="h"></div>
    `);
    expect(() => assertGroupContainersHaveLabels(root)).not.toThrow();
  });

  it("fails when group has no label", () => {
    const root = buildRoot(`<div role="group"></div>`);
    expect(() => assertGroupContainersHaveLabels(root)).toThrow(/no accessible name/);
  });

  it("fails when aria-labelledby points to nonexistent id", () => {
    const root = buildRoot(`<div role="radiogroup" aria-labelledby="missing"></div>`);
    expect(() => assertGroupContainersHaveLabels(root)).toThrow(/dangling aria-labelledby/);
  });

  it("checks all grouping roles", () => {
    const root = buildRoot(`
      <div role="toolbar"></div>
      <div role="tablist"></div>
      <div role="grid"></div>
    `);
    expect(() => assertGroupContainersHaveLabels(root)).toThrow(/3 grouping container/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
const GROUPING_ROLES = ["group", "radiogroup", "toolbar", "tablist", "grid", "list", "log"] as const;

/**
 * Every container with a grouping role must have an accessible name —
 * either `aria-label` or `aria-labelledby` pointing to an existing
 * element. Unlabeled groups make Switch Control's drill-in stops
 * announce as just "group" with no context.
 */
export function assertGroupContainersHaveLabels(root: Element): void {
  const violations: string[] = [];
  const selector = GROUPING_ROLES.map((r) => `[role="${r}"]`).join(", ");
  const groups = root.querySelectorAll(selector);
  for (const group of groups) {
    const label = group.getAttribute("aria-label");
    const labelledby = group.getAttribute("aria-labelledby");
    if (label && label.trim().length > 0) continue;
    if (labelledby) {
      const ids = labelledby.split(/\s+/).filter(Boolean);
      const allFound = ids.every((id) => root.querySelector(`#${CSS.escape(id)}`));
      if (allFound) continue;
      violations.push(`${describe(group)} has dangling aria-labelledby="${labelledby}"`);
      continue;
    }
    violations.push(`${describe(group)} has no accessible name`);
  }
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} grouping container(s) missing accessible name:\n  ${violations.join("\n  ")}`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertGroupContainersHaveLabels"
```

### Task 5: `assertGridStructure`

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertGridStructure } from "./a11yAssertions";

describe("assertGridStructure", () => {
  it("passes for a well-formed grid", () => {
    const root = buildRoot(`
      <div role="grid" aria-label="Phrases">
        <div role="row">
          <button role="gridcell">A</button>
          <button role="gridcell">B</button>
        </div>
        <div role="row">
          <button role="gridcell">C</button>
        </div>
      </div>
    `);
    expect(() => assertGridStructure(root)).not.toThrow();
  });

  it("fails when grid has no rows", () => {
    const root = buildRoot(`
      <div role="grid" aria-label="Phrases">
        <button role="gridcell">A</button>
      </div>
    `);
    expect(() => assertGridStructure(root)).toThrow(/no \[role="row"\]/);
  });

  it("fails when row has no gridcells", () => {
    const root = buildRoot(`
      <div role="grid" aria-label="Phrases">
        <div role="row"><span>nothing</span></div>
      </div>
    `);
    expect(() => assertGridStructure(root)).toThrow(/row without role="gridcell"/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
/**
 * Verify any [role="grid"] in the container has [role="row"] descendants
 * and each row contains at least one [role="gridcell"]. Catches
 * structural drift in PhraseGrid (a refactor that flattens the row
 * wrappers and silently disables row-column scanning).
 */
export function assertGridStructure(root: Element): void {
  const violations: string[] = [];
  const grids = root.querySelectorAll('[role="grid"]');
  for (const grid of grids) {
    const rows = grid.querySelectorAll('[role="row"]');
    if (rows.length === 0) {
      violations.push(`${describe(grid)} has no [role="row"] descendants`);
      continue;
    }
    for (const row of rows) {
      const cells = row.querySelectorAll('[role="gridcell"]');
      if (cells.length === 0) {
        violations.push(`${describe(row)} is a row without role="gridcell" descendants`);
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} grid structure issue(s):\n  ${violations.join("\n  ")}`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertGridStructure"
```

### Task 6: `assertRovingTabindex`

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertRovingTabindex } from "./a11yAssertions";

describe("assertRovingTabindex", () => {
  it("passes when exactly one cell has tabindex=0 and rest are -1", () => {
    const root = buildRoot(`
      <button tabindex="0">A</button>
      <button tabindex="-1">B</button>
      <button tabindex="-1">C</button>
    `);
    expect(() => assertRovingTabindex(root, "button")).not.toThrow();
  });

  it("fails when zero cells are tabbable", () => {
    const root = buildRoot(`
      <button tabindex="-1">A</button>
      <button tabindex="-1">B</button>
    `);
    expect(() => assertRovingTabindex(root, "button"))
      .toThrow(/exactly one tabindex="0".*found 0/);
  });

  it("fails when multiple cells are tabbable", () => {
    const root = buildRoot(`
      <button tabindex="0">A</button>
      <button tabindex="0">B</button>
    `);
    expect(() => assertRovingTabindex(root, "button"))
      .toThrow(/exactly one tabindex="0".*found 2/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
/**
 * Roving tabindex pattern: exactly one element matching the selector
 * should have tabindex="0" (in tab order); the rest should have
 * tabindex="-1" (programmatically focusable only). Used by PhraseGrid
 * to keep the grid as a single tab stop regardless of cell count.
 */
export function assertRovingTabindex(root: Element, selector: string): void {
  const all = root.querySelectorAll(selector);
  let zeros = 0;
  let missing = 0;
  for (const el of all) {
    const v = el.getAttribute("tabindex");
    if (v === "0") zeros++;
    else if (v !== "-1") missing++;
  }
  if (zeros !== 1) {
    throw new Error(
      `roving tabindex: expected exactly one tabindex="0" among "${selector}", found ${zeros} (and ${missing} elements with neither 0 nor -1)`,
    );
  }
  if (missing > 0) {
    throw new Error(
      `roving tabindex: ${missing} element(s) matching "${selector}" lack explicit tabindex (must be 0 or -1)`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertRovingTabindex"
```

### Task 7: `assertNoFixedOcclusionAtScrollStop` (static-analysis variant)

jsdom does not compute layout — `getBoundingClientRect` returns zeros. Implement a static-analysis variant: scan inline `style` attributes for `position: fixed` co-located with scrollable regions. Less precise than runtime, but catches the Wandke-paper pattern.

**Files:**
- Modify: `src/test/a11yAssertions.ts`
- Modify: `src/test/a11yAssertions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/test/a11yAssertions.test.ts`:

```ts
import { assertNoFixedOcclusionAtScrollStop } from "./a11yAssertions";

describe("assertNoFixedOcclusionAtScrollStop", () => {
  it("passes with no fixed elements", () => {
    const root = buildRoot(`<div style="overflow-y: auto"><button>A</button></div>`);
    expect(() => assertNoFixedOcclusionAtScrollStop(root)).not.toThrow();
  });

  it("warns when fixed-position element is a sibling of a scroll region", () => {
    const root = buildRoot(`
      <div style="overflow-y: auto"><button>A</button></div>
      <div style="position: fixed; bottom: 0">Floating menu</div>
    `);
    expect(() => assertNoFixedOcclusionAtScrollStop(root))
      .toThrow(/fixed-position .* sibling of scroll region/);
  });

  it("ignores when there are no scroll regions", () => {
    const root = buildRoot(`<div style="position: fixed; bottom: 0">Floating</div>`);
    expect(() => assertNoFixedOcclusionAtScrollStop(root)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement the helper**

Append to `src/test/a11yAssertions.ts`:

```ts
/**
 * Static-analysis approximation of Wandke flag 2: floating menus
 * occluding scrollable content. jsdom doesn't compute layout, so we
 * scan the DOM for `position: fixed` inline styles co-located with
 * scrollable regions (`overflow-y: auto|scroll`). If a fixed element
 * is a sibling/ancestor of a scroll region within the audited
 * container, flag it — the tester should manually verify in a real
 * browser that it doesn't occlude the scroll region's bottom edge.
 *
 * False positives are acceptable; this is a tripwire, not a strict gate.
 */
export function assertNoFixedOcclusionAtScrollStop(root: Element): void {
  function isFixed(el: Element): boolean {
    const inline = el.getAttribute("style") ?? "";
    return /position\s*:\s*fixed/i.test(inline);
  }
  function isScrollable(el: Element): boolean {
    const inline = el.getAttribute("style") ?? "";
    return /overflow(-y)?\s*:\s*(auto|scroll)/i.test(inline);
  }

  const allElements = Array.from(root.querySelectorAll("*"));
  const fixed = allElements.filter(isFixed);
  const scroll = allElements.filter(isScrollable);
  if (fixed.length === 0 || scroll.length === 0) return;

  const violations: string[] = [];
  for (const f of fixed) {
    for (const s of scroll) {
      if (f.contains(s) || s.contains(f) || f.parentElement === s.parentElement) {
        violations.push(
          `${describe(f)} (fixed) is sibling of scroll region ${describe(s)}`,
        );
        break;
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} fixed-position element(s) co-located with scroll regions:\n  ${violations.join("\n  ")}\n\nManual verification required: confirm in a real browser that the fixed element does not occlude the scroll region's bottom edge at any scroll position.`,
    );
  }
}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/test/a11yAssertions.ts src/test/a11yAssertions.test.ts
git commit -m "test(a11y): add assertNoFixedOcclusionAtScrollStop"
```

---

## Phase 2 — PhraseGrid structural change (PR-1)

PhraseGrid is the one structural change in PR-1. It moves from a flat list of buttons in a CSS grid to a `role="grid"` with `role="row"` wrappers and `role="gridcell"` cells, plus a roving-tabindex arrow-key handler.

### Task 8: PhraseButton — accept `role` and `tabIndex` pass-through

**Files:**
- Modify: `src/components/phrases/PhraseButton.tsx`
- Modify: `src/components/phrases/PhraseButton.test.tsx`

- [ ] **Step 1: Verify Btn already forwards arbitrary props**

Read `src/components/shared/Btn.tsx`. Confirm line 11 spreads `...props` so `role` and `tabIndex` flow through to the `<button>`. (Verified at audit time; re-verify if anything has changed.)

- [ ] **Step 2: Write the failing test**

Append to `src/components/phrases/PhraseButton.test.tsx`:

```tsx
it("forwards role and tabIndex props to the underlying button", () => {
  const phrase = { text: "Water", icon: "💧" };
  const { container } = render(
    <PhraseButton phrase={phrase} onTap={() => {}} t={baseTheme}
      role="gridcell" tabIndex={-1} />
  );
  const cell = container.querySelector('[role="gridcell"]');
  expect(cell).not.toBeNull();
  expect(cell?.getAttribute("tabindex")).toBe("-1");
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `npm test -- PhraseButton.test`
Expected: TypeScript fail because `role`/`tabIndex` aren't on `PhraseButtonProps`.

- [ ] **Step 4: Update `PhraseButtonProps` and forward the props**

In `src/components/phrases/PhraseButton.tsx`:

a) Extend the interface (around line 9):

```tsx
interface PhraseButtonProps {
  phrase: Phrase;
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
  /** Override role — used by PhraseGrid to set role="gridcell". */
  role?: string;
  /** Roving-tabindex value. PhraseGrid sets 0 on the active cell, -1 on the rest. */
  tabIndex?: number;
}
```

b) Destructure them in the function signature:

```tsx
export function PhraseButton({ phrase, onTap, t, role, tabIndex }: PhraseButtonProps) {
```

c) Pass to `<Btn>` (around line 58):

```tsx
return (
  <Btn
    onClick={handle}
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
    aria-label={phrase.text}
    role={role}
    tabIndex={tabIndex}
    style={{...}}
  >
```

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/phrases/PhraseButton.tsx src/components/phrases/PhraseButton.test.tsx
git commit -m "feat(phrases): PhraseButton accepts role + tabIndex pass-through"
```

### Task 9: PhraseGrid — chunk into rows + ARIA roles + roving tabindex

**Files:**
- Modify: `src/components/phrases/PhraseGrid.tsx`
- Create: `src/components/phrases/PhraseGrid.a11y.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/phrases/PhraseGrid.a11y.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { PhraseGrid } from "./PhraseGrid";
import { baseTheme } from "../../theme/tokens";
import {
  assertGridStructure,
  assertRovingTabindex,
  assertGroupContainersHaveLabels,
  assertNoAriaHiddenAncestorOnFocusables,
  assertFocusOrderMatchesDomOrder,
} from "../../test/a11yAssertions";

const phrases = Array.from({ length: 12 }, (_, i) => ({
  text: `Phrase ${i + 1}`,
  icon: "💧",
}));

describe("PhraseGrid a11y", () => {
  it("renders role=grid with row/gridcell structure and a label", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={baseTheme} ariaLabel="Comfort phrases" />,
    );
    assertGridStructure(container);
    assertGroupContainersHaveLabels(container);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertFocusOrderMatchesDomOrder(container);
  });

  it("uses roving tabindex (one cell tabbable, rest -1)", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={baseTheme} ariaLabel="Comfort phrases" />,
    );
    assertRovingTabindex(container, '[role="gridcell"]');
  });

  it("ArrowRight moves focus to the next cell in the row", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={baseTheme} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    fireEvent.keyDown(cells[0], { key: "ArrowRight" });
    expect(cells[1].getAttribute("tabindex")).toBe("0");
    expect(cells[0].getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowDown moves focus to the next row, same column", () => {
    // 12 phrases, pickColumns(12) = 4 → row 0 = idx 0..3, row 1 = 4..7
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={baseTheme} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    fireEvent.keyDown(cells[0], { key: "ArrowDown" });
    expect(cells[4].getAttribute("tabindex")).toBe("0");
  });

  it("ArrowRight at last cell of row stops at the row edge (no wrap)", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={baseTheme} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    // 12 phrases, 4 cols → cell index 3 is last in row 0
    fireEvent.keyDown(cells[3], { key: "ArrowRight" });
    expect(cells[3].getAttribute("tabindex")).toBe("0");
    expect(cells[4].getAttribute("tabindex")).toBe("-1");
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npm test -- PhraseGrid.a11y`
Expected: failures on missing `role="grid"`, missing `ariaLabel` prop, no roving tabindex, no arrow-key handler.

- [ ] **Step 3: Rewrite PhraseGrid**

Replace `src/components/phrases/PhraseGrid.tsx` with:

```tsx
import { useState, useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import { PhraseButton } from "./PhraseButton";
import type { Phrase } from "../../types";
import type { PhraseKey } from "../../data/locales/en";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseGridProps {
  phrases: Phrase[];
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
  /** Accessible name for the grid container. Caller passes the active
   *  category label, e.g. "Comfort phrases". Required because
   *  `role="grid"` containers must be labelled. */
  ariaLabel: string;
}

/** Pick a column count keeping cells roughly landscape on iPad without
 *  leaving a lone orphan on the last row. Targets 2–3 rows for typical
 *  phrase counts. */
function pickColumns(n: number): number {
  if (n <= 3) return Math.max(1, n);
  if (n <= 6) return 3;
  if (n <= 12) return 4;
  if (n <= 20) return 5;
  return 6;
}

/** Stop-at-edge arrow-key handler per WAI-ARIA grid pattern + spec §8 OQ.
 *  Returns the new flat active index, or null if the key isn't handled. */
function nextActiveIdx(
  cur: number, key: string, cols: number, total: number,
): number | null {
  const row = Math.floor(cur / cols);
  const rowStart = row * cols;
  const lastInRow = Math.min(rowStart + cols - 1, total - 1);
  switch (key) {
    case "ArrowRight": return Math.min(cur + 1, lastInRow);
    case "ArrowLeft":  return Math.max(cur - 1, rowStart);
    case "ArrowDown":  return Math.min(cur + cols, total - 1);
    case "ArrowUp":    return cur - cols >= 0 ? cur - cols : cur;
    case "Home":       return rowStart;
    case "End":        return lastInRow;
    case "PageDown":   return Math.min(cur + cols * 3, total - 1);
    case "PageUp":     return Math.max(cur - cols * 3, cur % cols);
    default: return null;
  }
}

export function PhraseGrid({ phrases, onTap, t, ariaLabel }: PhraseGridProps) {
  const cols = pickColumns(phrases.length);
  const [activeIdx, setActiveIdx] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  // Skip auto-focus on the very first render so opening the grid doesn't
  // steal focus from the page. Only re-focus when the user advances via
  // keyboard.
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const cells = gridRef.current?.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells?.[activeIdx]?.focus();
  }, [activeIdx]);

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    const next = nextActiveIdx(activeIdx, e.key, cols, phrases.length);
    if (next == null) return;
    e.preventDefault();
    setActiveIdx(next);
  };

  // Chunk phrases into rows of `cols`. Last row may have fewer cells.
  const rows: Phrase[][] = [];
  for (let i = 0; i < phrases.length; i += cols) {
    rows.push(phrases.slice(i, i + cols));
  }

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: "minmax(100px, 240px)",
        gap: 14,
        flex: 1,
        minHeight: 0,
        alignContent: "start",
      }}
    >
      {rows.map((row, rowIdx) => (
        // role="row" wrapper is structural for AT only. `display: contents`
        // means the row doesn't disrupt the parent CSS grid layout —
        // children flow into the parent's grid as if the row weren't there.
        // Verified support: Chrome 121+, Safari 17+ (well below our target
        // of iPadOS 26 / Safari 26).
        <div key={rowIdx} role="row" style={{ display: "contents" }}>
          {row.map((p, colIdx) => {
            const flatIdx = rowIdx * cols + colIdx;
            return (
              <PhraseButton
                key={p.text}
                phrase={p}
                onTap={onTap}
                t={t}
                role="gridcell"
                tabIndex={flatIdx === activeIdx ? 0 : -1}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- PhraseGrid.a11y`
Expected: 5 passes.

- [ ] **Step 5: Update existing PhraseGrid tests for new prop**

`src/components/phrases/PhraseGrid.test.tsx` likely renders without `ariaLabel`. Update each render call to include `ariaLabel="Test"` or similar.

Run: `npm test -- PhraseGrid` to find any failures, fix, re-run.

- [ ] **Step 6: Commit**

```bash
git add src/components/phrases/PhraseGrid.tsx \
        src/components/phrases/PhraseGrid.a11y.test.tsx \
        src/components/phrases/PhraseGrid.test.tsx
git commit -m "feat(phrases): PhraseGrid → role=grid + roving tabindex + arrow keys"
```

### Task 10: App.tsx — pass `ariaLabel` to PhraseGrid

**Files:**
- Modify: `src/App.tsx:309-325`

- [ ] **Step 1: Locate both PhraseGrid call sites**

In `src/App.tsx`, PhraseGrid is rendered in two places (around lines 318 and 324). Both need an `ariaLabel` prop.

- [ ] **Step 2: Update the cat?.subs branch**

Around line 318:

```tsx
<PhraseGrid
  phrases={cat.subs[sub].phrases}
  onTap={speakAsPatient}
  t={t}
  ariaLabel={`${cat.label}: ${cat.subs[sub].label}`}
/>
```

- [ ] **Step 3: Update the cat?.phrases branch**

Around line 324:

```tsx
return <PhraseGrid phrases={cat.phrases} onTap={speakAsPatient} t={t} ariaLabel={cat.label} />;
```

- [ ] **Step 4: Run App tests**

Run: `npm test -- App`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): pass category label to PhraseGrid as ariaLabel"
```

---

## Phase 3 — Patient-direction markup additions (PR-1)

### Task 11: PainFlow — three radiogroups + heading ids

**Files:**
- Modify: `src/components/pain/PainFlow.tsx`
- Create: `src/components/pain/PainFlow.a11y.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/pain/PainFlow.a11y.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { PainFlow } from "./PainFlow";
import { baseTheme } from "../../theme/tokens";
import {
  assertGroupContainersHaveLabels,
  assertNoAriaHiddenAncestorOnFocusables,
  assertFocusOrderMatchesDomOrder,
} from "../../test/a11yAssertions";

describe("PainFlow a11y", () => {
  it("severity step renders a radiogroup with 6 radios", () => {
    const { container } = render(<PainFlow onSelect={() => {}} t={baseTheme} theme="light" />);
    const rg = container.querySelector('[role="radiogroup"]');
    expect(rg).not.toBeNull();
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(6);
    assertGroupContainersHaveLabels(container);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertFocusOrderMatchesDomOrder(container);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Add heading ids and radiogroup roles**

In `src/components/pain/PainFlow.tsx`:

a) On the severity heading (around line 212), add an id:
```tsx
<h2 id="pain-severity-heading" class="font-sans" style={...}>
  <DualLocaleText variant="co-read" primaryKey="ui.dual.pain.heading.severity" ... />
</h2>
```

b) Wrap the severity grid (around line 215) with role:
```tsx
<div
  role="radiogroup"
  aria-labelledby="pain-severity-heading"
  style={{ display: "grid", ... existing styles ... }}
>
  {EMOJI_FPS.map((face) => {
    ...
    return (
      <Btn
        ... existing props ...
        role="radio"
        aria-checked={severity === face.n}
      >
```

c) Same change on location heading (around line 306) → `id="pain-location-heading"`, and the grid (around line 309) gets `role="radiogroup" aria-labelledby="pain-location-heading"`. Each Btn gets `role="radio" aria-checked={location === region.key}`.

d) Same on descriptor heading (around line 378) → `id="pain-descriptor-heading"`; the grid (around line 381) gets `role="radiogroup" aria-labelledby="pain-descriptor-heading"`. Each Btn gets `role="radio" aria-checked={false}` (descriptor selection ends the flow; checked is always false at render time).

- [ ] **Step 4: Run, expect PASS**

Run: `npm test -- PainFlow`

- [ ] **Step 5: Commit**

```bash
git add src/components/pain/PainFlow.tsx src/components/pain/PainFlow.a11y.test.tsx
git commit -m "feat(pain): three pain grids → radiogroup + radio semantics"
```

### Task 12: PainFlow breadcrumb → `<nav>`

**Files:**
- Modify: `src/components/pain/PainFlow.tsx`
- Modify: `src/components/pain/PainFlow.a11y.test.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Add the test**

Append to `PainFlow.a11y.test.tsx`:

```tsx
it("breadcrumb is wrapped in <nav> with a label", () => {
  const { container } = render(<PainFlow onSelect={() => {}} t={baseTheme} theme="light" />);
  const nav = container.querySelector('nav[aria-label]');
  expect(nav).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Wrap the breadcrumb**

In `PainFlow.tsx`, the `breadcrumb` JSX (around line 120) currently uses `<>...</>` wrapping a "step of" div and a step indicator row. Replace the outer fragment with a `<nav>`:

```tsx
const breadcrumb = (
  <nav
    aria-label={resolvePhrase("ui.patient.pain.breadcrumb_aria", patientLang)}
    style={{ marginBottom: 16 }}
  >
    <div class="font-sans" style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}>
      {resolvePhrase("ui.patient.pain.step_of", patientLang)
        .replace("{n}", String(currentIndex + 1))
        .replace("{total}", String(STEPS.length))}
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {STEPS.map((s, i) => (
        ... existing per-step JSX ...
      ))}
    </div>
  </nav>
);
```

- [ ] **Step 4: Add the i18n key**

In `src/data/locales/en.ts`, add:

```ts
"ui.patient.pain.breadcrumb_aria": "Pain wizard steps",
```

Add equivalent strings to the other locale files in `src/data/locales/`. For locales we haven't translated, copy the English; that matches the existing pattern.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/pain/PainFlow.tsx \
        src/components/pain/PainFlow.a11y.test.tsx \
        src/data/locales/
git commit -m "feat(pain): wrap breadcrumb in <nav aria-label>"
```

### Task 13: SubcategoryChips → `radiogroup` + `radio`

**Files:**
- Modify: `src/components/phrases/SubcategoryChips.tsx`
- Modify: `src/components/phrases/SubcategoryChips.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Add a test**

Append to `SubcategoryChips.test.tsx`:

```tsx
it("renders as radiogroup with one radio aria-checked", () => {
  const { container } = render(
    <SubcategoryChips labels={["A", "B", "C"]} activeIndex={1} onSelect={() => {}} t={baseTheme} ariaLabel="Test" />
  );
  expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
  const radios = container.querySelectorAll('[role="radio"]');
  expect(radios.length).toBe(3);
  expect(radios[1].getAttribute("aria-checked")).toBe("true");
  expect(radios[0].getAttribute("aria-checked")).toBe("false");
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Add the role + ariaLabel prop**

In `SubcategoryChips.tsx`:

a) Extend the props interface:

```tsx
interface SubcategoryChipsProps {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  t: ThemeTokens;
  /** Accessible name for the radiogroup. Defaults to "Subcategory". */
  ariaLabel?: string;
}
```

b) Destructure `ariaLabel` in the function signature.

c) Wrap the outer `<div>` with role:

```tsx
return (
  <div
    role="radiogroup"
    aria-label={ariaLabel ?? "Subcategory"}
    style={{
      display: "flex",
      gap: 4,
      marginBottom: 16,
      overflowX: "auto",
      padding: 4,
    }}
  >
    {labels.map((label, i) => {
      const active = i === activeIndex;
      const hovered = hoveredIdx === i && !active;
      return (
        <Btn
          key={label}
          onClick={() => onSelect(i)}
          onPointerEnter={onEnter(i)}
          onPointerLeave={onLeave}
          role="radio"
          aria-checked={active}
          style={...}
        >
```

- [ ] **Step 4: Update App.tsx to pass a localized label**

In `src/App.tsx` around line 312, add `ariaLabel`:

```tsx
<SubcategoryChips
  labels={cat.subs.map((s) => s.label)}
  activeIndex={sub}
  onSelect={setSub}
  t={t}
  ariaLabel={resolvePhrase("ui.patient.subcategory.aria_label", patientLang).replace("{cat}", cat.label)}
/>
```

- [ ] **Step 5: Add i18n keys**

In `src/data/locales/en.ts`:

```ts
"ui.patient.subcategory.aria_label": "Subcategory in {cat}",
```

Add to other locale files.

- [ ] **Step 6: Run, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add src/components/phrases/SubcategoryChips.tsx \
        src/components/phrases/SubcategoryChips.test.tsx \
        src/App.tsx \
        src/data/locales/
git commit -m "feat(phrases): SubcategoryChips → radiogroup + radio"
```

### Task 14: Quick suggestions row → `role="group"`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write a test**

Append to `src/App.test.tsx` (using existing fixture/setup):

```tsx
it("renders Quick suggestions row as role=group with a label", async () => {
  const { container } = render(<App />);
  // Wait for hydration if needed (existing tests show the pattern)
  const group = container.querySelector('[role="group"][aria-label]');
  expect(group).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Wrap the suggestions row**

Replace the inner div around App.tsx line 388-411:

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.patient.suggestions.time_of_day_aria", patientLang)}
  style={{
    display: "flex",
    gap: 10,
    overflowX: "auto",
    padding: "4px 4px 6px",
  }}
>
  {sug.map((s) => (
    <SuggestionChip
      key={s.key ?? s.text}
      text={s.text}
      phraseKey={s.key}
      onTap={speakAsPatient}
      t={t}
      theme={theme}
    />
  ))}
</div>
```

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.patient.suggestions.time_of_day_aria": "Time-of-day suggestions",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/data/locales/
git commit -m "feat(app): Quick suggestions row → role=group with label"
```

### Task 15: HeaderNav → `role="toolbar"`

**Files:**
- Modify: `src/components/layout/HeaderNav.tsx`
- Modify: `src/components/layout/HeaderNav.test.tsx` (create if missing)
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Test (create file if needed)**

Create or modify `src/components/layout/HeaderNav.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { HeaderNav } from "./HeaderNav";

describe("HeaderNav a11y", () => {
  it("wrapper has role=toolbar with aria-label", () => {
    const { container } = render(<HeaderNav onOpenSettings={() => {}} />);
    const toolbar = container.querySelector('[role="toolbar"][aria-label]');
    expect(toolbar).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Update HeaderNav.tsx**

Line 78 — change `<div style={{ display: "flex", gap: 12 }}>` to:

```tsx
<div
  role="toolbar"
  aria-label={resolvePhrase("ui.patient.toolbar.aria_label", caregiverLang)}
  style={{ display: "flex", gap: 12 }}
>
```

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.patient.toolbar.aria_label": "Patient toolbar",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/HeaderNav.tsx \
        src/components/layout/HeaderNav.test.tsx \
        src/data/locales/
git commit -m "feat(layout): HeaderNav → role=toolbar with aria-label"
```

### Task 16: MyWishes — multi-select group + progress nav

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx`
- Create: `src/components/wishes/MyWishes.a11y.test.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Write the failing test**

Create `src/components/wishes/MyWishes.a11y.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { MyWishes } from "./MyWishes";
import { baseTheme } from "../../theme/tokens";
import {
  assertGroupContainersHaveLabels,
  assertNoAriaHiddenAncestorOnFocusables,
} from "../../test/a11yAssertions";

describe("MyWishes a11y", () => {
  it("renders progress as <nav> and responses as labelled group", () => {
    const { container } = render(
      <MyWishes onSpeak={() => {}} onAddToThread={() => {}}
        onClose={() => {}} t={baseTheme} theme="light" patientName="Pat" />
    );
    expect(container.querySelector('nav[aria-label]')).not.toBeNull();
    expect(container.querySelector('[role="group"][aria-labelledby]')).not.toBeNull();
    assertGroupContainersHaveLabels(container);
    assertNoAriaHiddenAncestorOnFocusables(container);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Wrap progress + responses**

In `MyWishes.tsx`:

a) The progress block (around line 217-251) — wrap the `flexBasis: 100%` div in `<nav>`:

```tsx
<nav
  aria-label={resolvePhrase("ui.patient.wishes.progress_aria", patientLang)}
  style={{ flexBasis: "100%" }}
>
  <div class="font-sans" style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}>
    {resolvePhrase("ui.patient.wishes.step_of", patientLang)
      .replace("{n}", String(currentIdx + 1))
      .replace("{total}", String(SICG_TOPICS.length))}
  </div>
  <div style={progressRow}>
    {SICG_TOPICS.map((tp, i) => (
      ... existing per-step JSX ...
    ))}
  </div>
</nav>
```

b) Give the question h2 an id (around line 257):

```tsx
<h2
  id="wishes-question-heading"
  style={{ marginTop: 16, marginBottom: 24, ... }}
>
  <DualLocaleText variant="co-read" primaryKey={topic.questionKey} ... />
</h2>
```

c) Wrap the response button list (around line 272):

```tsx
<div
  role="group"
  aria-labelledby="wishes-question-heading"
  style={{ display: "flex", flexDirection: "column", gap: 10 }}
>
  {topic.responseKeys.map((rk) => (
    ... existing Btn JSX with aria-pressed ...
  ))}
</div>
```

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.patient.wishes.progress_aria": "Wishes wizard progress",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/wishes/MyWishes.tsx \
        src/components/wishes/MyWishes.a11y.test.tsx \
        src/data/locales/
git commit -m "feat(wishes): progress nav + responses group with aria-labelledby"
```

### Task 17: Thread → `role="log"`

**Files:**
- Modify: `src/components/conversation/Thread.tsx`
- Modify: `src/components/conversation/Thread.test.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files (if `ui.dual.thread.aria_label` doesn't already exist)

- [ ] **Step 1: Check if i18n key already exists**

Run: `grep -r "ui.dual.thread.aria_label" src/data/locales/` — if it exists in en.ts, skip locale changes.

- [ ] **Step 2: Write the failing test**

Append to `Thread.test.tsx`:

```tsx
it("renders message scroll container as role=log with live-region attrs", () => {
  const messages = [{ from: "patient" as const, text: "Hello", time: 0 }];
  const { container } = render(<Thread messages={messages} t={baseTheme} onRepeat={() => {}} />);
  const log = container.querySelector('[role="log"][aria-label]');
  expect(log).not.toBeNull();
  expect(log?.getAttribute("aria-live")).toBe("polite");
  expect(log?.getAttribute("aria-relevant")).toBe("additions text");
});
```

- [ ] **Step 3: Run, expect FAIL**

- [ ] **Step 4: Apply the role**

In `Thread.tsx`, the inner `<div style={scrollStyle}>` (around line 70) becomes:

```tsx
<div
  role="log"
  aria-label={resolvePhrase("ui.dual.thread.aria_label", patientLang)}
  aria-live="polite"
  aria-relevant="additions text"
  style={scrollStyle}
>
```

- [ ] **Step 5: Add the i18n key if needed**

If the key doesn't exist:

```ts
"ui.dual.thread.aria_label": "Conversation",
```

In en.ts plus other locale files.

- [ ] **Step 6: Run, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add src/components/conversation/Thread.tsx \
        src/components/conversation/Thread.test.tsx \
        src/data/locales/
git commit -m "feat(conversation): Thread → role=log with live-region announcement"
```

---

## Phase 4 — Provider-direction markup additions (PR-1)

These changes benefit screen-reader users on caregiver surfaces. Per spec §1, they CAN be split into a follow-up PR if review prefers, but default is to bundle.

### Task 18: ProviderPanel chip rows + phrase list

**Files:**
- Modify: `src/components/provider/ProviderPanel.tsx`
- Modify: `src/components/provider/ProviderPanel.test.tsx` (create if missing)
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Write the failing test**

```tsx
it("provider chip row + section chip row are radiogroups; phrase list is a labelled group", () => {
  // render ProviderPanel with cfg.providers = [{name:"A"}, {name:"B"}]
  // ...
  const radiogroups = container.querySelectorAll('[role="radiogroup"][aria-label]');
  expect(radiogroups.length).toBeGreaterThanOrEqual(2);
  const phraseGroup = container.querySelector('[role="group"][aria-label]');
  expect(phraseGroup).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply roles**

In `ProviderPanel.tsx`:

a) Provider chip row (around line 134):

```tsx
<div
  role="radiogroup"
  aria-label={resolvePhrase("ui.provider.speaking_as_aria", caregiverLang)}
  style={chipRowStyle}
>
  {cfg.providers.map((prov, idx) => (
    <Btn
      key={idx}
      onClick={() => onSelectProvider(idx)}
      style={chipStyle(idx === activeProvIdx, providerGreen)}
      aria-label={...existing...}
      role="radio"
      aria-checked={idx === activeProvIdx}
    >
      ...
    </Btn>
  ))}
</div>
```

(Drop `aria-pressed` since `aria-checked` now carries the state.)

b) Section chip row (around line 150):

```tsx
<div
  role="radiogroup"
  aria-label={resolvePhrase("ui.provider.section_aria", caregiverLang)}
  style={chipRowStyle}
>
  {SECTION_KEYS.map((key) => (
    <Btn
      key={key}
      onClick={() => setActiveSection(key)}
      style={chipStyle(key === activeSection, blueText)}
      aria-label={...existing...}
      role="radio"
      aria-checked={key === activeSection}
    >
```

c) Phrase list container (around line 164):

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.provider.phrases_aria", caregiverLang).replace("{section}", activeSection)}
>
  {phrases.map((item, idx) => (
    ... existing Btn JSX ...
  ))}
</div>
```

- [ ] **Step 4: Add i18n keys**

In `src/data/locales/en.ts`:

```ts
"ui.provider.speaking_as_aria": "Speaking as",
"ui.provider.section_aria": "Phrase category",
"ui.provider.phrases_aria": "{section} phrases",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/provider/ProviderPanel.tsx \
        src/components/provider/ProviderPanel.test.tsx \
        src/data/locales/
git commit -m "feat(provider): radiogroups for chip rows; group for phrase list"
```

### Task 19: ListenPanel — provider chip row + mic cluster

**Files:**
- Modify: `src/components/provider/ListenPanel.tsx`
- Modify: `src/components/provider/ListenPanel.test.tsx` (create if missing)
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Write the failing test**

```tsx
it("provider chip row is radiogroup; mic cluster is a labelled group", () => {
  // render ListenPanel with 2+ providers
  // ...
  expect(container.querySelector('[role="radiogroup"]')).not.toBeNull();
  expect(container.querySelector('[role="group"][aria-label]')).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply roles**

In `ListenPanel.tsx`:

a) Provider chip row (around line 159) — same treatment as ProviderPanel: `role="radiogroup" aria-label="..."`, each chip drops `aria-pressed` and gets `role="radio" aria-checked`.

b) Mic + status + textarea cluster (around line 181) — wrap the existing div:

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.provider.listen.capture_aria", caregiverLang)}
  style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}
>
  ... existing Btn + status + error region ...
</div>
```

The textarea + Submit button stay OUTSIDE this group (they're the action surface, not the capture cluster).

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.provider.listen.capture_aria": "Voice capture",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/provider/ListenPanel.tsx \
        src/components/provider/ListenPanel.test.tsx \
        src/data/locales/
git commit -m "feat(listen): radiogroup for provider row; group for mic cluster"
```

### Task 20: Setup — wizard nav + language radiogroup + emoji radiogroup

**Files:**
- Modify: `src/components/settings/Setup.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Test (locate or create the Setup test file)**

```tsx
it("Setup renders progress as <nav>, language grid as radiogroup", () => {
  const { container } = render(<Setup />);
  expect(container.querySelector('nav[aria-label]')).not.toBeNull();
  // Language grid is on step 0 (Patient).
  const radiogroups = container.querySelectorAll('[role="radiogroup"]');
  expect(radiogroups.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply roles**

In `Setup.tsx`:

a) Progress bar (around line 266) — wrap in `<nav>`:

```tsx
<nav
  aria-label={resolvePhrase("ui.provider.setup.progress_aria", caregiverLang)}
  style={{
    width: "100%",
    maxWidth: 700,
    padding: "16px 24px 0",
    boxSizing: "border-box",
    display: "flex",
    gap: 6,
  }}
>
  {stepLabelKeys.map((key, i) => (
    ... existing per-step JSX ...
  ))}
</nav>
```

b) Language label div (around line 474) — give it an id:

```tsx
<div id="setup-lang-label" style={{ ...labelStyle, marginTop: 20 }}>
  {resolvePhrase("ui.provider.setup.step0.language_label", caregiverLang)}
</div>
```

c) Language grid (around line 475) — radiogroup:

```tsx
<div
  role="radiogroup"
  aria-labelledby="setup-lang-label"
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 8,
    marginTop: 8,
  }}
>
  {LANGS.map((l) => (
    <button
      key={l.code}
      role="radio"
      aria-checked={lang === l.code}
      onClick={() => setLang(l.code)}
      style={...existing...}
    >
      ... existing button content ...
    </button>
  ))}
</div>
```

d) Emoji picker popover (around line 711). The label div `setup-provider-icon-label` already exists. Wrap the popover:

```tsx
{showEmojiPicker && (
  <div
    role="radiogroup"
    aria-labelledby="setup-provider-icon-label"
    style={{
      position: "absolute",
      top: "100%",
      ... existing ...
    }}
  >
    {EMOJIS.map((e) => (
      <button
        key={e}
        role="radio"
        aria-checked={newProvEmoji === e}
        onClick={() => {
          setNewProvEmoji(e);
          setShowEmojiPicker(false);
        }}
        style={...existing...}
      >
        {e}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.provider.setup.progress_aria": "Setup progress",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/Setup.tsx src/data/locales/
git commit -m "feat(setup): nav + language radiogroup + emoji radiogroup"
```

### Task 21: CareTeamSection emoji picker + provider list grouping

**Files:**
- Modify: `src/components/settings/sections/CareTeamSection.tsx`

- [ ] **Step 1: Test**

```tsx
it("CareTeamSection emoji picker is radiogroup; each provider row is a group", () => {
  // render CareTeamSection with cfg.providers having 2 entries
  // ...
  expect(container.querySelector('[role="radiogroup"][aria-labelledby="new-provider-icon-label"]')).not.toBeNull();
  const providerGroups = container.querySelectorAll('[role="group"][aria-labelledby]');
  expect(providerGroups.length).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply roles**

In `CareTeamSection.tsx`:

a) Emoji picker (around line 238) — same as Setup: `role="radiogroup" aria-labelledby="new-provider-icon-label"`; each emoji button gets `role="radio" aria-checked`.

b) Provider list rows (around line 152). Each provider's name span gets a stable id; wrap each row in a labelled group:

```tsx
{providers.map((p, i) => {
  const nameId = `provider-${i}-name`;
  return (
    <div
      key={i}
      role="group"
      aria-labelledby={nameId}
      style={{ padding: "10px 0", borderBottom: i < providers.length - 1 ? `1px solid ${t.border}` : "none" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>
          {p.emoji ?? "🧑‍⚕️"}
        </span>
        <span id={nameId} style={{ flex: 1, fontSize: 16, fontWeight: 500, color: t.text }}>
          {p.name}
        </span>
        ... existing remove Btn ...
      </div>
      ... existing VoiceCapture + VoiceCacheProgress ...
    </div>
  );
})}
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/sections/CareTeamSection.tsx
git commit -m "feat(careteam): emoji radiogroup + per-provider group"
```

---

## Phase 5 — Moderate role additions (PR-1)

### Task 22: SettingsPanel + ResetSheet + PatientsScreen labels

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`
- Modify: `src/components/settings/ResetSheet.tsx`
- Modify: `src/components/patients/PatientsScreen.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

These three are tiny single-line changes; group into one task for commit hygiene.

- [ ] **Step 1: Add tests**

```tsx
// SettingsPanel.test.tsx
it("settings rows are wrapped in a labelled group", () => {
  // render the panel ...
  expect(container.querySelector('[role="group"][aria-label]')).not.toBeNull();
});

// ResetSheet.test.tsx
it("reset actions are wrapped in a labelled group", () => {
  // render ...
  expect(container.querySelector('[role="group"][aria-label]')).not.toBeNull();
});

// PatientsScreen.test.tsx
it("patients list <ul> has aria-label", () => {
  // render with 2+ patients ...
  expect(container.querySelector('ul[aria-label]')).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL on all three**

- [ ] **Step 3: Apply changes**

a) `SettingsPanel.tsx` line 74 — wrap inner div:

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.provider.settings.aria_label", caregiverLang)}
  style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 10 }}
>
```

b) `ResetSheet.tsx` line 107:

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.provider.settings.reset.aria_label", caregiverLang)}
  style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}
>
```

c) `PatientsScreen.tsx` line 199:

```tsx
<ul
  aria-label={resolvePhrase("ui.provider.patients.list_aria", caregiverLang)}
  style={listStyle}
>
```

- [ ] **Step 4: Add i18n keys**

In `src/data/locales/en.ts`:

```ts
"ui.provider.settings.aria_label": "Settings",
"ui.provider.settings.reset.aria_label": "Reset actions",
"ui.provider.patients.list_aria": "Patients",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsPanel.tsx \
        src/components/settings/ResetSheet.tsx \
        src/components/patients/PatientsScreen.tsx \
        src/data/locales/
git commit -m "feat(settings): labelled groups on Settings list, Reset actions, Patients list"
```

### Task 23: FallbackVoicePicker — list semantics + selected aria-pressed

**Files:**
- Modify: `src/components/shared/FallbackVoicePicker.tsx`
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Test addition**

In an existing or new test file:

```tsx
it("renders recommended/other lists with role=list and selected aria-pressed", () => {
  // mock speechSynthesis.getVoices to return at least one voice
  // ...
  const lists = container.querySelectorAll('[role="list"][aria-label]');
  expect(lists.length).toBeGreaterThanOrEqual(1);
  // exactly one selected (or zero if none selected yet)
  const pressed = container.querySelectorAll('[aria-pressed="true"]');
  expect(pressed.length).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply roles**

In `FallbackVoicePicker.tsx`:

a) Primary list `<div>` (around line 326):

```tsx
<div
  role="list"
  aria-label={resolvePhrase(
    hasRecommended
      ? "ui.provider.fallback_voice.recommended_aria"
      : "ui.provider.fallback_voice.all_aria",
    caregiverLang,
  )}
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxHeight: 320,
    overflowY: "auto",
    padding: 4,
  }}
>
  {primaryList.map(renderVoice)}
</div>
```

b) Disclosure list `<div>` (around line 372):

```tsx
<div
  id="fallback-voice-other-list"
  role="list"
  aria-label={resolvePhrase("ui.provider.fallback_voice.other_aria", caregiverLang)}
  style={{
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxHeight: 320,
    overflowY: "auto",
    padding: 4,
  }}
>
  {disclosureList.map(renderVoice)}
</div>
```

c) Update `renderVoice()` (around line 231) to wrap each button in a listitem div + add `aria-pressed`:

```tsx
function renderVoice(v: SpeechSynthesisVoice) {
  const isSelected = selectedVoice?.voiceURI === v.voiceURI;
  const isPlaying = playingURI === v.voiceURI;
  const enhanced = isEnhancedVoice(v);

  return (
    <div role="listitem" key={v.voiceURI}>
      <button
        onClick={() => handleSelect(v)}
        aria-pressed={isSelected}
        style={...existing...}
      >
        ... existing button content ...
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Add i18n keys**

In `src/data/locales/en.ts`:

```ts
"ui.provider.fallback_voice.recommended_aria": "Recommended voices",
"ui.provider.fallback_voice.other_aria": "Other voices",
"ui.provider.fallback_voice.all_aria": "Available voices",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/FallbackVoicePicker.tsx src/data/locales/
git commit -m "feat(voice): voice picker lists + aria-pressed for selected"
```

---

## Phase 6 — Hardening fixes (PR-1)

### Task 24: BottomSheet backdrop → aria-hidden + tabindex=-1

**Files:**
- Modify: `src/components/shared/BottomSheet.tsx`
- Modify: `src/components/shared/BottomSheet.test.tsx`

- [ ] **Step 1: Test addition**

```tsx
it("backdrop is aria-hidden and tabindex=-1", () => {
  // render BottomSheet with a single child
  // ...
  const backdrop = container.querySelector('[data-testid="bottom-sheet-backdrop"]');
  expect(backdrop?.getAttribute("aria-hidden")).toBe("true");
  expect(backdrop?.getAttribute("tabindex")).toBe("-1");
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Update backdrop**

In `BottomSheet.tsx` line 140-144:

```tsx
<div
  data-testid="bottom-sheet-backdrop"
  aria-hidden="true"
  tabIndex={-1}
  onClick={assistiveInput ? undefined : handleClose}
  style={backdrop}
/>
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/BottomSheet.tsx src/components/shared/BottomSheet.test.tsx
git commit -m "fix(a11y): BottomSheet backdrop is aria-hidden + tabindex=-1"
```

### Task 25: PinGate keypad → role=group

**Files:**
- Modify: `src/components/shared/PinGate.tsx`
- Modify: `src/components/shared/PinGate.test.tsx` (create if missing)
- Modify: `src/data/locales/en.ts` plus other locale files

- [ ] **Step 1: Test**

```tsx
it("keypad is wrapped in a labelled group", () => {
  const { container } = render(
    <PinGate pin="1234" onSuccess={() => {}} onClose={() => {}} t={baseTheme} theme="light" />
  );
  const group = container.querySelector('[role="group"][aria-label]');
  expect(group).not.toBeNull();
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply role**

In `PinGate.tsx` line 167:

```tsx
<div
  role="group"
  aria-label={resolvePhrase("ui.provider.pin_gate.keypad_aria", caregiverLang)}
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 4,
  }}
>
```

- [ ] **Step 4: Add i18n key**

In `src/data/locales/en.ts`:

```ts
"ui.provider.pin_gate.keypad_aria": "PIN keypad",
```

Add to other locale files.

- [ ] **Step 5: Run, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/PinGate.tsx \
        src/components/shared/PinGate.test.tsx \
        src/data/locales/
git commit -m "fix(a11y): PinGate keypad → role=group"
```

### Task 26: Speaking → aria-atomic="true"

**Files:**
- Modify: `src/components/shared/Speaking.tsx`
- Modify: `src/components/shared/Speaking.test.tsx` (create if missing)

- [ ] **Step 1: Test addition**

```tsx
it("speaking overlay is atomic", () => {
  // render a Speaking overlay with text
  // ...
  expect(container.querySelector('[role="status"]')?.getAttribute("aria-atomic")).toBe("true");
});
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Apply attribute**

`Speaking.tsx` around line 82:

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label={resolvePhrase("ui.dual.speaking.aria_label", patientLang).replace("{text}", text)}
  style={...}
>
```

- [ ] **Step 4: Run, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/Speaking.tsx src/components/shared/Speaking.test.tsx
git commit -m "fix(a11y): Speaking → aria-atomic for full-label re-announce"
```

---

## Phase 7 — Top-level a11y test (PR-1)

### Task 27: App-level a11y smoke test across patient surfaces

**Files:**
- Create: `src/App.a11y.test.tsx`

- [ ] **Step 1: Write the test**

Create `src/App.a11y.test.tsx`. Reuse the existing App.test.tsx fixtures (cfg, hydration mocks) — copy or import them.

```tsx
import { describe, it } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { App } from "./App";
import {
  assertNoAriaHiddenAncestorOnFocusables,
  assertGroupContainersHaveLabels,
  assertFocusOrderMatchesDomOrder,
  assertNoFixedOcclusionAtScrollStop,
} from "./test/a11yAssertions";

// Setup: mirror App.test.tsx's hydration fixture so the gate at App.tsx:266
// passes. If App.test.tsx exposes a helper, import it; otherwise duplicate
// the hydration setup here (cfg with one patient, settings store hydrated).

describe("App a11y across patient surfaces", () => {
  it("Quick tab — all assertions pass", async () => {
    const { container } = render(<App />);
    // Wait for hydration if needed (existing tests show the pattern with
    // findBy* or waitFor()).
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertGroupContainersHaveLabels(container);
    assertFocusOrderMatchesDomOrder(container);
    assertNoFixedOcclusionAtScrollStop(container);
  });

  it("Pain tab — all assertions pass", async () => {
    const { container, findByRole } = render(<App />);
    const painTab = await findByRole("button", { name: /Pain/i });
    fireEvent.click(painTab);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertGroupContainersHaveLabels(container);
    assertFocusOrderMatchesDomOrder(container);
    assertNoFixedOcclusionAtScrollStop(container);
  });

  it("Comfort tab (with subcategories) — all assertions pass", async () => {
    const { container, findByRole } = render(<App />);
    const comfortTab = await findByRole("button", { name: /Comfort/i });
    fireEvent.click(comfortTab);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertGroupContainersHaveLabels(container);
    assertFocusOrderMatchesDomOrder(container);
    assertNoFixedOcclusionAtScrollStop(container);
  });
});
```

- [ ] **Step 2: Run, expect PASS**

Run: `npm test -- App.a11y`
Expected: 3 passes. If any fail, the failing surface still has an unfixed issue from earlier phases — go fix it before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/App.a11y.test.tsx
git commit -m "test(a11y): top-level app a11y smoke across patient surfaces"
```

---

## Phase 8 — Manual testing protocol (PR-2)

Open this as a separate PR after PR-1 lands per `feedback_pr_merge_cadence`.

### Task 28: Manual macOS Switch Control protocol doc

**Files:**
- Create: `docs/switch-testing-protocol.md`
- Modify: `docs/DESIGN_GUIDELINES.md` line 428

- [ ] **Step 1: Create the protocol doc**

Create `docs/switch-testing-protocol.md`:

````markdown
# Switch-Device Testing Protocol

Manual-verification companion to the Vitest a11y assertion suite (`src/test/a11yAssertions.ts`). Walks a tester through enabling macOS Switch Control as a proxy for iPadOS Switch Control and exercising every patient-facing surface.

**When to run:** Before merging any PR that touches patient-surface markup or layout.

## Why macOS Switch Control proxies for iPadOS

macOS Safari and iPad Safari both emit a single accessibility tree definition derived from the same WebKit a11y mapping. So scan-order, focus-stops, and grouping behavior measured under macOS Switch Control on macOS Safari is a faithful proxy for iPadOS Switch Control on iPad Safari. Chrome on macOS uses Blink's a11y tree (different from WebKit), so it's a useful breadth check but not a reliable iPadOS predictor — prioritize Safari.

What's lost without an iPad: iPadOS-specific gestures (irrelevant — switch users don't gesture), "screen as switch" mode (iOS-only), BLE pairing flow (requires hardware), AAA-contrast focus-ring legibility on the LiquidRetina XDR display. Documented as deferred to A2 (hardware verification) under the "Hardware verification" section at the end.

## Setup (one-time, ~5 minutes)

1. Open System Settings → Accessibility → Switch Control.
2. Click **Switches** → **+** → choose **External**. When prompted to press the switch, press **Spacebar**. Set the **Action** to **Select Item**.
3. Optional (for 2-switch testing): add a second switch bound to the **J** key, action **Move To Next Item**. Skip this for 1-switch testing.
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

1. Breadcrumb at top of Pain tab should announce as a navigation landmark labeled "Pain wizard steps" (or localized equivalent).
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
````

- [ ] **Step 2: Update DESIGN_GUIDELINES.md**

Read `docs/DESIGN_GUIDELINES.md` around line 428. Find the existing checklist item:

```
- [ ] Has this screen been tested with iPadOS Switch Control?
```

Replace with:

```
- [ ] Has this screen passed the manual switch-testing protocol? See [docs/switch-testing-protocol.md](./switch-testing-protocol.md) — the macOS Switch Control proxy is the v0.1 verification bar; iPadOS hardware verification is deferred to A2.
```

- [ ] **Step 3: Run the protocol once on macOS Safari**

Per your existing dev workflow, run `npm run dev`, follow the protocol's setup steps in System Settings, run the per-surface checklist, paste the YAML scratchpad results into the PR description.

- [ ] **Step 4: Commit**

```bash
git add docs/switch-testing-protocol.md docs/DESIGN_GUIDELINES.md
git commit -m "docs(a11y): manual macOS Switch Control testing protocol"
```

---

## Spec coverage check

| Spec section | Tasks |
|--------------|-------|
| §4.1 H1 (PhraseGrid grid) | 8, 9, 10 |
| §4.1 H2-H4 (PainFlow grids) | 11 |
| §4.1 H5 (SubcategoryChips) | 13 |
| §4.1 H6 (Quick suggestions) | 14 |
| §4.1 H7-H9 (ProviderPanel) | 18 |
| §4.1 H7 (ListenPanel chip row) | 19 |
| §4.1 H10 (MyWishes responses) | 16 |
| §4.1 H11 (HeaderNav toolbar) | 15 |
| §4.1 H12 (wizard breadcrumbs) | 12, 16, 20 |
| §4.1 H13 (Setup + CareTeam emoji) | 20, 21 |
| §4.2 M1 (Thread log) | 17 |
| §4.2 M2 (Settings group) | 22 |
| §4.2 M3 (ResetSheet group) | 22 |
| §4.2 M4 (FallbackVoicePicker lists) | 23 |
| §4.2 M5 (CareTeam provider groups) | 21 |
| §4.2 M6 (ListenPanel mic cluster) | 19 |
| §4.2 M7 (PatientsScreen ul) | 22 |
| §4.3 D1 (BottomSheet backdrop) | 24 |
| §4.3 D2 (PinGate keypad) | 25 |
| §4.3 D3 (Thread aria-relevant) | 17 |
| §4.3 D4 (Speaking aria-atomic) | 26 |
| §5.1 Vitest helpers | 1-7 |
| §5.2 manual protocol | 28 |
| §6 Done definition | covered by Tasks 1-28 collectively |
| §7 PR plan | reflected in task ordering |
| §8 OQ: PhraseGrid arrow-key edge | resolved in Task 9 (stop-at-edge) |
| §8 OQ: provider chip rows | resolved in Tasks 18, 19 (radiogroup migration) |
| §8 OQ: Thread log vs list | resolved in Task 17 (log) |

All spec items have a task.

## PR boundaries

- **PR-1 commits:** Tasks 1-27. Push branch + open PR + stop per `feedback_pr_merge_cadence`.
- **PR-2 commits:** Task 28. Push branch + open PR + stop. Tiny PR; ideally lands same day as PR-1.
