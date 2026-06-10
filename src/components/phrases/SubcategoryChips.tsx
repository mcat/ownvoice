import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { useTheme } from "../../hooks/useTheme";
import { useSettingsStore } from "../../stores/settingsStore";
import type { ThemeTokens } from "../../theme/tokens";

interface SubcategoryChipsProps {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  t: ThemeTokens;
  /** Accessible name for the radiogroup. */
  ariaLabel?: string;
}

export function SubcategoryChips({
  labels,
  activeIndex,
  onSelect,
  t,
  ariaLabel,
}: SubcategoryChipsProps) {
  const { theme } = useTheme();
  const assistive = useSettingsStore((s) => s.cfg?.assistiveInput === true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const onEnter = (i: number) => (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHoveredIdx(i);
  };
  const onLeave = () => setHoveredIdx(null);

  // Hover tint — stronger in assistive mode.
  const hoverBg = assistive
    ? (theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)")
    : (theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? "Subcategory"}
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 16,
        overflowX: "auto",
        // overflowX:auto forces overflow-y:auto too, and this row is the
        // clip boundary for its chip children. Pad all four sides so focus
        // rings on the leftmost/rightmost chips aren't clipped.
        padding: 4,
      }}
    >
      {labels.map((label, i) => {
        const active = i === activeIndex;
        const hovered = hoveredIdx === i && !active;
        return (
          <Btn
            key={label}
            onClick={() => onSelect(i)}
            onPointerEnter={onEnter(i)}
            onPointerLeave={onLeave}
            role="radio"
            aria-checked={active}
            style={{
              background: active ? t.card : hovered ? hoverBg : "transparent",
              color: active ? t.text : t.sub,
              border: active
                ? `1px solid ${t.border}`
                : "1px solid transparent",
              borderRadius: 12,
              // Patient-facing selection chrome: 64px target floor + 18px
              // text (DESIGN_GUIDELINES §3.1/§4.1).
              padding: "16px 20px",
              minHeight: 64,
              fontSize: 18,
              fontWeight: active ? 700 : 500,
              whiteSpace: "nowrap",
              boxShadow: active
                ? (theme === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.06)")
                : "none",
              transition: "background 0.12s ease",
            }}
          >
            {label}
          </Btn>
        );
      })}
    </div>
  );
}
