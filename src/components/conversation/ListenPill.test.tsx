import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/preact";
import { ListenPill } from "./ListenPill";
import { light } from "../../theme/tokens";

// Mock the orchestrator hook so the component is tested in isolation.
const session = {
  state: { phase: "idle" } as const,
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  editSentence: vi.fn(),
  discardSentence: vi.fn(),
  tryAgain: vi.fn(),
  reset: vi.fn(),
};
vi.mock("../../hooks/useListenSession", () => ({
  useListenSession: () => session,
}));

// Mock composeThread so we can assert split-on-add behavior.
const composeThread = vi.fn();
vi.mock("../../hooks/useSpeakActions", () => ({
  useSpeakActions: () => ({ composeThread }),
}));

// Reactive readiness gate. Each test that needs to flip STT to "not
// warm" overrides this before render.
let sttWarm = true;
vi.mock("../../hooks/useModels", () => ({
  useModels: () => ({
    isWarm: (id: string) => (id === "stt" ? sttWarm : false),
    isReady: () => true,
    isLoading: () => false,
    getError: () => undefined,
    progress: [],
    initialized: true,
    secondsLeft: () => undefined,
    humanCountdown: () => null,
    isAlmostReady: () => false,
    totalProgress: () => ({ loaded: 0, total: 0 }),
  }),
}));

beforeEach(() => {
  session.start.mockClear();
  session.stop.mockClear();
  session.reset.mockClear();
  session.tryAgain.mockClear();
  composeThread.mockClear();
  (session.state as any) = { phase: "idle" };
  sttWarm = true;
});

describe("ListenPill", () => {
  it("renders the idle pill with the 'Listen' label", () => {
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    expect(screen.getByRole("button", { name: /^listen$/i })).toBeTruthy();
  });

  it("shows the privacy notice in idle state", () => {
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    expect(screen.getByText(/no audio leaves this device/i)).toBeTruthy();
  });

  it("hides the privacy notice while recording", () => {
    (session.state as any) = { phase: "recording", elapsedMs: 1000, level: 0.3 };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    expect(screen.queryByText(/no audio leaves this device/i)).toBeNull();
  });

  it("calls start() when idle pill is tapped", async () => {
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^listen$/i }));
    });
    expect(session.start).toHaveBeenCalledOnce();
  });

  it("calls stop() when recording pill is tapped", async () => {
    (session.state as any) = { phase: "recording", elapsedMs: 1000, level: 0.3 };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /tap to stop/i }));
    });
    expect(session.stop).toHaveBeenCalledOnce();
  });

  it("shows the silence countdown banner in the final 5s", () => {
    (session.state as any) = {
      phase: "recording",
      elapsedMs: 26_000,
      level: 0,
      silenceCountdownMs: 4000,
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    expect(screen.getByText(/auto-stopping in 4s/i)).toBeTruthy();
  });

  it("on Add, emits one composeThread per remaining draft sentence", () => {
    (session.state as any) = {
      phase: "draft",
      sessionId: 1,
      error: null,
      transcribing: null,
      sentences: [
        { id: "a", text: "First sentence.", chunkIndex: 0 },
        { id: "b", text: "Second sentence.", chunkIndex: 0 },
      ],
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /add as dr\. patel/i }));
    expect(composeThread).toHaveBeenCalledTimes(2);
    expect(composeThread).toHaveBeenNthCalledWith(1, "First sentence.", {
      from: "provider",
      providerLabel: "Dr. Patel",
      via: "mic",
    });
    expect(composeThread).toHaveBeenNthCalledWith(2, "Second sentence.", {
      from: "provider",
      providerLabel: "Dr. Patel",
      via: "mic",
    });
    expect(session.reset).toHaveBeenCalledOnce();
  });

  it("on Discard, resets without emitting any composeThread", () => {
    (session.state as any) = {
      phase: "draft",
      sessionId: 1,
      error: null,
      transcribing: null,
      sentences: [{ id: "a", text: "X.", chunkIndex: 0 }],
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    fireEvent.click(screen.getByRole("button", { name: /^discard$/i }));
    expect(composeThread).not.toHaveBeenCalled();
    expect(session.reset).toHaveBeenCalledOnce();
  });

  it("disables Add while transcribing", () => {
    (session.state as any) = {
      phase: "draft",
      sessionId: 1,
      error: null,
      transcribing: { done: 1, total: 3 },
      sentences: [{ id: "a", text: "X.", chunkIndex: 0 }],
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    const btn = screen.getByRole("button", { name: /add as/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("disables the idle pill and swaps the hint when STT is not warm", () => {
    sttWarm = false;
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    const btn = screen.getByRole("button", { name: /engine not yet ready/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    // Privacy notice is replaced with the not-ready hint.
    expect(screen.queryByText(/no audio leaves this device/i)).toBeNull();
    expect(screen.getByText(/engine not yet ready/i)).toBeTruthy();
  });

  it("does not call start() when tapped while STT is not warm", async () => {
    sttWarm = false;
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    const btn = screen.getByRole("button", { name: /engine not yet ready/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(session.start).not.toHaveBeenCalled();
  });

  it("renders the error banner with a Try again button when draft.error is set", () => {
    (session.state as any) = {
      phase: "draft",
      sessionId: 1,
      error: "decoder crashed",
      transcribing: null,
      sentences: [{ id: "a", text: "First.", chunkIndex: 0 }],
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/couldn't transcribe/i)).toBeTruthy();
    const tryBtn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(tryBtn);
    expect(session.tryAgain).toHaveBeenCalledOnce();
  });

  it("with error + some sentences, ✓ Add stays enabled (doesn't strand the user)", () => {
    (session.state as any) = {
      phase: "draft",
      sessionId: 1,
      error: "partial failure",
      transcribing: null,
      sentences: [{ id: "a", text: "Got this one.", chunkIndex: 0 }],
    };
    render(<ListenPill providerName="Dr. Patel" language="en" t={light} />);
    const btn = screen.getByRole("button", { name: /add as/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
