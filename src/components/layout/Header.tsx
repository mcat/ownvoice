import { useTheme } from "../../hooks/useTheme";
import { useActivePatient, useSettingsStore } from "../../stores/settingsStore";
import { HeaderNav } from "./HeaderNav";
import { PatientPill } from "./PatientPill";
import type { AppSettings } from "../../types";

interface HeaderProps {
  cfg: AppSettings;
  onOpenSettings: () => void;
  onEditPatient: () => void;
}

export function Header({ onOpenSettings, onEditPatient }: HeaderProps) {
  const { theme, t } = useTheme();
  const active = useActivePatient();
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

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
        {active && (
          <PatientPill
            patient={active}
            caregiverLang={caregiverLang}
            onEditPatient={onEditPatient}
            t={t}
            theme={theme}
          />
        )}
      </div>
      <HeaderNav onOpenSettings={onOpenSettings} />
    </header>
  );
}
