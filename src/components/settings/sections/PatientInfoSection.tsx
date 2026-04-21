import type { JSX, ComponentChildren } from "preact";
import type { AppSettings, Speaker } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { LANGS } from "../../../data/phrases";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { FallbackVoicePicker } from "../../shared/FallbackVoicePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore } from "../../../stores/settingsStore";
import { speak } from "../../../speak";

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
        value={cfg.patientName}
        onInput={(e) => updateCfg({ patientName: (e.target as HTMLInputElement).value })}
        style={inputStyle(t, isDark)}
      />

      <label htmlFor="settings-bed" style={{ ...labelStyle(t), marginTop: 16 }}>Bed / Room</label>
      <input
        id="settings-bed"
        type="text"
        value={cfg.bed}
        onInput={(e) => updateCfg({ bed: (e.target as HTMLInputElement).value })}
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
          hasVoice={cfg.patientVoice}
          hasEmbedding={!!useSettingsStore.getState().speakerData}
          onCapture={(_blob, embedding) => {
            updateCfg({ patientVoice: true });
            if (embedding) useSettingsStore.getState().setSpeakerData(embedding);
          }}
          onRemove={() => {
            updateCfg({ patientVoice: false });
            useSettingsStore.getState().setSpeakerData(null);
          }}
          onPreview={previewClonedVoice}
          locale={cfg.patientLang}
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
        {/* Separate row for the ~700-phrase pain matrix: runs only on GPU
            (hardware gated in audioCacheRunner), so on WASM-only systems
            this row is simply absent — the store has no entry to render. */}
        <VoiceCacheProgress
          speakerKey="patient:pain"
          speakerLabel="Pain descriptions"
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
          selectedVoice={cfg.fallbackVoice ?? null}
          onSelect={(v) => updateCfg({ fallbackVoice: v })}
          lang={cfg.patientLang}
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
