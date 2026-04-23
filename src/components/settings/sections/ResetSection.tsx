import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { ThemeTokens, ThemeName } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { useSettingsStore } from "../../../stores/settingsStore";

interface Props {
  onReset: () => void | Promise<void>;
  t: ThemeTokens;
  theme: ThemeName;
}

export function ResetSection({ onReset, t, theme }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const [showConfirm, setShowConfirm] = useState(false);
  const isDark = theme === "dark";

  return (
    <Section label={resolvePhrase("ui.provider.settings.reset.heading", caregiverLang)} t={t}>
      {!showConfirm ? (
        <Btn
          onClick={() => setShowConfirm(true)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "1px solid #DC2626",
            background: "transparent",
            color: "#DC2626",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          {resolvePhrase("ui.provider.settings.reset.action_label", caregiverLang)}
        </Btn>
      ) : (
        <div
          style={{
            padding: 16,
            background: isDark ? "rgba(220,38,38,0.1)" : "rgba(220,38,38,0.05)",
            borderRadius: 14,
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, color: "#DC2626", margin: "0 0 8px" }}>
            {resolvePhrase("ui.provider.settings.reset.confirm_title", caregiverLang)}
          </p>
          <p style={{ fontSize: 14, color: t.sub, margin: "0 0 16px" }}>
            {resolvePhrase("ui.provider.settings.reset.confirm_body", caregiverLang)}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={() => setShowConfirm(false)}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${t.border}`,
                background: t.card,
                color: t.text,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang)}
            </Btn>
            <Btn
              onClick={onReset}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#DC2626",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              {resolvePhrase("ui.provider.settings.reset.confirm_destructive", caregiverLang)}
            </Btn>
          </div>
        </div>
      )}
    </Section>
  );
}

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
