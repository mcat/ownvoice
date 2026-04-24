import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { useSettingsStore } from "../../stores/settingsStore";
import type { Phrase } from "../../types";
import type { PhraseKey } from "../../data/locales/en";
import type { ThemeTokens } from "../../theme/tokens";

interface PhraseButtonProps {
  phrase: Phrase;
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
}

/** 64px+ touch target with icon + label. Single tap speaks the phrase.
 *  Hover tint only fires for pointerType === "mouse" so touch users
 *  don't see a brief hover flash on tap. AssistiveTouch cursors and
 *  USB/Bluetooth pointer devices (e.g. Pretorian trackballs) all report
 *  as "mouse", so they get the aiming feedback.
 *
 *  Assistive Input Mode amplifies the hover tint (more saturated border
 *  + stronger shadow) and stretches the post-tap "lit" highlight from
 *  500 ms to 1000 ms so patients with slow motor control can confirm
 *  what they selected before the visual clears. */
export function PhraseButton({ phrase, onTap, t }: PhraseButtonProps) {
  const [lit, setLit] = useState(false);
  const [hover, setHover] = useState(false);
  const assistiveInput = useSettingsStore((s) => s.cfg?.assistiveInput === true);

  const litMs = assistiveInput ? 1000 : 500;

  const handle = () => {
    setLit(true);
    if (phrase.key) onTap(phrase.text, { key: phrase.key });
    else onTap(phrase.text);
    setTimeout(() => setLit(false), litMs);
  };

  const onPointerEnter = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHover(true);
  };
  const onPointerLeave = () => setHover(false);

  // Hover intensity — stronger alpha on border, stronger shadow in assistive mode.
  const hoverBorder = assistiveInput ? "#2563EBCC" : "#2563EB66";
  const hoverShadow = assistiveInput
    ? "0 4px 14px rgba(37,99,235,0.22)"
    : "0 2px 8px rgba(37,99,235,0.12)";

  const borderColor = lit ? "#2563EB" : hover ? hoverBorder : t.border;
  const shadow = lit
    ? "0 4px 16px rgba(37,99,235,0.25)"
    : hover
      ? hoverShadow
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
