import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { Btn } from "../shared/Btn";
import { getKeyedContextualSuggestions } from "../../data/suggestion-trees";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey, SuggestionItem } from "../../data/phraseRegistry";
import { resolveEmoji, scanKeywordEmoji, pickBubbleIcon, type EmojiEntry } from "../../data/expressiveEmoji";
import { useActivePatient, useSettingsStore } from "../../stores/settingsStore";
import { useKeyboardInsets } from "../../hooks/useKeyboardInsets";
import { polishSentence } from "../../utils/polishSentence";
import type { SuggestionContextMessage } from "../../data/suggestion-trees";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";

// ── Token model ─────────────────────────────────────────────────

export type Token =
  | { kind: "key"; key: PhraseKey; emoji?: EmojiEntry }   // From a curated suggestion chip tap
  | { kind: "free"; text: string; emoji?: EmojiEntry };   // From keyboard typing or keyless chip

interface SentenceBuilderProps {
  onSend: (text: string, opts?: { gloss?: string; icon?: string }) => void;
  t: ThemeTokens;
  theme: ThemeName;
  messages: readonly SuggestionContextMessage[];
}

/** Resolve a token array + pending free text into a single string in the
 *  given locale. Key tokens resolve via the phrase registry; free tokens
 *  pass through as-is. */
