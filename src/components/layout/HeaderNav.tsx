import { Btn } from "../shared/Btn";
import { useUIStore, type OverlayName } from "../../stores/uiStore";
import { useSettingsStore, useActivePatient } from "../../stores/settingsStore";
import { useTheme } from "../../hooks/useTheme";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import type { ThemeTokens } from "../../theme/tokens";

const ICONS = {
  auto: "🌓",
  light: "🌙",
  dark: "☀️",
  wishes: "❤️",
  listen: "👂",
  provider: "👩‍⚕️",
  // Locked-with-key — distinct from the provider 👩‍⚕️ used by the patient-
  // facing Care Team button. Signals "behind PIN gate".
  staff: "🔐",
} as const;

// Overlay button definitions live at module scope — identity never changes
// across renders, so React/Preact reuses the same array reference.
const OVERLAY_BUTTONS: readonly { overlay: OverlayName; icon: string; labelKey: PhraseKey; usePatientLang?: boolean }[] = [
  { overlay: "wishes", icon: ICONS.wishes, labelKey: "ui.dual.nav.wishes", usePatientLang: true },
  { overlay: "listen", icon: ICONS.listen, labelKey: "ui.dual.nav.listen", usePatientLang: true },
  { overlay: "provider", icon: ICONS.provider, labelKey: "ui.provider.nav.staff" },
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
  /**
   * Single staff entry point. Replaces the previous trio (Patients,
   * Settings, End Session) with a PIN-gated Staff button that opens the
   * StaffSheet — keeps the patient-facing nav focused on Wishes / Listen /
   * Care Team / Theme.
   */
  onOpenStaff: () => void;
}

export function HeaderNav({ onOpenStaff }: HeaderNavProps) {
  const { theme, toggle: onToggleTheme, isAuto, t } = useTheme();
  const openOverlay = useUIStore((s) => s.openOverlay);
  const cfg = useSettingsStore((s) => s.cfg);
  const active = useActivePatient();
  const patientLang = active?.patientLang ?? "en";
  const caregiverLang = cfg?.caregiverLang ?? "en";

  const themeIcon = isAuto ? ICONS.auto : theme === "light" ? ICONS.light : ICONS.dark;
  const themeLabelKey: PhraseKey = isAuto ? "ui.provider.nav.theme.auto" : theme === "light" ? "ui.provider.nav.theme.light" : "ui.provider.nav.theme.dark";
  const themeLabel = resolvePhrase(themeLabelKey, caregiverLang);

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Btn key="theme" onClick={onToggleTheme} aria-label={`Theme: ${themeLabel}`} style={btnStyle(t, themeIcon)}>
        <span>{themeIcon}</span>
        <span style={labelStyle(t)}>{themeLabel}</span>
      </Btn>
      {OVERLAY_BUTTONS.map(({ overlay, icon, labelKey, usePatientLang }) => {
        const label = resolvePhrase(labelKey, usePatientLang ? patientLang : caregiverLang);
        return (
          <Btn key={overlay} onClick={() => openOverlay(overlay)} aria-label={label} style={btnStyle(t, icon)}>
            <span>{icon}</span>
            <span style={labelStyle(t)}>{label}</span>
          </Btn>
        );
      })}
      <Btn
        key="staff"
        onClick={onOpenStaff}
        aria-label={resolvePhrase("ui.provider.nav.staff_menu", caregiverLang)}
        style={btnStyle(t, ICONS.staff)}
      >
        <span>{ICONS.staff}</span>
        <span style={labelStyle(t)}>{resolvePhrase("ui.provider.nav.staff_menu", caregiverLang)}</span>
      </Btn>
    </div>
  );
}
