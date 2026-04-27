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
  assertGridStructure,
  assertGroupContainersHaveLabels,
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
