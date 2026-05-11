/**
 * Automated accessibility tests using axe-core via vitest-axe.
 *
 * These tests render patient-facing components and run axe audits
 * to catch WCAG violations (contrast, labels, roles, etc.).
 */
import { render } from "@testing-library/preact";
import { axe } from "vitest-axe";
// Import from dist path — vitest-axe/matchers.d.ts uses `export type *`
// which prevents importing the runtime value through the public entry point.
import { toHaveNoViolations } from "vitest-axe/dist/matchers";

expect.extend({ toHaveNoViolations });

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();
import { light } from "../theme/tokens";
import type { Message, AppSettings } from "../types";
import { makeTestCfg } from "../test/makeCfg";

// --- Mocks for store-connected components ---
vi.mock("../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light" as const, toggle: vi.fn(), t: light }),
}));
vi.mock("../stores/uiStore", () => {
  const state = {
    tab: "quick",
    sub: 0,
    builderOpen: false,
    wishesOpen: false,
    providerOpen: false,
    listenOpen: false,
    settingsOpen: false,
    pinEntryOpen: false,
    activeProvIdx: 0,
    speaking: null,
    setTab: vi.fn(),
    setSub: vi.fn(),
    toggleBuilder: vi.fn(),
    openOverlay: vi.fn(),
    closeOverlay: vi.fn(),
    closeAllOverlays: vi.fn(),
    setActiveProvIdx: vi.fn(),
    setSpeaking: vi.fn(),
    resetUI: vi.fn(),
  };
  return {
    useUIStore: Object.assign((selector: (s: typeof state) => unknown) => selector(state), {
      getState: () => state,
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }),
  };
});
vi.mock("../models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    // useModels (now consumed by ListenPill for readiness gating)
    // subscribes via onProgress and reads getProgress on mount.
    onProgress: vi.fn(() => () => undefined),
    getProgress: vi.fn(() => []),
    isWarm: vi.fn(() => true),
    isReady: vi.fn(() => true),
  }),
}));

// --- Imports after mocks ---
import { Thread } from "../components/conversation/Thread";
import { PhraseGrid } from "../components/phrases/PhraseGrid";
import { TabBar } from "../components/layout/TabBar";
import { Header } from "../components/layout/Header";
import { SubcategoryChips } from "../components/phrases/SubcategoryChips";

const t = light;

const sampleMessages: Message[] = [
  { from: "patient", text: "I need water", time: "3:50 PM", label: "Eleanor" },
  { from: "provider", text: "I will get you water.", time: "3:51 PM", label: "Nurse Davis" },
  { from: "patient", text: "Thank you", time: "3:51 PM", label: "Eleanor" },
];

const sampleCfg = makeTestCfg({
  patient: { name: "Eleanor", bed: "4B", patientLang: "en", hasVoice: false },
  cfg: { providers: [{ name: "Nurse Davis", hasVoice: false }] },
});

const samplePhrases = [
  { text: "Yes", icon: "👍" },
  { text: "No", icon: "👎" },
  { text: "Thank you", icon: "🙏" },
];

describe("Accessibility (axe-core)", () => {
  it("Thread: no violations in conversation bubbles", async () => {
    const { container } = render(
      <Thread messages={sampleMessages} t={t} onRepeat={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PhraseGrid: no violations in phrase buttons", async () => {
    const { container } = render(
      <PhraseGrid phrases={samplePhrases} onTap={vi.fn()} t={t} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("TabBar: no violations", async () => {
    const { container } = render(<TabBar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Header: no violations", async () => {
    const { container } = render(<Header cfg={sampleCfg} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SubcategoryChips: no violations", async () => {
    const { container } = render(
      <SubcategoryChips
        labels={["Comfort", "Medical", "People"]}
        activeIndex={0}
        onSelect={vi.fn()}
        t={t}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
