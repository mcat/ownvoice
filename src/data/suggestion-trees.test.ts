import { vi } from "vitest";

// We'll control the mock behavior per-test
const mockIsReady = vi.fn(() => false);
// Typed as Worker-like | null so per-test mockReturnValue calls with a worker
// shape type-check against the declared return.
const mockGetWorker = vi.fn<() => Worker | null>(() => null);

vi.mock("../models/modelManager", () => ({
  getModelManager: () => ({
    isReady: mockIsReady,
    getWorker: mockGetWorker,
  }),
}));

import {
  buildCompletionPrompt,
  extractPatientVocabulary,
  getContextualSuggestions,
  getLLMSuggestions,
} from "./suggestion-trees";
import type { Message } from "../types";

beforeEach(() => {
  mockIsReady.mockReturnValue(false);
  mockGetWorker.mockReturnValue(null);
});

const msg = (from: "patient" | "provider", text: string): Message => ({
  from,
  text,
  time: "12:00",
  label: text,
});

describe("buildCompletionPrompt", () => {
  it("returns a string containing the partial sentence", () => {
    const result = buildCompletionPrompt("i need", [], 10);
    expect(result).toContain('"i need"');
  });

  it("includes time-of-day context", () => {
    expect(buildCompletionPrompt("", [], 2)).toContain("nighttime");
    expect(buildCompletionPrompt("", [], 8)).toContain("morning");
    expect(buildCompletionPrompt("", [], 14)).toContain("afternoon");
    expect(buildCompletionPrompt("", [], 19)).toContain("evening");
    expect(buildCompletionPrompt("", [], 22)).toContain("nighttime");
  });

  it("includes recent conversation context when messages provided", () => {
    const messages: Message[] = [
      msg("provider", "How are you feeling?"),
      msg("patient", "I feel sick"),
    ];
    const result = buildCompletionPrompt("i need", messages, 10);
    expect(result).toContain("Recent conversation:");
    expect(result).toContain("Provider: How are you feeling?");
    expect(result).toContain("Patient: I feel sick");
  });

  it("omits conversation context when no messages", () => {
    const result = buildCompletionPrompt("hello", [], 10);
    expect(result).not.toContain("Recent conversation:");
  });

  it("uses at most the last 5 messages", () => {
    const messages: Message[] = Array.from({ length: 8 }, (_, i) =>
      msg("patient", `msg ${i}`),
    );
    const result = buildCompletionPrompt("", messages, 12);
    expect(result).not.toContain("msg 0");
    expect(result).not.toContain("msg 2");
    expect(result).toContain("msg 3");
    expect(result).toContain("msg 7");
  });
});

