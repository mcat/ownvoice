import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { RoleToggle, type DiagRole } from "./RoleToggle";

describe("RoleToggle", () => {
  it("renders three options labelled Healthcare worker / Researcher / Developer", () => {
    render(<RoleToggle role="healthcare" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /healthcare/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /researcher/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /developer/i })).toBeTruthy();
  });

  it("calls onChange with new role when clicked", () => {
    let next: DiagRole | null = null;
    render(<RoleToggle role="healthcare" onChange={(r) => { next = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /researcher/i }));
    expect(next).toBe("researcher");
  });

  it("highlights the selected role via aria-pressed", () => {
    render(<RoleToggle role="developer" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /developer/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /researcher/i })).toHaveAttribute("aria-pressed", "false");
  });
});
