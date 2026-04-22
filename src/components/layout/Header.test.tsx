import { render, screen, fireEvent } from "@testing-library/preact";
import { Header } from "./Header";
import { useUIStore } from "../../stores/uiStore";
import type { AppSettings } from "../../types";

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

const makeCfg = (overrides?: Partial<AppSettings>): AppSettings => ({
  patientName: "Maria",
  bed: "4A",
  patientLang: "en",
  caregiverLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
  ...overrides,
});

describe("Header", () => {
  beforeEach(() => {
    useUIStore.setState({
      builderOpen: false,
      wishesOpen: false,
      providerOpen: false,
      listenOpen: false,
      settingsOpen: false,
      pinEntryOpen: false,
    });
  });

  it("shows patient name from cfg prop", () => {
    render(<Header cfg={makeCfg()} />);
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("shows bed number when provided", () => {
    render(<Header cfg={makeCfg({ bed: "4A" })} />);
    expect(screen.getByText(/Bed 4A/)).toBeInTheDocument();
  });

  it("hides bed label when bed is empty", () => {
    render(<Header cfg={makeCfg({ bed: "" })} />);
    expect(screen.queryByText(/Bed/)).not.toBeInTheDocument();
  });

  it("wishes overlay button calls openOverlay on UI store", () => {
    render(<Header cfg={makeCfg()} />);
    const heartBtn = screen.getByText("\u2764\uFE0F");
    fireEvent.click(heartBtn);
    expect(useUIStore.getState().wishesOpen).toBe(true);
  });

  it("listen overlay button calls openOverlay on UI store", () => {
    render(<Header cfg={makeCfg()} />);
    const listenBtn = screen.getByText("\uD83D\uDC42");
    fireEvent.click(listenBtn);
    expect(useUIStore.getState().listenOpen).toBe(true);
  });

  it("provider overlay button calls openOverlay on UI store", () => {
    render(<Header cfg={makeCfg()} />);
    const providerBtn = screen.getByText("\uD83D\uDC69\u200D\u2695\uFE0F");
    fireEvent.click(providerBtn);
    expect(useUIStore.getState().providerOpen).toBe(true);
  });

  it("settings button opens pinEntry when PIN is set", () => {
    render(<Header cfg={makeCfg({ pin: "1234" })} />);
    const settingsBtn = screen.getByText("\u2699\uFE0F");
    fireEvent.click(settingsBtn);
    expect(useUIStore.getState().pinEntryOpen).toBe(true);
    expect(useUIStore.getState().settingsOpen).toBe(false);
  });

  it("settings button opens settings directly when no PIN", () => {
    render(<Header cfg={makeCfg({ pin: "" })} />);
    const settingsBtn = screen.getByText("\u2699\uFE0F");
    fireEvent.click(settingsBtn);
    expect(useUIStore.getState().settingsOpen).toBe(true);
  });
});
