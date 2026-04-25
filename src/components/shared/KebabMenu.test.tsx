import { render, screen, fireEvent } from "@testing-library/preact";
import { KebabMenu } from "./KebabMenu";
import { light } from "../../theme/tokens";

const baseProps = {
  ariaLabel: "Patient actions",
  t: light,
  isDark: false,
};

describe("KebabMenu", () => {
  it("renders a trigger button with the configured aria-label and is closed by default", () => {
    render(
      <KebabMenu
        {...baseProps}
        items={[
          { label: "Edit", onSelect: () => {} },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Patient actions" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the menu when the trigger is clicked, exposing all items", () => {
    render(
      <KebabMenu
        {...baseProps}
        items={[
          { label: "Edit", onSelect: () => {} },
          { label: "Remove", onSelect: () => {}, tone: "destructive" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remove" })).toBeInTheDocument();
  });

  it("invokes the item's onSelect and closes the menu when an item is clicked", () => {
    const onEdit = vi.fn();
    const onRemove = vi.fn();
    render(
      <KebabMenu
        {...baseProps}
        items={[
          { label: "Edit", onSelect: onEdit },
          { label: "Remove", onSelect: onRemove, tone: "destructive" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not invoke onSelect when a disabled item is clicked", () => {
    const onRemove = vi.fn();
    render(
      <KebabMenu
        {...baseProps}
        items={[
          { label: "Edit", onSelect: () => {} },
          {
            label: "Remove",
            onSelect: onRemove,
            disabled: true,
            disabledHint: "Switch to another patient first",
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    const removeItem = screen.getByRole("menuitem", { name: "Remove" });
    fireEvent.click(removeItem);
    expect(onRemove).not.toHaveBeenCalled();
    // Menu stays open since the click was a no-op.
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // Disabled hint is rendered alongside the disabled item.
    expect(screen.getByText("Switch to another patient first")).toBeInTheDocument();
  });

  it("Escape closes the menu", () => {
    render(
      <KebabMenu
        {...baseProps}
        items={[{ label: "Edit", onSelect: () => {} }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("clicking outside the menu closes it", () => {
    render(
      <div>
        <button>Outside</button>
        <KebabMenu
          {...baseProps}
          items={[{ label: "Edit", onSelect: () => {} }]}
        />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ArrowDown / ArrowUp move focus across enabled items, skipping disabled", () => {
    render(
      <KebabMenu
        {...baseProps}
        items={[
          { label: "Edit", onSelect: () => {} },
          { label: "Locked", onSelect: () => {}, disabled: true },
          { label: "Remove", onSelect: () => {}, tone: "destructive" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Patient actions" }));
    const edit = screen.getByRole("menuitem", { name: "Edit" });
    const remove = screen.getByRole("menuitem", { name: "Remove" });

    // First enabled item starts focused.
    expect(document.activeElement).toBe(edit);

    // ArrowDown skips the disabled "Locked" item and lands on Remove.
    fireEvent.keyDown(edit, { key: "ArrowDown" });
    expect(document.activeElement).toBe(remove);

    // ArrowUp wraps back to Edit (still skipping Locked).
    fireEvent.keyDown(remove, { key: "ArrowUp" });
    expect(document.activeElement).toBe(edit);
  });
});
