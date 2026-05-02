import { t } from "./phraseRegistry";
import type { PhraseKey } from "./locales/en";

describe("voice_quality phrase keys", () => {
  const keys: PhraseKey[] = [
    "ui.voice_quality.title",
    "ui.voice_quality.label.good",
    "ui.voice_quality.label.ok",
    "ui.voice_quality.label.poor",
    "ui.voice_quality.tip.snr",
    "ui.voice_quality.tip.clipping",
    "ui.voice_quality.tip.coverage",
    "ui.voice_quality.tip.voiced_fraction",
    "ui.voice_quality.tip.pitch_variation",
    "ui.voice_quality.tip.loudness",
    "ui.voice_quality.tip.tilt_boomy",
    "ui.voice_quality.tip.tilt_tinny",
  ];
  for (const k of keys) {
    it(`resolves ${k} for en`, () => {
      const value = t(k, "en");
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    });
  }
});
