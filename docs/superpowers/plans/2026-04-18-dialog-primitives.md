# Dialog Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `<BottomSheet>` compound primitive, replace ad-hoc z-index magic numbers with a token scale, add a motion-safe entrance/exit animation, and migrate the four bottom-sheet dialogs (Wishes, Settings, Provider, Listen) onto it — decomposing `SettingsPanel` into focused section components on the way.

**Architecture:** New primitive at `src/components/shared/BottomSheet.tsx` owns the overlay, backdrop, card, `useDialog` wiring, z-index, and animation. Dot-subcomponents (`Header`, `Title`, `CloseButton`, `Body`, `Actions`) enforce the shared flex/scroll layout; their children are arbitrary so callers keep full control over content. A small z-index token scale at `src/theme/z.ts` replaces every magic number. `SettingsPanel` splits its four top-level sections into files under `src/components/settings/sections/` during its migration.

**Tech Stack:** TypeScript, Preact, Preact Context API, Vite, Vitest, `@testing-library/preact`, `@testing-library/jest-dom`. CSS-only animation via `@keyframes` with `prefers-reduced-motion` media query. No new dependencies.

---

## File Structure

**New files:**
- `src/theme/z.ts` — z-index token scale.
- `src/components/shared/BottomSheet.tsx` — compound primitive.
- `src/components/shared/BottomSheet.test.tsx` — unit tests.
- `src/components/settings/sections/PatientInfoSection.tsx` — patient info + voice controls.
- `src/components/settings/sections/PatientInfoSection.test.tsx` — unit tests.
- `src/components/settings/sections/CareTeamSection.tsx` — provider list + add form + emoji picker.
- `src/components/settings/sections/CareTeamSection.test.tsx` — unit tests.
- `src/components/settings/sections/AboutSection.tsx` — static about content.
- `src/components/settings/sections/ResetSection.tsx` — reset button + confirmation flow.
- `src/components/settings/sections/ResetSection.test.tsx` — unit tests.

**Modified files:**
- `src/theme/tokens.ts` — re-export `z`.
- `src/components/wishes/MyWishes.tsx` — rewritten using BottomSheet.
- `src/components/settings/SettingsPanel.tsx` — rewritten using BottomSheet, sections extracted.
- `src/components/provider/ProviderPanel.tsx` — rewritten using BottomSheet.
- `src/components/provider/ListenPanel.tsx` — rewritten using BottomSheet.
- `src/components/shared/PinGate.tsx` — consumes `z.pin`.
- `src/components/settings/Setup.tsx` — consumes `z.setup`.
- `src/components/shared/Speaking.tsx` — consumes `z.speaking`.
- Existing `.test.tsx` files for migrated components — update any assertions that depend on old DOM structure (e.g. direct `container.firstElementChild` backdrop lookups).

---

### Task 1: Z-index token scale

Introduce a single source of truth for stacking. Every remaining magic number in the tree will be replaced by one of these tokens later in the plan.

**Files:**
- Create: `src/theme/z.ts`
- Modify: `src/theme/tokens.ts`

- [ ] **Step 1: Create the z-index scale**

Write `src/theme/z.ts`:

```ts
/**
 * Z-index scale for overlays. Ordering rationale:
 *   - speaking: a passive "now speaking" toast; sits below interactive UI.
 *   - sheet:        default bottom-sheet layer (MyWishes, ProviderPanel, ListenPanel).
 *   - sheetStacked: for a sheet layered on top of another (SettingsPanel opened
 *                   after a PIN unlock that temporarily overlaps).
 *   - pin:          the centered PinGate dialog — sits above sheets so the PIN
 *                   prompt is never visually buried.
 *   - setup:        first-run wizard, renders before the app exists.
 */
export const z = {
  speaking: 100,
  sheet: 1000,
  sheetStacked: 1100,
  pin: 1200,
  setup: 1300,
} as const;

export type ZToken = typeof z[keyof typeof z];
```

- [ ] **Step 2: Re-export from `tokens.ts`**

Append to `src/theme/tokens.ts`:

```ts
export { z } from "./z";
export type { ZToken } from "./z";
```

- [ ] **Step 3: Run build to verify types compile**

Run: `npm run build`
Expected: exits 0 (type-check + build succeed).

- [ ] **Step 4: Commit**

```bash
git add src/theme/z.ts src/theme/tokens.ts
git commit -m "Add z-index token scale"
```

---

### Task 2: BottomSheet root shell — TDD

The root owns the overlay/backdrop/card, `useDialog` wiring, and a Preact context that carries `titleId` and `closeFn` down to `Title` and `CloseButton`. In this task we ship only the root plus a context object; subcomponents arrive in Task 3.

**Files:**
- Create: `src/components/shared/BottomSheet.tsx`
- Create: `src/components/shared/BottomSheet.test.tsx`

- [ ] **Step 1: Write failing tests for the root shell**

Write `src/components/shared/BottomSheet.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { BottomSheet } from "./BottomSheet";
import { light } from "../../theme/tokens";

describe("BottomSheet root", () => {
  it("renders children inside a dialog", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <p>Body content</p>
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("dialog has aria-modal=true", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        content
      </BottomSheet>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("fires onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("fires onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    // The outermost positioned element is the overlay; its first child is
    // the backdrop (absolute, inset:0). Click it.
    const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not fire onClose when clicking inside the card", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        <button>inside</button>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "inside" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: FAIL with "Cannot find module './BottomSheet'" (module does not yet exist).

- [ ] **Step 3: Implement the root shell**

Create `src/components/shared/BottomSheet.tsx`:

```tsx
import { createContext } from "preact";
import { useContext, useId } from "preact/hooks";
import type { ComponentChildren, JSX, RefObject } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { z as zScale } from "../../theme/z";
import { useDialog } from "../../hooks/useDialog";

interface BottomSheetContext {
  titleId: string;
  close: () => void;
}

const ctx = createContext<BottomSheetContext | null>(null);

function useBottomSheet(): BottomSheetContext {
  const v = useContext(ctx);
  if (!v) {
    throw new Error(
      "BottomSheet subcomponents must be rendered inside <BottomSheet>",
    );
  }
  return v;
}

export interface BottomSheetProps {
  onClose: () => void;
  t: ThemeTokens;
  /** Height of the sheet, in vh. Pass "auto" for content-sized sheets. */
  heightVh?: number | "auto";
  /** Stacking layer. Defaults to z.sheet. Use z.sheetStacked for nested sheets. */
  zIndex?: number;
  /** Override focus target; defaults to the dialog root. */
  initialFocusRef?: RefObject<HTMLElement>;
  children: ComponentChildren;
}

