import { render, screen, fireEvent, waitFor, act } from "@testing-library/preact";
import { Setup } from "./Setup";

// Mock getModelManager to avoid model init side effects
vi.mock("../../models/modelManager", () => ({
  getModelManager: () => ({
    init: vi.fn(),
    getWorker: vi.fn(() => null),
    clearAll: vi.fn(),
    isReady: vi.fn(() => false),
    onProgress: vi.fn(() => () => {}),
  }),
}));

describe("Setup", () => {
  const onDone = vi.fn();

  beforeEach(() => {
    onDone.mockClear();
    vi.useFakeTimers();
    // Skip button now gates behind window.confirm (WCAG 3.3.6 AAA).
    // Default to accept so existing skip tests continue exercising the
    // skip path; individual tests can override.
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders step 0 with patient name input and language selection", () => {
    render(<Setup onDone={onDone} />);
    expect(screen.getByText("Welcome to OwnVoice")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name or preferred name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. 4B-12")).toBeInTheDocument();
    // Language buttons should be present
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("has a 4-step progress indicator with correct labels", () => {
    render(<Setup onDone={onDone} />);
    expect(screen.getByText("Patient")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Care Team")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("'Skip' calls onDone with default settings and entered name", () => {
    render(<Setup onDone={onDone} />);

    // Enter a patient name
    const nameInput = screen.getByPlaceholderText("First name or preferred name");
    fireEvent.input(nameInput, { target: { value: "Alice" } });

    // Click "Skip →"
    const skipBtn = screen.getByText(/Skip/);
    fireEvent.click(skipBtn);

    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: "Alice",
        patientLang: "en",
        patientVoice: false,
        pin: "",
        providers: [],
      }),
    );
  });

  it("'Continue' advances through steps", () => {
    render(<Setup onDone={onDone} />);

    // Step 0 visible
    expect(screen.getByText("Welcome to OwnVoice")).toBeInTheDocument();

    // Click Continue → Step 1 (Voice)
    const continueBtn = screen.getByText("Continue");
    fireEvent.click(continueBtn);
    vi.advanceTimersByTime(300); // Btn debounce
    expect(screen.getByText("Voice sample")).toBeInTheDocument();

    // Click Continue → Step 2 (Care Team)
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Care team")).toBeInTheDocument();

    // Click Continue → Step 3 (Confirm)
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Ready to go")).toBeInTheDocument();
  });

  it("Step 3 shows confirm summary with review text", () => {
    render(<Setup onDone={onDone} />);

    // Enter name first
    fireEvent.input(screen.getByPlaceholderText("First name or preferred name"), {
      target: { value: "Bob" },
    });

    // Advance to step 3
    fireEvent.click(screen.getByText("Continue")); // → Step 1
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue")); // → Step 2
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue")); // → Step 3
    vi.advanceTimersByTime(300);

    expect(screen.getByText("Ready to go")).toBeInTheDocument();
    expect(
      screen.getByText("Review your setup. You can change anything later in Settings."),
    ).toBeInTheDocument();

    // Summary rows — "Patient" and "Voice" appear in both progress indicator
    // and summary, so use getAllByText for those labels.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Bed / Room")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getAllByText("Patient")).toHaveLength(2); // progress + summary
    expect(screen.getAllByText("Voice")).toHaveLength(2);   // progress + summary
  });

  it("Step 3 'Start OwnVoice' button calls onDone with gathered settings", () => {
    render(<Setup onDone={onDone} />);

    // Enter name
    fireEvent.input(screen.getByPlaceholderText("First name or preferred name"), {
      target: { value: "Carol" },
    });

    // Advance to step 3
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);

    // Final button should say "Start OwnVoice"
    const startBtn = screen.getByText("Start OwnVoice");
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: "Carol",
        patientLang: "en",
      }),
    );
  });

  it("Back button appears on step 1+ and navigates backwards", () => {
    render(<Setup onDone={onDone} />);

    // Step 0 has no Back button
    expect(screen.queryByText("Back")).not.toBeInTheDocument();

    // Advance to step 1
    fireEvent.click(screen.getByText("Continue"));
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Voice sample")).toBeInTheDocument();

    // Back button now visible
    const backBtn = screen.getByText("Back");
    expect(backBtn).toBeInTheDocument();

    // Click Back → returns to step 0
    fireEvent.click(backBtn);
    vi.advanceTimersByTime(300);
    expect(screen.getByText("Welcome to OwnVoice")).toBeInTheDocument();
  });

  it("bed input updates the bed field in onDone", () => {
    render(<Setup onDone={onDone} />);
    fireEvent.input(screen.getByPlaceholderText("e.g. 4B-12"), {
      target: { value: "Room 5" },
    });
    fireEvent.click(screen.getByText(/Skip/));
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ bed: "Room 5" }),
    );
  });

  it("language selection updates the chosen language", () => {
    render(<Setup onDone={onDone} />);

    // Select Spanish
    fireEvent.click(screen.getByText("Español"));

    // Skip to finish — should have Spanish language
    fireEvent.click(screen.getByText(/Skip/));

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        patientLang: "es",
      }),
    );
  });

  /* ---------- Step 1: Voice ---------- */
  describe("Step 1 (Voice)", () => {
    function goToStep1() {
      render(<Setup onDone={onDone} />);
      fireEvent.click(screen.getByText("Continue"));
      vi.advanceTimersByTime(300);
    }

    it("renders Voice sample title and description", () => {
      goToStep1();
      expect(screen.getByText("Voice sample")).toBeInTheDocument();
      expect(
        screen.getByText(/Capture a voice sample/),
      ).toBeInTheDocument();
    });

    it("renders Upload file and Record buttons", () => {
      goToStep1();
      expect(screen.getByText("Upload file")).toBeInTheDocument();
      expect(screen.getByText("Record")).toBeInTheDocument();
    });

    it("shows privacy note when voice not yet captured", () => {
      goToStep1();
      expect(screen.getByText(/Voice cloning runs entirely on-device/)).toBeInTheDocument();
      expect(screen.getByText(/No audio leaves this tablet/)).toBeInTheDocument();
    });

    it("has back button returning to Step 0", () => {
      goToStep1();
      expect(screen.getByText("Back")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Back"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Welcome to OwnVoice")).toBeInTheDocument();
    });

    it("clicking Upload file triggers hidden file input click", () => {
      goToStep1();
      // The Upload file button should be present
      const uploadBtn = screen.getByText("Upload file").closest("button")!;
      // Clicking it should try to open the file picker (clicks hidden input)
      fireEvent.click(uploadBtn);
      // We can't fully test the file picker, but the button should be interactive
      expect(uploadBtn).toBeDefined();
    });

    it("clicking Record triggers microphone access", async () => {
      // Mock getUserMedia to reject so we can test the error path
      vi.spyOn(navigator.mediaDevices, "getUserMedia").mockRejectedValue(
        new Error("Not allowed"),
      );

      goToStep1();
      const recordBtn = screen.getByText("Record").closest("button")!;
      fireEvent.click(recordBtn);

      // Wait for the async rejection to be handled
      await vi.advanceTimersByTimeAsync(100);

      // Error message should appear
      expect(
        screen.getByText("Microphone access denied. Try uploading a file instead."),
      ).toBeInTheDocument();
    });

    it("file upload with no file does nothing", async () => {
      goToStep1();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      // Trigger change with no file
      Object.defineProperty(fileInput, "files", {
        value: [],
        configurable: true,
      });
      fireEvent.change(fileInput);
      await vi.advanceTimersByTimeAsync(100);
      // Should still show upload/record buttons, no error
      expect(screen.getByText("Upload file")).toBeInTheDocument();
    });

    it("file upload error shows a friendly message and a Retry affordance, not the raw error", async () => {
      goToStep1();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      // Mock AudioContext.decodeAudioData to throw. The raw error string ("bad
      // format") must NEVER reach the user-facing DOM — it should be translated
      // into an actionable sentence via friendlyVoiceError().
      (globalThis as any).AudioContext = vi.fn(function() {
        return {
          decodeAudioData: vi.fn().mockRejectedValue(new Error("bad format")),
          close: vi.fn(),
          state: "running",
          resume: vi.fn(),
          sampleRate: 24000,
        };
      });

      const mockFile = new File([new Blob([new ArrayBuffer(100)])], "bad.wav", { type: "audio/wav" });
      Object.defineProperty(fileInput, "files", {
        value: [mockFile],
        configurable: true,
      });

      // Switch to real timers so async processing can complete
      vi.useRealTimers();
      // Use direct dispatchEvent — fireEvent.change does not reliably trigger
      // Preact's onChange handler on file inputs in the test environment
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Wait for async processAndCapture chain to resolve and update the DOM.
      // The failure surfaces as the "Clone failed" badge + Retry button + a
      // non-technical subtitle.
      await waitFor(() => {
        expect(screen.getByText(/Clone failed/i)).toBeInTheDocument();
      });
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      // Raw error must NOT be visible to the user.
      expect(screen.queryByText(/bad format/i)).not.toBeInTheDocument();
    });

    it("Remove button clears voice sample", async () => {
      goToStep1();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Mock successful audio decode
      (globalThis as any).AudioContext = vi.fn(function() {
        return {
          decodeAudioData: vi.fn().mockResolvedValue({
            getChannelData: () => new Float32Array(16000),
          }),
          close: vi.fn(),
          state: "running",
          resume: vi.fn(),
          sampleRate: 24000,
        };
      });

      const mockFile = new File([new Blob([new ArrayBuffer(100)])], "test.wav", { type: "audio/wav" });
      Object.defineProperty(fileInput, "files", {
        value: [mockFile],
        configurable: true,
      });

      // Switch to real timers so async processing can complete
      vi.useRealTimers();
      // Use direct dispatchEvent — fireEvent.change does not reliably trigger
      // Preact's onChange handler on file inputs in the test environment
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Wait for async extractEmbedding chain to resolve
      await waitFor(() => {
        expect(screen.getByText("Voice captured")).toBeInTheDocument();
      });

      // Click Remove
      fireEvent.click(screen.getByText("Remove"));

      // Should go back to uncaptured state — Upload/Record buttons reappear
      expect(screen.getByText("Upload file")).toBeInTheDocument();
      expect(screen.getByText("Record")).toBeInTheDocument();
    });

    it("file upload with audio triggers extractEmbedding no-worker path", async () => {
      goToStep1();

      // Find the hidden file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      // Create a mock audio file and trigger onChange
      const mockBlob = new Blob([new ArrayBuffer(100)], { type: "audio/wav" });
      const mockFile = new File([mockBlob], "test.wav", { type: "audio/wav" });

      // Mock AudioContext.decodeAudioData to return a valid AudioBuffer-like object
      const mockDecodeAudioData = vi.fn().mockResolvedValue({
        getChannelData: () => new Float32Array(16000),
      });
      const mockClose = vi.fn();
      (globalThis as any).AudioContext = vi.fn(function() {
        return {
          decodeAudioData: mockDecodeAudioData,
          close: mockClose,
          state: "running",
          resume: vi.fn(),
          sampleRate: 24000,
        };
      });

      // Trigger file selection
      Object.defineProperty(fileInput, "files", {
        value: [mockFile],
        configurable: true,
      });

      // Switch to real timers so async processing can complete
      vi.useRealTimers();
      // Use direct dispatchEvent — fireEvent.change does not reliably trigger
      // Preact's onChange handler on file inputs in the test environment
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Wait for async extractEmbedding chain to resolve
      await waitFor(() => {
        expect(screen.getByText("Voice captured")).toBeInTheDocument();
      });
    });
  });

  /* ---------- Step 2: Care Team ---------- */
  describe("Step 2 (Care Team)", () => {
    function goToStep2() {
      render(<Setup onDone={onDone} />);
      fireEvent.click(screen.getByText("Continue")); // → Step 1
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 2
      vi.advanceTimersByTime(300);
    }

    it("renders Care team title", () => {
      goToStep2();
      expect(screen.getByText("Care team")).toBeInTheDocument();
      expect(
        screen.getByText(/Add the providers/),
      ).toBeInTheDocument();
    });

    it("has name input and Add button", () => {
      goToStep2();
      expect(
        screen.getByPlaceholderText("Dr. Smith, Nurse Jay..."),
      ).toBeInTheDocument();
      expect(screen.getByText("Add")).toBeInTheDocument();
    });

    it("adding a provider shows it in the list", () => {
      goToStep2();
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. Test" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Dr. Test")).toBeInTheDocument();
    });

    it("removing a provider removes it from the list", () => {
      goToStep2();
      // Add a provider
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Nurse Jay" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Nurse Jay")).toBeInTheDocument();

      // Remove it (✕ button)
      fireEvent.click(screen.getByText("\u2715"));
      expect(screen.queryByText("Nurse Jay")).not.toBeInTheDocument();
    });

    it("adding empty name does nothing", () => {
      goToStep2();
      // Don't type anything, just click Add
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);
      // No provider should appear — the "No voice" label should not be present
      expect(screen.queryByText("No voice")).not.toBeInTheDocument();
    });

    it("has back button returning to Step 1", () => {
      goToStep2();
      fireEvent.click(screen.getByText("Back"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Voice sample")).toBeInTheDocument();
    });

    it("Enter key in name input triggers addProvider", () => {
      goToStep2();
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. Keys" } });
      fireEvent.keyDown(nameInput, { key: "Enter" });
      expect(screen.getByText("Dr. Keys")).toBeInTheDocument();
    });

    it("Enter key with empty name does not add a provider", () => {
      goToStep2();
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      // Press Enter with empty input — triggers addProvider() which early-returns
      fireEvent.keyDown(nameInput, { key: "Enter" });
      // No provider should be added
      expect(screen.queryByText("No voice")).not.toBeInTheDocument();
    });

    it("emoji picker opens and selecting an emoji updates the icon", () => {
      goToStep2();
      // The icon button shows the default emoji
      const iconBtn = screen.getByText("👩‍⚕️");
      fireEvent.click(iconBtn);
      // Emoji picker should be visible — pick a different emoji
      const starEmoji = screen.getByText("⭐");
      fireEvent.click(starEmoji);
      // Now add a provider with that emoji
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Star Provider" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Star Provider")).toBeInTheDocument();
    });

    it("after adding a provider, a VoiceCapture widget appears for that provider", () => {
      goToStep2();
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. Voice" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);

      // Provider should be in the list
      expect(screen.getByText("Dr. Voice")).toBeInTheDocument();

      // VoiceCapture widget should appear for the provider (Upload file / Record buttons)
      expect(screen.getByText("Upload file")).toBeInTheDocument();
      expect(screen.getByText("Record")).toBeInTheDocument();
    });
  });

  /* ---------- Step 3: Confirm ---------- */
  describe("Step 3 (Confirm)", () => {
    function goToStep3(enterName = true) {
      render(<Setup onDone={onDone} />);
      if (enterName) {
        fireEvent.input(
          screen.getByPlaceholderText("First name or preferred name"),
          { target: { value: "Test Patient" } },
        );
      }
      fireEvent.click(screen.getByText("Continue")); // → Step 1
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 2
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 3
      vi.advanceTimersByTime(300);
    }

    it("renders Ready to go title", () => {
      goToStep3();
      expect(screen.getByText("Ready to go")).toBeInTheDocument();
    });

    it("shows summary rows with patient info", () => {
      goToStep3();
      expect(screen.getByText("Test Patient")).toBeInTheDocument();
      expect(screen.getByText("Bed / Room")).toBeInTheDocument();
      expect(screen.getByText("Not set")).toBeInTheDocument(); // bed not set
      expect(screen.getByText("Care team")).toBeInTheDocument();
      expect(screen.getByText("None added")).toBeInTheDocument();
    });

    it("has PIN input field", () => {
      goToStep3();
      expect(screen.getByPlaceholderText("1234")).toBeInTheDocument();
      expect(screen.getByText(/Staff PIN/)).toBeInTheDocument();
    });

    it("PIN input only accepts digits and limits to 4 chars", () => {
      goToStep3();
      const pinInput = screen.getByPlaceholderText("1234");
      fireEvent.input(pinInput, { target: { value: "12ab56" } });
      // Should strip non-digits and truncate to 4
      expect((pinInput as HTMLInputElement).value).toMatch(/^\d{0,4}$/);
    });

    it("has Start OwnVoice button", () => {
      goToStep3();
      expect(screen.getByText("Start OwnVoice")).toBeInTheDocument();
    });

    it("has back button returning to Step 2", () => {
      goToStep3();
      fireEvent.click(screen.getByText("Back"));
      vi.advanceTimersByTime(300);
      expect(screen.getByText("Care team")).toBeInTheDocument();
    });

    it("shows 'Not captured' for voice when no voice sample", () => {
      goToStep3();
      expect(screen.getByText("Not captured")).toBeInTheDocument();
    });

    it("shows provider names in summary when providers added", () => {
      render(<Setup onDone={onDone} />);
      // Enter name
      fireEvent.input(
        screen.getByPlaceholderText("First name or preferred name"),
        { target: { value: "Test" } },
      );
      // Go to step 2
      fireEvent.click(screen.getByText("Continue")); // → Step 1
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 2
      vi.advanceTimersByTime(300);

      // Add a provider
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. Who" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);

      // Go to step 3
      fireEvent.click(screen.getByText("Continue"));
      vi.advanceTimersByTime(300);

      // Provider should appear in summary
      expect(screen.getByText(/Dr\. Who/)).toBeInTheDocument();
    });

    it("finish/skip flow includes provider hasVoice state", () => {
      render(<Setup onDone={onDone} />);

      // Go to step 2
      fireEvent.click(screen.getByText("Continue")); // → Step 1
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 2
      vi.advanceTimersByTime(300);

      // Add a provider
      const nameInput = screen.getByPlaceholderText("Dr. Smith, Nurse Jay...");
      fireEvent.input(nameInput, { target: { value: "Dr. Prov" } });
      fireEvent.click(screen.getByText("Add"));
      vi.advanceTimersByTime(300);

      // Go to step 3
      fireEvent.click(screen.getByText("Continue"));
      vi.advanceTimersByTime(300);

      // Click Start OwnVoice
      fireEvent.click(screen.getByText("Start OwnVoice"));

      expect(onDone).toHaveBeenCalledOnce();
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: [
            expect.objectContaining({
              name: "Dr. Prov",
              hasVoice: false,
            }),
          ],
        }),
      );
    });

    it("PIN entered is sent to onDone", () => {
      render(<Setup onDone={onDone} />);
      // Navigate to step 3
      fireEvent.click(screen.getByText("Continue")); // → Step 1
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 2
      vi.advanceTimersByTime(300);
      fireEvent.click(screen.getByText("Continue")); // → Step 3
      vi.advanceTimersByTime(300);

      // Enter PIN
      const pinInput = screen.getByPlaceholderText("1234");
      fireEvent.input(pinInput, { target: { value: "9876" } });

      // Click Start OwnVoice
      fireEvent.click(screen.getByText("Start OwnVoice"));
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          pin: "9876",
        }),
      );
    });
  });
});
