import type { JSX, ComponentChildren } from "preact";
import type { AppSettings } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { LANGS } from "../../../data/phrases";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { FallbackVoicePicker } from "../../shared/FallbackVoicePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore, useActivePatient } from "../../../stores/settingsStore";
import { t as resolvePhrase } from "../../../data/phraseRegistry";

interface Props {
  cfg: AppSettings;
  /**
   * Persist a partial cfg update immediately. Every field in this section
   * calls this from its own change handler — there is no "Save" button.
   */
  updateCfg: (partial: Partial<AppSettings>) => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function PatientInfoSection({
  cfg,
  updateCfg,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const active = useActivePatient();
  const selectedLang = LANGS.find((l) => l.code === (active?.patientLang ?? "en"));

  return (
    <Section label={resolvePhrase("ui.provider.settings.patient_info.heading", caregiverLang)} t={t}>
      <label htmlFor="settings-name" style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.name_label", caregiverLang)}</label>
      <input
        id="settings-name"
        type="text"
        value={active?.name ?? ""}
        onInput={(e) => useSettingsStore.getState().updateActivePatient({ name: (e.target as HTMLInputElement).value })}
        style={inputStyle(t, isDark)}
      />

      <label htmlFor="settings-bed" style={{ ...labelStyle(t), marginTop: 16 }}>{resolvePhrase("ui.provider.settings.patient_info.bed_label", caregiverLang)}</label>
      <input
        id="settings-bed"
        type="text"
        value={active?.bed ?? ""}
        onInput={(e) => useSettingsStore.getState().updateActivePatient({ bed: (e.target as HTMLInputElement).value })}
        style={inputStyle(t, isDark)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 15, color: t.sub }}>{resolvePhrase("ui.provider.settings.patient_info.language_label", caregiverLang)}</span>
        <span style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>
          {selectedLang ? `${selectedLang.flag} ${selectedLang.label}` : (active?.patientLang ?? "en")}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.voice_label", caregiverLang)}</div>
        <VoiceCapture
          label="Patient"
          hasVoice={active?.hasVoice ?? false}
          hasEmbedding={!!active?.speakerData}
          onCapture={(_blob, embedding) => {
            useSettingsStore.getState().updateActivePatient({
              hasVoice: true,
              speakerData: embedding ?? null,
            });
          }}
          onRemove={() => {
            useSettingsStore.getState().updateActivePatient({
              hasVoice: false,
              speakerData: null,
            });
          }}
          locale={active?.patientLang ?? "en"}
          compact
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
        {active && (
          <VoiceCacheProgress
            speakerKey={`patient:${active.id}`}
            speakerLabel={active.name || "Patient"}
            cfg={cfg}
            patientSpeakerData={active.speakerData ?? null}
          />
        )}
        {/* Separate row for the ~700-phrase pain matrix: runs only on GPU
            (hardware gated in audioCacheRunner), so on WASM-only systems
            this row is simply absent — the store has no entry to render. */}
        {active && (
          <VoiceCacheProgress
            speakerKey={`patient:${active.id}:pain`}
            speakerLabel="Pain descriptions"
            cfg={cfg}
            patientSpeakerData={active.speakerData ?? null}
          />
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={labelStyle(t)}>{resolvePhrase("ui.provider.settings.patient_info.backup_voice_label", caregiverLang)}</div>
        <p style={{ fontSize: 13, color: t.muted, margin: "0 0 10px" }}>
          {resolvePhrase("ui.provider.settings.patient_info.backup_voice_body", caregiverLang)}
        </p>
        <FallbackVoicePicker
          selectedVoice={active?.fallbackVoice ?? null}
          onSelect={(v) => useSettingsStore.getState().updateActivePatient({ fallbackVoice: v })}
          lang={active?.patientLang ?? "en"}
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
