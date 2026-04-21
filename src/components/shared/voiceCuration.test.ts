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

  it("recommends curated Microsoft neural voices", () => {
    expect(isRecommendedVoice(v("Microsoft Aria"))).toBe(true);
    expect(isRecommendedVoice(v("Microsoft Jenny"))).toBe(true);
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
