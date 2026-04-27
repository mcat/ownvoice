import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import type { FallbackVoice } from "../../types";
import { curateVoices, isEnhancedVoice } from "./voiceCuration";
import { getRecordingScript } from "../../data/recordingScripts";

/**
 * Short clinical fallback phrases per language. Used for locales where
 * we don't have a phonetically-balanced reference passage. English uses
 * the Rainbow Passage from `getRecordingScript("en")` instead — see
 * `getPreviewPhrase` below.
 */
const PREVIEW_PHRASES: Record<string, string> = {
  en: "Hello, I need some help please. Can you come here?",
  es: "Hola, necesito ayuda por favor.",
  zh: "你好，请帮帮我。",
  ar: "مرحبا، أحتاج مساعدة من فضلك.",
  fr: "Bonjour, j'ai besoin d'aide s'il vous plaît.",
  de: "Hallo, ich brauche bitte Hilfe.",
  hi: "नमस्ते, कृपया मेरी मदद करें।",
  pt: "Olá, preciso de ajuda por favor.",
  ko: "안녕하세요, 도와주세요.",
  ja: "すみません、助けてください。",
  vi: "Xin chào, tôi cần giúp đỡ.",
  tl: "Kumusta, kailangan ko ng tulong.",
  ru: "Здравствуйте, мне нужна помощь.",
};

/**
 * Pick the phrase to recite when previewing a backup voice.
 *
 * For locales where the recording-coaching script provides a phonetically-
 * balanced passage (currently English's Rainbow Passage), use it — that's
 * the same script the patient reads when capturing their voice clone, so
 * it gives a fair comparison of how the backup voice handles the full
 * range of English phonemes (sibilants, vowels, plosives) rather than
 * just the handful in a short greeting.
 *
 * For locales without a passage (no native-speaker review), fall back
 * to the short clinical phrase from `PREVIEW_PHRASES`.
 */
function getPreviewPhrase(langPrefix: string): string {
  const script = getRecordingScript(langPrefix);
  if (script.passage) return script.passage;
  return PREVIEW_PHRASES[langPrefix] ?? PREVIEW_PHRASES.en;
}

// Rainbow Passage runs ~14s at conversational pace; allow generous
// headroom for slow voices. Acts only as a safety net — the utterance's
// `onend` handler resolves the playing state when speech finishes
// naturally, which usually happens well before this fires.
const PREVIEW_MAX_MS = 25_000;

interface ColorTokens {
  text: string;
  sub: string;
  muted: string;
  border: string;
  cardBg: string;
}

const LIGHT_COLORS: ColorTokens = {
  text: "#1A1A1A",
  sub: "#374151", // 10.04:1 on #FFFFFF — AAA
  muted: "#4B5563", // 7.23:1 on #FFFFFF — AAA
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
};

interface FallbackVoicePickerProps {
  selectedVoice: FallbackVoice | null | undefined;
  onSelect: (voice: FallbackVoice | null) => void;
  lang: string;
  color?: ColorTokens;
}

