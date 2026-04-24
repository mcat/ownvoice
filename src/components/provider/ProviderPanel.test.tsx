import { render, screen, fireEvent } from "@testing-library/preact";
import { ProviderPanel } from "./ProviderPanel";
import { light } from "../../theme/tokens";
import { getProviderCategories } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { makeTestCfg } from "../../test/makeCfg";

const PROVIDER_CATEGORIES = getProviderCategories("en");

const cfg = makeTestCfg({
  patient: { name: "Maria", bed: "4A", patientLang: "en", hasVoice: true },
  cfg: {
    pin: "1234",
    providers: [
      { name: "Dr. Smith", hasVoice: false, emoji: "👩‍⚕️" },
      { name: "Nurse Lee", hasVoice: false, emoji: "🧑‍⚕️" },
    ],
  },
});

const baseProps = {
  onSend: vi.fn(),
  onClose: vi.fn(),
  cfg,
  t: light,
  theme: "light" as const,
  activeProvIdx: 0,
  onSelectProvider: vi.fn(),
};

describe("ProviderPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ cfg, speakerData: null, _hasHydrated: true });
  });

  it("renders the Care Team title", () => {
    render(<ProviderPanel {...baseProps} />);
    expect(screen.getByText("Care Team")).toBeInTheDocument();
  });

  it("renders section category chips", () => {
    render(<ProviderPanel {...baseProps} />);
    const sectionKeys = Object.keys(PROVIDER_CATEGORIES);
    for (const key of sectionKeys) {
      expect(screen.getByRole("button", { name: `Show ${key}` })).toBeInTheDocument();
    }
  });

  it("shows phrases from the first section (responses) by default", () => {
    render(<ProviderPanel {...baseProps} />);
    const responses = PROVIDER_CATEGORIES["responses"];
    // Check the first phrase is visible
    expect(screen.getByText(responses[0])).toBeInTheDocument();
  });

  it("tapping a phrase calls onSend with phrase text and its registry key", () => {
    const onSend = vi.fn();
    render(<ProviderPanel {...baseProps} onSend={onSend} />);
    const firstPhrase = PROVIDER_CATEGORIES["responses"][0];
    fireEvent.click(screen.getByRole("button", { name: `Speak: ${firstPhrase}` }));
    // Key forwards so speakAsProvider can resolve patientLang for speech.
    expect(onSend).toHaveBeenCalledWith(firstPhrase, { key: "provider.responses.help" });
  });

  it("switching sections shows different phrases", () => {
    render(<ProviderPanel {...baseProps} />);
    // Switch to questions section
    fireEvent.click(screen.getByRole("button", { name: "Show questions" }));
    const questions = PROVIDER_CATEGORIES["questions"];
    expect(screen.getByText(questions[0])).toBeInTheDocument();
  });

  it("calls onClose when close button is tapped (after exit transition)", () => {
    const onClose = vi.fn();
    render(<ProviderPanel {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    // BottomSheet plays an exit transition before calling caller onClose.
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked (after exit transition)", () => {
    const onClose = vi.fn();
    const { container } = render(<ProviderPanel {...baseProps} onClose={onClose} />);
    const backdrop = container.querySelector("[data-testid='bottom-sheet-backdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    const evt = new Event("transitionend", { bubbles: true });
    (evt as unknown as { propertyName: string }).propertyName = "transform";
    screen.getByRole("dialog").dispatchEvent(evt);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows patient name and provider label in subtitle with bold emphasis", () => {
    render(<ProviderPanel {...baseProps} />);
    // Patient name + provider label are rendered as separate <strong>
    // elements interpolated into the localized template; query the
    // containing subtitle and assert against the full text content.
    const prefix = screen.getByText(/Speaking to/);
    const subtitle = prefix.parentElement as HTMLElement;
    expect(subtitle).toHaveTextContent(/Maria/);
    expect(subtitle).toHaveTextContent(/Dr\. Smith/);
    // Both interpolated slots are rendered as <strong>
    const strongs = subtitle.querySelectorAll("strong");
    expect(strongs.length).toBe(2);
    expect(strongs[0]).toHaveTextContent("Maria");
    expect(strongs[1]).toHaveTextContent(/Dr\. Smith/);
  });

  it("renders provider selector chips when multiple providers exist", () => {
    render(<ProviderPanel {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "Select Dr. Smith" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select Nurse Lee" }),
    ).toBeInTheDocument();
  });

  it("calls onSelectProvider when a provider chip is clicked", () => {
    const onSelectProvider = vi.fn();
    render(
      <ProviderPanel {...baseProps} onSelectProvider={onSelectProvider} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select Nurse Lee" }));
    expect(onSelectProvider).toHaveBeenCalledWith(1);
  });
});
