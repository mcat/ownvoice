import type { JSX } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";
import { useUIStore } from "../../../stores/uiStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { t as resolvePhrase } from "../../../data/phraseRegistry";

interface Props {
  t: ThemeTokens;
}

/**
 * Top-of-Settings nav row that pushes into the existing PatientsScreen
 * (the "switch" overlay). Stays a nav link rather than embedding the
 * 300-line patient roster inline — the per-patient kebab menus and
 * Add Patient card warrant their own sheet, and matching iPadOS Settings
 * convention (Apple ID, Wi-Fi, Cellular all push into sub-screens) keeps
 * this panel scannable.
 */
export function PatientsSection({ t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const count = useSettingsStore((s) => s.cfg?.patients.length ?? 0);

  const label = resolvePhrase("ui.provider.patients.title", caregiverLang);
  const description = resolvePhrase(
    "ui.provider.staff_sheet.patients_description",
    caregiverLang,
  );

  function handleOpen() {
    useUIStore.getState().closeOverlay("settings");
    useUIStore.getState().openOverlay("switch");
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <button type="button" onClick={handleOpen} style={rowStyle(t)}>
        <span aria-hidden="true" style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>
          {"👥"}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: t.text }}>
            {label} {count > 0 && <span style={{ fontWeight: 500, color: t.muted }}>({count})</span>}
          </span>
          <span style={{ fontSize: 13, color: t.muted, fontWeight: 500 }}>{description}</span>
        </span>
        <span aria-hidden="true" style={{ fontSize: 18, color: t.muted, lineHeight: 1 }}>
          {"›"}
        </span>
      </button>
    </section>
  );
}

function rowStyle(t: ThemeTokens): JSX.CSSProperties {
  return {
    width: "100%",
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.card,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
    color: t.text,
  };
}
