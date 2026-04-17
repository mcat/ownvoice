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
  const inactiveBar = theme === "dark" ? "rgba(255,255,255,0.12)" : "#E5E7EB";
  const inactiveText = theme === "dark" ? "#9CA3AF" : "#9CA3AF";
  const breadcrumb = (
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
                fontSize: 12,
                color: isCurrent ? PAIN_COLOR : inactiveText,
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
          <div key={s} style={{ flex: 1 }}>
            {content}
          </div>
        );
      })}
    </div>
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
      <div style={{ padding: 8, animation: "fadeUp 0.25s ease-out backwards" }}>
        {breadcrumb}
        <p class="font-sans" style={{ color: t.sub, fontSize: 18, margin: "0 0 16px" }}>
          How much pain do you have?
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {EMOJI_FPS.map((face) => (
            <Btn
              key={face.n}
              onClick={() => handleSeverity(face.n)}
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
      <div style={{ padding: 8, animation: "fadeUp 0.25s ease-out backwards" }}>
        {breadcrumb}
        {backButton}
        <p class="font-sans" style={{ color: t.sub, fontSize: 18, margin: "0 0 16px" }}>
          Where is your pain?
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
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
    <div style={{ padding: 8, animation: "fadeUp 0.25s ease-out backwards" }}>
      {breadcrumb}
      {backButton}
      <p class="font-sans" style={{ color: t.sub, fontSize: 18, margin: "0 0 16px" }}>
        What does the pain feel like?
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
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
