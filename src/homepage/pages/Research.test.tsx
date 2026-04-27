import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Research } from "./Research";

describe("Research page", () => {
  it("renders the research plan title from the markdown", () => {
    render(<Research />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/OwnVoice/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /ICU patients without functional speech/i,
    );
  });

  it("renders the abstract section heading", () => {
    render(<Research />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /abstract/i.test(t))).toBe(true);
  });

  it("renders the study aims section heading", () => {
    render(<Research />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /study aims/i.test(t) || /aims and hypotheses/i.test(t))).toBe(true);
  });

  it("uses the new patient framing in the abstract", () => {
    render(<Research />);
    // After Plan A, the rendered prose should not contain the trait label.
    expect(document.body.textContent).not.toMatch(/\bnonverbal\b/i);
  });
});
