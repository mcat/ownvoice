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
