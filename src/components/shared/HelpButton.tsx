import { Btn } from "./Btn";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import type { ThemeTokens } from "../../theme/tokens";
import type { SpeakGlossOpts } from "../../hooks/useSpeakActions";

interface HelpButtonProps {
  /** speakAsPatient from useSpeakActions. */
  onTap: (text: string, opts?: SpeakGlossOpts) => void;
  patientLang: string;
  t: ThemeTokens;
}

/**
 * Persistent emergency phrase — DESIGN_GUIDELINES §3.4: "A persistent,
 * always-visible 'I need help' button accessible from every screen…
 * never more than one tap away." The AAC equivalent of a nurse call
 * button.
 *
 * Sizing: §3.1 calls for ≥80×80px for critical actions (Yes / No /
 * I need help). Label is 20px/800 — WCAG "large text", so the white-on-
 * helpBg pair passes AA in both themes (4.83:1 on #DC2626, 3.77:1 on
 * #EF4444).
 *
 * z-order: above the page (fixed, over content + TabBar), below modal
 * sheets (z.sheet = 1000) — every *screen* keeps help one tap away;
 * modal overlays provide their own one-tap exits.
 */
export function HelpButton({ onTap, patientLang, t }: HelpButtonProps) {
  const phrase = resolvePhrase("needs.medical.call_light", patientLang);
  return (
    <Btn
      data-testid="help-button"
      aria-label={phrase}
      onClick={() => onTap(phrase, { key: "needs.medical.call_light", icon: "🆘" })}
      style={{
        position: "fixed",
        right: 20,
        bottom: "calc(84px + env(safe-area-inset-bottom))",
        zIndex: 900,
        minWidth: 96,
        minHeight: 84,
        padding: "10px 18px",
        borderRadius: 22,
        border: "none",
        background: t.helpBg,
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: 800,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>
        🆘
      </span>
      {resolvePhrase("ui.patient.help.label", patientLang)}
    </Btn>
  );
}
