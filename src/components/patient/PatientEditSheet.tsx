import { BottomSheet } from "../shared/BottomSheet";
import { z } from "../../theme/z";
import { PatientInfoSection } from "../settings/sections/PatientInfoSection";
import { useSettingsStore, usePatientById } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";

interface Props {
  /** Id of the patient to edit. Sheet auto-closes if no patient with this id exists. */
  patientId: string;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/**
 * Bottom-sheet wrapper around PatientInfoSection for editing any patient
 * (active or otherwise) without switching to them. Used by:
 *   - the header PatientPill (active patient, fast path)
 *   - the Patients screen kebab menu (any patient)
 */
export function PatientEditSheet({ patientId, onClose, t, theme }: Props) {
  const bump = useStaffActivityBump();
  const cfg = useSettingsStore((s) => s.cfg);
  const caregiverLang = cfg?.caregiverLang ?? "en";
  const patient = usePatientById(patientId);

  // If the patient is removed while the sheet is open, close it. Don't
  // unmount mid-edit silently — the parent's onClose triggers any cleanup
  // (e.g. clearing patientEditId in uiStore).
  if (!patient || !cfg) {
    return null;
  }

  const title = patient.name
    ? resolvePhrase("ui.provider.patient_edit.title", caregiverLang).replace("{name}", patient.name)
    : resolvePhrase("ui.provider.patient_edit.title_default", caregiverLang);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
      <BottomSheet onClose={onClose} t={t} zIndex={z.sheetStacked}>
        <BottomSheet.Header>
          <BottomSheet.Title>{title}</BottomSheet.Title>
          <BottomSheet.CloseButton
            aria-label={resolvePhrase("ui.provider.patient_edit.close_aria", caregiverLang)}
            style={{
              fontSize: 16,
              color: t.muted,
              padding: "8px 12px",
              minWidth: 64,
              minHeight: 64,
              fontFamily:
                "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
            }}
          >
            {resolvePhrase("ui.provider.settings.done", caregiverLang)}
          </BottomSheet.CloseButton>
        </BottomSheet.Header>
        <BottomSheet.Body>
          <div style={{ padding: "0 4px" }}>
            <PatientInfoSection
              patient={patient}
              cfg={cfg}
              t={t}
              theme={theme}
            />
          </div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}
