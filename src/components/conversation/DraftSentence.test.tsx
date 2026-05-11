import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { DraftSentence } from "./DraftSentence";
import { light } from "../../theme/tokens";

describe("DraftSentence", () => {
  it("renders the sentence text", () => {
    render(
      <DraftSentence
        text="Hello world."
        index={0}
        total={1}
        onEdit={() => {}}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    expect(screen.getByText("Hello world.")).toBeTruthy();
  });

  it("calls onDiscard when the ✕ button is clicked", () => {
    const onDiscard = vi.fn();
    render(
      <DraftSentence
        text="Hello."
        index={0}
        total={1}
        onEdit={() => {}}
        onDiscard={onDiscard}
        locale="en"
        t={light}
      />,
    );
    fireEvent.click(screen.getByLabelText(/discard sentence 1/i));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("calls onEdit with new text when the row is edited", () => {
    const onEdit = vi.fn();
    render(
      <DraftSentence
        text="Hello."
        index={0}
        total={2}
        onEdit={onEdit}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    const editable = screen.getByRole("textbox");
    fireEvent.input(editable, { target: { textContent: "Hello, world." } });
    fireEvent.blur(editable);
    expect(onEdit).toHaveBeenCalledWith("Hello, world.");
  });

  it("sets ARIA labels with sentence index", () => {
    render(
      <DraftSentence
        text="X."
        index={2}
        total={5}
        onEdit={() => {}}
        onDiscard={() => {}}
        locale="en"
        t={light}
      />,
    );
    expect(screen.getByLabelText(/edit sentence 3 of 5/i)).toBeTruthy();
    expect(screen.getByLabelText(/discard sentence 3/i)).toBeTruthy();
  });
});
