import { Btn } from "../shared/Btn";
import { getCategories } from "../../data/phraseRegistry";
import { useUIStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useTheme } from "../../hooks/useTheme";

/** Contrast-safe active label colors — verified >= 4.5:1 on both backgrounds */
const ACTIVE_COLORS_LIGHT: Record<string, string> = {
  "#2563EB": "#1D4ED8",
  "#059669": "#047857",
  "#D97706": "#92400E",
  "#DC2626": "#991B1B",
  "#7C3AED": "#6D28D9",
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

  const smLabelColor = builderOpen
    ? (theme === "dark" ? "#22D3EE" : "#0E7490")
    : t.muted;

  return (
    <div
      role="tablist"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: t.tabBg,
        borderTop: `1px solid ${t.border}`,
        display: "flex",
        justifyContent: "center",
        padding: "8px 32px",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        zIndex: 40,
      }}
    >
      {CATS.map((c) => {
        const isActive = tab === c.id && !builderOpen;
        const colorMap = theme === "dark" ? ACTIVE_COLORS_DARK : ACTIVE_COLORS_LIGHT;
        const labelColor = isActive ? (colorMap[c.color] ?? c.color) : t.muted;

        return (
          <Btn
            key={c.id}
            onClick={() => setTab(c.id)}
            role="tab"
            aria-selected={isActive}
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
                background: isActive ? c.color + "20" : "transparent",
                border: isActive
                  ? `2px solid ${c.color}40`
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
            {/* Structural indicator — visible without color */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isActive ? labelColor : "transparent",
                transition: "background 0.15s",
              }}
            />
          </Btn>
        );
      })}

      {/* Say More — Sentence Builder, visually distinct from phrase categories */}
      <Btn
        onClick={openBuilder}
        role="tab"
        aria-selected={builderOpen}
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
            background: builderOpen ? SAY_MORE_COLOR + "20" : "transparent",
            border: builderOpen
              ? `2px solid ${SAY_MORE_COLOR}40`
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
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: builderOpen ? smLabelColor : "transparent",
            transition: "background 0.15s",
          }}
        />
      </Btn>
    </div>
  );
}
