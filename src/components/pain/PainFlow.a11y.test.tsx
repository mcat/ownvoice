import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { PainFlow } from "./PainFlow";
import { light } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";
import {
  assertGroupContainersHaveLabels,
  assertNoAriaHiddenAncestorOnFocusables,
  assertFocusOrderMatchesDomOrder,
} from "../../test/a11yAssertions";

const baseCfg = makeTestCfg();

beforeEach(() => {
  useSettingsStore.setState({ cfg: baseCfg });
});

describe("PainFlow a11y", () => {
  it("severity step renders a radiogroup with 6 radios", () => {
    const { container } = render(<PainFlow onSelect={() => {}} t={light} theme="light" />);
    const rg = container.querySelector('[role="radiogroup"]');
    expect(rg).not.toBeNull();
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(6);
    assertGroupContainersHaveLabels(container);
    assertNoAriaHiddenAncestorOnFocusables(container);
    assertFocusOrderMatchesDomOrder(container);
  });

  it("breadcrumb is wrapped in <nav> with a label", () => {
    const { container } = render(<PainFlow onSelect={() => {}} t={light} theme="light" />);
    const nav = container.querySelector("nav[aria-label]");
    expect(nav).not.toBeNull();
  });
});
