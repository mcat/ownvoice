import { useState } from "preact/hooks";
import type { AppSettings, FallbackVoice, Patient, Provider } from "../../types";
import type { SpeakerData } from "../../models/types";
import { LANGS } from "../../data/phrases";
import { z } from "../../theme/z";
import { Btn } from "../shared/Btn";
import { VoiceCapture } from "../shared/VoiceCapture";
import { FallbackVoicePicker } from "../shared/FallbackVoicePicker";
import { useSettingsStore } from "../../stores/settingsStore";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import { confirm } from "../shared/ConfirmDialog";
import * as audioCacheRunner from "../../models/audioCacheRunner";

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

const FIRST_RUN_STEP_KEYS: PhraseKey[] = [
  "ui.provider.setup.steps.patient",
  "ui.provider.setup.steps.voice",
  "ui.provider.setup.steps.care_team",
  "ui.provider.setup.steps.confirm",
];
const FIRST_RUN_STEP_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706"];

const ADD_PATIENT_STEP_KEYS: PhraseKey[] = [
  "ui.provider.setup.steps.patient",
  "ui.provider.setup.steps.voice",
  "ui.provider.setup.steps.confirm",
];
const ADD_PATIENT_STEP_COLORS = ["#2563EB", "#7C3AED", "#D97706"];

function defaults(): AppSettings {
  const now = Date.now();
  const patient: Patient = {
    id: crypto.randomUUID(),
    name: "",
    bed: "",
    patientLang: "en",
    hasVoice: false,
    speakerData: null,
    addedAt: now,
    lastActiveAt: now,
  };
  return {
    caregiverLang: "en",
    pin: "",
    providers: [],
    patients: [patient],
    activePatientId: patient.id,
  };
}

interface SetupProps {
  /** Controls which Setup flow to show. "first-run" is the default full
   *  wizard; "add-patient" shows only the patient-specific steps. */
  mode?: "first-run" | "add-patient";
  /** Called when the first-run wizard completes with a full AppSettings. */
  onFirstRunDone?: (cfg: AppSettings) => void;
  /** Called when the add-patient flow completes with the new Patient. */
  onAddPatientDone?: (patient: Patient) => void;
  /** Called when the user cancels the add-patient flow (via Skip). */
  onCancel?: () => void;
}

