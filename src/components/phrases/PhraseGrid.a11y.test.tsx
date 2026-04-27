import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { PhraseGrid } from "./PhraseGrid";
import { light } from "../../theme/tokens";
import type { Phrase } from "../../types";
import {
  assertGridStructure,
  assertRovingTabindex,
  assertGroupContainersHaveLabels,
  assertNoAriaHiddenAncestorOnFocusables,
  assertFocusOrderMatchesDomOrder,
} from "../../test/a11yAssertions";

const phrases: Phrase[] = Array.from({ length: 12 }, (_, i) => ({
  text: `Phrase ${i + 1}`,
  icon: "💧",
}));

describe("PhraseGrid a11y", () => {
  it("renders role=grid with row/gridcell structure and a label", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    assertGridStructure(container);
    assertGroupContainersHaveLabels(container);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertFocusOrderMatchesDomOrder(container);
  });

  it("uses roving tabindex (one cell tabbable, rest -1)", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    assertRovingTabindex(container, '[role="gridcell"]');
  });

  it("ArrowRight moves focus to the next cell in the row", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    fireEvent.keyDown(cells[0], { key: "ArrowRight" });
    expect(cells[1].getAttribute("tabindex")).toBe("0");
    expect(cells[0].getAttribute("tabindex")).toBe("-1");
  });

  it("ArrowDown moves focus to the next row, same column", () => {
    // 12 phrases, pickColumns(12) = 4 → row 0 = idx 0..3, row 1 = 4..7
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    fireEvent.keyDown(cells[0], { key: "ArrowDown" });
    expect(cells[4].getAttribute("tabindex")).toBe("0");
  });

  it("ArrowRight at last cell of row stops at the row edge (no wrap)", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    // 12 phrases, 4 cols. Walk from 0 → 1 → 2 → 3 (last in row 0), then
    // assert another ArrowRight stops at 3 instead of advancing to 4.
    fireEvent.keyDown(cells[0], { key: "ArrowRight" });
    fireEvent.keyDown(cells[1], { key: "ArrowRight" });
    fireEvent.keyDown(cells[2], { key: "ArrowRight" });
    expect(cells[3].getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(cells[3], { key: "ArrowRight" });
    expect(cells[3].getAttribute("tabindex")).toBe("0");
    expect(cells[4].getAttribute("tabindex")).toBe("-1");
  });
});
