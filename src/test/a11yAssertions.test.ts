import { describe, it, expect } from "vitest";

/**
 * Build a DOM subtree from an HTML string for use in helper unit tests.
 * Uses DOMParser so we never assign to `Element.innerHTML` directly
 * (project lint pattern). Returns the wrapping div; query inside it as
 * needed.
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

import {
  assertFocusOrderMatchesDomOrder,
  assertNoAriaHiddenAncestorOnFocusables,
} from "./a11yAssertions";

describe("assertNoAriaHiddenAncestorOnFocusables", () => {
  it("passes when no focusable has aria-hidden ancestor", () => {
    const root = buildRoot(`<button>Click me</button>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root)).not.toThrow();
  });

  it("fails when a focusable button has an aria-hidden ancestor", () => {
    const root = buildRoot(`<div aria-hidden="true"><button>Click me</button></div>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root)).toThrow(
      /aria-hidden ancestor/,
    );
  });

  it("ignores aria-hidden on the focusable itself", () => {
    // Self aria-hidden on a focusable is a separate failure mode (axe-core
    // catches it). This helper specifically checks ANCESTOR aria-hidden,
    // which is the Wandke-paper flag-3 pattern.
    const root = buildRoot(`<button aria-hidden="true">Click me</button>`);
    expect(() => assertNoAriaHiddenAncestorOnFocusables(root)).not.toThrow();
  });
});

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
    expect(() => assertFocusOrderMatchesDomOrder(root)).toThrow(
      /positive tabindex/,
    );
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
