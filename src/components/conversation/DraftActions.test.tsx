import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { DraftActions } from "./DraftActions";
import { light } from "../../theme/tokens";

describe("DraftActions", () => {
  it("renders Add and Discard buttons with the provider name", () => {
    render(
      <DraftActions
        providerName="Dr. Patel"
        addDisabled={false}
        onAdd={() => {}}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    expect(screen.getByRole("button", { name: /add as dr\. patel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /discard/i })).toBeTruthy();
  });

  it("disables Add when addDisabled is true", () => {
    render(
      <DraftActions
        providerName="Dr. Patel"
        addDisabled={true}
        onAdd={() => {}}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    expect((screen.getByRole("button", { name: /add as/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onAdd when Add is clicked and enabled", () => {
    const onAdd = vi.fn();
    render(
      <DraftActions
        providerName="Dr. Patel"
        addDisabled={false}
        onAdd={onAdd}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /add as/i }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("calls onDiscard when Discard is clicked", () => {
    const onDiscard = vi.fn();
    render(
      <DraftActions
        providerName="Dr. Patel"
        addDisabled={true}
        onAdd={() => {}}
        onDiscard={onDiscard}
        locale="en"
        t={light}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
