import { useState } from "preact/hooks";
import type { AppSettings, FallbackVoice, Provider } from "../../types";
import { LANGS } from "../../data/phrases";
import { z } from "../../theme/z";
import { Btn } from "../shared/Btn";
import { VoiceCapture } from "../shared/VoiceCapture";
import { FallbackVoicePicker } from "../shared/FallbackVoicePicker";
import { useSettingsStore } from "../../stores/settingsStore";

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

const STEP_LABELS = ["Patient", "Voice", "Care Team", "Confirm"];
const STEP_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706"];

function defaults(): AppSettings {
  return {
    patientName: "",
    bed: "",
    patientLang: "en",
    caregiverLang: "en",
    patientVoice: false,
    pin: "",
    providers: [],
  };
}

interface SetupProps {
  onDone: (settings: AppSettings) => void;
}

export function Setup({ onDone }: SetupProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bed, setBed] = useState("");
  const [lang, setLang] = useState("en");
  const [patientVoice, setPatientVoice] = useState(false);
  const [fallbackVoice, setFallbackVoice] = useState<FallbackVoice | null>(null);
  const [pin, setPin] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);

  // Provider editing state
  const [newProvName, setNewProvName] = useState("");
  const [newProvEmoji, setNewProvEmoji] = useState(EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function finish() {
    onDone({
      patientName: name,
      bed,
      patientLang: lang,
      caregiverLang: "en",
      patientVoice,
      fallbackVoice,
      pin,
      providers,
    });
  }

  function next() {
    if (step < 3) setStep(step + 1);
    else finish();
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function addProvider() {
    if (!newProvName.trim()) return;
    setProviders([
      ...providers,
      { name: newProvName.trim(), hasVoice: false, emoji: newProvEmoji },
    ]);
    setNewProvName("");
    setNewProvEmoji(EMOJIS[0]);
  }

  function removeProvider(i: number) {
    setProviders(providers.filter((_, idx) => idx !== i));
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

  const selectedLang = LANGS.find((l) => l.code === lang);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FAFAF8",
        zIndex: z.setup,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily:
          "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px 0",
          boxSizing: "border-box",
        }}
      >
        <span
          class="font-brand"
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1A1A1A",
            letterSpacing: "-0.02em",
          }}
        >
          OwnVoice
        </span>
        <button
          onClick={() => {
            // Confirm before discarding setup — otherwise a tremor-tap loses
            // everything (WCAG 3.3.6 AAA Error Prevention).
            if (window.confirm("Skip setup? You can finish this later in Settings.")) {
              finish();
            }
          }}
          aria-label="Skip setup"
          style={{
            background: "none",
            border: "none",
            color: "#4B5563",
            fontSize: 16,
            cursor: "pointer",
            padding: "8px 12px",
            fontFamily: "inherit",
          }}
        >
          Skip &rarr;
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 700,
          padding: "16px 24px 0",
          boxSizing: "border-box",
          display: "flex",
          gap: 6,
        }}
      >
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ flex: 1 }} aria-current={i === step ? "step" : undefined}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: i <= step ? STEP_COLORS[i] : "#6B7280",
                transition: "background 0.2s",
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: i === step ? STEP_COLORS[i] : "#4B5563",
                marginTop: 4,
                fontWeight: i === step ? 600 : 400,
                textAlign: "center",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Step content — scrollable; extra scroll-padding-bottom ensures focused
          inputs aren't obscured by the fixed bottom action bar (2.4.12 AAA). */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 700,
          overflowY: "auto",
          padding: "24px 24px 120px",
          boxSizing: "border-box",
          scrollPaddingBottom: 120,
        }}
      >
        {step === 0 && (
          <StepPatient
            name={name}
            setName={setName}
            bed={bed}
            setBed={setBed}
            lang={lang}
            setLang={setLang}
          />
        )}
        {step === 1 && (
          <StepVoice
            patientName={name}
            patientVoice={patientVoice}
            setPatientVoice={setPatientVoice}
            fallbackVoice={fallbackVoice}
            setFallbackVoice={setFallbackVoice}
            lang={lang}
          />
        )}
        {step === 2 && (
          <StepCareTeam
            providers={providers}
            newProvName={newProvName}
            setNewProvName={setNewProvName}
            newProvEmoji={newProvEmoji}
            setNewProvEmoji={setNewProvEmoji}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            addProvider={addProvider}
            removeProvider={removeProvider}
            toggleProviderVoice={toggleProviderVoice}
            setProviderEmbedding={setProviderEmbedding}
            lang={lang}
          />
        )}
        {step === 3 && (
          <StepConfirm
            name={name}
            bed={bed}
            lang={selectedLang}
            patientVoice={patientVoice}
            providers={providers}
            pin={pin}
            setPin={setPin}
          />
        )}
      </div>

      {/* Bottom buttons */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          maxWidth: 700,
          display: "flex",
          gap: 12,
          padding: "16px 24px",
          boxSizing: "border-box",
          background: "linear-gradient(transparent, #FAFAF8 20%)",
          paddingTop: 40,
        }}
      >
        {step > 0 && (
          <Btn
            onClick={back}
            style={{
              flex: 1,
              padding: "16px 24px",
              borderRadius: 14,
              border: "1px solid #D1D5DB",
              background: "#FFFFFF",
              color: "#1A1A1A",
              fontSize: 18,
              fontWeight: 600,
              fontFamily: "inherit",
              minHeight: 56,
            }}
          >
            Back
          </Btn>
        )}
        <Btn
          onClick={next}
          style={{
            flex: step > 0 ? 2 : 1,
            padding: "16px 24px",
            borderRadius: 14,
            border: "none",
            background: STEP_COLORS[step],
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "inherit",
            minHeight: 56,
          }}
        >
          {step === 3 ? "Start OwnVoice" : "Continue"}
        </Btn>
      </div>
    </div>
  );
}

