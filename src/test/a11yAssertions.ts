// Vitest assertion helpers for accessibility regressions. Each helper
// takes a rendered DOM container and either returns void (pass) or
// throws an Error with a descriptive message listing every offending
// element (fail). See
// docs/superpowers/specs/2026-04-26-switch-support-design.md §5.1.

const FOCUSABLE_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  "button:not([disabled])",
  "a[href]",
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
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

const GROUPING_ROLES = [
  "group",
  "radiogroup",
  "toolbar",
  "tablist",
  "grid",
  "list",
  "log",
] as const;

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
      const allFound = ids.every((id) =>
        root.querySelector(`#${CSS.escape(id)}`),
      );
      if (allFound) continue;
      violations.push(
        `${describe(group)} has dangling aria-labelledby="${labelledby}"`,
      );
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
        violations.push(
          `${describe(row)} is a row without role="gridcell" descendants`,
        );
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `${violations.length} grid structure issue(s):\n  ${violations.join("\n  ")}`,
    );
  }
}
