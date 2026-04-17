import { useState, useEffect, useRef } from "preact/hooks";
import { Btn } from "../shared/Btn";
import {
  getContextualSuggestions,
  getLLMSuggestions,
} from "../../data/suggestion-trees";
import { polishSentence } from "../../utils/polishSentence";
import type { Message } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";

interface SentenceBuilderProps {
  onSend: (text: string) => void;
  t: ThemeTokens;
  theme: ThemeName;
  messages: Message[];
}

export function SentenceBuilder({
  onSend,
  t,
  theme,
  messages,
}: SentenceBuilderProps) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [llmSuggestions, setLlmSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingLlm, setLoadingLlm] = useState(false);
  // Bumped when the user taps the AI refresh button — forces the LLM
  // effect below to refire and produce a new sampled set.
  const [llmRefreshNonce, setLlmRefreshNonce] = useState(0);
  const requestIdRef = useRef(0);
  const llmRequestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const key = text.toLowerCase().trim();
  const hour = new Date().getHours();
  const hasText = text.trim().length > 0;
  const shownSuggestions = suggestions.slice(0, 8);

  // Filter LLM suggestions that duplicate curated ones
  const curatedLower = new Set(shownSuggestions.map((s) => s.toLowerCase()));
  const shownLlm = llmSuggestions
    .filter((s) => !curatedLower.has(s.toLowerCase()))
    .slice(0, 8);

  // Fetch curated/keyword suggestions when text or messages change
  useEffect(() => {
    const id = ++requestIdRef.current;
    let cancelled = false;

    setLoadingSuggestions(true);
    getContextualSuggestions(key, messages, hour).then((results) => {
      if (cancelled || requestIdRef.current !== id) return;
      setSuggestions(results);
      setLoadingSuggestions(false);
    });

    return () => {
      cancelled = true;
    };
  }, [key, messages, hour]);

  // Fetch LLM suggestions after a short debounce so rapid typing doesn't
  // flood the worker queue (each keystroke would otherwise fire its own
  // request; 6-letter word = 6 requests stacking up, 3-5s apiece, blowing
  // past the 8s timeout). Refresh button taps are treated as an immediate
  // fire by bumping `llmRefreshNonce` and letting the debounce apply.
  useEffect(() => {
    const id = ++llmRequestIdRef.current;
    let cancelled = false;

    if (!key) {
      setLlmSuggestions([]);
      setLoadingLlm(false);
      return;
    }

    setLoadingLlm(true);
    const debounce = setTimeout(() => {
      if (cancelled) return;
      getLLMSuggestions(key, messages, hour).then((results) => {
        if (cancelled || llmRequestIdRef.current !== id) return;
        setLlmSuggestions(results);
        setLoadingLlm(false);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [key, messages, hour, llmRefreshNonce]);

  function addWord(word: string) {
    setText((prev) => (prev.trim() ? prev.trimEnd() + " " + word : word));
  }

  function undoLast() {
    setText((prev) => {
      const trimmed = prev.trimEnd();
      const lastSpace = trimmed.lastIndexOf(" ");
      return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace);
    });
  }

  function clearAll() {
    setText("");
    inputRef.current?.focus();
  }

  function handleSpeak() {
    const polished = polishSentence(text);
    if (!polished) return;
    onSend(polished);
    setText("");
  }

  // --- Colors ---
  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const llmAccent = theme === "dark" ? "#A78BFA" : "#7C3AED";

  const noSuggestions =
    shownSuggestions.length === 0 && shownLlm.length === 0 && hasText;

  return (
    <div style={{ padding: 16, animation: "fadeUp 0.25s ease-out backwards" }}>
      {/* Text input — editable via keyboard or suggestion taps */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px 4px 16px",
          background: t.card,
          borderRadius: 12,
          border: `2px solid ${hasText ? blue : t.border}`,
          marginBottom: 16,
          minHeight: 56,
          transition: "border-color 0.15s ease",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onInput={(e) => setText((e.target as HTMLInputElement).value)}
          placeholder="Tap words below or type..."
          style={{
            flex: 1,
            fontSize: 20,
            fontFamily: "inherit",
            color: t.text,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: "12px 0",
            lineHeight: 1.4,
            minWidth: 0,
          }}
          aria-label="Your message"
        />

        {hasText && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Btn
              onClick={undoLast}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.activeBg,
                color: t.text,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              aria-label="Undo last word"
            >
              &#x2190;
            </Btn>
            <Btn
              onClick={clearAll}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.activeBg,
                color: t.text,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              aria-label="Clear message"
            >
              &#x2715;
            </Btn>
          </div>
        )}
      </div>

      {/* Curated suggestion pills */}
      {shownSuggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap" as const,
              gap: 8,
            }}
          >
            {shownSuggestions.map((word) => (
              <Btn
                key={word}
                onClick={() => addWord(word)}
                style={{
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 500,
                  color: t.text,
                  background: t.card,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  lineHeight: 1.3,
                }}
              >
                {word}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/* LLM suggestion row — header + refresh button are always shown when
          the user is typing so they can re-sample on demand. Pills appear
          once the model returns results; an "AI is thinking…" hint fills
          the pill area while a request is in flight. */}
      {hasText && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: llmAccent,
                background:
                  theme === "dark"
                    ? "rgba(167,139,250,0.12)"
                    : "rgba(124,58,237,0.08)",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              AI
            </span>
            <Btn
              onClick={() => setLlmRefreshNonce((n) => n + 1)}
              disabled={loadingLlm}
              aria-label="Refresh AI suggestions"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                padding: 0,
                color: llmAccent,
                background: "transparent",
                border: `1px solid ${
                  theme === "dark"
                    ? "rgba(167,139,250,0.25)"
                    : "rgba(124,58,237,0.2)"
                }`,
                borderRadius: 8,
                cursor: loadingLlm ? "not-allowed" : "pointer",
                opacity: loadingLlm ? 0.5 : 1,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                style={{
                  animation: loadingLlm ? "spin 0.9s linear infinite" : "none",
                }}
              >
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M3 21v-5h5" />
              </svg>
            </Btn>
          </div>
          {shownLlm.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap" as const,
                gap: 8,
              }}
            >
              {shownLlm.map((word) => (
                <Btn
                  key={`llm-${word}`}
                  onClick={() => addWord(word)}
                  style={{
                    padding: "10px 16px",
                    fontSize: 16,
                    fontWeight: 500,
                    color: t.text,
                    background: t.card,
                    border: `1px solid ${
                      theme === "dark"
                        ? "rgba(167,139,250,0.25)"
                        : "rgba(124,58,237,0.2)"
                    }`,
                    borderRadius: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {word}
                </Btn>
              ))}
            </div>
          ) : loadingLlm ? (
            <div style={{ color: llmAccent, fontSize: 14 }}>
              AI is thinking...
            </div>
          ) : (
            <div style={{ color: t.muted, fontSize: 14 }}>
              No AI suggestions. Tap refresh to try again.
            </div>
          )}
        </div>
      )}

      {/* No suggestions at all — hint */}
      {noSuggestions && !loadingSuggestions && !loadingLlm && (
        <div
          style={{
            padding: 16,
            color: t.muted,
            fontSize: 16,
            textAlign: "center" as const,
            marginBottom: 16,
          }}
        >
          Your message is ready. Tap Speak to send.
        </div>
      )}

      {/* Speak button */}
      <Btn
        onClick={handleSpeak}
        disabled={!hasText}
        style={{
          width: "100%",
          padding: "14px 20px",
          fontSize: 18,
          fontWeight: 700,
          color: hasText ? "#FFFFFF" : t.muted,
          background: hasText ? blue : t.activeBg,
          border: hasText ? "none" : `1px solid ${t.border}`,
          borderRadius: 12,
          minHeight: 48,
          transition: "background 0.15s ease, color 0.15s ease",
        }}
      >
        Speak
      </Btn>
    </div>
  );
}