describe("getContextualSuggestions", () => {
  it("returns an array of strings", async () => {
    const result = await getContextualSuggestions("i need", [], 12);
    expect(Array.isArray(result)).toBe(true);
    for (const s of result) {
      expect(typeof s).toBe("string");
    }
  });

  it("returns base suggestions for known partial keys", async () => {
    const result = await getContextualSuggestions("i need", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("help");
    expect(result).toContain("water");
  });

  it("returns generic continuations for unknown partial keys (LLM not ready)", async () => {
    const result = await getContextualSuggestions("xyzzy nonsense", [], 12);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns starters for empty input during daytime", async () => {
    const result = await getContextualSuggestions("", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("I am");
    expect(result).toContain("I need");
  });

  it("returns nighttime starters between 20:00 and 06:00", async () => {
    const result = await getContextualSuggestions("", [], 23);
    expect(result[0]).toBe("I can't sleep");
  });

  it("returns morning starters between 06:00 and 10:00", async () => {
    const result = await getContextualSuggestions("", [], 8);
    expect(result).toContain("When is the doctor coming?");
  });

  it("responds to provider 'how are you' with feeling-related suggestions", async () => {
    const messages = [msg("provider", "How are you feeling?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("I feel");
    expect(result).toContain("I am");
  });

  it("responds to provider 'anything you need' with need-related suggestions", async () => {
    const messages = [msg("provider", "Is there anything you need?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("I need");
    expect(result).toContain("I want");
  });

  it("responds to provider 'where does it hurt' with body locations", async () => {
    const messages = [msg("provider", "Can you show me where it hurts?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("My head");
    expect(result).toContain("My chest");
  });

  it("responds to provider 'rate your pain' with pain-related suggestions", async () => {
    const messages = [msg("provider", "Can you rate your pain?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("It's very bad");
    expect(result).toContain("I need something for the pain");
  });

  it("responds to provider asking about 'pain' with pain suggestions", async () => {
    const messages = [msg("provider", "Tell me about the pain you're feeling")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("It's getting worse");
  });

  it("responds to provider 'comfortable' with comfort-related suggestions", async () => {
    const messages = [msg("provider", "Are you comfortable?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("I'm comfortable");
    expect(result).toContain("I can't sleep");
  });

  it("responds to provider asking about 'sleep' with comfort-related suggestions", async () => {
    const messages = [msg("provider", "How did you sleep last night?")];
    const result = await getContextualSuggestions("", messages, 12);
    expect(result).toContain("I can't sleep");
    expect(result).toContain("Can you adjust my bed?");
  });

  it("reranks base suggestions based on recent messages", async () => {
    const messages = [msg("patient", "I need help with water")];
    const result = await getContextualSuggestions("i need", messages, 12);
    expect(result.length).toBeGreaterThan(0);
    // "water" and "help" should be bumped toward the front because they appear in recent messages
    const waterIdx = result.indexOf("water");
    const helpIdx = result.indexOf("help");
    expect(waterIdx).toBeGreaterThanOrEqual(0);
    expect(helpIdx).toBeGreaterThanOrEqual(0);
  });

  it("returns nighttime starters at hour 3 (before 6am)", async () => {
    const result = await getContextualSuggestions("", [], 3);
    expect(result[0]).toBe("I can't sleep");
  });

  it("returns default starters for midday with no provider messages", async () => {
    const result = await getContextualSuggestions("", [], 14);
    expect(result).toContain("I am");
    expect(result).toContain("I need");
  });
});

// =============================================================================
// Deeper curated tree entries (Layer 1)
// =============================================================================
describe("getContextualSuggestions — deeper tree entries", () => {
  it("returns pain-specific suggestions for 'i am in pain'", async () => {
    const result = await getContextualSuggestions("i am in pain", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("please help me");
    expect(result).toContain("in my back");
  });

  it("returns help-specific suggestions for 'i need help'", async () => {
    const result = await getContextualSuggestions("i need help", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("getting up");
    expect(result).toContain("breathing");
  });

  it("returns status suggestions for 'i feel better'", async () => {
    const result = await getContextualSuggestions("i feel better", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("than before");
  });

  it("returns urgency suggestions for 'i feel worse'", async () => {
    const result = await getContextualSuggestions("i feel worse", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("than before");
    expect(result).toContain("I need the doctor");
  });
});

// =============================================================================
// Keyword-based contextual suggestions (Layer 1.5)
// =============================================================================
describe("getContextualSuggestions — keyword patterns", () => {
  it("returns contextual suggestions for phrases containing 'tired'", async () => {
    const result = await getContextualSuggestions("i am tired", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes("rest") || s.includes("sleep"))).toBe(true);
  });

  it("returns contextual suggestions for phrases containing 'lonely'", async () => {
    const result = await getContextualSuggestions("i feel lonely", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes("stay") || s.includes("family"))).toBe(true);
  });

  it("returns contextual suggestions for phrases containing 'cold'", async () => {
    const result = await getContextualSuggestions("i am cold", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes("blanket"))).toBe(true);
  });

  it("returns contextual suggestions for phrases containing 'scared'", async () => {
    const result = await getContextualSuggestions("i am scared", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes("stay") || s.includes("procedure"))).toBe(true);
  });

  it("returns contextual suggestions for phrases containing 'medication'", async () => {
    const result = await getContextualSuggestions("i want my medication", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes("please") || s.includes("now"))).toBe(true);
  });

  it("merges suggestions from multiple matching keyword patterns", async () => {
    // "pain" and "help" should both match
    const result = await getContextualSuggestions("i am in pain and need help", [], 12);
    expect(result.length).toBeGreaterThan(0);
    // Should have suggestions from both pain and help patterns
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("filters out redundant suggestions that already appear in the phrase", async () => {
    const result = await getContextualSuggestions("i am in pain please help me", [], 12);
    // "please help me" should be filtered out since it's already in the phrase
    expect(result).not.toContain("please help me");
  });

  it("returns at most 8 suggestions", async () => {
    // "pain" and "help" together have many suggestions
    const result = await getContextualSuggestions("i am in pain and need help", [], 12);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("falls through to generic for phrases with no keyword matches", async () => {
    const result = await getContextualSuggestions("xyzzy nonsense", [], 12);
    expect(result.length).toBeGreaterThan(0);
    // Should get generic continuations, not keyword-based
  });
});

// =============================================================================
// getContextualSuggestions — no longer calls LLM (LLM is separate)
// =============================================================================
describe("getContextualSuggestions — generic fallback", () => {
  it("falls back to generic continuations for unknown keys (LLM not used)", async () => {
    const result = await getContextualSuggestions("i really want to", [], 12);
    expect(result.length).toBeGreaterThan(0);
    // Should get generic continuations, not LLM results
  });
});

// =============================================================================
// getLLMSuggestions (dedicated LLM path)
// =============================================================================
describe("getLLMSuggestions", () => {
  it("returns completions from the LLM worker when ready", async () => {
    // Capture the requestId from postMessage and echo it in the reply so
    // the caller's id-filtered listener accepts the response.
    let capturedId: number | undefined;
    const mockWorkerObj = {
      postMessage: vi.fn((msg: { requestId?: number }) => {
        capturedId = msg.requestId;
      }),
      addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "completions", data: ["rest now", "go home"], requestId: capturedId },
          } as MessageEvent);
        }, 10);
      }),
      removeEventListener: vi.fn(),
    };

    mockIsReady.mockReturnValue(true);
    mockGetWorker.mockReturnValue(mockWorkerObj as unknown as Worker);

    const result = await getLLMSuggestions("i really want to", [], 12);
    expect(result).toEqual(["rest now", "go home"]);
    expect(mockWorkerObj.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "complete",
        partial: "i really want to",
        maxTokens: 64,
        requestId: expect.any(Number),
      }),
    );
  });

  it("returns empty array when LLM is not ready", async () => {
    mockIsReady.mockReturnValue(false);
    const result = await getLLMSuggestions("i need", [], 12);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", async () => {
    mockIsReady.mockReturnValue(true);
    const result = await getLLMSuggestions("", [], 12);
    expect(result).toEqual([]);
  });

  it("returns empty array when worker is null", async () => {
    mockIsReady.mockReturnValue(true);
    mockGetWorker.mockReturnValue(null);

    const result = await getLLMSuggestions("something", [], 12);
    expect(result).toEqual([]);
  });

  it("returns empty array when LLM worker returns an error", async () => {
    let capturedId: number | undefined;
    const mockWorkerObj = {
      postMessage: vi.fn((msg: { requestId?: number }) => {
        capturedId = msg.requestId;
      }),
      addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: { type: "error", message: "inference failed", requestId: capturedId },
          } as MessageEvent);
        }, 10);
      }),
      removeEventListener: vi.fn(),
    };

    mockIsReady.mockReturnValue(true);
    mockGetWorker.mockReturnValue(mockWorkerObj as unknown as Worker);

    const result = await getLLMSuggestions("something strange", [], 12);
    expect(result).toEqual([]);
  });

  it("ignores replies whose requestId does not match the caller", async () => {
    // A stale completion from a previous request must not resolve the
    // current getLLMSuggestions promise. This is the regression test for
    // the "rapid typing shows stale completions" bug.
    let capturedId: number | undefined;
    const mockWorkerObj = {
      postMessage: vi.fn((msg: { requestId?: number }) => {
        capturedId = msg.requestId;
      }),
      addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          // First fire a STALE reply with wrong id → must be ignored
          handler({
            data: { type: "completions", data: ["stale"], requestId: (capturedId ?? 0) - 1 },
          } as MessageEvent);
          // Then the real reply with matching id
          handler({
            data: { type: "completions", data: ["fresh"], requestId: capturedId },
          } as MessageEvent);
        }, 10);
      }),
      removeEventListener: vi.fn(),
    };

    mockIsReady.mockReturnValue(true);
    mockGetWorker.mockReturnValue(mockWorkerObj as unknown as Worker);

    const result = await getLLMSuggestions("a new partial", [], 12);
    expect(result).toEqual(["fresh"]);
  });

  it("sends the patient's recent unique phrases as priorPhrases", async () => {
    let captured: Record<string, unknown> | undefined;
    const mockWorkerObj = {
      postMessage: vi.fn((msg: Record<string, unknown>) => {
        captured = msg;
      }),
      addEventListener: vi.fn((_e: string, handler: (e: MessageEvent) => void) => {
        setTimeout(() => {
          handler({
            data: {
              type: "completions",
              data: ["ok"],
              requestId: captured?.requestId as number,
            },
          } as MessageEvent);
        }, 10);
      }),
      removeEventListener: vi.fn(),
    };

    mockIsReady.mockReturnValue(true);
    mockGetWorker.mockReturnValue(mockWorkerObj as unknown as Worker);

    const messages: Message[] = [
      msg("patient", "I am in pain"),
      msg("provider", "Where does it hurt?"),
      msg("patient", "In my back"),
      msg("patient", "I am in pain"), // duplicate, should dedup to most recent
      msg("patient", "I need suction"),
    ];
    await getLLMSuggestions("i feel", messages, 12);

    expect(captured).toBeDefined();
    const priorPhrases = captured!.priorPhrases as string[];
    // Most recent first, deduplicated, patient-only
    expect(priorPhrases).toEqual([
      "I need suction",
      "I am in pain",
      "In my back",
    ]);
    // Provider text must not appear
    expect(priorPhrases).not.toContain("Where does it hurt?");
  });
});

