import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ThemeTokens } from "../../../theme/tokens";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { useSettingsStore } from "../../../stores/settingsStore";
import { ActivityLog } from "../../diag/ActivityLog";

interface Props {
  t: ThemeTokens;
}

export function AboutSection({ t }: Props) {
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  // SW cache names read live via `caches.keys()`. Lets a clinician (or
  // us during debugging) confirm which service-worker cache is actually
  // persisted on this device — catches the "pulled new build but old
  // SW still serving" class of surprise where app behavior lags behind
  // the deployed code. `caches.keys()` returns everything under this
  // origin, so we filter to our own `ownvoice-*` prefix.
  const [swCaches, setSwCaches] = useState<string[]>([]);
  // Hidden 5-tap unlock on the version string opens the dev-only
  // Diagnostics viewer. Phase 1: not gated by build flag — Phase 2 may
  // restrict to dev builds.
  const [versionTaps, setVersionTaps] = useState(0);
  const [diagOpen, setDiagOpen] = useState(false);
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
    <Section label={resolvePhrase("ui.provider.settings.about.heading", caregiverLang)} t={t}>
      <p
        style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: "0 0 8px", cursor: "pointer" }}
        onClick={() => {
          setVersionTaps((n) => {
            if (n + 1 >= 5) {
              setDiagOpen(true);
              return 0;
            }
            return n + 1;
          });
        }}
      >
        OwnVoice v0.1
      </p>
      <p style={{ fontSize: 14, color: t.sub, margin: "0 0 4px" }}>
        {resolvePhrase("ui.provider.settings.about.subtitle", caregiverLang)}
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: "0 0 4px" }}>
        {resolvePhrase("ui.provider.settings.about.attribution_1", caregiverLang)}
      </p>
      <p style={{ fontSize: 13, color: t.muted, margin: "0 0 8px" }}>
        {resolvePhrase("ui.provider.settings.about.attribution_2", caregiverLang)}
      </p>
      {diagOpen && <ActivityLog onClose={() => setDiagOpen(false)} />}
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
          {resolvePhrase("ui.provider.settings.about.sw_cache_prefix", caregiverLang)} {swCaches.join(", ")}
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
