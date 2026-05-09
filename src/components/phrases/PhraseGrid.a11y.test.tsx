import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { PhraseGrid } from "./PhraseGrid";
import { light } from "../../theme/tokens";
import type { Phrase } from "../../types";
import {
  assertGridStructure,
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

  it("every cell is sequentially tabbable (no roving tabindex)", () => {
    // Sequential Tab is required because our audience (switch users,
    // sip-and-puff, single-button assistive devices) advances focus one
    // step at a time and lacks arrow keys; a roving tabindex strands them
    // on whichever cell was last active.
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll('[role="gridcell"]');
    for (const cell of cells) {
      expect(cell.getAttribute("tabindex")).toBe("0");
    }
  });

  it("ArrowRight moves focus to the next cell in the row", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(cells[1]);
  });

  it("ArrowDown moves focus to the next row, same column", () => {
    // 12 phrases, pickColumns(12) = 4 → row 0 = idx 0..3, row 1 = 4..7
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(cells[4]);
  });

  it("ArrowRight at last cell of row stops at the row edge (no wrap)", () => {
    const { container } = render(
      <PhraseGrid phrases={phrases} onTap={() => {}} t={light} ariaLabel="Comfort phrases" />,
    );
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    // 12 phrases, 4 cols. Land focus on cell 3 (last in row 0), then
    // assert another ArrowRight stops at 3 instead of advancing to 4.
    cells[3].focus();
    fireEvent.keyDown(cells[3], { key: "ArrowRight" });
    expect(document.activeElement).toBe(cells[3]);
  });
});
