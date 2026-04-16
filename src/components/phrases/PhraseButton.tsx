import { useState } from "preact/hooks";
import { Btn } from "../shared/Btn";
import type { Phrase } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseButtonProps {
  phrase: Phrase;
  onTap: (text: string) => void;
  t: ThemeTokens;
}

/** 64px+ touch target with icon + label. Single tap speaks the phrase. */
export function PhraseButton({ phrase, onTap, t }: PhraseButtonProps) {
  const [lit, setLit] = useState(false);

  const handle = () => {
    setLit(true);
    onTap(phrase.text);
    setTimeout(() => setLit(false), 500);
  };

  return (
    <Btn
      onClick={handle}
      aria-label={phrase.text}
      style={{
        background: lit ? "#2563EB" : t.card,
        color: lit ? "#FFF" : t.text,
        border: `1.5px solid ${lit ? "#2563EB" : t.border}`,
        borderRadius: 18,
        padding: "14px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 100,
        boxShadow: lit
          ? "0 4px 16px rgba(37,99,235,0.25)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.12s ease",
        animation: "fadeUp 0.25s ease-out backwards",
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }}>{phrase.icon}</span>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.35,
        }}
      >
        {phrase.text}
      </span>
    </Btn>
  );
}
