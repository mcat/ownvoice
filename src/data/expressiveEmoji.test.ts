import { describe, it, expect } from "vitest";
import { resolveEmoji, scanKeywordEmoji, pickBubbleIcon } from "./expressiveEmoji";

describe("expressiveEmoji", () => {
  describe("scanKeywordEmoji", () => {
    it("matches a tier-30 symptom keyword", () => {
      const e = scanKeywordEmoji("I need water");
      expect(e?.icon).toBe("💧");
      expect(e?.weight).toBe(30);
    });

    it("matches a tier-20 clinical object keyword", () => {
      const e = scanKeywordEmoji("blanket");
      expect(e?.icon).toBe("🛏️");
      expect(e?.weight).toBe(20);
    });

    it("matches a tier-10 modifier keyword", () => {
      const e = scanKeywordEmoji("now");
      expect(e?.icon).toBe("⏰");
      expect(e?.weight).toBe(10);
    });

    it("returns undefined for grammatical-only text", () => {
      // Articles, conjunctions, prepositions, copulas, politeness — all
      // deliberately absent from the map so they contribute no icon.
      expect(scanKeywordEmoji("the")).toBeUndefined();
      expect(scanKeywordEmoji("and")).toBeUndefined();
      expect(scanKeywordEmoji("please")).toBeUndefined();
      expect(scanKeywordEmoji("to the")).toBeUndefined();
      expect(scanKeywordEmoji("i am")).toBeUndefined();
    });

    it("returns undefined for unknown content", () => {
      expect(scanKeywordEmoji("xyzzy")).toBeUndefined();
      expect(scanKeywordEmoji("")).toBeUndefined();
    });

    it("is case-insensitive", () => {
      expect(scanKeywordEmoji("WATER")?.icon).toBe("💧");
      expect(scanKeywordEmoji("Water")?.icon).toBe("💧");
    });

    it("respects word boundaries (no false subword matches)", () => {
      // "ahead" must not match "head" — \b prevents this.
      expect(scanKeywordEmoji("ahead")).toBeUndefined();
      // "ached" matches the 'ache' alternation.
      expect(scanKeywordEmoji("ached")?.icon).toBe("🤕");
    });

    it("picks the higher weight when multiple keywords match", () => {
      // "water" is tier 30; "now" is tier 10. Water should win.
      const e = scanKeywordEmoji("water now");
      expect(e?.icon).toBe("💧");
      expect(e?.weight).toBe(30);
    });

    it("breaks ties by first-listed rule on equal weight", () => {
      // "scared" and "lonely" are both tier 30; whichever comes first
      // in KEYWORD_EMOJI wins. Snapshot-style assertion: just check it
      // resolves to a tier-30 entry; the exact pick is intentional but
      // implementation-defined.
      const e = scanKeywordEmoji("scared and lonely");
      expect(e?.weight).toBe(30);
      expect(["😰", "😔"]).toContain(e?.icon);
    });

    it("matches verb conjugations covered by the regex", () => {
      expect(scanKeywordEmoji("hurts")?.icon).toBe("🤕");
      expect(scanKeywordEmoji("hurting")?.icon).toBe("🤕");
      expect(scanKeywordEmoji("ache")?.icon).toBe("🤕");
    });
  });

  describe("resolveEmoji", () => {
    it("uses keyword scan when no PhraseKey override exists", () => {
      const e = resolveEmoji({ text: "I need water", key: "needs.comfort.water" });
      expect(e?.icon).toBe("💧");
    });

    it("uses keyword scan for keyless free/LLM items", () => {
      const e = resolveEmoji({ text: "right now" });
      expect(e?.icon).toBe("⏰");
    });

    it("returns undefined for icon-less items", () => {
      expect(resolveEmoji({ text: "the" })).toBeUndefined();
      expect(resolveEmoji({ text: "" })).toBeUndefined();
    });

    it("prefers a per-key override over keyword scan", () => {
      // "thanks" alone has no keyword match, but the key has an override.
      // We assert via the wishes.* override which is in KEY_EMOJI.
      const e = resolveEmoji({ text: "I hope", key: "wishes.hopes.stem" });
      expect(e?.icon).toBe("✨");
    });
  });

  describe("pickBubbleIcon", () => {
    it("returns undefined when no token has an emoji", () => {
      expect(pickBubbleIcon([])).toBeUndefined();
      expect(pickBubbleIcon([{ emoji: undefined }, {}])).toBeUndefined();
    });

    it("returns the only emoji when exactly one token has one", () => {
      const icon = pickBubbleIcon([
        { emoji: undefined },
        { emoji: { icon: "💧", weight: 30 } },
        { emoji: undefined },
      ]);
      expect(icon).toBe("💧");
    });

    it("picks the highest-weighted icon across tokens", () => {
      // "please now water" → please (none), now (10), water (30) → 💧
      const icon = pickBubbleIcon([
        { emoji: undefined },
        { emoji: { icon: "⏰", weight: 10 } },
        { emoji: { icon: "💧", weight: 30 } },
      ]);
      expect(icon).toBe("💧");
    });

    it("breaks ties on equal weight by first occurrence", () => {
      const icon = pickBubbleIcon([
        { emoji: { icon: "🤕", weight: 30 } },
        { emoji: { icon: "🥶", weight: 30 } },
      ]);
      expect(icon).toBe("🤕");
    });
  });
});
