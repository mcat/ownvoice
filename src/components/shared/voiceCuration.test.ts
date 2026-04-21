import { describe, it, expect } from "vitest";
import {
  isBlockedVoice,
  isRecommendedVoice,
  isEnhancedVoice,
  curateVoices,
} from "./voiceCuration";

function v(
  name: string,
  voiceURI: string = name.toLowerCase().replace(/\s+/g, "-"),
  lang: string = "en-US",
  localService: boolean = true,
): SpeechSynthesisVoice {
  return { name, voiceURI, lang, localService, default: false } as SpeechSynthesisVoice;
}

describe("voiceCuration — isBlockedVoice", () => {
  it("blocks Apple novelty voices by exact name", () => {
    expect(isBlockedVoice(v("Bad News"))).toBe(true);
    expect(isBlockedVoice(v("Bells"))).toBe(true);
    expect(isBlockedVoice(v("Bubbles"))).toBe(true);
    expect(isBlockedVoice(v("Cellos"))).toBe(true);
    expect(isBlockedVoice(v("Zarvox"))).toBe(true);
    expect(isBlockedVoice(v("Whisper"))).toBe(true);
    expect(isBlockedVoice(v("Hysterical"))).toBe(true);
  });

  it("blocks retro robotic Apple voices", () => {
    // Pre-neural voices that sound robotic by modern standards
    expect(isBlockedVoice(v("Albert"))).toBe(true);
    expect(isBlockedVoice(v("Fred"))).toBe(true);
    expect(isBlockedVoice(v("Ralph"))).toBe(true);
    expect(isBlockedVoice(v("Junior"))).toBe(true);
  });

  it("blocks Apple 'personality' voices (caricatured timbres)", () => {
    // These land in the "More voices" disclosure by default because they
    // pass the blocklist but aren't on the recommended list. Clinicians
    // shouldn't be offered them at all.
    expect(isBlockedVoice(v("Aaron"))).toBe(true);
    expect(isBlockedVoice(v("Arthur"))).toBe(true);
    expect(isBlockedVoice(v("Eddy"))).toBe(true);
    expect(isBlockedVoice(v("Flo"))).toBe(true);
    expect(isBlockedVoice(v("Grandma"))).toBe(true);
    expect(isBlockedVoice(v("Grandpa"))).toBe(true);
    expect(isBlockedVoice(v("Nathan"))).toBe(true);
    expect(isBlockedVoice(v("Reed"))).toBe(true);
    expect(isBlockedVoice(v("Rocko"))).toBe(true);
    expect(isBlockedVoice(v("Sandy"))).toBe(true);
    expect(isBlockedVoice(v("Shelley"))).toBe(true);
  });

  it("blocks Microsoft SAPI-4 / Vista-era voices by prefix", () => {
    expect(isBlockedVoice(v("Microsoft Sam"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft Sam - English (United States)"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft Mike"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft Mary"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft Anna - English (United States)"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft LH Michael"))).toBe(true);
    expect(isBlockedVoice(v("Microsoft LH Michelle"))).toBe(true);
  });

  it("Microsoft blocklist matches on word boundary, not substring", () => {
    // If a "Microsoft Samuel" voice ever shipped, it would NOT share a
    // root with blocked "Microsoft Sam" — boundary check is load-bearing.
    expect(isBlockedVoice(v("Microsoft Samuel"))).toBe(false);
    expect(isBlockedVoice(v("Microsoft Samantha"))).toBe(false);
    // Only Microsoft-prefixed names hit the root matcher; an Apple
    // "Sam" would be blocked by exact-name match via BLOCKED_VOICE_NAMES
    // if we ever added it, but the root matcher itself doesn't fire.
  });

  it("blocks 'Pipe Organ' with varied whitespace / casing", () => {
    expect(isBlockedVoice(v("Pipe Organ"))).toBe(true);
    expect(isBlockedVoice(v("pipe organ"))).toBe(true);
    expect(isBlockedVoice(v("Pipe  Organ"))).toBe(true); // double space
  });

  it("does NOT block normal human-name voices", () => {
    expect(isBlockedVoice(v("Samantha"))).toBe(false);
    expect(isBlockedVoice(v("Daniel"))).toBe(false);
    expect(isBlockedVoice(v("Google US English"))).toBe(false);
    expect(isBlockedVoice(v("Microsoft Aria Online (Natural) - English"))).toBe(false);
  });
});

describe("voiceCuration — isRecommendedVoice", () => {
  it("recommends known high-quality Apple voices by name", () => {
    expect(isRecommendedVoice(v("Samantha"))).toBe(true);
    expect(isRecommendedVoice(v("Alex"))).toBe(true);
    expect(isRecommendedVoice(v("Daniel"))).toBe(true);
    expect(isRecommendedVoice(v("Siri"))).toBe(true);
  });

  it("recommends Apple voices in non-English locales", () => {
    expect(isRecommendedVoice(v("Monica", "monica", "es-ES"))).toBe(true);
    expect(isRecommendedVoice(v("Amélie", "amelie", "fr-CA"))).toBe(true);
    expect(isRecommendedVoice(v("Yuna", "yuna", "ko-KR"))).toBe(true);
  });

  it("recommends Apple Enhanced variants (parenthetical suffix stripped)", () => {
    // Apple's enhanced voices appear as e.g. "Samantha (Enhanced)"
    expect(isRecommendedVoice(v("Samantha (Enhanced)"))).toBe(true);
    expect(isRecommendedVoice(v("Daniel (Premium)"))).toBe(true);
    expect(isRecommendedVoice(v("Ava (Siri Voice 1)"))).toBe(true);
  });

  it("recommends ALL Google Chrome voices via the 'Google ' prefix rule", () => {
    expect(isRecommendedVoice(v("Google US English"))).toBe(true);
    expect(isRecommendedVoice(v("Google UK English Female"))).toBe(true);
    expect(isRecommendedVoice(v("Google español"))).toBe(true);
    expect(isRecommendedVoice(v("Google 日本語"))).toBe(true);
  });

  it("recommends Microsoft voices via prefix match (not exact name)", () => {
    // Chrome/Edge report Microsoft voices with "Desktop"/"Mobile" +
    // locale suffixes. The prefix matcher on MICROSOFT_RECOMMENDED_ROOTS
    // catches them; exact-name matching would not.
    expect(isRecommendedVoice(v("Microsoft David Desktop - English (United States)"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Zira Desktop - English (United States)"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Mark - English (United States)"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Hazel Desktop - English (Great Britain)"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Haruka Desktop - Japanese"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Huihui Desktop - Chinese (Simplified)"))).toBe(true);
    // Exact "Microsoft David" (no suffix) also works.
    expect(isRecommendedVoice(v("Microsoft David"))).toBe(true);
  });

  it("Microsoft recommend matches on word boundary", () => {
    // "Microsoft Davidson" shouldn't be recommended via the "David" root.
    expect(isRecommendedVoice(v("Microsoft Davidson"))).toBe(false);
    // Unknown Microsoft voices fall through to "other", not "blocked".
    expect(isRecommendedVoice(v("Microsoft SomeUnknownVoice"))).toBe(false);
  });

  it("does NOT recommend unknown / unvetted voices", () => {
    expect(isRecommendedVoice(v("SomeRandomVoice"))).toBe(false);
    expect(isRecommendedVoice(v("eSpeak"))).toBe(false);
  });
});

describe("voiceCuration — isEnhancedVoice", () => {
  it("tags voices with (Enhanced) / (Premium) / (Siri ...) in the name", () => {
    expect(isEnhancedVoice(v("Samantha (Enhanced)"))).toBe(true);
    expect(isEnhancedVoice(v("Daniel (Premium)"))).toBe(true);
    expect(isEnhancedVoice(v("Ava (Siri Voice 1)"))).toBe(true);
  });

  it("tags Microsoft neural / online voices by name", () => {
    expect(isEnhancedVoice(v("Microsoft Aria Online (Natural) - English (United States)"))).toBe(true);
    expect(isEnhancedVoice(v("AriaNeural"))).toBe(true);
  });

  it("tags voices whose voiceURI marks them as premium / siri / neural", () => {
    expect(isEnhancedVoice(v("Samantha", "com.apple.voice.compact.siri.Aaron.en-US"))).toBe(true);
    expect(isEnhancedVoice(v("Something", "com.apple.voice.premium.en-US.Samantha"))).toBe(true);
    expect(isEnhancedVoice(v("Something", "Microsoft-AriaNeural"))).toBe(true);
  });

  it("tags ALL Google Chrome voices as enhanced (all server-neural)", () => {
    expect(isEnhancedVoice(v("Google US English"))).toBe(true);
    expect(isEnhancedVoice(v("Google UK English Female"))).toBe(true);
  });

  it("does NOT tag plain local Apple voices as enhanced", () => {
    // "Samantha" alone, no (Enhanced) suffix, no Siri URI — just the
    // stock compact Samantha, which is NOT the enhanced variant.
    expect(isEnhancedVoice(v("Samantha", "com.apple.voice.compact.Samantha.en-US"))).toBe(false);
    expect(isEnhancedVoice(v("Daniel", "com.apple.voice.compact.Daniel.en-GB"))).toBe(false);
  });
});

describe("voiceCuration — curateVoices", () => {
  it("drops blocked voices; splits the rest into recommended / other", () => {
    const input = [
      v("Samantha"),              // recommended
      v("Bad News"),              // blocked — dropped
      v("Google US English"),     // recommended (Google prefix)
      v("SomeRandomVoice"),       // other
      v("Pipe Organ"),            // blocked — dropped
      v("Daniel (Enhanced)"),     // recommended (parenthetical stripped)
    ];
    const { recommended, other } = curateVoices(input);

    const names = (arr: SpeechSynthesisVoice[]) => arr.map((x) => x.name);
    expect(names(recommended).sort()).toEqual(
      ["Daniel (Enhanced)", "Google US English", "Samantha"].sort(),
    );
    expect(names(other)).toEqual(["SomeRandomVoice"]);
  });

  it("returns empty buckets when given an empty input", () => {
    expect(curateVoices([])).toEqual({ recommended: [], other: [] });
  });

  it("preserves the input order within each bucket", () => {
    const input = [v("Tom"), v("Samantha"), v("Daniel")];
    const { recommended } = curateVoices(input);
    expect(recommended.map((x) => x.name)).toEqual(["Tom", "Samantha", "Daniel"]);
  });
});
