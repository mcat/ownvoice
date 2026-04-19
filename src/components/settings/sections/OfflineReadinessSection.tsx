import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { loadManifest } from "../../../models/modelsManifest";
import { primeOffline } from "../../../models/offlinePrimer";
import { useOfflineStore } from "../../../stores/offlineStore";
import { useStorageHealth } from "../../../hooks/useStorageHealth";

interface Props {
  t: ThemeTokens;
}

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function OfflineReadinessSection({ t }: Props) {
  const primerRunning = useOfflineStore((s) => s.primerRunning);
  const progress = useOfflineStore((s) => s.progress);
  const verified = useOfflineStore((s) => s.verified);
  const lastVerifiedAt = useOfflineStore((s) => s.lastVerifiedAt);
  const setPrimerRunning = useOfflineStore((s) => s.setPrimerRunning);
  const reportProgress = useOfflineStore((s) => s.reportProgress);
  const setModelVerified = useOfflineStore((s) => s.setModelVerified);
  const markPrimerComplete = useOfflineStore((s) => s.markPrimerComplete);

  const [error, setError] = useState<string | null>(null);
  const health = useStorageHealth();

  async function runPrimer() {
    setError(null);
    setPrimerRunning(true);
    try {
      const manifest = await loadManifest();
      for await (const ev of primeOffline(manifest)) {
        if (ev.type === "download-progress") {
          reportProgress(ev.model, ev.file, ev.loaded, ev.total);
        } else if (ev.type === "model-verified") {
          setModelVerified(ev.model, ev.ok);
        } else if (ev.type === "complete") {
          markPrimerComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPrimerRunning(false);
    }
  }

  const verifiedEntries = Object.entries(verified);
  const warnColor = "#DC2626";

  return (
    <Section label="Offline readiness" t={t}>
      <p style={{ margin: "0 0 14px", color: t.sub, fontSize: 14 }}>
        Download and verify all voice files so the device works without Wi-Fi.
      </p>

      <Btn
        onClick={runPrimer}
        disabled={primerRunning}
        style={{
          width: "100%",
          minHeight: 64,
          padding: "14px 20px",
          borderRadius: 12,
          border: `1px solid ${t.border}`,
          background: primerRunning ? t.activeBg : t.card,
          color: t.text,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        {primerRunning ? "Preparing…" : "Prepare for offline"}
      </Btn>

      {verifiedEntries.length > 0 && (
        <ul
          style={{
            marginTop: 14,
            padding: 0,
            listStyle: "none",
            fontSize: 14,
          }}
        >
          {verifiedEntries.map(([model, ok]) => (
            <li
              key={model}
              style={{ color: ok ? t.text : warnColor, padding: "4px 0" }}
            >
              {model}: {ok ? "verified" : "needs retry"}
            </li>
          ))}
        </ul>
      )}

      {primerRunning && Object.keys(progress).length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: t.muted }}>
          {Object.entries(progress).map(([key, p]) => (
            <div key={key}>
              {key}: {formatBytes(p.loaded)} / {formatBytes(p.total)}
            </div>
          ))}
        </div>
      )}

      {lastVerifiedAt && (
        <p style={{ marginTop: 12, fontSize: 12, color: t.muted }}>
          Last verified: {new Date(lastVerifiedAt).toLocaleString()}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{ marginTop: 12, color: warnColor, fontSize: 14 }}
        >
          {error}
        </p>
      )}

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
          fontSize: 12,
          color: health.warning ? warnColor : t.muted,
        }}
      >
        Storage: {formatBytes(health.usage)} of {formatBytes(health.quota)} used
        {health.percentUsed != null && ` (${health.percentUsed.toFixed(0)}%)`}
        {health.warning && " — running low, consider resetting audio cache"}
      </div>
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
