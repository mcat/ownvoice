import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { PlaceholderApp } from "./PlaceholderApp";

describe("PlaceholderApp", () => {
  it("renders the OwnVoice title", () => {
    render(<PlaceholderApp />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/OwnVoice/i);
  });

  it("links to the app at /app/", () => {
    render(<PlaceholderApp />);
    const link = screen.getByRole("link", { name: /open the app/i });
    expect(link).toHaveAttribute("href", "/app/");
  });
});
