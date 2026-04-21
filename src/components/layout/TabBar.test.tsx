import { render, screen, fireEvent } from "@testing-library/preact";
import { TabBar } from "./TabBar";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getCategories } from "../../data/phraseRegistry";
import type { AppSettings } from "../../types";

const baseCfg: AppSettings = {
  patientName: "",
  bed: "",
  patientLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
};

const CATS = getCategories("en");

// Mock useTheme to return stable light theme tokens
vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "light" as const,
    toggle: vi.fn(),
    t: {
      bg: "#FAFAF8",
      card: "#FFFFFF",
      text: "#1A1A1A",
      sub: "#4B5563",
      muted: "#6B7280",
      border: "rgba(0,0,0,0.07)",
      activeBg: "rgba(0,0,0,0.03)",
      helpBg: "#DC2626",
      headerBg: "#FFFFFF",
      tabBg: "#FFFFFF",
      speakBg: "linear-gradient(135deg,#1E293B,#334155)",
      threadMeta: "#71767E",
      threadMetaProvider: "#6B7280",
    },
  }),
}));

describe("TabBar", () => {
  beforeEach(() => {
    useUIStore.setState({ tab: "quick", sub: 0 });
    useSettingsStore.setState({ cfg: baseCfg });
  });

  it("renders all category tabs", () => {
    render(<TabBar />);
    // CATS + the "Say More" sentence builder
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const buttons = nav.querySelectorAll("button");
    expect(buttons).toHaveLength(CATS.length + 1);
  });

  it("renders tab labels matching CATS data", () => {
    render(<TabBar />);
    for (const c of CATS) {
      expect(screen.getByLabelText(c.label)).toBeInTheDocument();
    }
  });

  it("active tab has aria-current='page'", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const quickTab = screen.getByLabelText("Quick");
    expect(quickTab).toHaveAttribute("aria-current", "page");
  });

  it("inactive tabs omit aria-current", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const nonQuickTabs = CATS.filter((c) => c.id !== "quick");
    for (const c of nonQuickTabs) {
      expect(screen.getByLabelText(c.label)).not.toHaveAttribute("aria-current");
    }
  });

  it("clicking tab calls setTab on UI store", () => {
    render(<TabBar />);
    const needsTab = screen.getByLabelText("I Need");
    fireEvent.click(needsTab);
    expect(useUIStore.getState().tab).toBe("needs");
  });

  it("mouse hover tints inactive tab icon tile", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const needsTab = screen.getByLabelText("I Need");
    const tile = needsTab.querySelector("div") as HTMLDivElement;
    const baseBg = tile.style.background;
    expect(baseBg).toBe("transparent");

    fireEvent.pointerEnter(needsTab, { pointerType: "mouse" });
    expect(tile.style.background).not.toBe("transparent");

    fireEvent.pointerLeave(needsTab, { pointerType: "mouse" });
    expect(tile.style.background).toBe("transparent");
  });

  it("touch pointer does not trigger tab hover", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const needsTab = screen.getByLabelText("I Need");
    const tile = needsTab.querySelector("div") as HTMLDivElement;

    fireEvent.pointerEnter(needsTab, { pointerType: "touch" });
    expect(tile.style.background).toBe("transparent");
  });

  it("active tab ignores hover (keeps active background)", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const quickTab = screen.getByLabelText("Quick");
    const tile = quickTab.querySelector("div") as HTMLDivElement;
    const activeBg = tile.style.background;

    fireEvent.pointerEnter(quickTab, { pointerType: "mouse" });
    expect(tile.style.background).toBe(activeBg);
  });

  it("assistive mode strengthens inactive-tab hover tint", () => {
    useUIStore.setState({ tab: "quick" });

    // Default mode hover
    const { unmount } = render(<TabBar />);
    const defaultTab = screen.getByLabelText("I Need");
    const defaultTile = defaultTab.querySelector("div") as HTMLDivElement;
    fireEvent.pointerEnter(defaultTab, { pointerType: "mouse" });
    const defaultHoverBg = defaultTile.style.background;
    unmount();

    // Assistive mode hover
    useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
    render(<TabBar />);
    const assistiveTab = screen.getByLabelText("I Need");
    const assistiveTile = assistiveTab.querySelector("div") as HTMLDivElement;
    fireEvent.pointerEnter(assistiveTab, { pointerType: "mouse" });
    expect(assistiveTile.style.background).not.toBe(defaultHoverBg);
  });

  it("clicking tab resets sub to 0 and closes builder", () => {
    useUIStore.setState({ sub: 2, builderOpen: true, tab: "quick" });
    render(<TabBar />);
    const needsTab = screen.getByLabelText("I Need");
    fireEvent.click(needsTab);
    expect(useUIStore.getState().sub).toBe(0);
    expect(useUIStore.getState().builderOpen).toBe(false);
  });
});
