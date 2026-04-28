import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { References } from "./References";

describe("References section", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the BibTeX with the canonical www URL", () => {
    render(<References />);
    const pre = screen.getByText(/@misc\{ownvoice2026/);
    expect(pre).toHaveTextContent("https://www.ownvoice.icu");
    // Guard against accidentally reverting to the apex form.
    expect(pre.textContent).not.toMatch(/url = \{https:\/\/ownvoice\.icu\}/);
  });

  it("renders the bibliography link with the www-prefixed display text", () => {
    render(<References />);
    expect(screen.getByText("www.ownvoice.icu/bibliography")).toBeInTheDocument();
  });

  it("copies the BibTeX to the clipboard when the Copy button is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<References />);

    const button = screen.getByRole("button", { name: /copy citation to clipboard/i });
    expect(button).toHaveTextContent("Copy");

    fireEvent.click(button);

    expect(writeText).toHaveBeenCalledOnce();
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain("@misc{ownvoice2026");
    expect(copied).toContain("https://www.ownvoice.icu");

    await waitFor(() => expect(button).toHaveTextContent("Copied!"));
  });

  it("shows a failure label when the clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<References />);

    const button = screen.getByRole("button", { name: /copy citation to clipboard/i });
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveTextContent("Copy failed"));
  });
});