function resolveTokens(tokens: Token[], pendingFree: string, locale: string): string {
  const parts = tokens.map((tok) =>
    tok.kind === "key" ? resolvePhrase(tok.key, locale) : tok.text,
  );
  if (pendingFree) parts.push(pendingFree);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// ── Component ───────────────────────────────────────────────────

export function SentenceBuilder({ onSend, t, theme, messages }: SentenceBuilderProps) {
  const patientLang = useActivePatient()?.patientLang ?? "en";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const { keyboardHeight } = useKeyboardInsets();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [pendingFree, setPendingFree] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const displaySentence = useMemo(
    () => resolveTokens(tokens, pendingFree, patientLang),
    [tokens, pendingFree, patientLang],
  );

  // The curated suggestion tree is keyed in English (the tree data is
  // deliberately hardcoded-English so the structure is reviewable; text
  // is localized at render time via each item's PhraseKey). Build the
  // lookup key in English from the same tokens so traversal works when
  // patientLang ≠ en.
  const key = useMemo(
    () => resolveTokens(tokens, pendingFree, "en").toLowerCase().trim(),
    [tokens, pendingFree],
  );
  const hour = new Date().getHours();
  const hasText = displaySentence.length > 0;
  const shownSuggestions = suggestions.slice(0, 8);

  // Fetch curated/keyword suggestions. Lookup stays English-keyed (see
  // comment above); patientLang resolves the DISPLAY text of curated
  // results so a Spanish patient sees Spanish chips.
  useEffect(() => {
    const id = ++requestIdRef.current;
    let cancelled = false;
    setLoadingSuggestions(true);
    getKeyedContextualSuggestions(key, messages, hour, patientLang).then((results) => {
      if (cancelled || requestIdRef.current !== id) return;
      setSuggestions(results);
      setLoadingSuggestions(false);
    });
    return () => { cancelled = true; };
  }, [key, messages, hour, patientLang]);

  /** Flush pendingFree into a token and return the new tokens array. */
  function flushPending(): Token[] {
    const trimmed = pendingFree.trim();
    if (!trimmed) return tokens;
    const emoji = scanKeywordEmoji(trimmed);
    const next = [...tokens, { kind: "free" as const, text: trimmed, emoji }];
    setTokens(next);
    setPendingFree("");
    return next;
  }

  function addKeyedChip(item: SuggestionItem) {
    const base = flushPending();
    const emoji = resolveEmoji(item);
    const tok: Token = item.key
      ? { kind: "key", key: item.key, emoji }
      : { kind: "free", text: item.text, emoji };
    setTokens([...base, tok]);
  }

  function undoLast() {
    if (pendingFree) {
      const trimmed = pendingFree.trimEnd();
      const idx = trimmed.lastIndexOf(" ");
      setPendingFree(idx === -1 ? "" : trimmed.slice(0, idx));
    } else {
      setTokens((prev) => prev.slice(0, -1));
    }
  }

  function clearAll() {
    setTokens([]);
    setPendingFree("");
    inputRef.current?.focus();
  }

  function handleSpeak() {
    const patientText = polishSentence(resolveTokens(tokens, pendingFree, patientLang));
    if (!patientText) return;
    const caregiverText = polishSentence(resolveTokens(tokens, pendingFree, caregiverLang));
    const gloss = patientText !== caregiverText ? caregiverText : undefined;
    // Build a token list that includes any unflushed pendingFree so its
    // emoji can win the bubble pick — without this, a patient who hits
    // Speak mid-typing loses any icon their final word would contribute.
    const trimmedPending = pendingFree.trim();
    const finalTokens: Token[] = trimmedPending
      ? [...tokens, { kind: "free", text: trimmedPending, emoji: scanKeywordEmoji(trimmedPending) }]
      : tokens;
    const icon = pickBubbleIcon(finalTokens);
    const opts: { gloss?: string; icon?: string } = {};
    if (gloss) opts.gloss = gloss;
    if (icon) opts.icon = icon;
    onSend(patientText, Object.keys(opts).length ? opts : undefined);
    setTokens([]);
    setPendingFree("");
  }

  function handleBlur() {
    const trimmed = pendingFree.trim();
    if (trimmed) {
      const emoji = scanKeywordEmoji(trimmed);
      setTokens((prev) => [...prev, { kind: "free", text: trimmed, emoji }]);
      setPendingFree("");
    }
  }

  // --- Colors ---
  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const noSuggestions = shownSuggestions.length === 0 && hasText;

  // Patient-facing controls: 64px floor (DESIGN_GUIDELINES §3.1).
  const smallBtnStyle = {
    width: 64, height: 64, borderRadius: 12, border: `1px solid ${t.border}`,
    background: t.activeBg, color: t.text, fontSize: 24,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  } as const;

  const pillStyle = {
    padding: "12px 20px", fontSize: 18, fontWeight: 500, color: t.text,
    background: t.card, border: `1px solid ${t.border}`, borderRadius: 12,
    lineHeight: 1.3, minHeight: 64,
  } as const;

  return (
    <div
      style={{
        padding: 16,
        // Lift the suggestion pills above the on-screen keyboard. App.tsx
        // root is `height: 100dvh; overflow: hidden`, so iPadOS can't
        // auto-scroll the focused input into view — adding the keyboard
        // height as bottom padding gives the internal scroll container
        // room to bring the input above the keyboard fold.
        paddingBottom: 16 + keyboardHeight,
        animation: "fadeUp 0.25s ease-out backwards",
      }}
    >
      {/* Input row: token display + free-text input */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "4px 8px 4px 16px", background: t.card, borderRadius: 12,
        border: `2px solid ${hasText ? blue : t.border}`,
        marginBottom: 16, minHeight: 56, transition: "border-color 0.15s ease",
      }}>
        {tokens.length > 0 && (
          <span style={{
            fontSize: 20, fontFamily: "inherit", color: t.text,
            lineHeight: 1.4, whiteSpace: "pre", flexShrink: 0,
          }} data-testid="token-display">
            {tokens.map((tok) =>
              tok.kind === "key" ? resolvePhrase(tok.key, patientLang) : tok.text,
            ).join(" ")}{" "}
          </span>
        )}
        <input
          ref={inputRef} type="text" value={pendingFree}
          onInput={(e) => setPendingFree((e.target as HTMLInputElement).value)}
          onBlur={handleBlur}
          placeholder={tokens.length === 0 ? resolvePhrase("ui.patient.builder.placeholder", patientLang) : ""}
          style={{
            flex: 1, fontSize: 20, fontFamily: "inherit", color: t.text,
            background: "transparent", border: "none", outline: "none",
            padding: "12px 0", lineHeight: 1.4, minWidth: 0,
          }}
          aria-label={resolvePhrase("ui.patient.builder.message_aria", patientLang)}
        />
        {hasText && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Btn onClick={undoLast} style={smallBtnStyle}
              aria-label={resolvePhrase("ui.patient.builder.undo", patientLang)}>&#x2190;</Btn>
            <Btn onClick={clearAll} style={smallBtnStyle}
              aria-label={resolvePhrase("ui.patient.builder.clear", patientLang)}>&#x2715;</Btn>
          </div>
        )}
      </div>

      {/* Curated suggestion pills */}
      {shownSuggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {shownSuggestions.map((item) => {
              const emoji = resolveEmoji(item);
              const label = item.key ? resolvePhrase(item.key, patientLang) : item.text;
              return (
                <Btn key={item.text} onClick={() => addKeyedChip(item)} style={pillStyle}>
                  {emoji ? `${label} ${emoji.icon}` : label}
                </Btn>
              );
            })}
          </div>
        </div>
      )}

      {/* No suggestions hint */}
      {noSuggestions && !loadingSuggestions && (
        <div style={{ padding: 16, color: t.muted, fontSize: 16, textAlign: "center" as const, marginBottom: 16 }}>
          {resolvePhrase("ui.patient.builder.ready", patientLang)}
        </div>
      )}

      {/* Speak button */}
      <Btn onClick={handleSpeak} disabled={!hasText} style={{
        width: "100%", padding: "14px 20px", fontSize: 18, fontWeight: 700,
        color: hasText ? "#FFFFFF" : t.muted, background: hasText ? blue : t.activeBg,
        border: hasText ? "none" : `1px solid ${t.border}`, borderRadius: 12,
        minHeight: 64, transition: "background 0.15s ease, color 0.15s ease",
      }}>
        {resolvePhrase("ui.patient.builder.speak", patientLang)}
      </Btn>
    </div>
  );
}
