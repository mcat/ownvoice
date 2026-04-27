import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Home } from "./Home";

describe("Home page", () => {
  it("renders the hero headline with the ICU stat", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/33%/);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/AAC only 11%/);
  });

  it("renders all five major section headings", () => {
    render(<Home />);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "");
    expect(h2s.some((t) => /communication failure/i.test(t))).toBe(true);
    expect(h2s.some((t) => /four pillars/i.test(t))).toBe(true);
    expect(h2s.some((t) => /clinical validation study/i.test(t))).toBe(true);
    expect(h2s.some((t) => /no PHI ever leaves/i.test(t))).toBe(true);
    expect(h2s.some((t) => /try the app on your iPad/i.test(t))).toBe(true);
  });

  it("links 'Try a demo' to /app/?demo=1", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /try a demo/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/app/?demo=1"));
  });

  it("links 'Set up a real session' to /app/", () => {
    render(<Home />);
    const links = screen.getAllByRole("link", { name: /set up a real session/i });
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
});