export function BottomSheet({
  onClose,
  t,
  heightVh = "auto",
  zIndex = zScale.sheet,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

  const overlay: JSX.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const backdrop: JSX.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
  };

  const card: JSX.CSSProperties = {
    position: "relative",
    background: t.card,
    borderRadius: "20px 20px 0 0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: heightVh === "auto" ? undefined : `${heightVh}vh`,
    maxHeight: heightVh === "auto" ? "92vh" : undefined,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
  };

  return (
    <div style={overlay}>
      {/* Backdrop — passive close surface. Escape and CloseButton are the
          keyboard/AT paths; no role or tabindex here. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-testid="bottom-sheet-backdrop"
        onClick={onClose}
        style={backdrop}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={card}
      >
        <ctx.Provider value={{ titleId, close: onClose }}>
          {children}
        </ctx.Provider>
      </div>
    </div>
  );
}

// Subcomponent placeholders — filled in Task 3 and Task 4.
// Exported now so imports don't break if someone tries to add them early.
BottomSheet.__ctx = ctx;
BottomSheet.__useBottomSheet = useBottomSheet;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/BottomSheet.tsx src/components/shared/BottomSheet.test.tsx
git commit -m "Add BottomSheet root primitive with dialog wiring"
```

---

### Task 3: Header, Title, CloseButton subcomponents

The `Header` is `flex-shrink:0` with `border-bottom`. `Title` renders an `<h2>` wired to the context `titleId` so `aria-labelledby` connects automatically. `CloseButton` renders an X inside a 64×64 touch target and calls `close` from context.

**Files:**
- Modify: `src/components/shared/BottomSheet.tsx`
- Modify: `src/components/shared/BottomSheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/components/shared/BottomSheet.test.tsx`:

```tsx
describe("BottomSheet.Title", () => {
  it("renders as h2 and wires aria-labelledby", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>Hello</BottomSheet.Title>
        </BottomSheet.Header>
      </BottomSheet>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Hello" });
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBe(heading.id);
  });
});

describe("BottomSheet.CloseButton", () => {
  it("calls onClose when tapped", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>T</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
        </BottomSheet.Header>
      </BottomSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("has a minimum 64x64 touch target", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.CloseButton aria-label="Close" />
        </BottomSheet.Header>
      </BottomSheet>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    const style = btn.getAttribute("style") ?? "";
    expect(style).toMatch(/min-width:\s*64px/);
    expect(style).toMatch(/min-height:\s*64px/);
  });
});

describe("BottomSheet.Header custom children", () => {
  it("renders arbitrary children alongside Title and CloseButton", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Header>
          <BottomSheet.Title>T</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
          <div data-testid="custom">progress</div>
        </BottomSheet.Header>
      </BottomSheet>,
    );
    expect(screen.getByTestId("custom")).toHaveTextContent("progress");
  });
});

describe("BottomSheet subcomponent misuse", () => {
  it("throws when Title is rendered outside BottomSheet", () => {
    // Suppress Preact's error rendering noise during this negative-path test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BottomSheet.Title>T</BottomSheet.Title>)).toThrow(
      /must be rendered inside <BottomSheet>/,
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: FAIL — `BottomSheet.Title`, `BottomSheet.CloseButton`, `BottomSheet.Header` are undefined.

- [ ] **Step 3: Implement Header, Title, CloseButton**

Replace the `BottomSheet.__ctx = ctx; BottomSheet.__useBottomSheet = useBottomSheet;` tail of `src/components/shared/BottomSheet.tsx` with:

```tsx
/* ── Subcomponents ─────────────────────────────────────── */

function Header({
  children,
  t,
}: {
  children: ComponentChildren;
  t?: ThemeTokens; // Optional: inherit from root. Kept for tests that render just Header.
}) {
  // Header is itself a flex row. Callers put <Title>, <CloseButton>, and any
  // custom children (progress bars, subtitle) inside — layout is theirs.
  const style: JSX.CSSProperties = {
    flexShrink: 0,
    padding: "16px 20px 12px",
    borderBottom: t ? `1px solid ${t.border}` : undefined,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  };
  return <div style={style}>{children}</div>;
}

function Title({ children }: { children: ComponentChildren }) {
  const { titleId } = useBottomSheet();
  return (
    <h2
      id={titleId}
      style={{
        fontSize: 22,
        fontWeight: 700,
        margin: 0,
        flex: 1,
        minWidth: 0,
      }}
    >
      {children}
    </h2>
  );
}

function CloseButton({
  children,
  ...rest
}: JSX.HTMLAttributes<HTMLButtonElement>) {
  const { close } = useBottomSheet();
  return (
    <button
      type="button"
      onClick={close}
      {...rest}
      style={{
        background: "none",
        border: "none",
        fontSize: 28,
        padding: 8,
        minWidth: 64,
        minHeight: 64,
        cursor: "pointer",
        fontFamily: "inherit",
        ...(rest.style as JSX.CSSProperties | undefined),
      }}
    >
      {children ?? "\u2715"}
    </button>
  );
}

BottomSheet.Header = Header;
BottomSheet.Title = Title;
BottomSheet.CloseButton = CloseButton;
```

Also update the root to thread `t` into `Header` via context. Easiest path: extend the context object and let `Header` read `t` from it.

Update the context type at the top of the file:

```tsx
interface BottomSheetContext {
  titleId: string;
  close: () => void;
  t: ThemeTokens;
}
```

Update the `ctx.Provider` in `BottomSheet` to pass `t`:

```tsx
<ctx.Provider value={{ titleId, close: onClose, t }}>
  {children}
</ctx.Provider>
```

Update `Header` to read `t` from context and drop the prop:

```tsx
function Header({ children }: { children: ComponentChildren }) {
  const { t } = useBottomSheet();
  const style: JSX.CSSProperties = {
    flexShrink: 0,
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${t.border}`,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  };
  return <div style={style}>{children}</div>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: PASS (9/9).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/BottomSheet.tsx src/components/shared/BottomSheet.test.tsx
git commit -m "Add BottomSheet Header, Title, CloseButton subcomponents"
```

---

### Task 4: Body and Actions subcomponents

`Body` is the scroll container (`flex:1, min-height:0, overflow-y:auto`); this is where the bulk of the duplicated scroll chrome currently lives across the four migrated dialogs. `Actions` is an optional pinned footer with `border-top`.

**Files:**
- Modify: `src/components/shared/BottomSheet.tsx`
- Modify: `src/components/shared/BottomSheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/components/shared/BottomSheet.test.tsx`:

```tsx
describe("BottomSheet.Body", () => {
  it("renders children", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Body>
          <p>body paragraph</p>
        </BottomSheet.Body>
      </BottomSheet>,
    );
    expect(screen.getByText("body paragraph")).toBeInTheDocument();
  });

  it("sets overflow-y auto and flex:1 for scroll containment", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Body>
          <p data-testid="inner">body</p>
        </BottomSheet.Body>
      </BottomSheet>,
    );
    const body = screen.getByTestId("inner").parentElement as HTMLElement;
    const style = body.getAttribute("style") ?? "";
    expect(style).toMatch(/overflow-y:\s*auto/);
    expect(style).toMatch(/flex:\s*1/);
    expect(style).toMatch(/min-height:\s*0/);
  });
});

describe("BottomSheet.Actions", () => {
  it("renders children inside a pinned footer", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        <BottomSheet.Actions>
          <button>Submit</button>
        </BottomSheet.Actions>
      </BottomSheet>,
    );
    const btn = screen.getByRole("button", { name: "Submit" });
    const actions = btn.parentElement as HTMLElement;
    const style = actions.getAttribute("style") ?? "";
    expect(style).toMatch(/flex-shrink:\s*0/);
    expect(style).toMatch(/border-top/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: FAIL — `BottomSheet.Body` and `BottomSheet.Actions` are undefined.

- [ ] **Step 3: Implement Body and Actions**

Append to `src/components/shared/BottomSheet.tsx` (before the `BottomSheet.Header = …` assignments):

```tsx
function Body({ children }: { children: ComponentChildren }) {
  const style: JSX.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "16px 20px",
    // Keep focus rings on edge children from being clipped by the scroll
    // boundary (WCAG 2.4.11 / 2.4.13).
    scrollPaddingBottom: 96,
  };
  return <div style={style}>{children}</div>;
}

function Actions({ children }: { children: ComponentChildren }) {
  const { t } = useBottomSheet();
  const style: JSX.CSSProperties = {
    flexShrink: 0,
    display: "flex",
    gap: 12,
    padding: "12px 20px",
    borderTop: `1px solid ${t.border}`,
  };
  return <div style={style}>{children}</div>;
}
```

Add to the tail assignments:

```tsx
BottomSheet.Body = Body;
BottomSheet.Actions = Actions;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: PASS (12/12).

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/BottomSheet.tsx src/components/shared/BottomSheet.test.tsx
git commit -m "Add BottomSheet Body and Actions subcomponents"
```

---

### Task 5: Entrance/exit animation with `prefers-reduced-motion`

The root gets a `closing` state. Sheet and backdrop slide-up/fade on mount; on close the animation reverses and the caller's `onClose` fires only after the animation completes. `@media (prefers-reduced-motion: reduce)` short-circuits to instant open/close.

**Files:**
- Modify: `src/components/shared/BottomSheet.tsx`
- Modify: `src/components/shared/BottomSheet.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/components/shared/BottomSheet.test.tsx`:

```tsx
describe("BottomSheet animation", () => {
  afterEach(() => {
    // Reset matchMedia to the setup.ts default between tests
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  it("under prefers-reduced-motion, Escape fires caller onClose synchronously", () => {
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("without reduced motion, close waits for the exit transition to end before firing caller onClose", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} t={light}>
        content
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    // onClose should NOT have fired yet — the exit transition is still in flight.
    expect(onClose).not.toHaveBeenCalled();

    // Fire transitionend on the card to simulate the animation completing.
    const dialog = screen.getByRole("dialog");
    fireEvent.transitionEnd(dialog, { propertyName: "transform" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders the sheet with entrance transform on first paint", () => {
    render(
      <BottomSheet onClose={() => {}} t={light}>
        content
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    const style = dialog.getAttribute("style") ?? "";
    // Either translateY(0) (already settled) or translateY(100%) (pre-open).
    // The impl uses a rAF to flip to translateY(0), so either is acceptable.
    expect(style).toMatch(/transform:\s*translateY\(/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: FAIL — current impl fires `onClose` synchronously on Escape and has no transform.

- [ ] **Step 3: Add a `useReducedMotion` hook**

Create a new file `src/hooks/useReducedMotion.ts`:

```ts
import { useEffect, useState } from "preact/hooks";

/**
 * Returns true when the user has requested reduced motion. SSR/test-safe:
 * assumes false when matchMedia is unavailable.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduced(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return reduced;
}
```

- [ ] **Step 4: Wire the animation into `BottomSheet`**

Replace the `BottomSheet` function body in `src/components/shared/BottomSheet.tsx` with:

```tsx
export function BottomSheet({
  onClose,
  t,
  heightVh = "auto",
  zIndex = zScale.sheet,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(reducedMotion); // start at final state if reduced

  // After first paint, flip to the entered state so the transition runs.
  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Single close path: all close routes call handleClose → sets `closing`,
  // transitionEnd on the card fires the caller's onClose. Reduced motion
  // skips the delay.
  function handleClose() {
    if (reducedMotion) {
      onClose();
      return;
    }
    setClosing(true);
  }

  // useDialog gets OUR handler, not the caller's. This is the whole point of
  // the `closing` state — Escape must animate out before unmounting.
  const { dialogRef } = useDialog({ onClose: handleClose, titleId });

  const open = entered && !closing;

  const overlay: JSX.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const backdrop: JSX.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    opacity: reducedMotion ? 1 : open ? 1 : 0,
    transition: reducedMotion ? undefined : "opacity 180ms ease-out",
  };

  const card: JSX.CSSProperties = {
    position: "relative",
    background: t.card,
    borderRadius: "20px 20px 0 0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    height: heightVh === "auto" ? undefined : `${heightVh}vh`,
    maxHeight: heightVh === "auto" ? "92vh" : undefined,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
    transform: reducedMotion ? "translateY(0)" : open ? "translateY(0)" : "translateY(100%)",
    transition: reducedMotion ? undefined : "transform 220ms cubic-bezier(.22,.61,.36,1)",
    willChange: "transform",
  };

  function handleTransitionEnd(e: JSX.TargetedTransitionEvent<HTMLDivElement>) {
    if (closing && e.propertyName === "transform") {
      onClose();
    }
  }

  return (
    <div style={overlay}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-testid="bottom-sheet-backdrop"
        onClick={handleClose}
        style={backdrop}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={card}
        onTransitionEnd={handleTransitionEnd}
      >
        <ctx.Provider value={{ titleId, close: handleClose, t }}>
          {children}
        </ctx.Provider>
      </div>
    </div>
  );
}
```

Add the missing imports at the top:

```tsx
import { useEffect, useId, useState } from "preact/hooks";
import { useReducedMotion } from "../../hooks/useReducedMotion";
```

Note: `useContext` and `createContext` stay as-is from prior tasks. The full top-of-file import block should now read:

```tsx
import { createContext } from "preact";
import { useContext, useEffect, useId, useState } from "preact/hooks";
import type { ComponentChildren, JSX, RefObject } from "preact";
import type { ThemeTokens } from "../../theme/tokens";
import { z as zScale } from "../../theme/z";
import { useDialog } from "../../hooks/useDialog";
import { useReducedMotion } from "../../hooks/useReducedMotion";
```

Also: `CloseButton` in Task 3 reads `close` from context. Because the context now carries `handleClose` (which triggers the exit animation) instead of the raw `onClose`, `CloseButton` taps automatically animate out. Verify no changes needed to `CloseButton` — it should still work.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: PASS (15/15). Some existing tests (e.g. "fires onClose when Escape is pressed") now depend on `transitionEnd` firing; update them.

Update the original "fires onClose when Escape is pressed" test in the root describe to:

```tsx
it("fires onClose when Escape is pressed (after exit transition)", () => {
  const onClose = vi.fn();
  render(
    <BottomSheet onClose={onClose} t={light}>
      content
    </BottomSheet>,
  );
  fireEvent.keyDown(document, { key: "Escape" });
  // Exit transition in flight — caller onClose not yet called.
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

And update "fires onClose when the backdrop is clicked":

```tsx
it("fires onClose when the backdrop is clicked (after exit transition)", () => {
  const onClose = vi.fn();
  const { container } = render(
    <BottomSheet onClose={onClose} t={light}>
      content
    </BottomSheet>,
  );
  const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
  fireEvent.click(backdrop as Element);
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

And update CloseButton's test:

```tsx
it("calls onClose when tapped (after exit transition)", () => {
  const onClose = vi.fn();
  render(
    <BottomSheet onClose={onClose} t={light}>
      <BottomSheet.Header>
        <BottomSheet.Title>T</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close" />
      </BottomSheet.Header>
    </BottomSheet>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

Re-run: `npm test -- src/components/shared/BottomSheet.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/BottomSheet.tsx src/components/shared/BottomSheet.test.tsx src/hooks/useReducedMotion.ts
git commit -m "Add BottomSheet entrance/exit animation with reduced-motion support"
```

---

### Task 6: Migrate ProviderPanel

Smallest and simplest of the four; proves the API end-to-end.

**Files:**
- Modify: `src/components/provider/ProviderPanel.tsx`
- Modify: `src/components/provider/ProviderPanel.test.tsx`

- [ ] **Step 1: Update the existing test to match the new chrome**

Open `src/components/provider/ProviderPanel.test.tsx`. The old test at the "calls onClose when overlay background is clicked" case pokes at `container.firstElementChild`. Replace that test with one that uses the new `data-testid`:

```tsx
it("calls onClose when backdrop is clicked", () => {
  const onClose = vi.fn();
  const { container } = render(<ProviderPanel {...baseProps} onClose={onClose} />);
  const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
  expect(backdrop).not.toBeNull();
  fireEvent.click(backdrop as Element);
  // Reduced motion is off in tests → exit animation runs. Simulate its end.
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

Also update "calls onClose when close button is tapped" the same way:

```tsx
it("calls onClose when close button is tapped", () => {
  const onClose = vi.fn();
  render(<ProviderPanel {...baseProps} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/provider/ProviderPanel.test.tsx`
Expected: FAIL — the primitive isn't being used yet; backdrop test can't find the testid.

- [ ] **Step 3: Rewrite `ProviderPanel.tsx` on top of `BottomSheet`**

Replace `src/components/provider/ProviderPanel.tsx` with:

```tsx
import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getProviderCategories } from "../../data/phraseRegistry";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface ProviderPanelProps {
  onSend: (text: string) => void;
  onClose: () => void;
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

const PROVIDER_CATEGORIES = getProviderCategories("en");
const SECTION_KEYS = Object.keys(PROVIDER_CATEGORIES);

export function ProviderPanel({
  onSend,
  onClose,
  cfg,
  t,
  theme,
  activeProvIdx,
  onSelectProvider,
}: ProviderPanelProps) {
  const [activeSection, setActiveSection] = useState(SECTION_KEYS[0]);

  const provider = cfg.providers[activeProvIdx] ?? cfg.providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : "Provider";

  const blueText = theme === "dark" ? "#60A5FA" : "#1E40AF";
  const providerGreen = "#059669";
  const providerGreenText = theme === "dark" ? "#34D399" : "#065F46";

  const phrases = PROVIDER_CATEGORIES[activeSection] ?? [];

  const chipRowStyle: JSX.CSSProperties = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  };

  const chipStyle = (active: boolean, color: string): JSX.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    border: active ? `2px solid ${color}` : `1px solid ${t.border}`,
    background: active ? (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
    color: active ? color : t.sub,
    textTransform: "capitalize" as const,
    minHeight: 40,
  });

  const phraseBtnStyle: JSX.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 14,
    fontSize: 17,
    lineHeight: 1.45,
    color: t.text,
    background: t.activeBg,
    border: `1px solid ${t.border}`,
    marginBottom: 8,
    transition: "background 0.12s",
  };

  return (
    <BottomSheet onClose={onClose} t={t} heightVh={80}>
      <BottomSheet.Header>
        <BottomSheet.Title>Care Team</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close panel" />
        <div style={{ flexBasis: "100%", fontSize: 14, color: t.sub }}>
          Speaking to <strong>{cfg.patientName || "patient"}</strong> as{" "}
          <strong style={{ color: providerGreenText }}>{providerLabel}</strong>
        </div>
      </BottomSheet.Header>

      <BottomSheet.Body>
        {cfg.providers.length > 1 && (
          <div style={chipRowStyle}>
            {cfg.providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx, providerGreen)}
                aria-label={`Select ${prov.name}`}
                aria-pressed={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        )}

        <div style={chipRowStyle}>
          {SECTION_KEYS.map((key) => (
            <Btn
              key={key}
              onClick={() => setActiveSection(key)}
              style={chipStyle(key === activeSection, blueText)}
              aria-label={`Show ${key}`}
              aria-pressed={key === activeSection}
            >
              {key}
            </Btn>
          ))}
        </div>

        <div>
          {phrases.map((phrase, idx) => (
            <Btn
              key={idx}
              onClick={() => onSend(phrase)}
              style={phraseBtnStyle}
              aria-label={`Speak: ${phrase}`}
            >
              {phrase}
            </Btn>
          ))}
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/provider/ProviderPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: no other test regresses.

- [ ] **Step 6: Commit**

```bash
git add src/components/provider/ProviderPanel.tsx src/components/provider/ProviderPanel.test.tsx
git commit -m "Migrate ProviderPanel to BottomSheet primitive"
```

---

### Task 7: Migrate ListenPanel

Same shape as ProviderPanel but with the microphone capture state.

**Files:**
- Modify: `src/components/provider/ListenPanel.tsx`
- Modify: `src/components/provider/ListenPanel.test.tsx`

- [ ] **Step 1: Update existing tests to match new chrome**

Open `src/components/provider/ListenPanel.test.tsx`. Any test that uses `container.firstElementChild` to find the backdrop, or fires an onClose click, must be updated to query for `[data-testid='bottom-sheet-backdrop']` and simulate `transitionEnd` after backdrop or close-button clicks (mirror Task 6's changes).

For reference pattern:

```tsx
it("calls onClose when close button is tapped", () => {
  const onClose = vi.fn();
  render(<ListenPanel {...baseProps} onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
  fireEvent.transitionEnd(screen.getByRole("dialog"), { propertyName: "transform" });
  expect(onClose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/provider/ListenPanel.test.tsx`
Expected: FAIL for the updated tests.

- [ ] **Step 3: Rewrite `ListenPanel.tsx` on top of `BottomSheet`**

Replace `src/components/provider/ListenPanel.tsx` with:

```tsx
import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { Btn } from "../shared/Btn";
import { useMicrophone } from "../../hooks/useMicrophone";
import { BottomSheet } from "../shared/BottomSheet";

interface ListenPanelProps {
  onAddMessage: (text: string, providerLabel: string) => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
  providers: Provider[];
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

export function ListenPanel({
  onAddMessage,
  onClose,
  t,
  theme,
  providers,
  activeProvIdx,
  onSelectProvider,
}: ListenPanelProps) {
  const {
    isListening: listening,
    transcript: sttTranscript,
    error: micError,
    audioLevel,
    transcribing,
    startCapture,
    stopCapture,
    clearTranscript,
  } = useMicrophone();

  const [editedTranscript, setEditedTranscript] = useState<string | null>(null);

  const transcript = editedTranscript !== null ? editedTranscript : sttTranscript;

  const provider = providers[activeProvIdx] ?? providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : "Provider";

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const providerGreen = "#059669";
  const providerGreenText = theme === "dark" ? "#34D399" : "#065F46";

  const canSubmit = transcript.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddMessage(transcript.trim(), providerLabel);
    setEditedTranscript(null);
    clearTranscript();
  };

  const chipRowStyle: JSX.CSSProperties = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  };

  const chipStyle = (active: boolean): JSX.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    border: active ? `2px solid ${providerGreen}` : `1px solid ${t.border}`,
    background: active
      ? theme === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.04)"
      : "transparent",
    color: active ? providerGreen : t.sub,
    minHeight: 40,
  });

  const singleProvStyle: JSX.CSSProperties = {
    fontSize: 15,
    color: providerGreenText,
    fontWeight: 600,
    marginBottom: 18,
  };

  const shadowSpread = listening ? Math.round(16 + audioLevel * 12) : 0;
  const shadowAlpha = listening
    ? Math.round(0.2 * 255 + audioLevel * 0.35 * 255).toString(16).padStart(2, "0")
    : "00";

  const micBtnStyle: JSX.CSSProperties = {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: listening ? `3px solid ${blue}` : `2px solid ${t.border}`,
    background: listening
      ? theme === "dark"
        ? "rgba(96,165,250,0.15)"
        : "rgba(37,99,235,0.08)"
      : t.activeBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    color: listening ? blue : t.muted,
    transition: "border 0.2s, background 0.2s, color 0.2s",
    boxShadow: listening ? `0 0 ${shadowSpread}px ${blue}${shadowAlpha}` : "none",
  };

  const textareaStyle: JSX.CSSProperties = {
    width: "100%",
    minHeight: 80,
    borderRadius: 14,
    border: `1px solid ${t.border}`,
    background: t.activeBg,
    color: t.text,
    fontSize: 16,
    lineHeight: 1.45,
    padding: "12px 14px",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };

  const submitBtnStyle: JSX.CSSProperties = {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    fontSize: 17,
    fontWeight: 600,
    border: "none",
    background: canSubmit ? providerGreen : t.activeBg,
    color: canSubmit ? "#FFFFFF" : t.muted,
    marginTop: 12,
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <BottomSheet onClose={onClose} t={t} heightVh={80}>
      <BottomSheet.Header>
        <BottomSheet.Title>Listen</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close panel" />
      </BottomSheet.Header>

      <BottomSheet.Body>
        {providers.length > 1 ? (
          <div style={chipRowStyle}>
            {providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx)}
                aria-label={`Select ${prov.name}`}
                aria-pressed={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        ) : (
          <div style={singleProvStyle}>
            {provider?.emoji ? `${provider.emoji} ` : ""}
            {provider?.name ?? "Provider"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <Btn
            onClick={() => {
              if (listening) {
                stopCapture();
              } else {
                setEditedTranscript(null);
                startCapture();
              }
            }}
            style={micBtnStyle}
            aria-label={listening ? "Stop listening" : "Tap to start listening"}
          >
            🎙
          </Btn>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 10 }}>
            {listening ? "Listening..." : transcribing ? "Transcribing..." : "Tap to start listening"}
          </div>
          {micError && (
            <div
              style={{
                fontSize: 13,
                color: theme === "dark" ? "#FCA5A5" : "#DC2626",
                marginTop: 8,
                textAlign: "center" as const,
                maxWidth: 320,
              }}
              role="alert"
            >
              {micError}
            </div>
          )}
        </div>

        <textarea
          style={textareaStyle}
          value={transcript}
          onInput={(e) => setEditedTranscript((e.target as HTMLTextAreaElement).value)}
          placeholder={listening ? "Listening for speech..." : transcribing ? "Transcribing speech..." : "Or type what was said..."}
          aria-label="Transcript"
        />

        <Btn
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={submitBtnStyle}
          aria-label={`Add to conversation as ${providerLabel}`}
        >
          Add to conversation as {providerLabel}
        </Btn>

        <div style={{ fontSize: 12, color: t.muted, textAlign: "center", marginTop: 14 }}>
          On-device &middot; Whisper &middot; no audio leaves this device
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/provider/ListenPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/provider/ListenPanel.tsx src/components/provider/ListenPanel.test.tsx
git commit -m "Migrate ListenPanel to BottomSheet primitive"
```

---

### Task 8: Migrate MyWishes

Stress-tests the `Header` custom-children slot: MyWishes uses a step counter + progress bars inside the header, plus a two-pane body (internal thread on top, current-topic responses below) and an action bar.

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx`
- Modify: `src/components/wishes/MyWishes.test.tsx`

- [ ] **Step 1: Update existing tests to match new chrome**

In `src/components/wishes/MyWishes.test.tsx`, update any test that asserts backdrop-click close or close-button behavior to the `bottom-sheet-backdrop` + `transitionEnd` pattern from Task 6.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/wishes/MyWishes.test.tsx`
Expected: FAIL on the updated assertions.

- [ ] **Step 3: Rewrite `MyWishes.tsx` on top of `BottomSheet`**

The full rewrite is long; follow these rules when editing `src/components/wishes/MyWishes.tsx`:

1. Remove the local `overlay`, `card`, `header`, `headerRow`, `titleStyle`, `threadPane`, `bottomPane`, `actionBar` style objects.
2. Replace the outer `<div style={overlay}>` + `<div ref={dialogRef}>` with `<BottomSheet onClose={onClose} t={t} heightVh={92}>`.
3. Replace the `div style={header}` + `<h2>` + close button block with:

   ```tsx
   <BottomSheet.Header>
     <BottomSheet.Title>{complete ? `${patientName}'s Wishes` : "My Wishes"}</BottomSheet.Title>
     <BottomSheet.CloseButton aria-label="Close" />
     {!complete && (
       <div style={{ flexBasis: "100%" }}>
         <div class="font-sans" style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}>
           Step {currentIdx + 1} of {SICG_TOPICS.length}
         </div>
         <div style={progressRow}>
           {/* existing progress bars */}
         </div>
       </div>
     )}
   </BottomSheet.Header>
   ```

4. Replace the two-pane body (thread + bottomPane) with:

   ```tsx
   <BottomSheet.Body>
     {/* existing thread + topic content, unchanged internals */}
   </BottomSheet.Body>
   ```

5. Replace the action bar with `<BottomSheet.Actions>` (only when not complete; on complete screen use Actions for "Share all wishes again" + "Close").
6. Delete the `useDialog` import and the `titleId`/`dialogRef` wiring — the primitive owns them.
7. Delete the `useId` import if unused.

Follow exactly this file shape (shown abridged for clarity; replace content in place — do NOT delete any of the topic/thread logic):

```tsx
import { useState, useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getWishTopics, composeWishSentence } from "../../data/phraseRegistry";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface WishMessage { from: "patient" | "provider"; text: string; }
interface MyWishesProps {
  onSpeak: (text: string) => void;
  locale?: string;
  onAddToThread: (text: string, from: "patient" | "provider", label?: string) => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
  patientName: string;
}

export function MyWishes({
  onSpeak,
  onAddToThread,
  onClose,
  t,
  theme,
  patientName,
  locale = "en",
}: MyWishesProps) {
  const SICG_TOPICS = getWishTopics(locale);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [thread, setThread] = useState<WishMessage[]>([]);
  const [complete, setComplete] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const blueBg = theme === "dark" ? "#1E3A5F" : "#EFF6FF";

  const topic = SICG_TOPICS[currentIdx];
  const selected = selections[topic?.id] ?? [];

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread.length]);

  /* … toggleResponse, handleShare, handleSkip, advance, handleShareAll: unchanged from original … */

  const preview = selected.length > 0 ? composeWishSentence(locale, topic, selected) : "";

  const progressRow: JSX.CSSProperties = { display: "flex", gap: 6 };

  if (complete) {
    const answeredTopics = SICG_TOPICS.filter(
      (tp) => selections[tp.id] && selections[tp.id].length > 0,
    );
    return (
      <BottomSheet onClose={onClose} t={t} heightVh={92}>
        <BottomSheet.Header>
          <BottomSheet.Title>{patientName}'s Wishes</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
        </BottomSheet.Header>
        <BottomSheet.Body>
          {answeredTopics.length === 0 ? (
            <p style={{ color: t.sub, fontSize: 18, textAlign: "center", marginTop: 40 }}>
              No wishes were shared.
            </p>
          ) : (
            answeredTopics.map((tp) => {
              const sentence = composeWishSentence(locale, tp, selections[tp.id]);
              return (
                <div key={tp.id} style={{ marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: blueBg }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 6 }}>
                    {tp.icon} {tp.label}
                  </div>
                  <div style={{ fontSize: 18, color: t.text }}>{sentence}</div>
                </div>
              );
            })
          )}
        </BottomSheet.Body>
        <BottomSheet.Actions>
          {answeredTopics.length > 0 && (
            <Btn
              onClick={handleShareAll}
              style={{
                flex: 1, padding: "16px", borderRadius: 12, border: "none", fontSize: 18,
                fontWeight: 600, color: "#fff", backgroundColor: blue, minHeight: 64,
              }}
            >
              Share all wishes again
            </Btn>
          )}
          <Btn
            onClick={onClose}
            style={{
              flex: answeredTopics.length > 0 ? undefined : 1,
              padding: "16px 24px", borderRadius: 12, border: `2px solid ${t.border}`,
              fontSize: 18, fontWeight: 600, color: t.text, backgroundColor: t.card,
              minHeight: 64, minWidth: 64,
            }}
          >
            Close
          </Btn>
        </BottomSheet.Actions>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet onClose={onClose} t={t} heightVh={92}>
      <BottomSheet.Header>
        <BottomSheet.Title>My Wishes</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close" />
        <div style={{ flexBasis: "100%" }}>
          <div class="font-sans" style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}>
            Step {currentIdx + 1} of {SICG_TOPICS.length}
          </div>
          <div style={progressRow}>
            {SICG_TOPICS.map((tp, i) => {
              const answered = selections[tp.id] && selections[tp.id].length > 0;
              let bg: string;
              if (i < currentIdx || answered) bg = blue;
              else if (i === currentIdx) bg = "#93C5FD";
              else bg = theme === "dark" ? "rgba(255,255,255,0.30)" : "#6B7280";
              return (
                <div
                  key={tp.id}
                  aria-current={i === currentIdx ? "step" : undefined}
                  style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: bg, transition: "background-color 0.3s" }}
                />
              );
            })}
          </div>
        </div>
      </BottomSheet.Header>

      <BottomSheet.Body>
        {thread.length > 0 && (
          <div ref={threadRef} style={{ maxHeight: "38vh", overflowY: "auto", marginBottom: 12, borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
            {/* existing thread render, unchanged */}
          </div>
        )}
        {/* existing topic header, preview, response buttons, unchanged */}
      </BottomSheet.Body>

      <BottomSheet.Actions>
        <Btn
          onClick={handleShare}
          disabled={selected.length === 0}
          style={{
            flex: 1, padding: "16px", borderRadius: 12, border: "none", fontSize: 18,
            fontWeight: 600, color: "#fff",
            backgroundColor: selected.length > 0 ? blue : theme === "dark" ? "#374151" : "#D1D5DB",
            minHeight: 64, opacity: selected.length === 0 ? 0.6 : 1,
          }}
        >
          Share
        </Btn>
        <Btn
          onClick={handleSkip}
          style={{
            padding: "16px 24px", borderRadius: 12, border: `2px solid ${t.border}`,
            fontSize: 18, fontWeight: 600, color: t.sub, backgroundColor: t.card,
            minHeight: 64, minWidth: 64,
          }}
        >
          Skip
        </Btn>
      </BottomSheet.Actions>
    </BottomSheet>
  );
}
```

Keep the original logic (`toggleResponse`, `handleShare`, `handleSkip`, `advance`, `handleShareAll`) and the thread/topic render blocks verbatim — the migration is chrome-only.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/wishes/MyWishes.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/wishes/MyWishes.tsx src/components/wishes/MyWishes.test.tsx
git commit -m "Migrate MyWishes to BottomSheet primitive"
```

---

### Task 9: Extract `PatientInfoSection` from SettingsPanel

This task moves the patient-info block (name, bed, language display, patient voice, backup voice, and the "Save changes" button) into its own file. No behavior change — the extracted component receives state and callbacks via props.

**Files:**
- Create: `src/components/settings/sections/PatientInfoSection.tsx`
- Create: `src/components/settings/sections/PatientInfoSection.test.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Write a failing test**

Create `src/components/settings/sections/PatientInfoSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { PatientInfoSection } from "./PatientInfoSection";
import { light } from "../../../theme/tokens";
import type { AppSettings, FallbackVoice } from "../../../types";

const cfg: AppSettings = {
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  patientVoice: true,
  pin: "1234",
  providers: [],
};

const baseProps = {
  cfg,
  name: "Maria",
  bed: "4A",
  patientVoice: true,
  fallbackVoice: null as FallbackVoice | null,
  hasChanges: false,
  onNameChange: vi.fn(),
  onBedChange: vi.fn(),
  onPatientVoiceChange: vi.fn(),
  onFallbackVoiceChange: vi.fn(),
  onSave: vi.fn(),
  t: light,
  theme: "light" as const,
};

describe("PatientInfoSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the name input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Maria");
  });

  it("renders the bed input with the current value", () => {
    render(<PatientInfoSection {...baseProps} />);
    expect(screen.getByLabelText("Bed / Room")).toHaveValue("4A");
  });

  it("fires onNameChange when name is edited", () => {
    const onNameChange = vi.fn();
    render(<PatientInfoSection {...baseProps} onNameChange={onNameChange} />);
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Alex" } });
    expect(onNameChange).toHaveBeenCalledWith("Alex");
  });

  it("shows the Save button only when hasChanges is true", () => {
    const { rerender } = render(<PatientInfoSection {...baseProps} />);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    rerender(<PatientInfoSection {...baseProps} hasChanges />);
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/settings/sections/PatientInfoSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Extract the component**

Create `src/components/settings/sections/PatientInfoSection.tsx` by moving the relevant block out of `SettingsPanel.tsx`. The implementation below mirrors the original code — preserve every visual detail, just thread state through props:

```tsx
import type { JSX } from "preact";
import type { AppSettings, FallbackVoice } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { LANGS } from "../../../data/phrases";
import { Btn } from "../../shared/Btn";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { FallbackVoicePicker } from "../../shared/FallbackVoicePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore } from "../../../stores/settingsStore";
import { speak } from "../../../speak";
import type { Speaker } from "../../../types";

interface Props {
  cfg: AppSettings;
  name: string;
  bed: string;
  patientVoice: boolean;
  fallbackVoice: FallbackVoice | null;
  hasChanges: boolean;
  onNameChange: (v: string) => void;
  onBedChange: (v: string) => void;
  onPatientVoiceChange: (v: boolean) => void;
  onFallbackVoiceChange: (v: FallbackVoice | null) => void;
  onSave: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function PatientInfoSection({
  cfg,
  name,
  bed,
  patientVoice,
  fallbackVoice,
  hasChanges,
  onNameChange,
  onBedChange,
  onPatientVoiceChange,
  onFallbackVoiceChange,
  onSave,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const selectedLang = LANGS.find((l) => l.code === cfg.patientLang);

  function previewClonedVoice() {
    const embedding = useSettingsStore.getState().speakerData;
    if (!embedding) return;
    const text = cfg.patientName ? `Hi, I'm ${cfg.patientName}` : "Hello, this is my voice";
    const speaker: Speaker = {
      name: cfg.patientName || "Patient",
      type: "patient",
      embedding,
      lang: cfg.patientLang,
    };
    speak(text, speaker);
  }

  return (
    <Section label="Patient Information" t={t}>
      <label htmlFor="settings-name" style={labelStyle(t)}>Name</label>
      <input
        id="settings-name"
        type="text"
        value={name}
        onInput={(e) => onNameChange((e.target as HTMLInputElement).value)}
        style={inputStyle(t, isDark)}
      />

      <label htmlFor="settings-bed" style={{ ...labelStyle(t), marginTop: 16 }}>Bed / Room</label>
      <input
        id="settings-bed"
        type="text"
        value={bed}
        onInput={(e) => onBedChange((e.target as HTMLInputElement).value)}
        style={inputStyle(t, isDark)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 15, color: t.sub }}>Language</span>
        <span style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>
          {selectedLang ? `${selectedLang.flag} ${selectedLang.label}` : cfg.patientLang}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={labelStyle(t)}>Voice</div>
        <VoiceCapture
          label="Patient"
          hasVoice={patientVoice}
          hasEmbedding={!!useSettingsStore.getState().speakerData}
          onCapture={(_blob, embedding) => {
            onPatientVoiceChange(true);
            if (embedding) useSettingsStore.getState().setSpeakerData(embedding);
          }}
          onRemove={() => {
            onPatientVoiceChange(false);
            useSettingsStore.getState().setSpeakerData(null);
          }}
          onPreview={previewClonedVoice}
          compact
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
        <VoiceCacheProgress
          speakerKey="patient"
          speakerLabel={cfg.patientName || "Patient"}
          cfg={cfg}
          patientSpeakerData={useSettingsStore.getState().speakerData}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={labelStyle(t)}>Backup voice</div>
        <p style={{ fontSize: 13, color: t.muted, margin: "0 0 10px" }}>
          System voice used while the voice clone loads. Tap to preview.
        </p>
        <FallbackVoicePicker
          selectedVoice={fallbackVoice}
          onSelect={onFallbackVoiceChange}
          lang={cfg.patientLang}
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
      </div>

      {hasChanges && (
        <Btn
          onClick={onSave}
          style={{
            marginTop: 20, width: "100%", padding: "14px 20px", borderRadius: 12, border: "none",
            background: "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          Save changes
        </Btn>
      )}
    </Section>
  );
}

/* Local helpers (duplicated across section files to keep each file self-contained) */

function Section({
  label, t, children,
}: { label: string; t: ThemeTokens; children: preact.ComponentChildren; }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: t.muted, textTransform: "uppercase",
        letterSpacing: "0.05em", margin: "0 0 12px",
      }}>{label}</h3>
      <div style={{
        background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 18,
      }}>{children}</div>
    </div>
  );
}

function labelStyle(t: ThemeTokens): JSX.CSSProperties {
  return { display: "block", fontSize: 14, fontWeight: 600, color: t.sub, marginBottom: 6 };
}

function inputStyle(t: ThemeTokens, isDark: boolean): JSX.CSSProperties {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#D1D5DB"}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "#FAFAF8",
    fontSize: 16, color: t.text, outline: "none", boxSizing: "border-box",
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
  };
}
```

- [ ] **Step 4: Remove the extracted block from `SettingsPanel.tsx`**

In `SettingsPanel.tsx`, replace the inline "Patient info section" block (everything inside `<Section label="Patient Information" t={t}>…</Section>`) with:

```tsx
<PatientInfoSection
  cfg={cfg}
  name={name}
  bed={bed}
  patientVoice={patientVoice}
  fallbackVoice={fallbackVoice}
  hasChanges={hasChanges}
  onNameChange={setName}
  onBedChange={setBed}
  onPatientVoiceChange={setPatientVoice}
  onFallbackVoiceChange={setFallbackVoice}
  onSave={save}
  t={t}
  theme={theme}
/>
```

Add the import at the top of the file:

```tsx
import { PatientInfoSection } from "./sections/PatientInfoSection";
```

Leave the rest of SettingsPanel (Care Team, About, Reset, BottomSheet chrome [still old], local `Section`/`labelStyle`/`inputStyle` helpers — they're used by the remaining inline sections) intact for now.

- [ ] **Step 5: Run both test files to verify they pass**

Run: `npm test -- src/components/settings/sections/PatientInfoSection.test.tsx src/components/settings/SettingsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/sections/PatientInfoSection.tsx src/components/settings/sections/PatientInfoSection.test.tsx src/components/settings/SettingsPanel.tsx
git commit -m "Extract PatientInfoSection from SettingsPanel"
```

---

### Task 10: Extract `CareTeamSection`

Provider list, per-provider voice, add/remove, emoji picker.

**Files:**
- Create: `src/components/settings/sections/CareTeamSection.tsx`
- Create: `src/components/settings/sections/CareTeamSection.test.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/settings/sections/CareTeamSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { CareTeamSection } from "./CareTeamSection";
import { light } from "../../../theme/tokens";
import type { AppSettings, Provider } from "../../../types";

const cfg: AppSettings = {
  patientName: "Maria", bed: "4A", patientLang: "en", patientVoice: true, pin: "1234",
  providers: [{ name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" }],
};

const baseProps = {
  cfg,
  providers: cfg.providers,
  onProvidersChange: vi.fn<(p: Provider[]) => void>(),
  t: light,
  theme: "light" as const,
};

describe("CareTeamSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders existing providers", () => {
    render(<CareTeamSection {...baseProps} />);
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });

  it("adds a provider when the Add button is clicked", () => {
    const onProvidersChange = vi.fn();
    render(<CareTeamSection {...baseProps} onProvidersChange={onProvidersChange} />);
    fireEvent.input(screen.getByLabelText("Name"), { target: { value: "Nurse Lee" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onProvidersChange).toHaveBeenCalledOnce();
    const next = onProvidersChange.mock.calls[0]![0] as Provider[];
    expect(next.map((p) => p.name)).toEqual(["Dr. Smith", "Nurse Lee"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/settings/sections/CareTeamSection.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Extract the component**

Create `src/components/settings/sections/CareTeamSection.tsx`. Move the entire inline "Care team section" block out of `SettingsPanel.tsx` into this file. The component receives `providers: Provider[]` and `onProvidersChange: (next: Provider[]) => void` as props; internally, transform operations (`addProvider`, `removeProvider`, `toggleProviderVoice`, `setProviderEmbedding`) become calls to `onProvidersChange(next)`. Keep the `EMOJIS` constant and the `showEmojiPicker` state local.

Reference the current SettingsPanel.tsx block (lines ~322-552) — copy verbatim, then:

1. Replace `setProviders(fn)` with `onProvidersChange(fn(providers))` pattern (compute `next` directly, don't use updater form).
2. Replace `cfg` references with explicit props where needed.
3. Keep all styles identical.
4. Re-declare the local `Section`/`labelStyle`/`inputStyle` helpers at the bottom of the file (same bodies as Task 9).

- [ ] **Step 4: Remove the extracted block from `SettingsPanel.tsx`**

Replace the whole `<Section label="Care Team" t={t}>…</Section>` block with:

```tsx
<CareTeamSection
  cfg={cfg}
  providers={providers}
  onProvidersChange={setProviders}
  t={t}
  theme={theme}
/>
```

Add the import:

```tsx
import { CareTeamSection } from "./sections/CareTeamSection";
```

Delete the now-unused `EMOJIS` constant, `addProvider`, `removeProvider`, `toggleProviderVoice`, `setProviderEmbedding` helpers, and the `newProvName`/`newProvEmoji`/`showEmojiPicker` state from `SettingsPanel.tsx`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/components/settings/sections/CareTeamSection.test.tsx src/components/settings/SettingsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/sections/CareTeamSection.tsx src/components/settings/sections/CareTeamSection.test.tsx src/components/settings/SettingsPanel.tsx
git commit -m "Extract CareTeamSection from SettingsPanel"
```

---

### Task 11: Extract `AboutSection`

Pure static content — no tests needed for this small a block; just verify the larger file's tests still pass.

**Files:**
- Create: `src/components/settings/sections/AboutSection.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/settings/sections/AboutSection.tsx`:

```tsx
import type { JSX } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";

interface Props { t: ThemeTokens; }

export function AboutSection({ t }: Props) {
  return (
    <Section label="About" t={t}>
      <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: "0 0 8px" }}>
        OwnVoice v0.1
      </p>
      <p style={{ fontSize: 14, color: t.sub, margin: "0 0 4px" }}>
        In-patient AAC communication aid.
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: "0 0 4px" }}>
        Pain scale: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>
        Goals of care: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0
      </p>
    </Section>
  );
}

function Section({
  label, t, children,
}: { label: string; t: ThemeTokens; children: preact.ComponentChildren; }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: t.muted, textTransform: "uppercase",
        letterSpacing: "0.05em", margin: "0 0 12px",
      }}>{label}</h3>
      <div style={{
        background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 18,
      }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the inline block in SettingsPanel**

In `SettingsPanel.tsx`, replace the `<Section label="About" t={t}>…</Section>` block with `<AboutSection t={t} />`. Add the import `import { AboutSection } from "./sections/AboutSection";`.

- [ ] **Step 3: Run tests**

Run: `npm test -- src/components/settings/SettingsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/sections/AboutSection.tsx src/components/settings/SettingsPanel.tsx
git commit -m "Extract AboutSection from SettingsPanel"
```

---

### Task 12: Extract `ResetSection`

Reset button with a two-state (confirm / committed) flow.

**Files:**
- Create: `src/components/settings/sections/ResetSection.tsx`
- Create: `src/components/settings/sections/ResetSection.test.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/settings/sections/ResetSection.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { ResetSection } from "./ResetSection";
import { light } from "../../../theme/tokens";

describe("ResetSection", () => {
  it("shows the reset trigger initially", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    expect(screen.getByRole("button", { name: /reset app for new patient/i })).toBeInTheDocument();
  });

  it("shows a confirmation prompt after the trigger is tapped", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: /reset app for new patient/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset everything/i })).toBeInTheDocument();
  });

  it("calls onReset only after confirmation", () => {
    const onReset = vi.fn();
    render(<ResetSection onReset={onReset} t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: /reset app for new patient/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset everything/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("Cancel returns to the trigger state", () => {
    render(<ResetSection onReset={vi.fn()} t={light} theme="light" />);
    fireEvent.click(screen.getByRole("button", { name: /reset app for new patient/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /reset app for new patient/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/settings/sections/ResetSection.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Extract the component**

Create `src/components/settings/sections/ResetSection.tsx`:

```tsx
import { useState } from "preact/hooks";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";

interface Props {
  onReset: () => void | Promise<void>;
  t: ThemeTokens;
  theme: ThemeName;
}

export function ResetSection({ onReset, t, theme }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isDark = theme === "dark";

  return (
    <Section label="Reset" t={t}>
      {!showConfirm ? (
        <Btn
          onClick={() => setShowConfirm(true)}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 12,
            border: "1px solid #DC2626", background: "transparent",
            color: "#DC2626", fontSize: 16, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          Reset app for new patient
        </Btn>
      ) : (
        <div style={{
          padding: 16,
          background: isDark ? "rgba(220,38,38,0.1)" : "rgba(220,38,38,0.05)",
          borderRadius: 14,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#DC2626", margin: "0 0 8px" }}>
            Are you sure?
          </p>
          <p style={{ fontSize: 14, color: t.sub, margin: "0 0 16px" }}>
            This will erase all patient data, voice samples, conversation history, and provider
            settings. This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={() => setShowConfirm(false)}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.card,
                color: t.text, fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              Cancel
            </Btn>
            <Btn
              onClick={onReset}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, border: "none",
                background: "#DC2626", color: "#FFFFFF", fontSize: 15, fontWeight: 600, fontFamily: "inherit",
              }}
            >
              Reset everything
            </Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

function Section({
  label, t, children,
}: { label: string; t: ThemeTokens; children: preact.ComponentChildren; }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: t.muted, textTransform: "uppercase",
        letterSpacing: "0.05em", margin: "0 0 12px",
      }}>{label}</h3>
      <div style={{
        background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 18,
      }}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Replace the inline block in SettingsPanel**

In `SettingsPanel.tsx`, replace the `<Section label="Reset" …>…</Section>` block with:

```tsx
<ResetSection onReset={onReset} t={t} theme={theme} />
```

Add the import `import { ResetSection } from "./sections/ResetSection";`. Delete the now-unused `showResetConfirm` state.

Now that all four sections are extracted, also delete the local `Section`, `labelStyle`, and `inputStyle` helpers from `SettingsPanel.tsx` (they've been duplicated into the section files that still need them).

- [ ] **Step 5: Run tests**

Run: `npm test -- src/components/settings/sections/ResetSection.test.tsx src/components/settings/SettingsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/sections/ResetSection.tsx src/components/settings/sections/ResetSection.test.tsx src/components/settings/SettingsPanel.tsx
git commit -m "Extract ResetSection from SettingsPanel"
```

---

### Task 13: Migrate SettingsPanel to BottomSheet

Now that SettingsPanel is down to an orchestrator, swap its inline chrome for `<BottomSheet>` and the `"Done"` link for a custom header child. Pass `zIndex={z.sheetStacked}` because this sheet often opens in flows that have already shown `PinGate`.

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`
- Modify: `src/components/settings/SettingsPanel.test.tsx`

- [ ] **Step 1: Update existing tests**

In `src/components/settings/SettingsPanel.test.tsx`, apply the same update pattern as Task 6: for any test that asserts backdrop-click close or close-button close, switch to `[data-testid='bottom-sheet-backdrop']` and `transitionEnd` simulation.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/settings/SettingsPanel.test.tsx`
Expected: FAIL on the updated assertions.

- [ ] **Step 3: Rewrite `SettingsPanel.tsx`**

Replace `SettingsPanel.tsx` with:

```tsx
import { useState } from "preact/hooks";
import type { AppSettings, FallbackVoice, Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { PatientInfoSection } from "./sections/PatientInfoSection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { ResetSection } from "./sections/ResetSection";

interface SettingsPanelProps {
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  onReset: () => void | Promise<void>;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function SettingsPanel({
  cfg, onUpdate, onReset, onClose, t, theme,
}: SettingsPanelProps) {
  const [name, setName] = useState(cfg.patientName);
  const [bed, setBed] = useState(cfg.bed);
  const [providers, setProviders] = useState<Provider[]>(cfg.providers);
  const [patientVoice, setPatientVoice] = useState(cfg.patientVoice);
  const [fallbackVoice, setFallbackVoice] = useState<FallbackVoice | null>(
    cfg.fallbackVoice ?? null,
  );

  const providersChanged =
    providers.length !== cfg.providers.length ||
    providers.some(
      (p, i) =>
        p.name !== cfg.providers[i]?.name ||
        p.hasVoice !== cfg.providers[i]?.hasVoice ||
        p.emoji !== cfg.providers[i]?.emoji ||
        !!p.embedding !== !!cfg.providers[i]?.embedding,
    );

  const hasChanges =
    name !== cfg.patientName ||
    bed !== cfg.bed ||
    patientVoice !== cfg.patientVoice ||
    (fallbackVoice?.voiceURI ?? null) !== (cfg.fallbackVoice?.voiceURI ?? null) ||
    providersChanged;

  function save() {
    onUpdate({ ...cfg, patientName: name, bed, providers, patientVoice, fallbackVoice });
  }

  return (
    <BottomSheet onClose={onClose} t={t} heightVh={85} zIndex={z.sheetStacked}>
      <BottomSheet.Header>
        {/* Drag handle — visual affordance, not interactive */}
        <div
          aria-hidden="true"
          style={{
            flexBasis: "100%",
            display: "flex",
            justifyContent: "center",
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              width: 40, height: 4, borderRadius: 2,
              background: theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
            }}
          />
        </div>
        <BottomSheet.Title>Settings</BottomSheet.Title>
        {/* "Done" text link instead of X — matches iPadOS convention for settings sheets. */}
        <BottomSheet.CloseButton
          aria-label="Close settings"
          style={{
            fontSize: 16,
            color: t.muted,
            padding: "8px 12px",
            minWidth: 64,
            minHeight: 64,
            fontFamily: "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
          }}
        >
          Done
        </BottomSheet.CloseButton>
      </BottomSheet.Header>

      <BottomSheet.Body>
        <div style={{ padding: "0 4px" }}>
          <PatientInfoSection
            cfg={cfg}
            name={name}
            bed={bed}
            patientVoice={patientVoice}
            fallbackVoice={fallbackVoice}
            hasChanges={hasChanges}
            onNameChange={setName}
            onBedChange={setBed}
            onPatientVoiceChange={setPatientVoice}
            onFallbackVoiceChange={setFallbackVoice}
            onSave={save}
            t={t}
            theme={theme}
          />
          <CareTeamSection
            cfg={cfg}
            providers={providers}
            onProvidersChange={setProviders}
            t={t}
            theme={theme}
          />
          <AboutSection t={t} />
          <ResetSection onReset={onReset} t={t} theme={theme} />
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/settings/SettingsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsPanel.tsx src/components/settings/SettingsPanel.test.tsx
git commit -m "Migrate SettingsPanel to BottomSheet primitive"
```

---

### Task 14: Wire z tokens into PinGate, Setup, Speaking

These three don't adopt the primitive (different shapes), but they should consume the new token scale so every magic z number is gone.

**Files:**
- Modify: `src/components/shared/PinGate.tsx`
- Modify: `src/components/settings/Setup.tsx`
- Modify: `src/components/shared/Speaking.tsx`

- [ ] **Step 1: Update PinGate**

In `src/components/shared/PinGate.tsx`, add at the top:

```tsx
import { z } from "../../theme/z";
```

Replace `zIndex: 9000` in the outer div style with `zIndex: z.pin`.

- [ ] **Step 2: Update Setup**

In `src/components/settings/Setup.tsx`, add the import:

```tsx
import { z } from "../../theme/z";
```

Replace `zIndex: 9999` in the outer div style with `zIndex: z.setup`.

- [ ] **Step 3: Update Speaking**

In `src/components/shared/Speaking.tsx`, add the import:

```tsx
import { z } from "../../theme/z";
```

Replace `zIndex: 100` with `zIndex: z.speaking`.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — no behavioral change.

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/PinGate.tsx src/components/settings/Setup.tsx src/components/shared/Speaking.tsx
git commit -m "Replace magic z-index numbers with token scale"
```

---

### Task 15: Verification and cleanup

Sweep for any remaining magic numbers, unused code, or stale imports from the migration.

**Files:** ad hoc — whatever the audit reveals.

- [ ] **Step 1: Grep for residual inline overlay chrome**

Run: `grep -rn "justifyContent: \"flex-end\"" src/components | grep -v BottomSheet | grep -v test`
Expected: empty output. If any results appear, they're leftover chrome in a migrated component — delete them.

Run: `grep -rn "borderTopLeftRadius\|borderRadius: \"20px 20px 0 0\"" src/components | grep -v BottomSheet`
Expected: empty output.

- [ ] **Step 2: Grep for remaining magic z-index numbers**

Run: `grep -rn "zIndex: [0-9]" src --include="*.tsx" --include="*.ts" | grep -v "theme/z.ts" | grep -v "test" | grep -v BottomSheet`
Expected: empty output (or only references inside the `z` definition itself).

Edge case: `SettingsPanel.tsx` Task 13 had an inline `zIndex: 10` on the emoji picker inside the care team form. That moved to `CareTeamSection.tsx`; it's a local menu stacking context (not an overlay) and is OK to keep as-is.

- [ ] **Step 3: Run coverage**

Run: `npm run test:coverage`
Expected: coverage thresholds (lines 90, functions 90, branches 80) still pass.

- [ ] **Step 4: Manual smoke test in the dev server**

Run: `npm run dev`

Expected: dev server starts and opens the browser. Manually:
- Open each of the four bottom sheets (Wishes, Settings, Provider, Listen) and observe the 220ms slide-up on entry and exit.
- Verify backdrop click and Escape both animate out before the sheet disappears.
- Verify Settings still saves; Wishes still advances step-by-step and speaks; Provider and Listen still work.
- Verify the "Done" text link closes Settings.
- Toggle `System Settings → Accessibility → Reduce Motion` and verify the animation disables.

Report findings in a commit message if any tweaks are needed. Otherwise there's nothing to commit here — this step just verifies.

- [ ] **Step 5: Final commit (if any tweaks were made)**

```bash
git add -A
git status
# Commit only if there were follow-up fixes. Otherwise skip.
```

---

## Summary of deliverables

- `src/theme/z.ts` — z-index token scale.
- `src/components/shared/BottomSheet.tsx` — compound primitive (Root + Header + Title + CloseButton + Body + Actions) with 220ms CSS slide-up, prefers-reduced-motion support, and exit-animation-before-unmount wiring.
- `src/hooks/useReducedMotion.ts` — matchMedia hook for reduced-motion.
- `src/components/settings/sections/{PatientInfoSection,CareTeamSection,AboutSection,ResetSection}.tsx` — decomposed sections.
- `src/components/{wishes/MyWishes, settings/SettingsPanel, provider/ProviderPanel, provider/ListenPanel}.tsx` — migrated onto BottomSheet.
- `src/components/{shared/PinGate, settings/Setup, shared/Speaking}.tsx` — consume z tokens.
- All existing behavior preserved; entrance animation is the only visible change to end users.
