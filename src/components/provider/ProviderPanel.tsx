import { useId, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { AppSettings, Provider } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getProviderCategories } from "../../data/phraseRegistry";
import { Btn } from "../shared/Btn";
import { useDialog } from "../../hooks/useDialog";

interface ProviderPanelProps {
  onSend: (text: string) => void;
  onClose: () => void;
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

// Provider phrases are English-only (see project memory: provider_english_only.md)
const PROVIDER_CATEGORIES = getProviderCategories("en");
const SECTION_KEYS = Object.keys(PROVIDER_CATEGORIES);

/**
 * Bottom-sheet overlay showing care-team response phrases in 4 categories.
 * Provider speaks a phrase with a single tap.
 */
export function ProviderPanel({
  onSend,
  onClose,
  cfg,
  t,
  theme,
  activeProvIdx,
  onSelectProvider,
}: ProviderPanelProps) {
  const [activeSection, setActiveSection] = useState(SECTION_KEYS[0]);
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

  const provider = cfg.providers[activeProvIdx] ?? cfg.providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : "Provider";

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  // Text variant of patient blue for AAA 7:1 contrast on light card backgrounds.
  const blueText = theme === "dark" ? "#60A5FA" : "#1E40AF";
  const providerGreen = "#059669";
  // Stronger green for bold text on white to clear AAA 7:1; the base providerGreen
  // is used for UI chrome (borders, chip fills) where 3:1 non-text suffices.
  const providerGreenText = theme === "dark" ? "#34D399" : "#065F46";

  const phrases = PROVIDER_CATEGORIES[activeSection] ?? [];

  /* ── Styles ─────────────────────────────────────────── */

  const overlayStyle: JSX.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 900,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  };

  const cardStyle: JSX.CSSProperties = {
    background: t.card,
    borderRadius: "26px 26px 0 0",
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
    padding: "24px 20px 32px",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
  };

  const headerStyle: JSX.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  };

  const titleStyle: JSX.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: t.text,
    margin: 0,
  };

  const subtitleStyle: JSX.CSSProperties = {
    fontSize: 14,
    color: t.sub,
    marginTop: 2,
    marginBottom: 16,
  };

  const closeBtnStyle: JSX.CSSProperties = {
    background: t.activeBg,
    border: `1px solid ${t.border}`,
    borderRadius: 14,
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    color: t.muted,
    flexShrink: 0,
  };

  const chipRowStyle: JSX.CSSProperties = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  };

  const chipStyle = (active: boolean, color: string): JSX.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    border: active ? `2px solid ${color}` : `1px solid ${t.border}`,
    background: active ? (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)") : "transparent",
    color: active ? color : t.sub,
    textTransform: "capitalize" as const,
    minHeight: 40,
  });

  const phraseBtnStyle: JSX.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 14,
    fontSize: 17,
    lineHeight: 1.45,
    color: t.text,
    background: t.activeBg,
    border: `1px solid ${t.border}`,
    marginBottom: 8,
    transition: "background 0.12s",
  };

  return (
    // Backdrop is a passive surface: clicking it closes the dialog (mouse convenience),
    // but keyboard users close via Escape (document listener above) or the ✕ button.
    // No role/tabindex here — the backdrop is not an interactive target for AT.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div style={overlayStyle} onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 id={titleId} style={titleStyle}>Care Team</h2>
          </div>
          <Btn onClick={onClose} style={closeBtnStyle} aria-label="Close panel">
            ✕
          </Btn>
        </div>
        <div style={subtitleStyle}>
          Speaking to <strong>{cfg.patientName || "patient"}</strong> as{" "}
          <strong style={{ color: providerGreenText }}>{providerLabel}</strong>
        </div>

        {/* Provider selector chips */}
        {cfg.providers.length > 1 && (
          <div style={chipRowStyle}>
            {cfg.providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx, providerGreen)}
                aria-label={`Select ${prov.name}`}
                aria-pressed={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        )}

        {/* Section tab chips */}
        <div style={chipRowStyle}>
          {SECTION_KEYS.map((key) => (
            <Btn
              key={key}
              onClick={() => setActiveSection(key)}
              style={chipStyle(key === activeSection, blueText)}
              aria-label={`Show ${key}`}
              aria-pressed={key === activeSection}
            >
              {key}
            </Btn>
          ))}
        </div>

        {/* Phrase list */}
        <div>
          {phrases.map((phrase, idx) => (
            <Btn
              key={idx}
              onClick={() => onSend(phrase)}
              style={phraseBtnStyle}
              aria-label={`Speak: ${phrase}`}
            >
              {phrase}
            </Btn>
          ))}
        </div>
      </div>
    </div>
  );
}
