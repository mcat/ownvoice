import { Btn } from "../shared/Btn";
import { useUIStore } from "../../stores/uiStore";
import { useTheme } from "../../hooks/useTheme";

interface HeaderNavProps {
  onSettings: () => void;
}

export function HeaderNav({ onSettings }: HeaderNavProps) {
  const { theme, toggle: onToggleTheme, isAuto, t } = useTheme();
  const openOverlay = useUIStore((s) => s.openOverlay);

  const buttons = [
    {
      icon: isAuto ? "\uD83C\uDF13" : theme === "light" ? "\uD83C\uDF19" : "\u2600\uFE0F",
      onClick: onToggleTheme,
    },
    { icon: "\u2764\uFE0F", onClick: () => openOverlay("wishes") },
    { icon: "\uD83D\uDC42", onClick: () => openOverlay("listen") },
    { icon: "\uD83D\uDC69\u200D\u2695\uFE0F", onClick: () => openOverlay("provider") },
    { icon: "\u2699\uFE0F", onClick: onSettings },
  ];

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {buttons.map(({ icon, onClick }, i) => (
        <Btn
          key={i}
          onClick={onClick}
          style={{
            background: t.activeBg,
            color: t.sub,
            border: "none",
            borderRadius: 14,
            width: 44,
            height: 44,
            fontSize: icon === "\uD83D\uDC69\u200D\u2695\uFE0F" ? 16 : 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Btn>
      ))}
    </div>
  );
}