export function Setup({ mode = "first-run", onFirstRunDone, onAddPatientDone, onCancel }: SetupProps) {
  const isAddPatient = mode === "add-patient";
  const stepLabelKeys = isAddPatient ? ADD_PATIENT_STEP_KEYS : FIRST_RUN_STEP_KEYS;
  const stepColors = isAddPatient ? ADD_PATIENT_STEP_COLORS : FIRST_RUN_STEP_COLORS;
  const maxStep = stepLabelKeys.length - 1;

  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bed, setBed] = useState("");
  const [lang, setLang] = useState("en");
  const [patientVoice, setPatientVoice] = useState(false);
  const [speakerData, setSpeakerData] = useState<unknown>(null);
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);
  const [fallbackVoice, setFallbackVoice] = useState<FallbackVoice | null>(null);
  const [pin, setPin] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);

  // Provider editing state
  const [newProvName, setNewProvName] = useState("");
  const [newProvEmoji, setNewProvEmoji] = useState(EMOJIS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  /**
   * Maps a logical step index to the content to render.
   * first-run: 0=Patient, 1=Voice, 2=CareTeam, 3=Confirm
   * add-patient: 0=Patient, 1=Voice, 2=Confirm (Care Team skipped)
   */
  function stepContent(s: number): "patient" | "voice" | "careTeam" | "confirm" {
    if (isAddPatient) {
      if (s === 0) return "patient";
      if (s === 1) return "voice";
      return "confirm";
    }
    if (s === 0) return "patient";
    if (s === 1) return "voice";
    if (s === 2) return "careTeam";
    return "confirm";
  }

  function finish() {
    if (isAddPatient) {
      audioCacheRunner.pauseAll();
      const patient = useSettingsStore.getState().addPatient({
        name,
        bed,
        patientLang: lang,
        hasVoice: patientVoice,
        speakerData: speakerData ?? null,
        fallbackVoice,
        pendingVoiceBlob: pendingBlob,
      });
      onAddPatientDone?.(patient);
    } else {
      const now = Date.now();
      const patient: Patient = {
        id: crypto.randomUUID(),
        name,
        bed,
        patientLang: lang,
        hasVoice: patientVoice,
        speakerData: speakerData ?? null,
        fallbackVoice,
        pendingVoiceBlob: pendingBlob,
        addedAt: now,
        lastActiveAt: now,
      };
      onFirstRunDone?.({
        caregiverLang: "en",
        pin,
        providers,
        patients: [patient],
        activePatientId: patient.id,
      });
    }
  }

  function next() {
    if (step < maxStep) setStep(step + 1);
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
          onClick={async () => {
            // Confirm before discarding setup — otherwise a tremor-tap loses
            // everything (WCAG 3.3.6 AAA Error Prevention).
            const bodyKey = isAddPatient
              ? "ui.provider.setup.skip_dialog.body_add_patient" as const
              : "ui.provider.setup.skip_dialog.body" as const;
            const ok = await confirm({
              title: resolvePhrase("ui.provider.setup.skip_dialog.title", caregiverLang),
              body: resolvePhrase(bodyKey, caregiverLang),
              confirmLabel: resolvePhrase("ui.provider.setup.skip_dialog.confirm", caregiverLang),
              cancelLabel: resolvePhrase("ui.provider.setup.skip_dialog.cancel", caregiverLang),
            });
            if (ok) {
              if (isAddPatient) {
                onCancel?.();
              } else {
                finish();
              }
            }
          }}
          aria-label={resolvePhrase("ui.provider.setup.skip_aria", caregiverLang)}
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
          {resolvePhrase("ui.provider.setup.skip", caregiverLang)}
        </button>
      </div>

      {/* Progress bar */}
      <nav
        aria-label={resolvePhrase("ui.provider.setup.progress_aria", caregiverLang)}
        style={{
          width: "100%",
          maxWidth: 700,
          padding: "16px 24px 0",
          boxSizing: "border-box",
          display: "flex",
          gap: 6,
        }}
      >
        {stepLabelKeys.map((key, i) => (
          <div key={i} style={{ flex: 1 }} aria-current={i === step ? "step" : undefined}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: i <= step ? stepColors[i] : "#6B7280",
                transition: "background 0.2s",
              }}
            />
            <div
              style={{
                fontSize: 13,
                color: i === step ? stepColors[i] : "#4B5563",
                marginTop: 4,
                fontWeight: i === step ? 600 : 400,
                textAlign: "center",
              }}
            >
              {resolvePhrase(key, caregiverLang)}
            </div>
          </div>
        ))}
      </nav>

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
        {stepContent(step) === "patient" && (
          <StepPatient
            name={name}
            setName={setName}
            bed={bed}
            setBed={setBed}
            lang={lang}
            setLang={setLang}
            caregiverLang={caregiverLang}
          />
        )}
        {stepContent(step) === "voice" && (
          <StepVoice
            patientName={name}
            patientVoice={patientVoice}
            speakerData={speakerData}
            setPatientVoice={setPatientVoice}
            setSpeakerData={setSpeakerData}
            setPendingBlob={setPendingBlob}
            fallbackVoice={fallbackVoice}
            setFallbackVoice={setFallbackVoice}
            lang={lang}
            caregiverLang={caregiverLang}
          />
        )}
        {stepContent(step) === "careTeam" && (
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
            caregiverLang={caregiverLang}
          />
        )}
        {stepContent(step) === "confirm" && (
          <StepConfirm
            name={name}
            bed={bed}
            lang={selectedLang}
            patientVoice={patientVoice}
            providers={providers}
            pin={pin}
            setPin={setPin}
            caregiverLang={caregiverLang}
            hidePin={isAddPatient}
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
            {resolvePhrase("ui.provider.setup.back", caregiverLang)}
          </Btn>
        )}
        <Btn
          onClick={next}
          style={{
            flex: step > 0 ? 2 : 1,
            padding: "16px 24px",
            borderRadius: 14,
            border: "none",
            background: stepColors[step],
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "inherit",
            minHeight: 56,
          }}
        >
          {step === maxStep ? resolvePhrase("ui.provider.setup.start", caregiverLang) : resolvePhrase("ui.provider.setup.continue", caregiverLang)}
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
  caregiverLang,
}: {
  name: string;
  setName: (v: string) => void;
  bed: string;
  setBed: (v: string) => void;
  lang: string;
  setLang: (v: string) => void;
  caregiverLang: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.setup.step0.heading", caregiverLang)}
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        {resolvePhrase("ui.provider.setup.step0.subhead", caregiverLang)}
      </p>

      <label htmlFor="setup-name" style={labelStyle}>{resolvePhrase("ui.provider.setup.step0.name_label", caregiverLang)}</label>
      <input
        id="setup-name"
        type="text"
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
        placeholder={resolvePhrase("ui.provider.setup.step0.name_placeholder", caregiverLang)}
        style={inputStyle}
      />

      <label htmlFor="setup-bed" style={{ ...labelStyle, marginTop: 20 }}>{resolvePhrase("ui.provider.setup.step0.bed_label", caregiverLang)}</label>
      <input
        id="setup-bed"
        type="text"
        value={bed}
        onInput={(e) => setBed((e.target as HTMLInputElement).value)}
        placeholder={resolvePhrase("ui.provider.setup.step0.bed_placeholder", caregiverLang)}
        style={inputStyle}
      />

      {/* "Language" labels a group of buttons, not a single input — use <div> */}
      <div id="setup-lang-label" style={{ ...labelStyle, marginTop: 20 }}>{resolvePhrase("ui.provider.setup.step0.language_label", caregiverLang)}</div>
      <div
        role="radiogroup"
        aria-labelledby="setup-lang-label"
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
            role="radio"
            aria-checked={lang === l.code}
            onClick={() => setLang(l.code)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 12,
              border:
                lang === l.code ? "2px solid #2563EB" : "1px solid #E5E7EB",
              background: lang === l.code ? "#EFF6FF" : "#FFFFFF",
              cursor: "pointer",
              color: "#1A1A1A",
              fontFamily: "inherit",
              minHeight: 64,
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{l.flag}</span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1, minWidth: 0, overflow: "hidden" }}>
              <span style={{ fontWeight: lang === l.code ? 600 : 500, fontSize: 14 }}>{l.englishLabel}</span>
              {l.englishLabel !== l.label && (
                <span style={{ fontWeight: 400, color: "#6B7280", fontSize: 11 }}>{l.label}</span>
              )}
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
  speakerData,
  setPatientVoice,
  setSpeakerData,
  setPendingBlob,
  fallbackVoice,
  setFallbackVoice,
  lang,
  caregiverLang,
}: {
  patientName: string;
  patientVoice: boolean;
  speakerData: unknown;
  setPatientVoice: (v: boolean) => void;
  setSpeakerData: (data: unknown) => void;
  setPendingBlob: (b: string | null) => void;
  fallbackVoice: FallbackVoice | null;
  setFallbackVoice: (v: FallbackVoice | null) => void;
  lang: string;
  caregiverLang: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.setup.step1.heading", caregiverLang)}
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.setup.step1.body1", caregiverLang)}
      </p>
      <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 28px" }}>
        {resolvePhrase("ui.provider.setup.step1.body2", caregiverLang)}
      </p>

      <VoiceCapture
        label={resolvePhrase("ui.provider.setup.step1.patient_label", caregiverLang)}
        hasVoice={patientVoice}
        savedQuality={(speakerData as SpeakerData | null | undefined)?.quality}
        onCapture={async (blob, embedding, quality) => {
          setPatientVoice(true);
          if (embedding) setSpeakerData({ ...(embedding as SpeakerData), quality });
          const base64 = await blobToBase64(blob);
          setPendingBlob(base64);
        }}
        onRemove={() => {
          setPatientVoice(false);
          setPendingBlob(null);
        }}
        locale={lang}
      />

      <div style={{ marginTop: 36 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
          {resolvePhrase("ui.provider.setup.step1.backup_voice_heading", caregiverLang)}
        </h3>
        <p style={{ fontSize: 15, color: "#4B5563", margin: "0 0 6px" }}>
          {resolvePhrase("ui.provider.setup.step1.backup_voice_body1", caregiverLang)}
        </p>
        <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 16px" }}>
          {resolvePhrase("ui.provider.setup.step1.backup_voice_body2", caregiverLang)}
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
  caregiverLang,
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
  caregiverLang: string;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.setup.step2.heading", caregiverLang)}
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        {resolvePhrase("ui.provider.setup.step2.body", caregiverLang)}
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
              savedQuality={(p.embedding as SpeakerData | undefined)?.quality}
              onCapture={(_blob, embedding, quality) => {
                toggleProviderVoice(i, true);
                if (embedding) setProviderEmbedding(i, { ...(embedding as SpeakerData), quality });
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
            <div id="setup-provider-icon-label" style={{ ...labelStyle, fontSize: 13 }}>{resolvePhrase("ui.provider.setup.step2.icon_label", caregiverLang)}</div>
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
                role="radiogroup"
                aria-labelledby="setup-provider-icon-label"
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
                    role="radio"
                    aria-checked={newProvEmoji === e}
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
            <label htmlFor="setup-new-provider-name" style={{ ...labelStyle, fontSize: 13 }}>{resolvePhrase("ui.provider.setup.step2.name_label", caregiverLang)}</label>
            <input
              id="setup-new-provider-name"
              type="text"
              value={newProvName}
              onInput={(e) =>
                setNewProvName((e.target as HTMLInputElement).value)
              }
              placeholder={resolvePhrase("ui.provider.setup.step2.name_placeholder", caregiverLang)}
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
            {resolvePhrase("ui.provider.setup.step2.add", caregiverLang)}
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
  caregiverLang,
  hidePin,
}: {
  name: string;
  bed: string;
  lang: { code: string; label: string; englishLabel: string; flag: string } | undefined;
  patientVoice: boolean;
  providers: Provider[];
  pin: string;
  setPin: (v: string) => void;
  caregiverLang: string;
  hidePin?: boolean;
}) {
  return (
    <div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.setup.step3.heading", caregiverLang)}
      </h2>
      <p style={{ fontSize: 16, color: "#4B5563", margin: "0 0 28px" }}>
        {resolvePhrase("ui.provider.setup.step3.body", caregiverLang)}
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
          label={resolvePhrase("ui.provider.setup.step3.summary.patient", caregiverLang)}
          value={name || resolvePhrase("ui.provider.setup.step3.summary.not_set", caregiverLang)}
          muted={!name}
        />
        <SummaryRow
          label={resolvePhrase("ui.provider.setup.step3.summary.bed", caregiverLang)}
          value={bed || resolvePhrase("ui.provider.setup.step3.summary.not_set", caregiverLang)}
          muted={!bed}
        />
        <SummaryRow
          label={resolvePhrase("ui.provider.setup.step3.summary.language", caregiverLang)}
          value={lang ? `${lang.flag} ${lang.label}${lang.englishLabel !== lang.label ? ` / ${lang.englishLabel}` : ""}` : resolvePhrase("ui.provider.setup.step3.summary.language_default", caregiverLang)}
        />
        <SummaryRow
          label={resolvePhrase("ui.provider.setup.step3.summary.voice", caregiverLang)}
          value={patientVoice ? resolvePhrase("ui.provider.setup.step3.summary.captured", caregiverLang) : resolvePhrase("ui.provider.setup.step3.summary.not_captured", caregiverLang)}
          muted={!patientVoice}
        />
        <SummaryRow
          label={resolvePhrase("ui.provider.setup.step3.summary.care_team", caregiverLang)}
          value={
            providers.length > 0
              ? providers.map((p) => `${p.emoji ?? ""} ${p.name}`).join(", ")
              : resolvePhrase("ui.provider.setup.step3.summary.none_added", caregiverLang)
          }
          muted={providers.length === 0}
          last
        />
      </div>

      {/* PIN — hidden in add-patient mode (device PIN already set) */}
      {!hidePin && (
        <div style={{ marginTop: 28 }}>
          <label htmlFor="setup-pin" style={labelStyle}>{resolvePhrase("ui.provider.setup.step3.pin_label", caregiverLang)}</label>
          <p
            style={{
              fontSize: 14,
              color: "#4B5563",
              margin: "4px 0 12px",
            }}
          >
            {resolvePhrase("ui.provider.setup.step3.pin_body", caregiverLang)}
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
            placeholder={resolvePhrase("ui.provider.setup.step3.pin_placeholder", caregiverLang)}
            style={{
              ...inputStyle,
              maxWidth: 160,
              textAlign: "center",
              letterSpacing: "0.3em",
              fontSize: 24,
            }}
          />
        </div>
      )}
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

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",", 2)[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
