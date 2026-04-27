import type { ComponentChildren } from "preact";
import { homepageTheme as t } from "../theme";

/**
 * §2 — The system. Four pillars in a 2×2 grid. Each pillar is one
 * feature plus a short technical detail (model name + license / paper
 * citation) so a researcher can verify what's running. Where a pillar
 * names a paper or canonical resource, the citation is hyperlinked.
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
          <Pillar title="Personal voice">
            Zero-shot voice cloning from 15 s of reference audio.{" "}
            <CiteLink href="https://huggingface.co/ResembleAI/chatterbox-multilingual">
              Chatterbox Multilingual
            </CiteLink>
            , 23 languages.
          </Pillar>
          <Pillar title="Pain assessment">
            Emoji-FPS validated 6-face scale{" "}
            <CiteLink href="https://doi.org/10.2196/41189">(Li et al., JMIR 2023)</CiteLink>.
          </Pillar>
          <Pillar title="Goals of care">
            Serious Illness Conversation Guide adapted for AAC{" "}
            <CiteLink href="https://www.ariadnelabs.org/serious-illness-care/">
              (Ariadne Labs)
            </CiteLink>
            .
          </Pillar>
          <Pillar title="Listen">
            On-device Whisper STT captures provider speech for the patient.
          </Pillar>
        </div>
      </div>
    </section>
  );
}

function Pillar({ title, children }: { title: string; children: ComponentChildren }) {
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
        {children}
      </div>
    </div>
  );
}

function CiteLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: t.color.text, textDecoration: "underline", textUnderlineOffset: 2 }}
    >
      {children}
    </a>
  );
}
