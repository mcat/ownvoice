import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { t as resolvePhrase, getProviderCategories } from "../../data/phraseRegistry";
import { useSettingsStore } from "../../stores/settingsStore";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface ProviderPanelProps {
  onSend: (text: string) => void;
  onClose: () => void;
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

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
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const PROVIDER_CATEGORIES = getProviderCategories(caregiverLang);
  const SECTION_KEYS = Object.keys(PROVIDER_CATEGORIES);

  const [activeSection, setActiveSection] = useState(SECTION_KEYS[0]);

  const provider = cfg.providers[activeProvIdx] ?? cfg.providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : resolvePhrase("ui.provider.fallback_name", caregiverLang);

  const blueText = theme === "dark" ? "#60A5FA" : "#1E40AF";
  const providerGreen = "#059669";
  const providerGreenText = theme === "dark" ? "#34D399" : "#065F46";

  const phrases = PROVIDER_CATEGORIES[activeSection] ?? [];

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
    <BottomSheet onClose={onClose} t={t}>
      <BottomSheet.Header>
        <BottomSheet.Title>{resolvePhrase("ui.provider.care_team.title", caregiverLang)}</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label={resolvePhrase("ui.provider.close_panel", caregiverLang)} />
        <div style={{ flexBasis: "100%", fontSize: 14, color: t.sub }}>
          {resolvePhrase("ui.provider.speaking_to", caregiverLang)
            .replace("{name}", cfg.patientName || resolvePhrase("ui.provider.patient_fallback", caregiverLang))
            .replace("{prov}", providerLabel)}
        </div>
      </BottomSheet.Header>

      <BottomSheet.Body>
        {cfg.providers.length > 1 && (
          <div style={chipRowStyle}>
            {cfg.providers.map((prov, idx) => (
              <Btn
                key={idx}
                onClick={() => onSelectProvider(idx)}
                style={chipStyle(idx === activeProvIdx, providerGreen)}
                aria-label={resolvePhrase("ui.provider.select_provider", caregiverLang).replace("{name}", prov.name)}
                aria-pressed={idx === activeProvIdx}
              >
                {prov.emoji ? `${prov.emoji} ` : ""}
                {prov.name}
              </Btn>
            ))}
          </div>
        )}

        <div style={chipRowStyle}>
          {SECTION_KEYS.map((key) => (
            <Btn
              key={key}
              onClick={() => setActiveSection(key)}
              style={chipStyle(key === activeSection, blueText)}
              aria-label={resolvePhrase("ui.provider.show_category", caregiverLang).replace("{key}", key)}
              aria-pressed={key === activeSection}
            >
              {key}
            </Btn>
          ))}
        </div>

        <div>
          {phrases.map((phrase, idx) => (
            <Btn
              key={idx}
              onClick={() => onSend(phrase)}
              style={phraseBtnStyle}
              aria-label={resolvePhrase("ui.provider.speak_phrase", caregiverLang).replace("{phrase}", phrase)}
            >
              {phrase}
            </Btn>
          ))}
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
