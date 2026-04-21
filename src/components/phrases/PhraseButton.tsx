import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import type { Phrase } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseButtonProps {
  phrase: Phrase;
  onTap: (text: string) => void;
  t: ThemeTokens;
}

/** 64px+ touch target with icon + label. Single tap speaks the phrase.
 *  Hover tint only fires for pointerType === "mouse" so touch users
 *  don't see a brief hover flash on tap. AssistiveTouch cursors and
 *  USB/Bluetooth pointer devices (e.g. Pretorian trackballs) all report
 *  as "mouse", so they get the aiming feedback. */
export function PhraseButton({ phrase, onTap, t }: PhraseButtonProps) {
  const [lit, setLit] = useState(false);
  const [hover, setHover] = useState(false);

  const handle = () => {
    setLit(true);
    onTap(phrase.text);
    setTimeout(() => setLit(false), 500);
  };

  const onPointerEnter = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHover(true);
  };
  const onPointerLeave = () => setHover(false);

  const borderColor = lit ? "#2563EB" : hover ? "#2563EB66" : t.border;
  const shadow = lit
    ? "0 4px 16px rgba(37,99,235,0.25)"
    : hover
      ? "0 2px 8px rgba(37,99,235,0.12)"
      : "0 1px 3px rgba(0,0,0,0.04)";

  return (
    <Btn
      onClick={handle}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-label={phrase.text}
      style={{
        background: lit ? "#2563EB" : t.card,
        color: lit ? "#FFF" : t.text,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 18,
        padding: "14px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: "100%",
        boxShadow: shadow,
        transition: "all 0.12s ease",
        animation: "fadeUp 0.25s ease-out backwards",
      }}
    >
      <span style={{ fontSize: 40, lineHeight: 1 }}>{phrase.icon}</span>
      <span
        style={{
          fontSize: 18,
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
