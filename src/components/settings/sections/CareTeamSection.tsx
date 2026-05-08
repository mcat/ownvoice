import { useState } from "preact/hooks";
import type { JSX, ComponentChildren } from "preact";
import type { AppSettings, Provider } from "../../../types";
import type { SpeakerData } from "../../../models/types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { LanguagePicker } from "../../shared/LanguagePicker";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore, useActivePatient } from "../../../stores/settingsStore";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { LANGS } from "../../../data/phrases";
import { confirm } from "../../shared/ConfirmDialog";
import { canCloneForLocale } from "../../../data/chatterboxLocales";
import { isGPUReady } from "../../../models/ttsEngine";

// Provider edits (add / remove / voice capture / voice remove) write directly
// to the settings store instead of buffering through SettingsPanel's draft +
// Save-changes flow. This mirrors how the patient embedding is committed
// immediately via setSpeakerData — without it, cfg.providers[i].embedding
// stayed undefined until save, so runPreGeneration skipped the provider
// entirely and their cloned voice never played.

const EMOJIS = [
  "\uD83D\uDC69\u200D\u2695\uFE0F",
  "\uD83D\uDC68\u200D\u2695\uFE0F",
  "\uD83E\uDDD1\u200D\u2695\uFE0F",
  "\uD83D\uDC69\u200D\uD83D\uDD2C",
  "\uD83D\uDC68\u200D\uD83D\uDD2C",
  "\uD83E\uDDD1\u200D\uD83D\uDD2C",
  "\uD83E\uDDD1\u200D\uD83C\uDF93",
  "\uD83D\uDE4B",
  "\uD83E\uDDD1",
  "\uD83D\uDC69",
  "\uD83D\uDC68",
  "\u2B50",
];

interface Props {
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
}

