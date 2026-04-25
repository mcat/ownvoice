import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useUIStore } from "../../stores/uiStore";
import type { Patient } from "../../types";

interface Props {
  patient: Patient;
  caregiverLang: string;
  onEditPatient: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/**
 * Tappable header pill for the active patient. Replaces the static name
 * label and opens PatientEditSheet for the active patient via the
 * caller-supplied onEditPatient (App handles PIN-gating). Hidden by the
 * caller when no active patient exists, so this component assumes a
 * non-null patient.
 */
export function PatientPill({
  patient,
  caregiverLang,
  onEditPatient,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const blue = isDark ? "#60A5FA" : "#2563EB";
  // Show the trailing › only when staff is authenticated. To the patient,
  // the pill is purely informational; the chevron's "tap to edit" affordance
  // would be misleading since the PIN gate would block them anyway.
  const staffAuthed = useUIStore((s) => s.staffAuthed);
  const ariaLabel = resolvePhrase("ui.provider.patient_pill.aria", caregiverLang)
    .replace("{name}", patient.name);

  const buttonStyle: JSX.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 40, // header is dense; visual button is smaller than 64px but
                   // expands its hit-area via padding to meet 44px iOS HIG.
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    cursor: "pointer",
    fontFamily: "inherit",
    color: t.text,
  };

  const nameStyle: JSX.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: t.text,
    lineHeight: 1,
  };

  const bedStyle: JSX.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: t.muted,
    lineHeight: 1,
  };

  const chevronStyle: JSX.CSSProperties = {
    fontSize: 14,
    color: t.muted,
    lineHeight: 1,
    marginInlineStart: 2,
  };

  return (
    <button
      type="button"
      onClick={onEditPatient}
      aria-label={ariaLabel}
      style={buttonStyle}
    >
      <span class="font-sans" style={nameStyle}>
        {patient.name || resolvePhrase("ui.patient.header.name_fallback", patient.patientLang)}
      </span>
      {patient.bed && (
        <span style={bedStyle}>
          {"·"} {resolvePhrase("ui.patient.header.bed_prefix", patient.patientLang)}{patient.bed}
        </span>
      )}
      {patient.hasVoice && (
        <span
          aria-hidden="true"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: blue,
            background: isDark ? "#1E3A5F" : "#EFF6FF",
            borderRadius: 6,
            padding: "2px 7px",
            marginInlineStart: 4,
          }}
        >
          {"🎤"}
        </span>
      )}
      {staffAuthed && (
        <span aria-hidden="true" style={chevronStyle}>{"›"}</span>
      )}
    </button>
  );
}
