import { render, screen } from "@testing-library/preact";
import { DualLocaleText } from "./DualLocaleText";
import { describe, it, expect } from "vitest";

describe("DualLocaleText", () => {
  it("renders only primary when locales match", () => {
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="en"
        variant="co-read"
      />,
    );
    // Primary is rendered exactly once; gloss element absent
    expect(screen.getAllByText(/What are your most important goals/).length).toBe(1);
    expect(container.querySelector('[data-dual-gloss]')).toBeNull();
  });

  it("renders primary + gloss elements when locales differ", () => {
    // Both resolve to English because we only have en.ts today, but the gloss
    // element exists as proof the component honored the "differ" branch.
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="es"   // different locale — triggers gloss branch
        variant="co-read"
      />,
    );
    expect(container.querySelector('[data-dual-primary]')).not.toBeNull();
    expect(container.querySelector('[data-dual-gloss]')).not.toBeNull();
  });

  it("uses 24px primary + 18px gloss for co-read variant", () => {
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="es"
        variant="co-read"
      />,
    );
    const primary = container.querySelector('[data-dual-primary]') as HTMLElement;
    const gloss = container.querySelector('[data-dual-gloss]') as HTMLElement;
    expect(primary.style.fontSize).toBe("24px");
    expect(gloss.style.fontSize).toBe("18px");
  });

  it("uses 18px primary + 14px gloss for transcript variant", () => {
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="es"
        variant="transcript"
      />,
    );
    const primary = container.querySelector('[data-dual-primary]') as HTMLElement;
    const gloss = container.querySelector('[data-dual-gloss]') as HTMLElement;
    expect(primary.style.fontSize).toBe("18px");
    expect(gloss.style.fontSize).toBe("14px");
  });

  it("accepts primaryText and glossText overrides (for composed sentences)", () => {
    render(
      <DualLocaleText
        primaryKey={"wishes.compose" as never}
        primaryLocale="en"
        glossLocale="es"
        variant="transcript"
        primaryText="I have burning pain in my chest"
        glossText="Tengo dolor quemante en mi pecho"
      />,
    );
    expect(screen.getByText("I have burning pain in my chest")).toBeInTheDocument();
    expect(screen.getByText("Tengo dolor quemante en mi pecho")).toBeInTheDocument();
  });
});
