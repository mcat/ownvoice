import type { ComponentChildren } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";

interface Props {
  t: ThemeTokens;
}

export function AboutSection({ t }: Props) {
  return (
    <Section label="About" t={t}>
      <p style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: "0 0 8px" }}>
        OwnVoice v0.1
      </p>
      <p style={{ fontSize: 14, color: t.sub, margin: "0 0 4px" }}>
        In-patient AAC communication aid.
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: "0 0 4px" }}>
        Pain scale: Emoji-FPS (Li et al., JMIR 2023) — CC-BY 4.0
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>
        Goals of care: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0
      </p>
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
