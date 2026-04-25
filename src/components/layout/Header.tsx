import { useTheme } from "../../hooks/useTheme";
import { useActivePatient, useSettingsStore } from "../../stores/settingsStore";
import { HeaderNav } from "./HeaderNav";
import { PatientPill } from "./PatientPill";
import type { AppSettings } from "../../types";

interface HeaderProps {
  cfg: AppSettings;
  onSettings: () => void;
  onSwitchPatient: () => void;
  onEditPatient: () => void;
  staffAuthed: boolean;
  onEndStaffSession: () => void;
}

export function Header({
  onSettings,
  onSwitchPatient,
  onEditPatient,
  staffAuthed,
  onEndStaffSession,
}: HeaderProps) {
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
      <HeaderNav
        onSettings={onSettings}
        onSwitchPatient={onSwitchPatient}
        staffAuthed={staffAuthed}
        onEndStaffSession={onEndStaffSession}
      />
    </header>
  );
}
