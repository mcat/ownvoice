import { render, screen, fireEvent } from "@testing-library/preact";
import { TabBar } from "./TabBar";
import { useUIStore } from "../../stores/uiStore";
import { getCategories } from "../../data/phraseRegistry";

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
  });

  it("renders all category tabs", () => {
    render(<TabBar />);
    const tabs = screen.getAllByRole("tab");
    // CATS + the "Say More" sentence builder tab
    expect(tabs).toHaveLength(CATS.length + 1);
  });

  it("renders tab labels matching CATS data", () => {
    render(<TabBar />);
    for (const c of CATS) {
      expect(screen.getByLabelText(c.label)).toBeInTheDocument();
    }
  });

  it("active tab has aria-selected='true'", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const quickTab = screen.getByLabelText("Quick");
    expect(quickTab).toHaveAttribute("aria-selected", "true");
  });

  it("inactive tabs have aria-selected='false'", () => {
    useUIStore.setState({ tab: "quick" });
    render(<TabBar />);
    const nonQuickTabs = CATS.filter((c) => c.id !== "quick");
    for (const c of nonQuickTabs) {
      expect(screen.getByLabelText(c.label)).toHaveAttribute(
        "aria-selected",
        "false",
      );
    }
  });

  it("clicking tab calls setTab on UI store", () => {
    render(<TabBar />);
    const needsTab = screen.getByLabelText("I Need");
    fireEvent.click(needsTab);
    expect(useUIStore.getState().tab).toBe("needs");
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
