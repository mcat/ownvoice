import { useState, useId } from "preact/hooks";
import type { AppSettings, FallbackVoice, Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { Btn } from "../shared/Btn";
import { useDialog } from "../../hooks/useDialog";
import { PatientInfoSection } from "./sections/PatientInfoSection";
import { CareTeamSection } from "./sections/CareTeamSection";

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

          {/* About section */}
          <Section label="About" t={t}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: t.text,
                margin: "0 0 8px",
              }}
            >
              OwnVoice v0.1
            </p>
            <p style={{ fontSize: 14, color: t.sub, margin: "0 0 4px" }}>
              In-patient AAC communication aid.
            </p>
            <p style={{ fontSize: 13, color: t.muted, margin: "0 0 4px" }}>
              Pain scale: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0
            </p>
            <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>
              Goals of care: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0
            </p>
          </Section>

          {/* Reset section */}
          <Section label="Reset" t={t}>
            {!showResetConfirm ? (
              <Btn
                onClick={() => setShowResetConfirm(true)}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: "1px solid #DC2626",
                  background: "transparent",
                  color: "#DC2626",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                Reset app for new patient
              </Btn>
            ) : (
              <div
                style={{
                  padding: 16,
                  background: isDark
                    ? "rgba(220,38,38,0.1)"
                    : "rgba(220,38,38,0.05)",
                  borderRadius: 14,
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#DC2626",
                    margin: "0 0 8px",
                  }}
                >
                  Are you sure?
                </p>
                <p style={{ fontSize: 14, color: t.sub, margin: "0 0 16px" }}>
                  This will erase all patient data, voice samples, conversation
                  history, and provider settings. This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn
                    onClick={() => setShowResetConfirm(false)}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: `1px solid ${t.border}`,
                      background: t.card,
                      color: t.text,
                      fontSize: 15,
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </Btn>
                  <Btn
                    onClick={onReset}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: "#DC2626",
                      color: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    Reset everything
                  </Btn>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function Section({
  label,
  t,
  children,
}: {
  label: string;
  t: ThemeTokens;
  children: preact.ComponentChildren;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: t.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 12px",
        }}
      >
        {label}
      </h3>
      <div
        style={{
          background: t.card,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function labelStyle(t: ThemeTokens): Record<string, string | number> {
  return {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: t.sub,
    marginBottom: 6,
  };
}

function inputStyle(
  t: ThemeTokens,
  isDark: boolean,
): Record<string, string | number> {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#D1D5DB"}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "#FAFAF8",
    fontSize: 16,
    color: t.text,
    outline: "none",
    boxSizing: "border-box",
    fontFamily:
      "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
  };
}
