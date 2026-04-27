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
