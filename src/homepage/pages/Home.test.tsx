import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Home } from "./Home";

describe("Home page", () => {
  it("renders the hero headline with the ICU stat", () => {
    render(<Home />);
    // Happ et al. 2015 (53.9% of MV patients meet communication criteria:
    // awake, alert, responsive)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Half of ventilated ICU patients are awake, alert, and unable to speak/,
    );
  });

  it("renders all seven major section headings", () => {
    render(<Home />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /communication failure/i.test(t))).toBe(true);
    expect(h2s.some((t) => /reduces anxiety, captures pain accurately/i.test(t))).toBe(true);
    expect(h2s.some((t) => /four pillars/i.test(t))).toBe(true);
    expect(h2s.some((t) => /clinical validation study/i.test(t))).toBe(true);
    expect(h2s.some((t) => /no PHI ever leaves/i.test(t))).toBe(true);
    expect(h2s.some((t) => /AAC opportunity/i.test(t))).toBe(true);
    expect(h2s.some((t) => /try the app on your iPad/i.test(t))).toBe(true);
  });

  it("links 'Set up a patient' to /app/", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /set up a patient/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/app/"));
  });

  it("links 'Read the research plan' to /research", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /read the research plan/i });
    expect(link).toHaveAttribute("href", "/research");
  });

  it("links the 'Read the full research plan' deep link to /research", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /read the full research plan/i });
    expect(link).toHaveAttribute("href", "/research");
  });

  it("includes the study status string", () => {
    render(<Home />);
    expect(screen.getByText(/protocol drafted; not yet IRB-submitted/i)).toBeInTheDocument();
  });

  it("includes a BibTeX block for citing OwnVoice", () => {
    render(<Home />);
    expect(screen.getByText(/@misc\{ownvoice2026/)).toBeInTheDocument();
  });

  // A <footer> scoped to <main> maps to `sectionfooter`, not `contentinfo`,
  // so nesting it drops the footer out of screen-reader landmark navigation.
  //
  // Asserted structurally rather than via getByRole("contentinfo"): jsdom's
  // role computation does not implement the main-scoping rule and returns
  // contentinfo either way, so a role-based assertion passes even when the
  // footer is nested and would not catch a regression.
  it("renders the footer as a sibling of <main>, not inside it", () => {
    const { container } = render(<Home />);
    const main = container.querySelector("main");
    const footer = container.querySelector("footer");
    expect(main).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(main!.contains(footer!)).toBe(false);
  });
});
