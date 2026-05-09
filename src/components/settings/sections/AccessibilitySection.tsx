import type { ComponentChildren, JSX } from "preact";
import type { AppSettings } from "../../../types";
import type { ThemeTokens } from "../../../theme/tokens";
import { usePointerFine } from "../../../hooks/usePointerFine";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { useSettingsStore } from "../../../stores/settingsStore";

interface Props {
  cfg: AppSettings;
  updateCfg: (partial: Partial<AppSettings>) => void;
  t: ThemeTokens;
}

/**
 * Accessibility settings. Assistive Input Mode is the canonical, clinician-set
 * toggle. If a fine pointer (mouse/trackball/trackpad) is detected on what is
 * otherwise a touch-primary device, show an inline hint suggesting the mode —
 * but never flip the toggle automatically. The clinician decides.
 */
export function AccessibilitySection({ cfg, updateCfg, t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const enabled = cfg.assistiveInput === true;
  const pointerFine = usePointerFine();
  const showHint = pointerFine && !enabled;

  // `keepScreenAwake` defaults to true (undefined ≡ on); the toggle
  // shows on unless explicitly set to false.
  const keepAwake = cfg.keepScreenAwake !== false;

  return (
    <Section label={resolvePhrase("ui.provider.settings.accessibility.heading", caregiverLang)} t={t}>
      <ToggleRow
        label={resolvePhrase("ui.provider.settings.accessibility.toggle_label", caregiverLang)}
        description={resolvePhrase("ui.provider.settings.accessibility.toggle_description", caregiverLang)}
        checked={enabled}
        onChange={(next) => updateCfg({ assistiveInput: next })}
        t={t}
      />
      <div style={{ height: 1, background: t.border, margin: "18px 0" }} />
      <ToggleRow
        label={resolvePhrase("ui.provider.settings.accessibility.keep_screen_awake_label", caregiverLang)}
        description={resolvePhrase("ui.provider.settings.accessibility.keep_screen_awake_description", caregiverLang)}
        checked={keepAwake}
        onChange={(next) => updateCfg({ keepScreenAwake: next })}
        t={t}
      />
      {showHint && (
        <div
          role="note"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: t.activeBg,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            fontSize: 13,
            color: t.sub,
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: t.text, fontWeight: 600 }}>
            {resolvePhrase("ui.provider.settings.accessibility.pointer_hint_strong", caregiverLang)}
          </strong>{" "}
          {resolvePhrase("ui.provider.settings.accessibility.pointer_hint_body", caregiverLang)}
        </div>
      )}
    </Section>
  );
}

/* ── Toggle row ──────────────────────────────────────────
   Real <button role="switch"> so screen readers and Switch Control
   announce it correctly. Inline-styled to stay consistent with the
   other settings sections; no external switch dependency. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  t,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  t: ThemeTokens;
}) {
  const trackW = 52;
  const trackH = 30;
  const knob = 24;
  const trackBg = checked ? "#2563EB" : t.border;
  const knobX = checked ? trackW - knob - 3 : 3;

  const trackStyle: JSX.CSSProperties = {
    position: "relative",
    width: trackW,
    height: trackH,
    borderRadius: trackH,
    background: trackBg,
    border: "none",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "background 0.15s",
  };
  const knobStyle: JSX.CSSProperties = {
    position: "absolute",
    top: (trackH - knob) / 2,
    left: knobX,
    width: knob,
    height: knob,
    borderRadius: "50%",
    background: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
    transition: "left 0.15s",
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: t.muted,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={trackStyle}
      >
        <span style={knobStyle} aria-hidden="true" />
      </button>
    </div>
  );
}

/* Local Section (duplicated across section files to keep each self-contained) */
function Section({
  label,
  t,
  children,
}: {
  label: string;
  t: ThemeTokens;
  children: ComponentChildren;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: t.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 12px",
        }}
      >
        {label}
      </h3>
      <div
        style={{
          background: t.card,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          padding: 18,
        }}
      >
        {children}
      </div>
    </div>
  );
}
