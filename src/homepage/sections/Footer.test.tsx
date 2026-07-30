import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("keeps the non-clinical-use disclaimer", () => {
    render(<Footer />);
    expect(screen.getByText(/Not for clinical use without validation/)).toBeInTheDocument();
  });

  it("links to the research plan and bibliography", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /research plan/i })).toHaveAttribute(
      "href",
      "/research",
    );
    expect(screen.getByRole("link", { name: /bibliography/i })).toHaveAttribute(
      "href",
      "/bibliography",
    );
  });

  it("attributes the author with a hardened new-tab link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /created by mark catalano/i });
    expect(link).toHaveAttribute("href", "https://www.markcatalano.com/");
    expect(link).toHaveAttribute("target", "_blank");
    // noopener severs window.opener on the destination; noreferrer drops the
    // Referer header. Both matter because the link opens in a new tab.
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });
});
