import { useState, useId } from "preact/hooks";
import type { AppSettings, FallbackVoice, Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { Btn } from "../shared/Btn";
import { VoiceCapture } from "../shared/VoiceCapture";
import { VoiceCacheProgress } from "./VoiceCacheProgress";
import { useSettingsStore } from "../../stores/settingsStore";
import { useDialog } from "../../hooks/useDialog";
import { PatientInfoSection } from "./sections/PatientInfoSection";

const EMOJIS = [
  "\uD83D\uDC69\u200D\u2695\uFE0F", // woman health worker
  "\uD83D\uDC68\u200D\u2695\uFE0F", // man health worker
  "\uD83E\uDDD1\u200D\u2695\uFE0F", // health worker
  "\uD83D\uDC69\u200D\uD83D\uDD2C",  // woman scientist
  "\uD83D\uDC68\u200D\uD83D\uDD2C",  // man scientist
  "\uD83E\uDDD1\u200D\uD83D\uDD2C",  // scientist
  "\uD83E\uDDD1\u200D\uD83C\uDF93",  // student
  "\uD83D\uDE4B",                      // person raising hand
  "\uD83E\uDDD1",                      // person
  "\uD83D\uDC69",                      // woman
  "\uD83D\uDC68",                      // man
  "\u2B50",                            // star
];

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
  const [newProvName, setNewProvName] = useState("");
  const [newProvEmoji, setNewProvEmoji] = useState(EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  function addProvider() {
    if (!newProvName.trim()) return;
    setProviders((prev) => [
      ...prev,
      { name: newProvName.trim(), hasVoice: false, emoji: newProvEmoji },
    ]);
    setNewProvName("");
    setNewProvEmoji(EMOJIS[0]);
  }

  function removeProvider(i: number) {
    setProviders((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleProviderVoice(index: number, hasVoice: boolean) {
    setProviders((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, hasVoice, embedding: hasVoice ? p.embedding : undefined }
          : p,
      ),
    );
  }

  function setProviderEmbedding(index: number, embedding: unknown) {
    setProviders((prev) =>
      prev.map((p, i) => (i === index ? { ...p, embedding } : p)),
    );
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

          {/* Care team section */}
          <Section label="Care Team" t={t}>
            {providers.length === 0 && (
              <p style={{ fontSize: 15, color: t.muted, margin: "0 0 12px" }}>
                No providers added yet.
              </p>
            )}

            {providers.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 0",
                  borderBottom:
                    i < providers.length - 1
                      ? `1px solid ${t.border}`
                      : "none",
                }}
              >
                {/* Provider header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {p.emoji ?? "\uD83E\uDDD1\u200D\u2695\uFE0F"}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: 500,
                      color: t.text,
                    }}
                  >
                    {p.name}
                  </span>
                  <Btn
                    onClick={() => removeProvider(i)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 16,
                      color: t.muted,
                      padding: "4px 8px",
                      fontFamily: "inherit",
                    }}
                  >
                    {"\u2715"}
                  </Btn>
                </div>
                {/* Voice capture inline */}
                <div style={{ marginTop: 8, marginLeft: 36 }}>
                  <VoiceCapture
                    label={p.name}
                    hasVoice={p.hasVoice}
                    hasEmbedding={!!p.embedding}
                    onCapture={(_blob, embedding) => {
                      toggleProviderVoice(i, true);
                      if (embedding) setProviderEmbedding(i, embedding);
                    }}
                    onRemove={() => toggleProviderVoice(i, false)}
                    compact
                    color={{
                      text: t.text,
                      sub: t.sub,
                      muted: t.muted,
                      border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
                      cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
                    }}
                  />
                  <VoiceCacheProgress
                    speakerKey={`provider:${i}`}
                    speakerLabel={p.name}
                    cfg={cfg}
                    patientSpeakerData={useSettingsStore.getState().speakerData}
                  />
                </div>
              </div>
            ))}

            {/* Add provider form */}
            <div
              style={{
                marginTop: providers.length > 0 ? 16 : 0,
                paddingTop: providers.length > 0 ? 16 : 0,
                borderTop:
                  providers.length > 0 ? `1px solid ${t.border}` : "none",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                {/* Emoji selector */}
                <div style={{ position: "relative" }}>
                  <div
                    id="new-provider-icon-label"
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: t.muted,
                      marginBottom: 4,
                    }}
                  >
                    Icon
                  </div>
                  <button
                    aria-labelledby="new-provider-icon-label"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
                      background: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "#FAFAF8",
                      cursor: "pointer",
                      fontSize: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {newProvEmoji}
                  </button>
                  {showEmojiPicker && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: 0,
                        marginBottom: 4,
                        background: isDark ? "#2C2C2E" : "#FFFFFF",
                        borderRadius: 12,
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
                        padding: 8,
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 4,
                        zIndex: 10,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      }}
                    >
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setNewProvEmoji(e);
                            setShowEmojiPicker(false);
                          }}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            border: "none",
                            background:
                              newProvEmoji === e
                                ? isDark
                                  ? "rgba(255,255,255,0.1)"
                                  : "#EFF6FF"
                                : "transparent",
                            cursor: "pointer",
                            fontSize: 20,
                          }}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Name input */}
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="new-provider-name"
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: t.muted,
                      marginBottom: 4,
                    }}
                  >
                    Name
                  </label>
                  <input
                    id="new-provider-name"
                    type="text"
                    value={newProvName}
                    onInput={(e) =>
                      setNewProvName((e.target as HTMLInputElement).value)
                    }
                    placeholder="Dr. Smith, Nurse Jay..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addProvider();
                    }}
                    style={{
                      ...inputStyle(t, isDark),
                      height: 44,
                      padding: "0 12px",
                    }}
                  />
                </div>

                {/* Add button */}
                <Btn
                  onClick={addProvider}
                  disabled={!newProvName.trim()}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: newProvName.trim() ? "#059669" : isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
                    color: newProvName.trim() ? "#FFFFFF" : t.muted,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    height: 44,
                    whiteSpace: "nowrap",
                  }}
                >
                  Add
                </Btn>
              </div>
            </div>
          </Section>

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
