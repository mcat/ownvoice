import type { JSX, ComponentChildren } from "preact";
import type { AppSettings, Patient, Speaker } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { LANGS } from "../../../data/phrases";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { FallbackVoicePicker } from "../../shared/FallbackVoicePicker";
import { LanguagePicker } from "../../shared/LanguagePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore } from "../../../stores/settingsStore";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { confirm } from "../../shared/ConfirmDialog";
import { canCloneForLocale } from "../../../data/chatterboxLocales";
import { isGPUReady } from "../../../models/ttsEngine";
import { speak } from "../../../speak";

interface Props {
  /** The patient being edited. Caller passes the active patient (Settings) or any patient (PatientEditSheet). */
  patient: Patient;
  /** Device-wide settings. Used for the providers count when warning about audio regeneration on language change. */
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
}

export function PatientInfoSection({
  patient,
  cfg,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");

  function update(partial: Partial<Omit<Patient, "id">>) {
    useSettingsStore.getState().updatePatient(patient.id, partial);
  }

  async function handlePatientLangChange(destLocale: string) {
    if (destLocale === patient.patientLang) return;

    const destLangLabel = LANGS.find((l) => l.code === destLocale)?.label ?? destLocale;
    const providerCount = cfg.providers.filter((p) => p.hasVoice).length;
    const supported = canCloneForLocale(destLocale);
    const estimatedMinutes = Math.max(1, Math.ceil((30 * providerCount) / (isGPUReady() ? 60 : 5)));

    const body =
      providerCount === 0
        ? resolvePhrase("ui.provider.settings.lang.patient_dialog.body_no_providers", caregiverLang)
        : supported
        ? resolvePhrase("ui.provider.settings.lang.patient_dialog.body", caregiverLang)
            .replace("{providerCount}", String(providerCount))
            .replace("{estimatedMinutes}", String(estimatedMinutes))
        : resolvePhrase("ui.provider.settings.lang.patient_dialog.body_unsupported", caregiverLang)
            .replace("{lang}", destLangLabel);

    const ok = await confirm({
      title: resolvePhrase("ui.provider.settings.lang.patient_dialog.title", destLocale)
        .replace("{lang}", destLangLabel),
      body,
      confirmLabel: resolvePhrase("ui.provider.settings.lang.change", destLocale),
      cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang),
    });
    if (ok) {
      update({ patientLang: destLocale });
    }
  }

  // Per-patient input ids prevent label collisions if two PatientInfoSections
  // mount simultaneously (e.g. Settings still wires it for the active patient
  // while PatientEditSheet renders a different patient).
  const nameId = `patient-name-${patient.id}`;
  const bedId = `patient-bed-${patient.id}`;

  return (
    <Section label={resolvePhrase("ui.provider.settings.patient_info.heading", caregiverLang)} t={t}>
      <label htmlFor={nameId} style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.name_label", caregiverLang)}</label>
      <input
        id={nameId}
        type="text"
        value={patient.name}
        onInput={(e) => update({ name: (e.target as HTMLInputElement).value })}
        style={inputStyle(t, isDark)}
      />

      <label htmlFor={bedId} style={{ ...labelStyle(t), marginTop: 16 }}>{resolvePhrase("ui.provider.settings.patient_info.bed_label", caregiverLang)}</label>
      <input
        id={bedId}
        type="text"
        value={patient.bed}
        onInput={(e) => update({ bed: (e.target as HTMLInputElement).value })}
        style={inputStyle(t, isDark)}
      />

      {/* ── Patient language picker ─────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <LanguagePicker
          value={patient.patientLang}
          onChange={handlePatientLangChange}
          fieldLabel={resolvePhrase("ui.provider.settings.lang.patient_section", caregiverLang)}
          pickerTitle={resolvePhrase("ui.provider.settings.lang.picker_title", caregiverLang)}
          changeLabel={resolvePhrase("ui.provider.settings.lang.change", caregiverLang)}
          t={t}
          isDark={isDark}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.voice_label", caregiverLang)}</div>
        <VoiceCapture
          label="Patient"
          hasVoice={patient.hasVoice}
          hasEmbedding={!!patient.speakerData}
          onCapture={(_blob, embedding) => {
            update({
              hasVoice: true,
              speakerData: embedding ?? null,
            });
          }}
          onRemove={() => {
            update({
              hasVoice: false,
              speakerData: null,
            });
          }}
          locale={patient.patientLang}
          compact
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
        <VoiceCacheProgress
          speakerKey={`patient:${patient.id}`}
          speakerLabel={patient.name || "Patient"}
          cfg={cfg}
          patientSpeakerData={patient.speakerData ?? null}
        />
        {/* Separate row for the ~700-phrase pain matrix: runs only on GPU
            (hardware gated in audioCacheRunner), so on WASM-only systems
            this row is simply absent — the store has no entry to render. */}
        <VoiceCacheProgress
          speakerKey={`patient:${patient.id}:pain`}
          speakerLabel="Pain descriptions"
          cfg={cfg}
          patientSpeakerData={patient.speakerData ?? null}
        />
      </div>

      {/* TEMPORARY: paralinguistic-tag test row. Validates whether the model
          honors special-token tags like [chuckle] (a Resemble-documented
          paralinguistic marker) by producing a chuckle sound — or speaks the
          word like it did with [narration]. Remove this block once the
          mechanism is validated either way. */}
      {patient.speakerData ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            border: `1px dashed ${t.muted}`,
            borderRadius: 10,
            background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA",
          }}
        >
          <div style={{
            fontSize: 11, fontWeight: 600, color: t.muted,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
          }}>
            Debug — paralinguistic tag test
          </div>
          <p style={{ fontSize: 12, color: t.sub, margin: "0 0 10px", lineHeight: 1.4 }}>
            Synthesizes “That was funny [chuckle]” through this voice clone.
            Listen for whether the model produces a chuckle sound at the end,
            or pronounces the word “chuckle” aloud.
          </p>
          <button
            type="button"
            onClick={() => {
              const speaker: Speaker = {
                name: patient.name || "Patient",
                type: "patient",
                embedding: patient.speakerData ?? undefined,
                lang: caregiverLang,
              };
              void speak("That was funny [chuckle]", speaker);
            }}
            style={{
              padding: "8px 14px",
              background: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
              border: `1px solid ${t.muted}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              color: t.text,
              fontWeight: 500,
              fontFamily: "inherit",
            }}
          >
            Test [chuckle]
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: 20 }}>
        <div style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.backup_voice_label", caregiverLang)}</div>
        <p style={{ fontSize: 13, color: t.muted, margin: "0 0 10px" }}>
          {resolvePhrase("ui.provider.settings.patient_info.backup_voice_body", caregiverLang)}
        </p>
        <FallbackVoicePicker
          selectedVoice={patient.fallbackVoice ?? null}
          onSelect={(v) => update({ fallbackVoice: v })}
          lang={patient.patientLang}
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
      </div>
    </Section>
  );
}

/* Local helpers (duplicated across section files to keep each file self-contained) */

function Section({
  label, t, children,
}: { label: string; t: ThemeTokens; children: ComponentChildren; }) {
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

function labelStyle(t: ThemeTokens): JSX.CSSProperties {
  return { display: "block", fontSize: 14, fontWeight: 600, color: t.sub, marginBottom: 6 };
}

function inputStyle(t: ThemeTokens, isDark: boolean): JSX.CSSProperties {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#D1D5DB"}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "#FAFAF8",
    fontSize: 16, color: t.text, outline: "none", boxSizing: "border-box",
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
  };
}
