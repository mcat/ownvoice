import { getContextualSuggestions, getKeyedContextualSuggestions } from "./suggestion-trees";
import type { SuggestionContextMessage } from "./suggestion-trees";
import { t as tt } from "./phraseRegistry";
import type { Message } from "../types";

const msg = (from: "patient" | "provider", text: string): Message => ({
  from,
  text,
  time: "12:00",
  label: text,
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

  it("returns generic continuations for unknown partial keys", async () => {
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
    const result = await getContextualSuggestions("i am in pain and need help", [], 12);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it("filters out redundant suggestions that already appear in the phrase", async () => {
    const result = await getContextualSuggestions("i am in pain please help me", [], 12);
    expect(result).not.toContain("please help me");
  });

  it("returns at most 8 suggestions", async () => {
    const result = await getContextualSuggestions("i am in pain and need help", [], 12);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("falls through to generic for phrases with no keyword matches", async () => {
    const result = await getContextualSuggestions("xyzzy nonsense", [], 12);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getKeyedContextualSuggestions — locale + key-based matching", () => {
  it("resolves curated suggestion text in the requested locale", async () => {
    const result = await getKeyedContextualSuggestions("", [], 23, "es");
    expect(result[0]).toEqual(
      expect.objectContaining({
        key: "suggest.ctx.night.cant_sleep",
        text: "No puedo dormir",
      }),
    );
  });

  it("matches a provider question by phrase key regardless of display language", async () => {
    // Thread text is whatever language the provider phrase displayed in —
    // the trigger must key off the PhraseKey, not English substrings.
    const messages: SuggestionContextMessage[] = [
      { from: "provider", text: "¿Cómo te sientes?", key: "provider.questions.feeling" },
    ];
    const result = await getKeyedContextualSuggestions("", messages, 12, "es");
    expect(result.map((r) => r.key)).toContain("suggest.ctx.feeling.i_feel");
    expect(
      result.find((r) => r.key === "suggest.ctx.feeling.i_feel")?.text,
    ).toBe("Me siento");
  });

  it("still matches provider questions by en text when no key is present", async () => {
    const messages: SuggestionContextMessage[] = [
      { from: "provider", text: "How are you feeling?" },
    ];
    const result = await getKeyedContextualSuggestions("", messages, 12);
    expect(result.map((r) => r.key)).toContain("suggest.ctx.feeling.i_feel");
  });

  it("localizes Layer-1 curated completions for keyed lookups", async () => {
    const result = await getKeyedContextualSuggestions("i need", [], 12, "es");
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      if (item.key) {
        expect(item.text).toBe(tt(item.key, "es"));
      }
    }
  });
});
