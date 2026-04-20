import { useState, useRef, useCallback, useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { drivePrimer } from "../../../models/drivePrimer";
import { verifyAllOnBoot } from "../../../models/bootModels";
import { clearAudioCache } from "../../../models/audioCache";
import * as audioCacheRunner from "../../../models/audioCacheRunner";
import { useOfflineStore } from "../../../stores/offlineStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
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
  const markPrimerComplete = useOfflineStore((s) => s.markPrimerComplete);

  const cfg = useSettingsStore((s) => s.cfg);
  const speakerData = useSettingsStore((s) => s.speakerData);

  const cacheRuns = useAudioCacheStore((s) => s.runs);
  const rebuildingCache = Object.values(cacheRuns).some(
    (r) => r != null && r.status === "running",
  );
  /** Aggregate progress across all running speakers. */
  const rebuildCurrent = Object.values(cacheRuns).reduce(
    (sum, r) => sum + (r?.status === "running" ? r.current : 0),
    0,
  );
  const rebuildTotal = Object.values(cacheRuns).reduce(
    (sum, r) => sum + (r?.status === "running" ? r.total : 0),
    0,
  );

  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [alreadyReady, setAlreadyReady] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [forcingRedownload, setForcingRedownload] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const health = useStorageHealth();

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current != null) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  // Clean up timer on unmount
  useEffect(() => clearDismissTimer, [clearDismissTimer]);

  /**
   * Wipe /models/ in OPFS so the next primer run hits the network for
   * every file. Workers keep their in-memory copies — inference doesn't
   * interrupt. The primer refills OPFS.
   */
  async function forceRedownload() {
    if (
      !globalThis.confirm(
        "Redownload all AI models? This will re-fetch roughly 1.7 GB. Voice synthesis keeps working through the refresh.",
      )
    ) {
      return;
    }
    setError(null);
    setForcingRedownload(true);
    try {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry("models", { recursive: true });
      } catch {
        // /models/ doesn't exist yet — that's fine, primer will create it.
      }
      // Wipe stale progress + verified state so the UI reflects the refresh.
      useOfflineStore.getState().reset();
      await drivePrimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setForcingRedownload(false);
    }
  }

  // Offline-readiness actions (primer/verify/clear) gate on each other, but
  // NOT on audio-cache rebuild. Audio-cache pre-gen runs automatically in the
  // background any time a voice clone is configured — it shouldn't block
  // clinician-initiated offline prep.
  const offlineActionRunning =
    primerRunning || verifying || clearingCache || forcingRedownload;
  // Clear-cache itself is special: it conflicts with a live rebuild because
  // clearing mid-rebuild aborts it. So Clear disables when a rebuild is
  // actually in flight.
  const clearDisabled = offlineActionRunning || rebuildingCache;
  const warnColor = "#DC2626";

  async function runPrimer() {
    setError(null);
    clearDismissTimer();
    setAlreadyReady(false);
    try {
      const result = await drivePrimer();
      if (result && result.downloadedCount === 0) {
        setAlreadyReady(true);
        dismissTimer.current = setTimeout(() => setAlreadyReady(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function runVerifyOnly() {
    setError(null);
    clearDismissTimer();
    setJustVerified(false);
    setVerifying(true);
    try {
      await verifyAllOnBoot();
      markPrimerComplete();
      // Confirm to the clinician that the tap did something, even when the
      // state didn't change (models were already ok before the check).
      const v = useOfflineStore.getState().verified;
      if (Object.values(v).every((s) => s === "verified")) {
        setJustVerified(true);
        dismissTimer.current = setTimeout(() => setJustVerified(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifying(false);
    }
  }

  async function clearCacheAndRepopulate() {
    setError(null);
    setClearingCache(true);
    try {
      audioCacheRunner.abort();
      await clearAudioCache();
      // Repopulate in the background if we have a voice clone to generate from.
      // Skips silently when no cfg/speakerData — the App-level effect will
      // kick generation on next relevant state change.
      if (cfg && speakerData) {
        audioCacheRunner.runPreGeneration(cfg, speakerData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearingCache(false);
    }
  }

  const verifiedEntries = Object.entries(verified);
  const statuses = verifiedEntries.map(([, s]) => s);
  const allVerified =
    statuses.length > 0 && statuses.every((s) => s === "verified");
  const anyNeedsRetry = statuses.some((s) => s === "needs-retry");

  // Aggregate download progress across all files being primed.
  const progressEntries = Object.values(progress);
  const loadedBytes = progressEntries.reduce((s, p) => s + p.loaded, 0);
  const totalBytes = progressEntries.reduce((s, p) => s + p.total, 0);
  const percent =
    totalBytes > 0 ? Math.min(100, (loadedBytes / totalBytes) * 100) : 0;

  return (
    <Section label="Offline readiness" t={t}>
      <p style={{ margin: "0 0 14px", color: t.sub, fontSize: 14 }}>
        Status of the AI models the app uses on-device for voice generation,
        suggestions, and speech recognition.
      </p>

      {primerRunning && (
        <div style={{ margin: "0 0 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              color: t.text,
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 6,
            }}
          >
            <span>Downloading models…</span>
            <span>
              {formatBytes(loadedBytes)} / {formatBytes(totalBytes || null)}
              {totalBytes > 0 && ` (${percent.toFixed(0)}%)`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Model download progress"
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: t.activeBg,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                background: t.text,
                transition: "width 150ms linear",
              }}
            />
          </div>
        </div>
      )}

      {allVerified && !primerRunning && (
        <p
          style={{
            margin: "0 0 10px",
            color: t.text,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          All models ready
        </p>
      )}

      {anyNeedsRetry && !primerRunning && (
        <Btn
          onClick={runPrimer}
          disabled={offlineActionRunning}
          style={{
            width: "100%",
            minHeight: 64,
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: offlineActionRunning ? t.muted : warnColor,
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
            opacity: offlineActionRunning ? 0.7 : 1,
          }}
        >
          Redownload models
        </Btn>
      )}

      {alreadyReady && (
        <p style={{ marginTop: 8, fontSize: 14, color: t.sub, fontWeight: 500 }}>
          Already up to date
        </p>
      )}

      <Btn
        onClick={runVerifyOnly}
        disabled={offlineActionRunning}
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: 10,
          padding: "10px 20px",
          borderRadius: 10,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: t.sub,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "inherit",
          opacity: offlineActionRunning ? 0.6 : 1,
        }}
      >
        {verifying ? "Checking…" : "Check existing models"}
      </Btn>

      {justVerified && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: 8,
            fontSize: 14,
            color: t.text,
            fontWeight: 500,
          }}
        >
          ✓ Models verified
        </p>
      )}

      {/* Force redownload — lets a clinician or tester trigger a visible
          fresh download even when everything verifies. Wipes OPFS /models/
          then primes. Workers keep their in-memory copies through the swap. */}
      {allVerified && !primerRunning && (
        <Btn
          onClick={forceRedownload}
          disabled={offlineActionRunning}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 8,
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: "transparent",
            color: t.muted,
            fontSize: 13,
            fontWeight: 400,
            textDecoration: "underline",
            fontFamily: "inherit",
            opacity: offlineActionRunning ? 0.6 : 1,
          }}
        >
          {forcingRedownload ? "Redownloading…" : "Force redownload all models"}
        </Btn>
      )}

      {verifiedEntries.length > 0 && (
        <ul
          style={{
            marginTop: 14,
            padding: 0,
            listStyle: "none",
            fontSize: 14,
          }}
        >
          {verifiedEntries.map(([model, status]) => {
            const { label, color } =
              status === "verified"
                ? { label: "ready", color: t.text }
                : status === "not-primed"
                  ? { label: "downloading…", color: t.muted }
                  : { label: "needs retry", color: warnColor };
            return (
              <li key={model} style={{ color, padding: "4px 0" }}>
                {model}: {label}
              </li>
            );
          })}
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
        {health.warning && " — running low"}
      </div>

      {health.warning && (
        <Btn
          onClick={clearCacheAndRepopulate}
          disabled={clearDisabled}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 10,
            padding: "10px 20px",
            borderRadius: 10,
            border: `1px solid ${warnColor}`,
            background: "transparent",
            color: warnColor,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          {clearingCache
            ? "Clearing…"
            : rebuildingCache
              ? `Rebuilding: ${rebuildCurrent} / ${rebuildTotal}`
              : "Clear audio cache"}
        </Btn>
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
