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
const OVERLAY_BUTTONS: readonly { overlay: OverlayName; icon: string }[] = [
  { overlay: "wishes", icon: ICONS.wishes },
  { overlay: "listen", icon: ICONS.listen },
  { overlay: "provider", icon: ICONS.provider },
];

function btnStyle(t: ThemeTokens, icon: string) {
  return {
    background: t.activeBg,
    color: t.sub,
    border: "none",
    borderRadius: 14,
    width: 44,
    height: 44,
    fontSize: icon === ICONS.provider ? 16 : 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

interface HeaderNavProps {
  onSettings: () => void;
}

export function HeaderNav({ onSettings }: HeaderNavProps) {
  const { theme, toggle: onToggleTheme, isAuto, t } = useTheme();
  const openOverlay = useUIStore((s) => s.openOverlay);

  const themeIcon = isAuto ? ICONS.auto : theme === "light" ? ICONS.light : ICONS.dark;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Btn key="theme" onClick={onToggleTheme} style={btnStyle(t, themeIcon)}>
        {themeIcon}
      </Btn>
      {OVERLAY_BUTTONS.map(({ overlay, icon }) => (
        <Btn key={overlay} onClick={() => openOverlay(overlay)} style={btnStyle(t, icon)}>
          {icon}
        </Btn>
      ))}
      <Btn key="settings" onClick={onSettings} style={btnStyle(t, ICONS.settings)}>
        {ICONS.settings}
      </Btn>
    </div>
  );
}
