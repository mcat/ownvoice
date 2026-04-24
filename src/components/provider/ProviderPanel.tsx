import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { AppSettings } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { t as resolvePhrase, getKeyedProviderCategories } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/locales/en";
import { useSettingsStore, useActivePatient } from "../../stores/settingsStore";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface ProviderPanelProps {
  onSend: (text: string, opts?: { key?: PhraseKey }) => void;
  onClose: () => void;
  cfg: AppSettings;
  t: ThemeTokens;
  theme: ThemeName;
  activeProvIdx: number;
  onSelectProvider: (idx: number) => void;
}

/**
 * Interpolate the localized "Speaking to {name} as {prov}" template with
 * bold JSX spans. Splitting on the placeholder tokens preserves whatever
 * word order the destination language uses (Spanish "Hablando con {name}
 * como {prov}" and English differ in word order but share {name}/{prov}
 * as anchor tokens). A previous fix replaced the placeholders via String
 * .replace() which worked for text but lost the <strong> emphasis — see
 * PR 2 visual-regression note.
 */
function renderSpeakingTo(
  template: string,
  name: string,
  prov: string,
  provColor: string,
): JSX.Element[] {
  const tokens = template.split(/(\{name\}|\{prov\})/);
  return tokens.map((tok, i) => {
    if (tok === "{name}") return <strong key={i}>{name}</strong>;
    if (tok === "{prov}")
      return (
        <strong key={i} style={{ color: provColor }}>
          {prov}
        </strong>
      );
    return <span key={i}>{tok}</span>;
  });
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
  const active = useActivePatient();
  const PROVIDER_CATEGORIES = getKeyedProviderCategories(caregiverLang);
  const SECTION_KEYS = Object.keys(PROVIDER_CATEGORIES);

  const [activeSection, setActiveSection] = useState(SECTION_KEYS[0]);

  const provider = cfg.providers[activeProvIdx] ?? cfg.providers[0];
  const providerLabel = provider
    ? `${provider.emoji ?? ""} ${provider.name}`.trim()
    : resolvePhrase("ui.provider.fallback_name", caregiverLang);

  const blueText = theme === "dark" ? "#60A5FA" : "#1E40AF";
  const providerGreen = "#059669";
  // Text color for the provider name in the "Speaking to ..." header.
  // Dark-theme variant keeps the green hue but lifts lightness so the
  // bolded name meets 7:1 AAA contrast against the activeBg card.
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
          {renderSpeakingTo(
            resolvePhrase("ui.provider.speaking_to", caregiverLang),
            active?.name || resolvePhrase("ui.provider.patient_fallback", caregiverLang),
            providerLabel,
            providerGreenText,
          )}
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
          {phrases.map((item, idx) => (
            <Btn
              key={idx}
              onClick={() => (item.key ? onSend(item.text, { key: item.key }) : onSend(item.text))}
              style={phraseBtnStyle}
              aria-label={resolvePhrase("ui.provider.speak_phrase", caregiverLang).replace("{phrase}", item.text)}
            >
              {item.text}
            </Btn>
          ))}
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}
