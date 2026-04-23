import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { getEmojiFPS, getPainDescriptors, getBodyRegions, composePainSentence, t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import { painColors } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
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
  const [location, setLocation] = useState<PhraseKey | null>(null);
  // Single-slot hover key — only one tile is under the cursor at a time.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const assistive = useSettingsStore((s) => s.cfg?.assistiveInput === true);

  const onTileEnter = (key: string) => (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") setHoveredKey(key);
  };
  const onTileLeave = () => setHoveredKey(null);

  // Hover wash on pain tiles — a translucent overlay tint, stronger in assistive mode.
  const hoverBg = assistive
    ? (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(220,38,38,0.06)")
    : (theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(220,38,38,0.03)");

  const EMOJI_FPS = getEmojiFPS();
  const PAIN_DESCRIPTORS = getPainDescriptors();
  const BODY_REGIONS = getBodyRegions();

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

  function handleLocation(regionKey: PhraseKey) {
    setLocation(regionKey);
    setStep("descriptor");
  }

  function handleDescriptor(descriptorKey: PhraseKey) {
    const sentence = composePainSentence({
      locale,
      descriptorKey,
      regionKey: location!,
      severity: severity!,
    });
    onSelect(sentence);
    reset();
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

  // Back navigation is available via the breadcrumb — past steps are
  // rendered as buttons that call goToStep. A redundant Back button
  // above each grid duplicated that affordance and pushed the phrase
  // grid below the fold on shorter viewports.

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
            // Breathing room so focus rings on edge buttons aren't clipped
            // by the scroll container's overflow boundary (WCAG 2.4.11/2.4.13).
            padding: 4,
          }}
        >
          {EMOJI_FPS.map((face) => {
            const key = `sev-${face.n}`;
            const isHovered = hoveredKey === key;
            return (
            <Btn
              key={face.n}
              onClick={() => handleSeverity(face.n)}
              onPointerEnter={onTileEnter(key)}
              onPointerLeave={onTileLeave}
              aria-label={`Pain level ${face.n}, ${resolvePhrase(face.labelKey, locale)}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 80,
                minHeight: 80,
                background: isHovered ? hoverBg : t.card,
                border: `3px solid ${painColors[face.n]}`,
                borderRadius: 16,
                padding: 8,
                cursor: "pointer",
                transition: "background 0.12s ease",
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
                {resolvePhrase(face.labelKey, locale)}
              </span>
            </Btn>
            );
          })}
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
            // Breathing room so focus rings on edge buttons aren't clipped
            // by the scroll container's overflow boundary (WCAG 2.4.11/2.4.13).
            padding: 4,
          }}
        >
          {BODY_REGIONS.map((region) => {
            const hk = `loc-${region.key}`;
            const isHovered = hoveredKey === hk;
            return (
            <Btn
              key={region.key}
              onClick={() => handleLocation(region.key)}
              onPointerEnter={onTileEnter(hk)}
              onPointerLeave={onTileLeave}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 64,
                minHeight: 64,
                background: isHovered ? hoverBg : t.card,
                border: `2px solid ${t.border}`,
                borderRadius: 12,
                padding: "12px 8px",
                cursor: "pointer",
                transition: "background 0.12s ease",
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
                {resolvePhrase(region.key, locale)}
              </span>
            </Btn>
            );
          })}
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
          padding: 4,
        }}
      >
        {PAIN_DESCRIPTORS.map((desc) => {
          const hk = `desc-${desc.key}`;
          const isHovered = hoveredKey === hk;
          return (
          <Btn
            key={desc.key}
            onClick={() => handleDescriptor(desc.key)}
            onPointerEnter={onTileEnter(hk)}
            onPointerLeave={onTileLeave}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 64,
              minHeight: 64,
              background: isHovered ? hoverBg : t.card,
              border: `2px solid ${t.border}`,
              borderRadius: 12,
              padding: "12px 8px",
              cursor: "pointer",
              transition: "background 0.12s ease",
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
              {resolvePhrase(desc.key, locale)}
            </span>
          </Btn>
          );
        })}
      </div>
    </div>
  );
}