export function FallbackVoicePicker({
  selectedVoice,
  onSelect,
  lang,
  color,
}: FallbackVoicePickerProps) {
  const c = color ?? LIGHT_COLORS;
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingURI, setPlayingURI] = useState<string | null>(null);
  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepalive = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(speechSynthesis.getVoices());
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cancelTimer.current) clearTimeout(cancelTimer.current);
      if (keepalive.current) clearInterval(keepalive.current);
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    };
  }, []);

  const langPrefix = lang.split("-")[0];
  const matching = voices.filter((v) => v.lang.startsWith(langPrefix));
  const displayVoices = matching.length > 0 ? matching : voices;

  const sorted = useMemo(
    () =>
      [...displayVoices].sort((a, b) => {
        if (a.localService !== b.localService) return a.localService ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [displayVoices],
  );

  // Split into curated buckets. `curateVoices` also drops novelty voices
  // (Bad News, Bells, Pipe Organ, etc.) that shouldn't be selectable as
  // an ICU patient's backup voice under any circumstances.
  //
  // Enhanced voices (neural / premium / Siri / cloud) sort to the top
  // within each bucket — when Samantha and Samantha (Enhanced) both
  // exist, the enhanced one should be what the user sees first.
  // Array.sort is stable, so the (localService, alphabetical) secondary
  // ordering from `sorted` above is preserved.
  const { recommended, other } = useMemo(() => {
    const byEnhancedFirst = (a: SpeechSynthesisVoice, b: SpeechSynthesisVoice) => {
      const aE = isEnhancedVoice(a);
      const bE = isEnhancedVoice(b);
      if (aE !== bE) return aE ? -1 : 1;
      return 0;
    };
    const buckets = curateVoices(sorted);
    return {
      recommended: [...buckets.recommended].sort(byEnhancedFirst),
      other: [...buckets.other].sort(byEnhancedFirst),
    };
  }, [sorted]);

  // When the OS reports no recommended voices (e.g. a minimal Android
  // install), we still want to show *something* — fall through and
  // render `other` as the primary list instead of an empty state.
  const hasRecommended = recommended.length > 0;
  const primaryList = hasRecommended ? recommended : other;
  const disclosureList = hasRecommended ? other : [];

  function stopKeepalive() {
    if (keepalive.current) {
      clearInterval(keepalive.current);
      keepalive.current = null;
    }
  }

  function preview(voice: SpeechSynthesisVoice) {
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    stopKeepalive();

    const phrase = getPreviewPhrase(langPrefix);
    const utt = new SpeechSynthesisUtterance(phrase);
    utt.voice = voice;
    utt.rate = 0.9;
    utt.volume = 1.0;

    utt.onend = () => {
      stopKeepalive();
      setPlayingURI(null);
    };
    utt.onerror = () => {
      stopKeepalive();
      setPlayingURI(null);
    };

    setPlayingURI(voice.voiceURI);

    // Clear any stuck queue, then speak.
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);

    // Chrome bug: long utterances silently freeze (no onend/onerror).
    // Safari doesn't have this bug — the nudge causes audible choppiness.
    const isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent);
    if (isChrome) {
      keepalive.current = setInterval(() => {
        if (speechSynthesis.speaking) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        } else {
          stopKeepalive();
        }
      }, 10_000);
    }

    // Safety net: cancel after PREVIEW_MAX_MS if the utterance doesn't
    // signal completion (Chrome bug where long utterances silently
    // freeze without onend/onerror firing). Natural completion via
    // utt.onend resolves much sooner — typically ~14s for the Rainbow
    // Passage at conversational pace, ~3s for the short fallback phrases.
    cancelTimer.current = setTimeout(() => {
      stopKeepalive();
      speechSynthesis.cancel();
      setPlayingURI(null);
    }, PREVIEW_MAX_MS);
  }

  function handleSelect(voice: SpeechSynthesisVoice) {
    preview(voice);
    onSelect({ voiceURI: voice.voiceURI, name: voice.name });
  }

  if (!("speechSynthesis" in window)) {
    return (
      <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>
        {resolvePhrase("ui.provider.fallback_voice.unavailable", caregiverLang)}
      </p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>
        {resolvePhrase("ui.provider.fallback_voice.loading", caregiverLang)}
      </p>
    );
  }

  function renderVoice(v: SpeechSynthesisVoice) {
    const isSelected = selectedVoice?.voiceURI === v.voiceURI;
    const isPlaying = playingURI === v.voiceURI;
    const enhanced = isEnhancedVoice(v);

    return (
      <div role="listitem" key={v.voiceURI}>
      <button
        onClick={() => handleSelect(v)}
        aria-pressed={isSelected}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 12,
          border: isSelected
            ? "2px solid #7C3AED"
            : `1px solid ${c.border}`,
          background: isSelected ? "#F5F3FF" : c.cardBg,
          minHeight: 64,
          cursor: "pointer",
          textAlign: "left",
          fontFamily:
            "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              fontSize: 16,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? "#7C3AED" : c.text,
            }}
          >
            <span>{v.name}</span>
            {enhanced && (
              <span
                aria-label={resolvePhrase("ui.provider.fallback_voice.enhanced_aria", caregiverLang)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#065F46",
                  background: "#D1FAE5",
                  border: "1px solid #047857",
                  borderRadius: 999,
                  padding: "2px 8px",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {resolvePhrase("ui.provider.fallback_voice.enhanced_badge", caregiverLang)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
            {v.lang}
            {v.localService ? ` · ${resolvePhrase("ui.provider.fallback_voice.on_device_badge", caregiverLang)}` : ""}
          </div>
        </div>
        {isPlaying && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#7C3AED",
              whiteSpace: "nowrap",
            }}
          >
            {resolvePhrase("ui.provider.fallback_voice.playing", caregiverLang)}
          </span>
        )}
        {isSelected && !isPlaying && (
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#7C3AED",
              lineHeight: 1,
            }}
          >
            {"✓"}
          </span>
        )}
      </button>
      </div>
    );
  }

  return (
    <div>
      <div
        role="list"
        aria-label={resolvePhrase(
          hasRecommended
            ? "ui.provider.fallback_voice.recommended_aria"
            : "ui.provider.fallback_voice.all_aria",
          caregiverLang,
        )}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 320,
          overflowY: "auto",
          padding: 4,
        }}
      >
        {primaryList.map(renderVoice)}
      </div>

      {disclosureList.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowOther((s) => !s)}
            aria-expanded={showOther}
            aria-controls="fallback-voice-other-list"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "none",
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              color: c.sub,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily:
                "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
              minHeight: 44,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 11 }}>
              {showOther ? "▼" : "▶"}
            </span>
            {showOther
              ? resolvePhrase("ui.provider.fallback_voice.hide_others", caregiverLang)
              : resolvePhrase("ui.provider.fallback_voice.more_voices", caregiverLang).replace("{n}", String(disclosureList.length))}
          </button>

          {showOther && (
            <div
              id="fallback-voice-other-list"
              role="list"
              aria-label={resolvePhrase("ui.provider.fallback_voice.other_aria", caregiverLang)}
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 320,
                overflowY: "auto",
                padding: 4,
              }}
            >
              {disclosureList.map(renderVoice)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
