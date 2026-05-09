import { useTheme } from "../../hooks/useTheme";
import { useActivePatient, useSettingsStore } from "../../stores/settingsStore";
import { HeaderNav } from "./HeaderNav";
import { PatientPill } from "./PatientPill";
import { PatientVoiceStatus } from "./PatientVoiceStatus";
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
        paddingTop: "max(10px, var(--ov-safe-top))",
        paddingRight: "max(32px, var(--ov-safe-right))",
        paddingBottom: 10,
        paddingLeft: "max(32px, var(--ov-safe-left))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        {active && (
          <>
            <PatientPill
              patient={active}
              caregiverLang={caregiverLang}
              onEditPatient={onEditPatient}
              t={t}
              theme={theme}
            />
            <PatientVoiceStatus patient={active} />
          </>
        )}
      </div>
      <HeaderNav onOpenSettings={onOpenSettings} />
    </header>
  );
}
