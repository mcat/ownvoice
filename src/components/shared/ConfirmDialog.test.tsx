import { render, screen, fireEvent, cleanup, act, waitFor } from "@testing-library/preact";
import { ConfirmDialogHost, confirm } from "./ConfirmDialog";
import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

describe("ConfirmDialog", () => {
  it("resolves true when confirm is clicked", async () => {
    render(<ConfirmDialogHost />);
    let p: Promise<boolean>;
    act(() => {
      p = confirm({
        title: "Do the thing?",
        body: "This is irreversible.",
        confirmLabel: "Do it",
        cancelLabel: "Nope",
      });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Do it" }));
    await expect(p!).resolves.toBe(true);
  });

  it("resolves false when cancel is clicked", async () => {
    render(<ConfirmDialogHost />);
    let p: Promise<boolean>;
    act(() => {
      p = confirm({
        title: "x", body: "y",
        confirmLabel: "ok", cancelLabel: "no",
      });
    });
    fireEvent.click(await screen.findByRole("button", { name: "no" }));
    await expect(p!).resolves.toBe(false);
  });

  it("resolves false on Escape key", async () => {
    render(<ConfirmDialogHost />);
    let p: Promise<boolean>;
    act(() => {
      p = confirm({
        title: "x", body: "y",
        confirmLabel: "ok", cancelLabel: "no",
      });
    });
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });
    await expect(p!).resolves.toBe(false);
  });

  it("focuses the cancel button on mount (safer default)", async () => {
    render(<ConfirmDialogHost />);
    let p: Promise<boolean>;
    act(() => {
      p = confirm({
        title: "x", body: "y",
        confirmLabel: "ok", cancelLabel: "no",
      });
    });
    const cancel = await screen.findByRole("button", { name: "no" });
    await waitFor(() => {
      expect(document.activeElement).toBe(cancel);
    });
    // Cleanup
    fireEvent.click(cancel);
    await p!;
  });

  it("resolves false with a warning if host isn't mounted", async () => {
    // No host mounted in this test's tree
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await confirm({
      title: "x", body: "y",
      confirmLabel: "ok", cancelLabel: "no",
    });
    expect(result).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