describe("extractPatientVocabulary", () => {
  it("returns patient-only phrases, most recent first", () => {
    const messages: Message[] = [
      msg("patient", "I am cold"),
      msg("provider", "Do you want a blanket?"),
      msg("patient", "Yes please"),
    ];
    expect(extractPatientVocabulary(messages, 8)).toEqual([
      "Yes please",
      "I am cold",
    ]);
  });

  it("deduplicates on normalized text (case and trailing punctuation)", () => {
    const messages: Message[] = [
      msg("patient", "I am in pain"),
      msg("patient", "I am in pain."),
      msg("patient", "i am in pain"),
      msg("patient", "I need help"),
    ];
    const result = extractPatientVocabulary(messages, 8);
    expect(result).toEqual(["I need help", "i am in pain"]);
  });

  it("caps at the requested limit", () => {
    const messages: Message[] = Array.from({ length: 20 }, (_, i) =>
      msg("patient", `phrase number ${i}`),
    );
    expect(extractPatientVocabulary(messages, 5)).toHaveLength(5);
  });

  it("drops phrases longer than 12 words to protect prompt budget", () => {
    const long = Array.from({ length: 15 }, () => "word").join(" ");
    const messages: Message[] = [
      msg("patient", "I need help"),
      msg("patient", long),
      msg("patient", "I am cold"),
    ];
    const result = extractPatientVocabulary(messages, 8);
    expect(result).toContain("I need help");
    expect(result).toContain("I am cold");
    expect(result).not.toContain(long);
  });

  it("returns an empty array for empty or provider-only history", () => {
    expect(extractPatientVocabulary([], 8)).toEqual([]);
    expect(
      extractPatientVocabulary(
        [msg("provider", "Hello"), msg("provider", "How are you?")],
        8,
      ),
    ).toEqual([]);
  });
});
