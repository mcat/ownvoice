import type { JSX, ComponentChildren } from "preact";
import type { AppSettings, FallbackVoice, Speaker } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { LANGS } from "../../../data/phrases";
import { Btn } from "../../shared/Btn";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { FallbackVoicePicker } from "../../shared/FallbackVoicePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore } from "../../../stores/settingsStore";
import { speak } from "../../../speak";

interface Props {
  cfg: AppSettings;
  name: string;
  bed: string;
  patientVoice: boolean;
  fallbackVoice: FallbackVoice | null;
  hasChanges: boolean;
  onNameChange: (v: string) => void;
  onBedChange: (v: string) => void;
  onPatientVoiceChange: (v: boolean) => void;
  onFallbackVoiceChange: (v: FallbackVoice | null) => void;
  onSave: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function PatientInfoSection({
  cfg,
  name,
  bed,
  patientVoice,
  fallbackVoice,
  hasChanges,
  onNameChange,
  onBedChange,
  onPatientVoiceChange,
  onFallbackVoiceChange,
  onSave,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const selectedLang = LANGS.find((l) => l.code === cfg.patientLang);

  function previewClonedVoice() {
    const embedding = useSettingsStore.getState().speakerData;
    if (!embedding) return;
    const text = cfg.patientName ? `Hi, I'm ${cfg.patientName}` : "Hello, this is my voice";
    const speaker: Speaker = {
      name: cfg.patientName || "Patient",
      type: "patient",
      embedding,
      lang: cfg.patientLang,
    };
    speak(text, speaker);
  }

  return (
    <Section label="Patient Information" t={t}>
      <label htmlFor="settings-name" style={labelStyle(t)}>Name</label>
      <input
        id="settings-name"
        type="text"
        value={name}
        onInput={(e) => onNameChange((e.target as HTMLInputElement).value)}
        style={inputStyle(t, isDark)}
      />

      <label htmlFor="settings-bed" style={{ ...labelStyle(t), marginTop: 16 }}>Bed / Room</label>
      <input
        id="settings-bed"
        type="text"
        value={bed}
        onInput={(e) => onBedChange((e.target as HTMLInputElement).value)}
        style={inputStyle(t, isDark)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <span style={{ fontSize: 15, color: t.sub }}>Language</span>
        <span style={{ fontSize: 15, color: t.text, fontWeight: 500 }}>
          {selectedLang ? `${selectedLang.flag} ${selectedLang.label}` : cfg.patientLang}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={labelStyle(t)}>Voice</div>
        <VoiceCapture
          label="Patient"
          hasVoice={patientVoice}
          hasEmbedding={!!useSettingsStore.getState().speakerData}
          onCapture={(_blob, embedding) => {
            onPatientVoiceChange(true);
            if (embedding) useSettingsStore.getState().setSpeakerData(embedding);
          }}
          onRemove={() => {
            onPatientVoiceChange(false);
            useSettingsStore.getState().setSpeakerData(null);
          }}
          onPreview={previewClonedVoice}
          compact
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
        <VoiceCacheProgress
          speakerKey="patient"
          speakerLabel={cfg.patientName || "Patient"}
          cfg={cfg}
          patientSpeakerData={useSettingsStore.getState().speakerData}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={labelStyle(t)}>Backup voice</div>
        <p style={{ fontSize: 13, color: t.muted, margin: "0 0 10px" }}>
          System voice used while the voice clone loads. Tap to preview.
        </p>
        <FallbackVoicePicker
          selectedVoice={fallbackVoice}
          onSelect={onFallbackVoiceChange}
          lang={cfg.patientLang}
          color={{
            text: t.text, sub: t.sub, muted: t.muted,
            border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
            cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
          }}
        />
      </div>

      {hasChanges && (
        <Btn
          onClick={onSave}
          style={{
            marginTop: 20, width: "100%", padding: "14px 20px", borderRadius: 12, border: "none",
            background: "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          Save changes
        </Btn>
      )}
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
