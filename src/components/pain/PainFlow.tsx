import { useState } from "preact/hooks";
import type { JSX } from "preact";
import { Btn } from "../shared/Btn";
import { getEmojiFPS, getPainDescriptors, getBodyRegions, composePainSentence, t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import { DualLocaleText } from "../shared/DualLocaleText";
import { painColors } from "../../theme/tokens";
import { useSettingsStore, useActivePatient } from "../../stores/settingsStore";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";

type Step = "severity" | "location" | "descriptor";

interface PainFlowProps {
  onSelect: (text: string, opts?: { gloss?: string; icon?: string }) => void;
  t: ThemeTokens;
  theme: ThemeName;
}

const STEPS: Step[] = ["severity", "location", "descriptor"];

const STEP_LABEL_KEYS: Record<Step, PhraseKey> = {
  severity: "pain.step.severity",
  location: "pain.step.location",
  descriptor: "pain.step.descriptor",
};

export function PainFlow({ onSelect, t, theme }: PainFlowProps) {
  const [step, setStep] = useState<Step>("severity");
  const [severity, setSeverity] = useState<number | null>(null);
  const [location, setLocation] = useState<PhraseKey | null>(null);
  // Single-slot hover key — only one tile is under the cursor at a time.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const cfg = useSettingsStore((s) => s.cfg);
  const active = useActivePatient();
  const patientLang = active?.patientLang ?? "en";
  const caregiverLang = cfg?.caregiverLang ?? "en";
  const assistive = cfg?.assistiveInput === true;

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
      locale: patientLang,
      descriptorKey,
      regionKey: location!,
      severity: severity!,
    });
    // Compose gloss in the opposite locale for thread dual-locale display
    const gloss = caregiverLang !== patientLang
      ? composePainSentence({
          locale: caregiverLang,
          descriptorKey,
          regionKey: location!,
          severity: severity!,
        })
      : undefined;
    // Decorative pain face for the thread bubble — same emoji the patient
    // tapped in the severity step. Matches Emoji-FPS (Li et al. JMIR 2023):
    // n is the 0/2/4/6/8/10 severity. Falls back to undefined if the
    // current severity isn't a valid face value.
    const icon = EMOJI_FPS.find((f) => f.n === severity)?.face;
    onSelect(sentence, { gloss, icon });
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
    <nav
      aria-label={resolvePhrase("ui.patient.pain.breadcrumb_aria", patientLang)}
      style={{ marginBottom: 16 }}
    >
      {/* Visible step-of-total cue + SR-accessible aria-current below */}
      <div
        class="font-sans"
        style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}
      >
        {resolvePhrase("ui.patient.pain.step_of", patientLang).replace("{n}", String(currentIndex + 1)).replace("{total}", String(STEPS.length))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
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
                {resolvePhrase(STEP_LABEL_KEYS[s], patientLang)}
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
                aria-label={resolvePhrase("ui.patient.pain.back_to", patientLang).replace("{label}", resolvePhrase(STEP_LABEL_KEYS[s], patientLang))}
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
    </nav>
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
        <h2 id="pain-severity-heading" class="font-sans" style={{ color: t.sub, margin: "0 0 16px", flexShrink: 0 }}>
          <DualLocaleText variant="co-read" primaryKey="ui.dual.pain.heading.severity" primaryLocale={patientLang} glossLocale={caregiverLang} style={{ fontSize: 18, fontWeight: 600 }} />
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="pain-severity-heading"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            // Two rows share whatever vertical space the parent flex column
            // grants. minmax(80px, 1fr) keeps each row at the WCAG touch
            // floor on tiny viewports while expanding to fill on larger ones.
            gridTemplateRows: "repeat(2, minmax(80px, 1fr))",
            gap: 12,
            flex: 1,
            minHeight: 0,
            // overflowY:auto remains as a safety net: if even the 80px
            // row floor doesn't fit (extreme zoom, very short viewport),
            // the grid can scroll rather than clip behind the nav.
            overflowY: "auto",
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
              role="radio"
              aria-checked={severity === face.n}
              aria-label={resolvePhrase("ui.patient.pain.level_aria", patientLang).replace("{n}", String(face.n)).replace("{label}", resolvePhrase(face.labelKey, patientLang))}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 80,
                background: isHovered ? hoverBg : t.card,
                border: `3px solid ${painColors[face.n]}`,
                borderRadius: 16,
                padding: "10px 8px",
                cursor: "pointer",
                transition: "background 0.12s ease",
              }}
            >
              <span style={{ fontSize: 40, lineHeight: 1 }}>{face.face}</span>
              {/* Single composed label per PhraseButton's contract: the
                  clinical Emoji-FPS scale value (0/2/4/6/8/10) and the
                  descriptive text share one 18/600 line, so all three
                  Pain steps render with identical typography. */}
              <span
                class="font-sans"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: t.text,
                  marginTop: 8,
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {face.n} · {resolvePhrase(face.labelKey, patientLang)}
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
        <h2 id="pain-location-heading" class="font-sans" style={{ color: t.sub, margin: "0 0 16px", flexShrink: 0 }}>
          <DualLocaleText variant="co-read" primaryKey="ui.dual.pain.heading.location" primaryLocale={patientLang} glossLocale={caregiverLang} style={{ fontSize: 18, fontWeight: 600 }} />
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="pain-location-heading"
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
              role="radio"
              aria-checked={location === region.key}
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
                  fontSize: 18,
                  fontWeight: 600,
                  color: t.text,
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {resolvePhrase(region.key, patientLang)}
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
      <h2 id="pain-descriptor-heading" class="font-sans" style={{ color: t.sub, margin: "0 0 16px", flexShrink: 0 }}>
        <DualLocaleText variant="co-read" primaryKey="ui.dual.pain.heading.descriptor" primaryLocale={patientLang} glossLocale={caregiverLang} style={{ fontSize: 18, fontWeight: 600 }} />
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="pain-descriptor-heading"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          // 9 descriptors → 3 rows. Same shared-space pattern as severity:
          // rows divide available vertical space, with an 80px touch floor.
          gridTemplateRows: "repeat(3, minmax(80px, 1fr))",
          gap: 12,
          flex: 1,
          minHeight: 0,
          // Safety net for viewports too short to fit even the floor.
          overflowY: "auto",
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
            role="radio"
            aria-checked={false}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 64,
              background: isHovered ? hoverBg : t.card,
              border: `2px solid ${t.border}`,
              borderRadius: 12,
              padding: "12px 8px",
              cursor: "pointer",
              transition: "background 0.12s ease",
            }}
          >
            <span style={{ fontSize: 40, lineHeight: 1 }}>{desc.icon}</span>
            <span
              class="font-sans"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: t.text,
                marginTop: 8,
                textAlign: "center",
                lineHeight: 1.35,
              }}
            >
              {resolvePhrase(desc.key, patientLang)}
            </span>
          </Btn>
          );
        })}
      </div>
    </div>
  );
}
