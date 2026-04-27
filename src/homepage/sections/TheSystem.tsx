import { homepageTheme as t } from "../theme";

/**
 * §2 — The system. Four pillars in a 2×2 grid. Each pillar is one
 * feature plus a short technical detail (model name + license / paper
 * citation) so a researcher can verify what's running.
 */
export function TheSystem() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
      }}
    >
      <div style={{ maxWidth: t.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: t.color.muted,
          }}
        >
          §2 &middot; The system
        </div>
        <h2
          style={{
            marginTop: 12,
            fontSize: 22,
            fontWeight: 600,
            color: t.color.text,
            letterSpacing: "-0.01em",
            maxWidth: t.bodyMaxWidth,
          }}
        >
          Four pillars, all running on the tablet &mdash; no data leaves the device.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          <Pillar
            title="Personal voice"
            body="Zero-shot voice cloning from 15 s of reference audio. Chatterbox Multilingual, 23 languages."
          />
          <Pillar
            title="Pain assessment"
            body="Emoji-FPS validated 6-face scale (Li et al., JMIR 2023)."
          />
          <Pillar
            title="Goals of care"
            body="Serious Illness Conversation Guide adapted for AAC (Ariadne Labs)."
          />
          <Pillar
            title="Listen"
            body="On-device Whisper STT captures provider speech for the patient."
          />
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        background: t.color.bg,
        border: `1px solid ${t.color.border}`,
        padding: 16,
        borderRadius: t.radius,
      }}
    >
      <div style={{ fontWeight: 600, color: t.color.text }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          color: t.color.body,
          lineHeight: 1.5,
          marginTop: 6,
        }}
      >
        {body}
      </div>
    </div>
  );
}
