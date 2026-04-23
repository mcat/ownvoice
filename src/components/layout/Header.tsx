import { useTheme } from "../../hooks/useTheme";
import { useUIStore } from "../../stores/uiStore";
import { useActivePatient } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { HeaderNav } from "./HeaderNav";
import type { AppSettings } from "../../types";

interface HeaderProps {
  cfg: AppSettings;
}

export function Header({ cfg }: HeaderProps) {
  const { theme, t } = useTheme();
  const openOverlay = useUIStore((s) => s.openOverlay);
  const active = useActivePatient();

  const handleSettings = () => {
    openOverlay(cfg.pin ? "pinEntry" : "settings");
  };

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const patientLang = active?.patientLang ?? "en";

  return (
    <header
      style={{
        background: "transparent",
        padding: "10px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span class="font-sans" style={{ fontSize: 17, fontWeight: 700, color: t.text }}>
          {active?.name || resolvePhrase("ui.patient.header.name_fallback", patientLang)}
        </span>
        {active?.bed && (
          <span style={{ fontSize: 13, fontWeight: 600, color: t.muted }}>
            {"\u00B7"} {resolvePhrase("ui.patient.header.bed_prefix", patientLang)}{active.bed}
          </span>
        )}
        {active?.hasVoice && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: blue,
              background: theme === "dark" ? "#1E3A5F" : "#EFF6FF",
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            {"\uD83C\uDFA4"}
          </span>
        )}
      </div>
      <HeaderNav onSettings={handleSettings} />
    </header>
  );
}
