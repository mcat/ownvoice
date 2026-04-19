import { useState, useId } from "preact/hooks";
import type { AppSettings, FallbackVoice, Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { useDialog } from "../../hooks/useDialog";
import { PatientInfoSection } from "./sections/PatientInfoSection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { ResetSection } from "./sections/ResetSection";

interface SettingsPanelProps {
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  onReset: () => void | Promise<void>;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function SettingsPanel({
  cfg,
  onUpdate,
  onReset,
  onClose,
  t,
  theme,
}: SettingsPanelProps) {
  const [name, setName] = useState(cfg.patientName);
  const [bed, setBed] = useState(cfg.bed);
  const [providers, setProviders] = useState<Provider[]>(cfg.providers);
  const [patientVoice, setPatientVoice] = useState(cfg.patientVoice);
  const [fallbackVoice, setFallbackVoice] = useState<FallbackVoice | null>(
    cfg.fallbackVoice ?? null,
  );

  const isDark = theme === "dark";
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

  const providersChanged =
    providers.length !== cfg.providers.length ||
    providers.some(
      (p, i) =>
        p.name !== cfg.providers[i]?.name ||
        p.hasVoice !== cfg.providers[i]?.hasVoice ||
        p.emoji !== cfg.providers[i]?.emoji ||
        !!p.embedding !== !!cfg.providers[i]?.embedding,
    );

  const hasChanges =
    name !== cfg.patientName ||
    bed !== cfg.bed ||
    patientVoice !== cfg.patientVoice ||
    (fallbackVoice?.voiceURI ?? null) !== (cfg.fallbackVoice?.voiceURI ?? null) ||
    providersChanged;

  function save() {
    onUpdate({ ...cfg, patientName: name, bed, providers, patientVoice, fallbackVoice });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop: passive surface — click closes; Escape closes via useDialog. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: "relative",
          background: t.bg,
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "0 0 40px",
          scrollPaddingBottom: 120,
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 8px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "4px 24px 20px",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <h2 id={titleId} style={{ fontSize: 22, fontWeight: 700, color: t.text, margin: 0 }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 16,
              color: t.muted,
              cursor: "pointer",
              padding: "8px 12px",
              fontFamily:
                "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
            }}
          >
            Done
          </button>
        </div>

        <div style={{ padding: "0 24px" }}>
          <PatientInfoSection
            cfg={cfg}
            name={name}
            bed={bed}
            patientVoice={patientVoice}
            fallbackVoice={fallbackVoice}
            hasChanges={hasChanges}
            onNameChange={setName}
            onBedChange={setBed}
            onPatientVoiceChange={setPatientVoice}
            onFallbackVoiceChange={setFallbackVoice}
            onSave={save}
            t={t}
            theme={theme}
          />

          <CareTeamSection
            cfg={cfg}
            providers={providers}
            onProvidersChange={setProviders}
            t={t}
            theme={theme}
          />

          <AboutSection t={t} />

          <ResetSection onReset={onReset} t={t} theme={theme} />
        </div>
      </div>
    </div>
  );
}