export function CareTeamSection({
  cfg,
  t,
  theme,
}: Props) {
  const isDark = theme === "dark";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const active = useActivePatient();
  const providers = useSettingsStore((s) => s.cfg?.providers ?? []);
  const [newProvName, setNewProvName] = useState("");
  const [newProvEmoji, setNewProvEmoji] = useState(EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  async function handleCaregiverLangChange(destLocale: string) {
    if (destLocale === cfg.caregiverLang) return;

    const destLangLabel = LANGS.find((l) => l.code === destLocale)?.label ?? destLocale;
    const patientHasVoice = active?.hasVoice ?? false;
    const supported = canCloneForLocale(destLocale);
    // Patient cache = ~150 base phrases + ~700 pain matrix if GPU
    const phraseCount = 150 + (isGPUReady() ? 700 : 0);
    const estimatedMinutes = patientHasVoice
      ? Math.max(1, Math.ceil(phraseCount / (isGPUReady() ? 60 : 5)))
      : 1;

    const body =
      !patientHasVoice
        ? resolvePhrase("ui.provider.settings.lang.caregiver_dialog.body_no_voice", destLocale)
        : supported
        ? resolvePhrase("ui.provider.settings.lang.caregiver_dialog.body", destLocale)
            .replace("{estimatedMinutes}", String(estimatedMinutes))
        : resolvePhrase("ui.provider.settings.lang.caregiver_dialog.body_unsupported", destLocale)
            .replace("{lang}", destLangLabel);

    const ok = await confirm({
      title: resolvePhrase("ui.provider.settings.lang.caregiver_dialog.title", destLocale)
        .replace("{lang}", destLangLabel),
      body,
      confirmLabel: resolvePhrase("ui.provider.settings.lang.change", destLocale),
      cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", cfg.caregiverLang),
    });
    if (ok) {
      useSettingsStore.getState().setCaregiverLang(destLocale);
    }
  }

  function commitProviders(next: Provider[]) {
    useSettingsStore.getState().updateCfg({ providers: next });
  }

  function addProvider() {
    if (!newProvName.trim()) return;
    useSettingsStore.getState().addProvider({
      name: newProvName.trim(),
      hasVoice: false,
      emoji: newProvEmoji,
    });
    setNewProvName("");
    setNewProvEmoji(EMOJIS[0]);
  }

  function removeProvider(i: number) {
    commitProviders(providers.filter((_, idx) => idx !== i));
  }

  function toggleProviderVoice(index: number, hasVoice: boolean) {
    commitProviders(
      providers.map((p, i) =>
        i === index
          ? { ...p, hasVoice, embedding: hasVoice ? p.embedding : undefined }
          : p,
      ),
    );
  }

  // Capture commits hasVoice AND embedding in one pass. Doing it as two
  // separate updateCfg calls would read `providers` from the hook snapshot
  // both times — the second call would overwrite the first's `hasVoice`
  // because no re-render happens between synchronous mutations.
  function captureProviderVoice(index: number, embedding: unknown) {
    commitProviders(
      providers.map((p, i) =>
        i === index ? { ...p, hasVoice: true, embedding } : p,
      ),
    );
  }

  return (
    <Section label={resolvePhrase("ui.provider.settings.care_team.heading", caregiverLang)} t={t}>
      {/* ── Care team language picker ──────────────────────────── */}
      <LanguagePicker
        value={cfg.caregiverLang}
        onChange={handleCaregiverLangChange}
        fieldLabel={resolvePhrase("ui.provider.settings.lang.caregiver_section", caregiverLang)}
        helper={resolvePhrase("ui.provider.settings.lang.caregiver_helper", caregiverLang)}
        pickerTitle={resolvePhrase("ui.provider.settings.lang.picker_title", caregiverLang)}
        changeLabel={resolvePhrase("ui.provider.settings.lang.change", caregiverLang)}
        t={t}
        isDark={isDark}
      />

      <div style={{ borderTop: `1px solid ${t.border}`, margin: "20px 0 16px" }} />

      {providers.length === 0 && (
        <p style={{ fontSize: 15, color: t.muted, margin: "0 0 12px" }}>
          {resolvePhrase("ui.provider.settings.care_team.empty", caregiverLang)}
        </p>
      )}

      {providers.map((p, i) => {
        const nameId = `careteam-provider-${i}-name`;
        return (
        <div
          key={i}
          role="group"
          aria-labelledby={nameId}
          style={{
            padding: "10px 0",
            borderBottom:
              i < providers.length - 1 ? `1px solid ${t.border}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>
              {p.emoji ?? "\uD83E\uDDD1\u200D\u2695\uFE0F"}
            </span>
            <span id={nameId} style={{ flex: 1, fontSize: 16, fontWeight: 500, color: t.text }}>
              {p.name}
            </span>
            <Btn
              onClick={() => removeProvider(i)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 16, color: t.muted, padding: "4px 8px", fontFamily: "inherit",
              }}
            >
              {"\u2715"}
            </Btn>
          </div>
          <div style={{ marginTop: 8, marginLeft: 36 }}>
            <VoiceCapture
              label={p.name}
              hasVoice={p.hasVoice}
              hasEmbedding={!!p.embedding}
              savedQuality={(p.embedding as SpeakerData | undefined)?.quality}
              onCapture={(_blob, embedding, quality) => {
                if (embedding) captureProviderVoice(i, { ...(embedding as SpeakerData), quality });
                else toggleProviderVoice(i, true);
              }}
              onRemove={() => toggleProviderVoice(i, false)}
              locale={active?.patientLang ?? "en"}
              compact
              color={{
                text: t.text, sub: t.sub, muted: t.muted,
                border: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
                cardBg: isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF",
              }}
            />
            <VoiceCacheProgress
              speakerKey={`provider:${i}`}
              speakerLabel={p.name}
              cfg={cfg}
              patientSpeakerData={active?.speakerData ?? null}
            />
          </div>
        </div>
        );
      })}

      {/* Add provider form */}
      <div
        style={{
          marginTop: providers.length > 0 ? 16 : 0,
          paddingTop: providers.length > 0 ? 16 : 0,
          borderTop: providers.length > 0 ? `1px solid ${t.border}` : "none",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* Emoji selector */}
          <div style={{ position: "relative" }}>
            <div
              id="new-provider-icon-label"
              style={{
                display: "block", fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 4,
              }}
            >
              {resolvePhrase("ui.provider.setup.step2.icon_label", caregiverLang)}
            </div>
            <button
              aria-labelledby="new-provider-icon-label"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 44, height: 44, borderRadius: 10,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
                background: isDark ? "rgba(255,255,255,0.05)" : "#FAFAF8",
                cursor: "pointer", fontSize: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {newProvEmoji}
            </button>
            {showEmojiPicker && (
              <div
                role="radiogroup"
                aria-labelledby="new-provider-icon-label"
                style={{
                  position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
                  background: isDark ? "#2C2C2E" : "#FFFFFF", borderRadius: 12,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB"}`,
                  padding: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 4, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    role="radio"
                    aria-checked={newProvEmoji === e}
                    onClick={() => {
                      setNewProvEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    style={{
                      width: 38, height: 38, borderRadius: 8, border: "none",
                      background:
                        newProvEmoji === e
                          ? isDark
                            ? "rgba(255,255,255,0.1)"
                            : "#EFF6FF"
                          : "transparent",
                      cursor: "pointer", fontSize: 20,
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
                display: "block", fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 4,
              }}
            >
              {resolvePhrase("ui.provider.setup.step2.name_label", caregiverLang)}
            </label>
            <input
              id="new-provider-name"
              type="text"
              value={newProvName}
              onInput={(e) => setNewProvName((e.target as HTMLInputElement).value)}
              placeholder={resolvePhrase("ui.provider.setup.step2.name_placeholder", caregiverLang)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addProvider();
              }}
              style={{ ...inputStyle(t, isDark), height: 44, padding: "0 12px" }}
            />
          </div>

          {/* Add button */}
          <Btn
            onClick={addProvider}
            disabled={!newProvName.trim()}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "none",
              background: newProvName.trim() ? "#059669" : isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
              color: newProvName.trim() ? "#FFFFFF" : t.muted,
              fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              height: 44, whiteSpace: "nowrap",
            }}
          >
            {resolvePhrase("ui.provider.setup.step2.add", caregiverLang)}
          </Btn>
        </div>
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
