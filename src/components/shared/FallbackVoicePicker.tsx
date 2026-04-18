import { useState, useEffect, useRef } from "preact/hooks";
import type { FallbackVoice } from "../../types";

/**
 * Sample phrases per language — used for the 3-second voice preview.
 */
const PREVIEW_PHRASES: Record<string, string> = {
  en: "Hello, I need some help please. Can you come here?",
  es: "Hola, necesito ayuda por favor.",
  zh: "\u4F60\u597D\uFF0C\u8BF7\u5E2E\u5E2E\u6211\u3002",
  ar: "\u0645\u0631\u062D\u0628\u0627\u060C \u0623\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0645\u0646 \u0641\u0636\u0644\u0643.",
  fr: "Bonjour, j'ai besoin d'aide s'il vous pla\u00EEt.",
  de: "Hallo, ich brauche bitte Hilfe.",
  hi: "\u0928\u092E\u0938\u094D\u0924\u0947, \u0915\u0943\u092A\u092F\u093E \u092E\u0947\u0930\u0940 \u092E\u0926\u0926 \u0915\u0930\u0947\u0902\u0964",
  pt: "Ol\u00E1, preciso de ajuda por favor.",
  ko: "\uC548\uB155\uD558\uC138\uC694, \uB3C4\uC640\uC8FC\uC138\uC694.",
  ja: "\u3059\u307F\u307E\u305B\u3093\u3001\u52A9\u3051\u3066\u304F\u3060\u3055\u3044\u3002",
  vi: "Xin ch\u00E0o, t\u00F4i c\u1EA7n gi\u00FAp \u0111\u1EE1.",
  tl: "Kumusta, kailangan ko ng tulong.",
  ru: "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435, \u043C\u043D\u0435 \u043D\u0443\u0436\u043D\u0430 \u043F\u043E\u043C\u043E\u0449\u044C.",
};

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playingURI, setPlayingURI] = useState<string | null>(null);
  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepalive = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const sorted = [...displayVoices].sort((a, b) => {
    if (a.localService !== b.localService) return a.localService ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  function stopKeepalive() {
    if (keepalive.current) {
      clearInterval(keepalive.current);
      keepalive.current = null;
    }
  }

  function preview(voice: SpeechSynthesisVoice) {
    if (cancelTimer.current) clearTimeout(cancelTimer.current);
    stopKeepalive();

    const phrase = PREVIEW_PHRASES[langPrefix] ?? PREVIEW_PHRASES.en;
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

    // Auto-stop after 3 seconds
    cancelTimer.current = setTimeout(() => {
      stopKeepalive();
      speechSynthesis.cancel();
      setPlayingURI(null);
    }, 3000);
  }

  function handleSelect(voice: SpeechSynthesisVoice) {
    preview(voice);
    onSelect({ voiceURI: voice.voiceURI, name: voice.name });
  }

  if (!("speechSynthesis" in window)) {
    return (
      <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>
        System voices are not available on this device.
      </p>
    );
  }

  if (sorted.length === 0) {
    return (
      <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>
        Loading available voices...
      </p>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 320,
          overflowY: "auto",
          // Clearance for focus outline on edge items
          padding: 4,
        }}
      >
        {sorted.map((v) => {
          const isSelected = selectedVoice?.voiceURI === v.voiceURI;
          const isPlaying = playingURI === v.voiceURI;

          return (
            <button
              key={v.voiceURI}
              onClick={() => handleSelect(v)}
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
                    fontSize: 16,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "#7C3AED" : c.text,
                  }}
                >
                  {v.name}
                </div>
                <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
                  {v.lang}
                  {v.localService ? " \u00B7 On-device" : ""}
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
                  Playing...
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
                  {"\u2713"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
