import { Btn } from "../shared/Btn";
import { useUIStore, type OverlayName } from "../../stores/uiStore";
import { useTheme } from "../../hooks/useTheme";
import type { ThemeTokens } from "../../theme/tokens";

const ICONS = {
  auto: "\uD83C\uDF13",
  light: "\uD83C\uDF19",
  dark: "\u2600\uFE0F",
  wishes: "\u2764\uFE0F",
  listen: "\uD83D\uDC42",
  provider: "\uD83D\uDC69\u200D\u2695\uFE0F",
  settings: "\u2699\uFE0F",
} as const;

// Overlay button definitions live at module scope — identity never changes
// across renders, so React/Preact reuses the same array reference.
const OVERLAY_BUTTONS: readonly { overlay: OverlayName; icon: string; label: string }[] = [
  { overlay: "wishes", icon: ICONS.wishes, label: "Wishes" },
  { overlay: "listen", icon: ICONS.listen, label: "Listen" },
  { overlay: "provider", icon: ICONS.provider, label: "Staff" },
];

function btnStyle(t: ThemeTokens, icon: string) {
  return {
    background: t.activeBg,
    color: t.sub,
    border: "none",
    borderRadius: 14,
    width: 64,
    height: 64,
    padding: 0,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    lineHeight: 1,
    fontSize: icon === ICONS.provider ? 20 : 22,
  };
}

function labelStyle(t: ThemeTokens) {
  return {
    fontSize: 11,
    fontWeight: 600,
    color: t.sub,
    letterSpacing: 0.1,
  };
}

interface HeaderNavProps {
  onSettings: () => void;
}

export function HeaderNav({ onSettings }: HeaderNavProps) {
  const { theme, toggle: onToggleTheme, isAuto, t } = useTheme();
  const openOverlay = useUIStore((s) => s.openOverlay);

  const themeIcon = isAuto ? ICONS.auto : theme === "light" ? ICONS.light : ICONS.dark;
  const themeLabel = isAuto ? "Auto" : theme === "light" ? "Light" : "Dark";

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Btn key="theme" onClick={onToggleTheme} aria-label={`Theme: ${themeLabel}`} style={btnStyle(t, themeIcon)}>
        <span>{themeIcon}</span>
        <span style={labelStyle(t)}>{themeLabel}</span>
      </Btn>
      {OVERLAY_BUTTONS.map(({ overlay, icon, label }) => (
        <Btn key={overlay} onClick={() => openOverlay(overlay)} aria-label={label} style={btnStyle(t, icon)}>
          <span>{icon}</span>
          <span style={labelStyle(t)}>{label}</span>
        </Btn>
      ))}
      <Btn key="settings" onClick={onSettings} aria-label="Settings" style={btnStyle(t, ICONS.settings)}>
        <span>{ICONS.settings}</span>
        <span style={labelStyle(t)}>Settings</span>
      </Btn>
    </div>
  );
}
