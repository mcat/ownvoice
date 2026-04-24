import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import type { PhraseKey } from "../../data/locales/en";

interface SuggestionChipProps {
  text: string;
  /** Optional registry key. When present, speak path uses it to resolve the
   *  caregiverLang text (voice-direction model). Omit for free-text chips. */
  phraseKey?: PhraseKey;
  onTap: (text: string, opts?: { key?: PhraseKey }) => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/**
 * Time-of-day quick-tap chip on the Quick tab.
 * Extracted into its own component so it inherits Btn (tremor debounce,
 * assistive-mode debounce extension) and gains hover feedback gated on
 * pointerType === "mouse". Amplified hover/border in assistive mode.
 */
export function SuggestionChip({ text, phraseKey, onTap, t, theme }: SuggestionChipProps) {
  const [hover, setHover] = useState(false);
  const assistive = useSettingsStore((s) => s.cfg?.assistiveInput === true);
  const isDark = theme === "dark";

  const onPointerEnter = (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHover(true);
  };
  const onPointerLeave = () => setHover(false);

  const baseBorder = isDark ? "#60A5FA30" : "#2563EB30";
  const hoverBorder = assistive
    ? (isDark ? "#60A5FA99" : "#2563EB99")
    : (isDark ? "#60A5FA66" : "#2563EB66");
  const hoverBg = assistive
    ? (isDark ? "rgba(96,165,250,0.10)" : "rgba(37,99,235,0.07)")
    : (isDark ? "rgba(96,165,250,0.05)" : "rgba(37,99,235,0.03)");

  return (
    <Btn
      onClick={() => (phraseKey ? onTap(text, { key: phraseKey }) : onTap(text))}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      class="font-sans"
      style={{
        background: hover ? hoverBg : t.card,
        border: `1.5px solid ${hover ? hoverBorder : baseBorder}`,
        borderRadius: 10,
        padding: "10px 16px",
        fontSize: 16,
        // Patient blue text: darker shade for AAA 7:1 on card bg
        color: isDark ? "#60A5FA" : "#1E40AF",
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
        transition: "background 0.12s ease, border-color 0.12s ease",
      }}
    >
      {text}
    </Btn>
  );
}
