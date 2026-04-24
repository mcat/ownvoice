import type { JSX, ComponentChildren } from "preact";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { colors } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { confirm } from "../../shared/ConfirmDialog";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useConversationStore } from "../../../stores/conversationStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
import { removePatientHashes } from "../../../stores/patientIndex";
import { LANGS } from "../../../data/phrases";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { useUIStore } from "../../../stores/uiStore";
import type { Patient } from "../../../types";

interface Props {
  t: ThemeTokens;
  theme: ThemeName;
}

/** Find the LANGS entry for a BCP 47 code. */
function langInfo(code: string) {
  return LANGS.find((l) => l.code === code);
}

export function PatientsSection({ t, theme }: Props) {
  const isDark = theme === "dark";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const patients = useSettingsStore((s) => s.cfg?.patients ?? []);
  const activePatientId = useSettingsStore((s) => s.cfg?.activePatientId ?? null);

  const providerColor = isDark ? colors.provider.dark : colors.provider.light;

  async function handleRemove(patient: Patient) {
    const ok = await confirm({
      title: resolvePhrase("ui.provider.settings.patients.remove_dialog.title", caregiverLang).replace("{name}", patient.name),
      body: resolvePhrase("ui.provider.settings.patients.remove_dialog.body", caregiverLang),
      confirmLabel: resolvePhrase("ui.provider.settings.patients.remove_dialog.confirm", caregiverLang),
      cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang),
      tone: "destructive",
    });
    if (!ok) return;
    try {
      useSettingsStore.getState().removePatient(patient.id);
      useConversationStore.getState().clearForPatient(patient.id);
      const hashes = await removePatientHashes(patient.id);
      try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle("audio-cache-v3").catch(() => null);
        if (dir) {
          for (const hash of hashes) {
            try { await dir.removeEntry(`${hash}.raw`); } catch { /* ok if missing */ }
          }
        }
      } catch {
        // OPFS not available (e.g. jsdom) — hashes already cleared from index
      }
      useAudioCacheStore.getState().discardByPatientId(patient.id);
    } catch (err) {
      console.error("[PatientsSection] remove failed:", err);
    }
  }

  const addCardStyle: JSX.CSSProperties = {
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px dashed ${t.border}`,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 600,
    fontFamily: "inherit",
    color: t.muted,
    background: t.activeBg,
    cursor: "pointer",
    padding: "12px 16px",
    width: "100%",
  };

  const chipBase: JSX.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 8,
    display: "inline-block",
  };

  return (
    <Section label={resolvePhrase("ui.provider.settings.patients.title", caregiverLang)} t={t}>
      {/* + Add Patient */}
      <button
        type="button"
        onClick={() => useUIStore.getState().openOverlay("addPatient")}
        style={addCardStyle}
      >
        {resolvePhrase("ui.provider.settings.patients.add_patient", caregiverLang)}
      </button>

      {patients.map((patient, i) => {
        const isActive = patient.id === activePatientId;
        const lang = langInfo(patient.patientLang);
        const removeDisabled = isActive;
        const hintId = `patients-remove-hint-${patient.id}`;

        const voiceChipStyle: JSX.CSSProperties = {
          ...chipBase,
          background: patient.hasVoice ? providerColor : t.activeBg,
          color: patient.hasVoice ? "#FFFFFF" : t.muted,
        };

        return (
          <div
            key={patient.id}
            style={{
              minHeight: 64,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom: i < patients.length - 1 ? `1px solid ${t.border}` : "none",
            }}
          >
            {/* Card content — matches SwitchSheet card layout */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
                {patient.name}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: t.sub,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {patient.bed && <span>Bed {patient.bed}</span>}
                {lang && (
                  <span>
                    {lang.flag} {lang.label}
                    {lang.englishLabel !== lang.label && ` / ${lang.englishLabel}`}
                  </span>
                )}
                <span style={voiceChipStyle}>
                  {patient.hasVoice
                    ? resolvePhrase("ui.provider.switch.voice_captured", caregiverLang)
                    : resolvePhrase("ui.provider.switch.no_voice", caregiverLang)}
                </span>
              </div>
            </div>

            {/* Remove button */}
            <Btn
              onClick={() => handleRemove(patient)}
              disabled={removeDisabled}
              aria-describedby={removeDisabled ? hintId : undefined}
              style={{
                minHeight: 64,
                minWidth: 64,
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: removeDisabled
                  ? isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB"
                  : "#DC2626",
                color: removeDisabled ? t.muted : "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: removeDisabled ? "not-allowed" : "pointer",
                opacity: removeDisabled ? 0.6 : 1,
              }}
            >
              {resolvePhrase("ui.provider.settings.patients.remove_button", caregiverLang)}
            </Btn>

            {/* Visually hidden hint for disabled Remove (WCAG 3.3.4) */}
            {removeDisabled && (
              <span
                id={hintId}
                style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
              >
                {resolvePhrase("ui.provider.settings.patients.active_remove_hint", caregiverLang)}
              </span>
            )}
          </div>
        );
      })}
    </Section>
  );
}

/* Local helpers (duplicated across section files to keep each file self-contained) */

function Section({
  label, t, children,
}: { label: string; t: ThemeTokens; children: ComponentChildren }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: t.muted, textTransform: "uppercase",
        letterSpacing: "0.05em", margin: "0 0 12px",
      }}>{label}</h3>
      <div style={{
        background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 18,
      }}>{children}</div>
    </div>
  );
}
