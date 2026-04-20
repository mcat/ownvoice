import { useState } from "preact/hooks";
import type { JSX, ComponentChildren } from "preact";
import type { AppSettings, Provider } from "../../../types";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { VoiceCapture } from "../../shared/VoiceCapture";
import { VoiceCacheProgress } from "../VoiceCacheProgress";
import { useSettingsStore } from "../../../stores/settingsStore";

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
  const providers = useSettingsStore((s) => s.cfg?.providers ?? []);
  const [newProvName, setNewProvName] = useState("");
  const [newProvEmoji, setNewProvEmoji] = useState(EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function commitProviders(next: Provider[]) {
    useSettingsStore.getState().updateCfg({ providers: next });
  }

  function addProvider() {
    if (!newProvName.trim()) return;
    commitProviders([
      ...providers,
      { name: newProvName.trim(), hasVoice: false, emoji: newProvEmoji },
    ]);
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
              i < providers.length - 1 ? `1px solid ${t.border}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24 }}>
              {p.emoji ?? "\uD83E\uDDD1\u200D\u2695\uFE0F"}
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: t.text }}>
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
              onCapture={(_blob, embedding) => {
                if (embedding) captureProviderVoice(i, embedding);
                else toggleProviderVoice(i, true);
              }}
              onRemove={() => toggleProviderVoice(i, false)}
              locale={cfg.patientLang}
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
              Icon
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
              Name
            </label>
            <input
              id="new-provider-name"
              type="text"
              value={newProvName}
              onInput={(e) => setNewProvName((e.target as HTMLInputElement).value)}
              placeholder="Dr. Smith, Nurse Jay..."
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
            Add
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

function inputStyle(t: ThemeTokens, isDark: boolean): JSX.CSSProperties {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#D1D5DB"}`,
    background: isDark ? "rgba(255,255,255,0.05)" : "#FAFAF8",
    fontSize: 16, color: t.text, outline: "none", boxSizing: "border-box",
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
  };
}
