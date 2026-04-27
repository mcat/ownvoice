import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Bibliography } from "./Bibliography";

describe("Bibliography page", () => {
  it("renders the bibliography title", () => {
    render(<Bibliography />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Applied Research Bibliography/i);
  });

  it("renders the embedded clinical frameworks section", () => {
    render(<Bibliography />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /embedded clinical frameworks/i.test(t))).toBe(true);
  });

  it("renders DOI links to canonical paper sources", () => {
    render(<Bibliography />);
    // Pick three citations whose DOIs we know are present.
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.includes("10.4037/ajcc2011433"))).toBe(true); // Happ 2011
    expect(hrefs.some((h) => h.includes("10.2196/41189"))).toBe(true);       // Li 2023
    expect(hrefs.some((h) => h.includes("10.1044/aac22.2.79"))).toBe(true);  // Zubow & Hurtig
  });

  it("uses the new patient framing throughout (no 'nonverbal' except the preserved paper title)", () => {
    render(<Bibliography />);
    // The bibliography preserves "Nonverbal" only in the section heading
    // for Carroll 2007's paper title (line 108). All other prose uses
    // state-and-cause framing per Plan A.
    const text = document.body.textContent ?? "";
    const matches = text.match(/\bnonverbal\b/gi) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);
  });
});
