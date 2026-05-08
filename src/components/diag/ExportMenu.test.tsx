import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { ExportMenu, type ExportRequest } from "./ExportMenu";

describe("ExportMenu", () => {
  it("healthcare role shows Print/PDF only", () => {
    render(<ExportMenu role="healthcare" onExport={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /print/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /ndjson/i })).toBeNull();
  });

  it("researcher role shows redacted JSON, NDJSON, and unredacted JSON", () => {
    render(<ExportMenu role="researcher" onExport={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    expect(screen.getByRole("menuitem", { name: /redacted.*json/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /ndjson/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /unredacted/i })).toBeTruthy();
  });

  it("developer role shows unredacted JSON without PIN prompt flag", () => {
    let req: ExportRequest | null = null;
    render(<ExportMenu role="developer" onExport={(r) => { req = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /unredacted.*json/i }));
    expect(req).toEqual({ format: "otlp-json", redaction: "raw", needsPin: false });
  });

  it("researcher unredacted export carries needsPin=true", () => {
    let req: ExportRequest | null = null;
    render(<ExportMenu role="researcher" onExport={(r) => { req = r; }} />);
    fireEvent.click(screen.getByRole("button", { name: /export/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /unredacted/i }));
    expect(req?.needsPin).toBe(true);
  });
});