/* ---------- Step 0: Patient Info ---------- */

function StepPatient({
  name,
  setName,
  bed,
  setBed,
  lang,
  setLang,
}: {
  name: string;
  setName: (v: string) => void;
  bed: string;
  setBed: (v: string) => void;
  lang: string;
  setLang: (v: string) => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        Welcome to OwnVoice
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        Let's set up your communication board. Everything stays on this device.
      </p>

      <label htmlFor="setup-name" style={labelStyle}>Patient name</label>
      <input
        id="setup-name"
        type="text"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        placeholder="First name or preferred name"
        style={inputStyle}
      />

      <label htmlFor="setup-bed" style={{ ...labelStyle, marginTop: 20 }}>Bed / Room</label>
      <input
        id="setup-bed"
        type="text"
        value={bed}
        onInput={(e) => setBed((e.target as HTMLInputElement).value)}
        placeholder="e.g. 4B-12"
        style={inputStyle}
      />

      {/* "Language" labels a group of buttons, not a single input — use <div> */}
      <div style={{ ...labelStyle, marginTop: 20 }}>Language</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
          marginTop: 8,
        }}
      >
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 12,
              border:
                lang === l.code ? "2px solid #2563EB" : "1px solid #E5E7EB",
              background: lang === l.code ? "#EFF6FF" : "#FFFFFF",
              cursor: "pointer",
              fontSize: 16,
              color: "#1A1A1A",
              fontFamily: "inherit",
              minHeight: 48,
            }}
          >
            <span style={{ fontSize: 22 }}>{l.flag}</span>
            <span style={{ fontWeight: lang === l.code ? 600 : 400 }}>
              {l.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 1: Voice Sample ---------- */

function StepVoice({
  patientName,
  patientVoice,
  setPatientVoice,
  fallbackVoice,
  setFallbackVoice,
  lang,
}: {
  patientName: string;
  patientVoice: boolean;
  setPatientVoice: (v: boolean) => void;
  fallbackVoice: FallbackVoice | null;
  setFallbackVoice: (v: FallbackVoice | null) => void;
  lang: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        Voice sample
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 8px" }}>
        Capture a voice sample so OwnVoice can speak in the patient's own voice.
        This step is optional.
      </p>
      <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 28px" }}>
        Voice cloning runs entirely on-device. No audio leaves this tablet.
      </p>

      <VoiceCapture
        label="Patient"
        hasVoice={patientVoice}
        onCapture={(_blob, embedding) => {
          setPatientVoice(true);
          if (embedding) useSettingsStore.getState().setSpeakerData(embedding);
        }}
        onRemove={() => setPatientVoice(false)}
        locale={lang}
      />

      <div style={{ marginTop: 36 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
          Backup voice
        </h3>
        <p style={{ fontSize: 15, color: "#4B5563", margin: "0 0 6px" }}>
          Choose a system voice to use while the voice clone loads, or if no
          sample is recorded. Tap a voice to hear a preview.
        </p>
        <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 16px" }}>
          This uses your device's built-in text-to-speech.
        </p>

        <FallbackVoicePicker
          selectedVoice={fallbackVoice}
          onSelect={setFallbackVoice}
          lang={lang}
        />
      </div>
    </div>
  );
}

/* ---------- Step 2: Care Team ---------- */

function StepCareTeam({
  providers,
  newProvName,
  setNewProvName,
  newProvEmoji,
  setNewProvEmoji,
  showEmojiPicker,
  setShowEmojiPicker,
  addProvider,
  removeProvider,
  toggleProviderVoice,
  setProviderEmbedding,
  lang,
}: {
  providers: Provider[];
  newProvName: string;
  setNewProvName: (v: string) => void;
  newProvEmoji: string;
  setNewProvEmoji: (v: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  addProvider: () => void;
  removeProvider: (i: number) => void;
  toggleProviderVoice: (index: number, hasVoice: boolean) => void;
  setProviderEmbedding: (index: number, embedding: unknown) => void;
  lang: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        Care team
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        Add the providers who will be caring for this patient.
      </p>

      {/* Provider list */}
      {providers.map((p, i) => (
        <div
          key={i}
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            border: "1px solid #E5E7EB",
            marginBottom: 8,
            overflow: "hidden",
          }}
        >
          {/* Provider header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
            }}
          >
            <span style={{ fontSize: 28 }}>{p.emoji ?? "\uD83E\uDDD1\u200D\u2695\uFE0F"}</span>
            <span style={{ flex: 1, fontSize: 17, fontWeight: 500, color: "#1A1A1A" }}>
              {p.name}
            </span>
            <button
              onClick={() => removeProvider(i)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: "#4B5563",
                padding: "4px 8px",
                fontFamily: "inherit",
              }}
            >
              {"\u2715"}
            </button>
          </div>
          {/* Voice capture inline */}
          <div style={{ padding: "0 16px 12px" }}>
            <VoiceCapture
              label={p.name}
              hasVoice={p.hasVoice}
              hasEmbedding={!!p.embedding}
              onCapture={(_blob, embedding) => {
                toggleProviderVoice(i, true);
                if (embedding) setProviderEmbedding(i, embedding);
              }}
              onRemove={() => { toggleProviderVoice(i, false); }}
              locale={lang}
              compact
            />
          </div>
        </div>
      ))}

      {/* Add provider form */}
      <div
        style={{
          marginTop: providers.length > 0 ? 16 : 0,
          padding: 16,
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #E5E7EB",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          {/* Emoji selector */}
          <div style={{ position: "relative" }}>
            <div id="setup-provider-icon-label" style={{ ...labelStyle, fontSize: 13 }}>Icon</div>
            <button
              aria-labelledby="setup-provider-icon-label"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#FAFAF8",
                cursor: "pointer",
                fontSize: 28,
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
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  padding: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 4,
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      border: "none",
                      background:
                        newProvEmoji === e ? "#EFF6FF" : "transparent",
                      cursor: "pointer",
                      fontSize: 24,
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
            <label htmlFor="setup-new-provider-name" style={{ ...labelStyle, fontSize: 13 }}>Name</label>
            <input
              id="setup-new-provider-name"
              type="text"
              value={newProvName}
              onInput={(e) =>
                setNewProvName((e.target as HTMLInputElement).value)
              }
              placeholder="Dr. Smith, Nurse Jay..."
              onKeyDown={(e) => {
                if (e.key === "Enter") addProvider();
              }}
              style={{ ...inputStyle, marginTop: 0, minHeight: 56 }}
            />
          </div>

          {/* Add button */}
          <Btn
            onClick={addProvider}
            disabled={!newProvName.trim()}
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              border: "none",
              background: newProvName.trim() ? "#059669" : "#E5E7EB",
              color: newProvName.trim() ? "#FFFFFF" : "#9CA3AF",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
              minHeight: 56,
              whiteSpace: "nowrap",
            }}
          >
            Add
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 3: Confirm ---------- */

function StepConfirm({
  name,
  bed,
  lang,
  patientVoice,
  providers,
  pin,
  setPin,
}: {
  name: string;
  bed: string;
  lang: { code: string; label: string; flag: string } | undefined;
  patientVoice: boolean;
  providers: Provider[];
  pin: string;
  setPin: (v: string) => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        Ready to go
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        Review your setup. You can change anything later in Settings.
      </p>

      {/* Summary */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          border: "1px solid #E5E7EB",
          overflow: "hidden",
        }}
      >
        <SummaryRow
          label="Patient"
          value={name || "Not set"}
          muted={!name}
        />
        <SummaryRow label="Bed / Room" value={bed || "Not set"} muted={!bed} />
        <SummaryRow
          label="Language"
          value={lang ? `${lang.flag} ${lang.label}` : "English"}
        />
        <SummaryRow
          label="Voice"
          value={patientVoice ? "Captured" : "Not captured"}
          muted={!patientVoice}
        />
        <SummaryRow
          label="Care team"
          value={
            providers.length > 0
              ? providers.map((p) => `${p.emoji ?? ""} ${p.name}`).join(", ")
              : "None added"
          }
          muted={providers.length === 0}
          last
        />
      </div>

      {/* PIN */}
      <div style={{ marginTop: 28 }}>
        <label htmlFor="setup-pin" style={labelStyle}>Staff PIN (optional)</label>
        <p
          style={{
            fontSize: 14,
            color: "#4B5563",
            margin: "4px 0 12px",
          }}
        >
          Set a 4-digit PIN to protect provider settings.
        </p>
        <input
          id="setup-pin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onInput={(e) => {
            const v = (e.target as HTMLInputElement).value.replace(/\D/g, "");
            setPin(v.slice(0, 4));
          }}
          placeholder="1234"
          style={{
            ...inputStyle,
            maxWidth: 160,
            textAlign: "center",
            letterSpacing: "0.3em",
            fontSize: 24,
          }}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  last,
}: {
  label: string;
  value: string;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: last ? "none" : "1px solid #F3F4F6",
      }}
    >
      <span style={{ fontSize: 15, color: "#4B5563" }}>{label}</span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: muted ? "#4B5563" : "#1A1A1A",
          textAlign: "right",
          maxWidth: "60%",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ---------- Shared styles ---------- */

const labelStyle: Record<string, string | number> = {
  display: "block",
  fontSize: 15,
  fontWeight: 600,
  color: "#1A1A1A",
  marginBottom: 6,
};

const inputStyle: Record<string, string | number> = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #D1D5DB",
  background: "#FFFFFF",
  fontSize: 17,
  color: "#1A1A1A",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
