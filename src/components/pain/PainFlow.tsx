import { useState } from "preact/hooks";
import { Btn } from "../shared/Btn";
import { getEmojiFPS, getPainDescriptors, getBodyRegions, composePainSentence } from "../../data/phraseRegistry";
import { painColors } from "../../theme/tokens";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";

type Step = "severity" | "location" | "descriptor";

interface PainFlowProps {
  onSelect: (text: string) => void;
  t: ThemeTokens;
  theme: ThemeName;
  locale?: string;
}

const STEPS: Step[] = ["severity", "location", "descriptor"];

const STEP_LABELS: Record<Step, string> = {
  severity: "Severity",
  location: "Location",
  descriptor: "Describe",
};

export function PainFlow({ onSelect, t, theme, locale = "en" }: PainFlowProps) {
  const [step, setStep] = useState<Step>("severity");
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  const EMOJI_FPS = getEmojiFPS(locale);
  const PAIN_DESCRIPTORS = getPainDescriptors(locale);
  const BODY_REGIONS = getBodyRegions(locale);

  const currentIndex = STEPS.indexOf(step);

  function reset() {
    setStep("severity");
    setSeverity(null);
    setLocation(null);
  }

  function handleSeverity(n: number) {
    setSeverity(n);
    setStep("location");
  }

  function handleLocation(region: string) {
    setLocation(region);
    setStep("descriptor");
  }

  function handleDescriptor(desc: string) {
    const sentence = composePainSentence(locale, desc, location!, severity!);
    onSelect(sentence);
    reset();
  }

  function goBack() {
    if (step === "location") {
      setStep("severity");
      setSeverity(null);
    } else if (step === "descriptor") {
      setStep("location");
      setLocation(null);
    }
  }

  function goToStep(target: Step) {
    const targetIndex = STEPS.indexOf(target);
    if (targetIndex >= currentIndex) return;
    if (target === "severity") {
      reset();
    } else if (target === "location") {
      setStep("location");
      setLocation(null);
    }
  }

  // --- Breadcrumb ---
  // Visual style mirrors the onboarding step indicator (Setup.tsx): a
  // flex row of 4-px bars, colored when the step is current-or-past,
  // with a centered label below. Past bars remain clickable so the user
  // can jump back without stepping through.
  const PAIN_COLOR = "#DC2626";
  // Dedicated text color — 7.5:1 on #FAFAF8 in light, AAA-pass in dark.
  const PAIN_COLOR_TEXT = theme === "dark" ? "#FCA5A5" : "#991B1B";
  // Inactive bar: 3:1 non-text contrast for WCAG 1.4.11 AA
  const inactiveBar = theme === "dark" ? "rgba(255,255,255,0.30)" : "#D1D5DB";
  // Inactive step label uses theme.muted which is AAA-contrast on both themes
  const inactiveText = t.muted;
  const breadcrumb = (
    <>
      {/* Visible step-of-total cue + SR-accessible aria-current below */}
      <div
        class="font-sans"
        style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}
      >
        Step {currentIndex + 1} of {STEPS.length}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {STEPS.map((s, i) => {
          const isPast = i < currentIndex;
          const isCurrent = s === step;
          const isActive = i <= currentIndex;
          const content = (
            <>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: isActive ? PAIN_COLOR : inactiveBar,
                  transition: "background 0.2s",
                }}
              />
              <div
                class="font-sans"
                style={{
                  fontSize: 13,
                  color: isCurrent ? PAIN_COLOR_TEXT : inactiveText,
                  marginTop: 4,
                  fontWeight: isCurrent ? 600 : 400,
                  textAlign: "center",
                }}
              >
                {STEP_LABELS[s]}
              </div>
            </>
          );

          if (isPast) {
            return (
              <button
                key={s}
                type="button"
                onClick={() => goToStep(s)}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                aria-label={`Go back to ${STEP_LABELS[s]}`}
              >
                {content}
              </button>
            );
          }
          return (
            <div
              key={s}
              style={{ flex: 1 }}
              aria-current={isCurrent ? "step" : undefined}
            >
              {content}
            </div>
          );
        })}
      </div>
    </>
  );

  // --- Back button ---
  const backButton = currentIndex > 0 && (
    <div style={{ marginBottom: 12 }}>
      <Btn
        onClick={goBack}
        style={{
          background: "transparent",
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: "8px 16px",
          color: t.sub,
          fontSize: 15,
          minWidth: 64,
          minHeight: 44,
          cursor: "pointer",
        }}
      >
        <span class="font-sans">Back</span>
      </Btn>
    </div>
  );

  // --- Step: Severity ---
  if (step === "severity") {
    return (
      <div
        style={{
          padding: 8,
          animation: "fadeUp 0.25s ease-out backwards",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {breadcrumb}
        <h2 class="font-sans" style={{ color: t.sub, fontSize: 18, fontWeight: 600, margin: "0 0 16px", flexShrink: 0 }}>
          How much pain do you have?
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            alignContent: "start",
          }}
        >
          {EMOJI_FPS.map((face) => (
            <Btn
              key={face.n}
              onClick={() => handleSeverity(face.n)}
              aria-label={`Pain level ${face.n}, ${face.label}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 80,
                minHeight: 80,
                background: t.card,
                border: `3px solid ${painColors[face.n]}`,
                borderRadius: 16,
                padding: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>{face.face}</span>
              <span
                class="font-sans"
                style={{
                  fontSize: 14,
                  color: t.text,
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                {face.n}
              </span>
              <span
                class="font-sans"
                style={{
                  fontSize: 12,
                  color: t.sub,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                {face.label}
              </span>
            </Btn>
          ))}
        </div>
      </div>
    );
  }

  // --- Step: Location ---
  if (step === "location") {
    return (
      <div
        style={{
          padding: 8,
          animation: "fadeUp 0.25s ease-out backwards",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {breadcrumb}
        {backButton}
        <h2 class="font-sans" style={{ color: t.sub, fontSize: 18, fontWeight: 600, margin: "0 0 16px", flexShrink: 0 }}>
          Where is your pain?
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            alignContent: "start",
          }}
        >
          {BODY_REGIONS.map((region) => (
            <Btn
              key={region}
              onClick={() => handleLocation(region)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 64,
                minHeight: 64,
                background: t.card,
                border: `2px solid ${t.border}`,
                borderRadius: 12,
                padding: "12px 8px",
                cursor: "pointer",
              }}
            >
              <span
                class="font-sans"
                style={{
                  fontSize: 16,
                  color: t.text,
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {region}
              </span>
            </Btn>
          ))}
        </div>
      </div>
    );
  }

  // --- Step: Descriptor ---
  return (
    <div
      style={{
        padding: 8,
        animation: "fadeUp 0.25s ease-out backwards",
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {breadcrumb}
      {backButton}
      <h2 class="font-sans" style={{ color: t.sub, fontSize: 18, fontWeight: 600, margin: "0 0 16px", flexShrink: 0 }}>
        What does the pain feel like?
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          alignContent: "start",
        }}
      >
        {PAIN_DESCRIPTORS.map((desc) => (
          <Btn
            key={desc.text}
            onClick={() => handleDescriptor(desc.text)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 64,
              minHeight: 64,
              background: t.card,
              border: `2px solid ${t.border}`,
              borderRadius: 12,
              padding: "12px 8px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{desc.icon}</span>
            <span
              class="font-sans"
              style={{
                fontSize: 15,
                color: t.text,
                marginTop: 6,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {desc.text}
            </span>
          </Btn>
        ))}
      </div>
    </div>
  );
}
