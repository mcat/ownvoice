import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { getCategories } from "../../data/phraseRegistry";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTheme } from "../../hooks/useTheme";

/** Hover-tint alpha suffix: "10" (~6%) base, "26" (~15%) in assistive mode. */
function hoverBgAlpha(assistive: boolean): string {
  return assistive ? "26" : "10";
}
function hoverBorderAlpha(assistive: boolean): string {
  return assistive ? "40" : "20";
}

/** Contrast-safe active label colors — verified >= 7:1 on #FFFFFF for AAA */
const ACTIVE_COLORS_LIGHT: Record<string, string> = {
  "#2563EB": "#1E40AF", // 8.59:1
  "#059669": "#065F46", // 7.83:1
  "#D97706": "#92400E", // 7.50:1
  "#DC2626": "#991B1B", // 8.13:1
  "#7C3AED": "#5B21B6", // 8.72:1
};

const ACTIVE_COLORS_DARK: Record<string, string> = {
  "#2563EB": "#60A5FA",
  "#059669": "#34D399",
  "#D97706": "#FBBF24",
  "#DC2626": "#FCA5A5",
  "#7C3AED": "#A78BFA",
};

/** "Say More" tab color — teal, distinct from all phrase category colors */
const SAY_MORE_COLOR = "#0891B2";

export function TabBar() {
  const { theme, t } = useTheme();
  const locale = useSettingsStore((s) => s.cfg?.patientLang ?? "en");
  const CATS = getCategories(locale);
  const tab = useUIStore((s) => s.tab);
  const builderOpen = useUIStore((s) => s.builderOpen);
  const setTab = useUIStore((s) => s.setTab);
  const openBuilder = useUIStore((s) => s.openBuilder);
  const assistive = useSettingsStore((s) => s.cfg?.assistiveInput === true);

  // Which tab, if any, is currently hovered by a mouse-like pointer
  // (trackball, joystick, AssistiveTouch cursor). Touch events never set this.
  const [hovered, setHovered] = useState<string | null>(null);
  const onEnter = (id: string) => (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHovered(id);
  };
  const onLeave = () => setHovered(null);

  // Say More active label: cyan-900 in light gives 8.5:1 on card bg for AAA
  const smLabelColor = builderOpen
    ? (theme === "dark" ? "#22D3EE" : "#164E63")
    : t.muted;

  return (
    // Bottom primary nav. Not a tablist (which would require arrow-key roving
    // tabindex per WAI-ARIA) — aria-current="page" carries the active state
    // semantically and natively plays well with all AT.
    <nav
      aria-label="Primary"
      style={{
        background: t.tabBg,
        borderTop: `1px solid ${t.border}`,
        display: "flex",
        justifyContent: "center",
        padding: "4px 32px",
        paddingBottom: "max(4px, env(safe-area-inset-bottom))",
        flexShrink: 0,
      }}
    >
      {CATS.map((c) => {
        const isActive = tab === c.id && !builderOpen;
        const isHovered = hovered === c.id && !isActive;
        const colorMap = theme === "dark" ? ACTIVE_COLORS_DARK : ACTIVE_COLORS_LIGHT;
        const labelColor = isActive ? (colorMap[c.color] ?? c.color) : t.muted;

        return (
          <Btn
            key={c.id}
            onClick={() => setTab(c.id)}
            onPointerEnter={onEnter(c.id)}
            onPointerLeave={onLeave}
            aria-current={isActive ? "page" : undefined}
            aria-label={c.label}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "8px 4px",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: isActive
                  ? c.color + "20"
                  : isHovered
                    ? c.color + hoverBgAlpha(assistive)
                    : "transparent",
                border: isActive
                  ? `2px solid ${c.color}40`
                  : isHovered
                    ? `2px solid ${c.color}${hoverBorderAlpha(assistive)}`
                    : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                transition: "all 0.15s",
              }}
            >
              {c.icon}
            </div>
            <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 600, color: labelColor }}>
              {c.label}
            </span>
          </Btn>
        );
      })}

      {/* Say More — Sentence Builder, visually distinct from phrase categories */}
      {(() => {
        const smHovered = hovered === "__saymore__" && !builderOpen;
        return (
      <Btn
        onClick={openBuilder}
        onPointerEnter={onEnter("__saymore__")}
        onPointerLeave={onLeave}
        aria-current={builderOpen ? "page" : undefined}
        aria-label="Say More"
        style={{
          flex: 1,
          background: "none",
          border: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "8px 4px",
          transition: "all 0.15s",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: builderOpen
              ? SAY_MORE_COLOR + "20"
              : smHovered
                ? SAY_MORE_COLOR + hoverBgAlpha(assistive)
                : "transparent",
            border: builderOpen
              ? `2px solid ${SAY_MORE_COLOR}40`
              : smHovered
                ? `2px solid ${SAY_MORE_COLOR}${hoverBorderAlpha(assistive)}`
                : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            transition: "all 0.15s",
          }}
        >
          {"\u270F\uFE0F"}
        </div>
        <span style={{ fontSize: 14, fontWeight: builderOpen ? 700 : 600, color: smLabelColor }}>
          Say More
        </span>
      </Btn>
        );
      })()}
    </nav>
  );
}
