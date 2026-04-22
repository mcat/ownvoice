import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ThemeTokens } from "../../../theme/tokens";

interface Props {
  t: ThemeTokens;
}

export function AboutSection({ t }: Props) {
  // SW cache names read live via `caches.keys()`. Lets a clinician (or
  // us during debugging) confirm which service-worker cache is actually
  // persisted on this device — catches the "pulled new build but old
  // SW still serving" class of surprise where app behavior lags behind
  // the deployed code. `caches.keys()` returns everything under this
  // origin, so we filter to our own `ownvoice-*` prefix.
  const [swCaches, setSwCaches] = useState<string[]>([]);
  useEffect(() => {
    if (!("caches" in self)) return;
    let cancelled = false;
    caches
      .keys()
      .then((keys) => {
        if (cancelled) return;
        setSwCaches(keys.filter((k) => k.startsWith("ownvoice-")).sort());
      })
      .catch(() => {
        /* non-fatal — just don't display the row */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <p style={{ fontSize: 13, color: t.muted, margin: "0 0 8px" }}>
        Goals of care: SICG (Ariadne Labs) — CC-BY-NC-SA 4.0
      </p>
      {swCaches.length > 0 && (
        <p
          data-testid="about-sw-caches"
          style={{
            fontSize: 12,
            color: t.muted,
            margin: 0,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          SW cache: {swCaches.join(", ")}
        </p>
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
