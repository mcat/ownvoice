import { render, screen, fireEvent } from "@testing-library/preact";
import { PainFlow } from "./PainFlow";
import { light } from "../../theme/tokens";
import { getEmojiFPS, getBodyRegions, getPainDescriptors } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import type { AppSettings } from "../../types";

const baseCfg: AppSettings = {
  patientName: "",
  bed: "",
  patientLang: "en",
  caregiverLang: "en",
  patientVoice: false,
  pin: "",
  providers: [],
};

const EMOJI_FPS = getEmojiFPS("en");
const BODY_REGIONS = getBodyRegions("en");
const PAIN_DESCRIPTORS = getPainDescriptors("en");

const baseProps = {
  onSelect: vi.fn(),
  t: light,
  theme: "light" as const,
};

describe("PainFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({ cfg: baseCfg });
  });

  describe("hover feedback", () => {
    it("severity tile: mouse hover changes background; touch does not", () => {
      render(<PainFlow {...baseProps} />);
      const tile = screen.getByText(EMOJI_FPS[0].face).closest("button")!;
      const baseBg = tile.style.background;

      fireEvent.pointerEnter(tile, { pointerType: "touch" });
      expect(tile.style.background).toBe(baseBg);

      fireEvent.pointerEnter(tile, { pointerType: "mouse" });
      expect(tile.style.background).not.toBe(baseBg);

      fireEvent.pointerLeave(tile, { pointerType: "mouse" });
      expect(tile.style.background).toBe(baseBg);
    });

    it("severity tile: assistive mode renders stronger hover than default", () => {
      const { unmount } = render(<PainFlow {...baseProps} />);
      const defaultTile = screen.getByText(EMOJI_FPS[0].face).closest("button")!;
      fireEvent.pointerEnter(defaultTile, { pointerType: "mouse" });
      const defaultHoverBg = defaultTile.style.background;
      unmount();

      useSettingsStore.setState({ cfg: { ...baseCfg, assistiveInput: true } });
      render(<PainFlow {...baseProps} />);
      const assistiveTile = screen.getByText(EMOJI_FPS[0].face).closest("button")!;
      fireEvent.pointerEnter(assistiveTile, { pointerType: "mouse" });
      expect(assistiveTile.style.background).not.toBe(defaultHoverBg);
    });
  });

  describe("severity step", () => {
    it("starts at severity step with 6 faces", () => {
      render(<PainFlow {...baseProps} />);
      expect(screen.getByText("How much pain do you have?")).toBeInTheDocument();
      // 6 emoji faces
      for (const face of EMOJI_FPS) {
        expect(screen.getByText(face.face)).toBeInTheDocument();
      }
    });

    it("shows severity labels for each face", () => {
      render(<PainFlow {...baseProps} />);
      expect(screen.getByText("No hurt")).toBeInTheDocument();
      expect(screen.getByText("Hurts worst")).toBeInTheDocument();
    });

    it("shows breadcrumb with Severity highlighted as the current step", () => {
      render(<PainFlow {...baseProps} />);
      const severity = screen.getByText("Severity");
      expect(severity).toBeInTheDocument();
      // Matches the Setup-style step indicator — current step is semibold (600).
      expect(severity.style.fontWeight).toBe("600");
    });

    it("does not render a Back button on any step", () => {
      // Back navigation lives entirely in the breadcrumb now — the dedicated
      // Back button was removed so the phrase grid isn't pushed below the
      // fold on shorter viewports.
      render(<PainFlow {...baseProps} />);
      expect(screen.queryByText("Back")).not.toBeInTheDocument();

      // Advance to Location step
      fireEvent.click(screen.getByText(EMOJI_FPS[0].face));
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();
      expect(screen.queryByText("Back")).not.toBeInTheDocument();

      // Advance to Descriptor step
      fireEvent.click(screen.getByText("Head"));
      expect(
        screen.getByText("What does the pain feel like?"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Back")).not.toBeInTheDocument();
    });
  });

  describe("location step", () => {
    it("advances to location step when a severity face is tapped", () => {
      render(<PainFlow {...baseProps} />);
      // Tap the first face (0 — No hurt)
      fireEvent.click(screen.getByText(EMOJI_FPS[0].face));
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();
    });

    it("shows all body regions on location step", () => {
      render(<PainFlow {...baseProps} />);
      fireEvent.click(screen.getByText(EMOJI_FPS[2].face)); // severity 4
      for (const region of BODY_REGIONS) {
        expect(screen.getByText(region)).toBeInTheDocument();
      }
    });

  });

  describe("descriptor step", () => {
    it("advances to descriptor step when a body region is tapped", () => {
      render(<PainFlow {...baseProps} />);
      fireEvent.click(screen.getByText(EMOJI_FPS[3].face)); // severity 6
      fireEvent.click(screen.getByText("Head"));
      expect(
        screen.getByText("What does the pain feel like?"),
      ).toBeInTheDocument();
    });

    it("shows all pain descriptors", () => {
      render(<PainFlow {...baseProps} />);
      fireEvent.click(screen.getByText(EMOJI_FPS[0].face));
      fireEvent.click(screen.getByText("Chest"));
      for (const desc of PAIN_DESCRIPTORS) {
        expect(screen.getByText(desc.text)).toBeInTheDocument();
      }
    });
  });

  describe("full flow: severity -> location -> descriptor -> onSelect", () => {
    it("calls onSelect with composed sentence after all three steps", () => {
      const onSelect = vi.fn();
      render(<PainFlow {...baseProps} onSelect={onSelect} />);

      // Step 1: Severity (8 — Hurts a whole lot)
      fireEvent.click(screen.getByText(EMOJI_FPS[4].face));

      // Step 2: Location
      fireEvent.click(screen.getByText("Lower Back"));

      // Step 3: Descriptor
      fireEvent.click(screen.getByText("Sharp"));

      expect(onSelect).toHaveBeenCalledWith(
        "I have sharp pain in my Lower Back, level 8 out of 10",
      );
    });

    it("resets to severity after completing the flow", () => {
      const onSelect = vi.fn();
      render(<PainFlow {...baseProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText(EMOJI_FPS[0].face));
      fireEvent.click(screen.getByText("Head"));
      fireEvent.click(screen.getByText("Aching"));

      // Should have reset back to severity step
      expect(screen.getByText("How much pain do you have?")).toBeInTheDocument();
    });
  });

  describe("breadcrumb goToStep", () => {
    it("clicking Severity breadcrumb from descriptor resets to severity", () => {
      render(<PainFlow {...baseProps} />);
      // Advance to descriptor step
      fireEvent.click(screen.getByText(EMOJI_FPS[3].face)); // severity 6
      fireEvent.click(screen.getByText("Head"));
      expect(screen.getByText("What does the pain feel like?")).toBeInTheDocument();

      // Click "Severity" breadcrumb to go all the way back
      fireEvent.click(screen.getByText("Severity"));
      expect(screen.getByText("How much pain do you have?")).toBeInTheDocument();
    });

    it("clicking Location breadcrumb from descriptor goes to location", () => {
      render(<PainFlow {...baseProps} />);
      // Advance to descriptor step
      fireEvent.click(screen.getByText(EMOJI_FPS[1].face)); // severity 2
      fireEvent.click(screen.getByText("Chest"));
      expect(screen.getByText("What does the pain feel like?")).toBeInTheDocument();

      // Click "Location" breadcrumb
      fireEvent.click(screen.getByText("Location"));
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();
    });

    it("clicking current or future step breadcrumb does nothing", () => {
      render(<PainFlow {...baseProps} />);
      fireEvent.click(screen.getByText(EMOJI_FPS[0].face)); // severity 0
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();

      // Click "Describe" breadcrumb (future step) — should not navigate
      fireEvent.click(screen.getByText("Describe"));
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();

      // Click "Location" breadcrumb (current step) — should not navigate
      fireEvent.click(screen.getByText("Location"));
      expect(screen.getByText("Where is your pain?")).toBeInTheDocument();
    });
  });
});
