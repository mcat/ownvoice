import { useState, useRef, useCallback, useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { ThemeTokens } from "../../../theme/tokens";
import { Btn } from "../../shared/Btn";
import { confirm } from "../../shared/ConfirmDialog";
import { t as resolvePhrase } from "../../../data/phraseRegistry";
import { drivePrimer } from "../../../models/drivePrimer";
import { verifyAllOnBoot } from "../../../models/bootModels";
import { clearAudioCache } from "../../../models/audioCache";
import * as audioCacheRunner from "../../../models/audioCacheRunner";
import { useOfflineStore } from "../../../stores/offlineStore";
import { useSettingsStore, useActivePatient } from "../../../stores/settingsStore";
import { useAudioCacheStore } from "../../../stores/audioCacheStore";
import { useStorageHealth } from "../../../hooks/useStorageHealth";
import { EngineOutcomesPanel } from "../EngineOutcomesPanel";

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

const DAY_MS = 24 * 60 * 60 * 1000;

function formatLastUsed(lastInteractionAt: number | null, locale: string): string {
  if (lastInteractionAt == null) return "";
  const daysSince = Math.floor((Date.now() - lastInteractionAt) / DAY_MS);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -daysSince,
    "day",
  );
}

/**
 * "Diagnostics" section in the flat Settings panel: offline readiness,
 * model verification, audio cache rebuild, storage health. Renamed from
 * `OfflineReadinessSection` because the surface now also covers cache
 * health and storage troubleshooting — "Diagnostics" reads more honestly
 * to a clinician scanning the panel. The underlying i18n keys
 * (`ui.provider.settings.offline.*`) stay put; this is a UI-side rename
 * only, no locale churn.
 */
export function DiagnosticsSection({ t }: Props) {
  const primerRunning = useOfflineStore((s) => s.primerRunning);
  const progress = useOfflineStore((s) => s.progress);
  const expectedBytes = useOfflineStore((s) => s.expectedBytes);
  const verified = useOfflineStore((s) => s.verified);
  const lastVerifiedAt = useOfflineStore((s) => s.lastVerifiedAt);
  const markPrimerComplete = useOfflineStore((s) => s.markPrimerComplete);

  const cfg = useSettingsStore((s) => s.cfg);
  const active = useActivePatient();
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  const lastInteractionAt = useSettingsStore((s) => s.lastInteractionAt);

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
    const ok = await confirm({
      title: resolvePhrase("ui.provider.settings.offline.redownload_dialog.title", caregiverLang),
      body: resolvePhrase("ui.provider.settings.offline.redownload_dialog.body", caregiverLang),
      confirmLabel: resolvePhrase("ui.provider.settings.offline.redownload_dialog.confirm", caregiverLang),
      cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang),
      tone: "destructive",
    });
    if (!ok) return;

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
      // Skips silently when no cfg or no active patient with voice data —
      // the App-level effect will kick generation on next relevant state change.
      if (cfg && active?.hasVoice) {
        audioCacheRunner.runPreGeneration(cfg);
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

  // Aggregate loaded across all files currently in flight. The denominator is
  // `expectedBytes` from the store (published once at primer-start) — NOT a
  // sum of `progress[].total`, which would grow each time a new file begins
  // and make the bar non-monotonic.
  const loadedBytes = Object.values(progress).reduce(
    (s, p) => s + p.loaded,
    0,
  );
  const percent =
    expectedBytes > 0
      ? Math.min(100, (loadedBytes / expectedBytes) * 100)
      : 0;

  const modelsOnDeviceText =
    expectedBytes > 0
      ? resolvePhrase("ui.provider.settings.offline.models_on_device", caregiverLang)
          .replace("{bytes}", formatBytes(expectedBytes))
      : resolvePhrase("ui.provider.settings.offline.models_not_yet_downloaded", caregiverLang);
  const modelsGlyph = expectedBytes > 0 ? (anyNeedsRetry ? "⚠️" : "✓") : "…";
  const modelsColor = expectedBytes > 0 ? (anyNeedsRetry ? warnColor : t.text) : t.muted;

  return (
    <Section label={resolvePhrase("ui.provider.settings.offline.heading", caregiverLang)} t={t}>
      <p style={{ margin: "0 0 14px", color: t.sub, fontSize: 14 }}>
        {resolvePhrase("ui.provider.settings.offline.status_description", caregiverLang)}
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
            <span>{resolvePhrase("ui.provider.settings.offline.downloading", caregiverLang)}</span>
            <span>
              {formatBytes(loadedBytes)} /{" "}
              {formatBytes(expectedBytes > 0 ? expectedBytes : null)}
              {expectedBytes > 0 && ` (${percent.toFixed(0)}%)`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={resolvePhrase("ui.provider.settings.offline.download_progress_aria", caregiverLang)}
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
          {resolvePhrase("ui.provider.settings.offline.all_ready", caregiverLang)}
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
          {resolvePhrase("ui.provider.settings.offline.redownload_button", caregiverLang)}
        </Btn>
      )}

      {alreadyReady && (
        <p style={{ marginTop: 8, fontSize: 14, color: t.sub, fontWeight: 500 }}>
          {resolvePhrase("ui.provider.settings.offline.already_up_to_date", caregiverLang)}
        </p>
      )}

      <Btn
        onClick={runVerifyOnly}
        disabled={offlineActionRunning || justVerified}
        aria-live="polite"
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: 10,
          padding: "10px 20px",
          borderRadius: 10,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: justVerified ? t.text : t.sub,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "inherit",
          opacity: offlineActionRunning && !justVerified ? 0.6 : 1,
        }}
      >
        {verifying
          ? resolvePhrase("ui.provider.settings.offline.checking", caregiverLang)
          : justVerified
            ? resolvePhrase("ui.provider.settings.offline.verified", caregiverLang)
            : resolvePhrase("ui.provider.settings.offline.check_button", caregiverLang)}
      </Btn>

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
          {forcingRedownload
            ? resolvePhrase("ui.provider.settings.offline.redownloading", caregiverLang)
            : resolvePhrase("ui.provider.settings.offline.force_redownload_button", caregiverLang)}
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
                ? { label: resolvePhrase("ui.provider.settings.offline.model_status_ready", caregiverLang), color: t.text }
                : status === "not-primed"
                  ? { label: resolvePhrase("ui.provider.settings.offline.model_status_downloading", caregiverLang), color: t.muted }
                  : { label: resolvePhrase("ui.provider.settings.offline.model_status_needs_retry", caregiverLang), color: warnColor };
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
          {resolvePhrase("ui.provider.settings.offline.last_verified_prefix", caregiverLang)}
          {new Date(lastVerifiedAt).toLocaleString()}
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

      {/* Row 1 — Models on device */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
          color: modelsColor,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <span aria-hidden="true">{modelsGlyph} </span>
        {modelsOnDeviceText}
      </div>

      {/* Row 2 — Storage protection (hidden when API absent) */}
      {health.persisted !== null && (
        <div
          style={{
            marginTop: 8,
            color: health.persisted ? t.text : warnColor,
            fontSize: 14,
          }}
        >
          <div>
            <span aria-hidden="true">{health.persisted ? "🔒 " : "⚠️ "}</span>
            {health.persisted
              ? resolvePhrase("ui.provider.settings.offline.storage_protected", caregiverLang)
              : resolvePhrase("ui.provider.settings.offline.storage_not_protected", caregiverLang)}
          </div>
          {!health.persisted && lastInteractionAt != null && (
            <div style={{ marginTop: 4, fontSize: 13, color: t.sub }}>
              {resolvePhrase("ui.provider.settings.offline.storage_last_used", caregiverLang)
                .replace("{relative}", formatLastUsed(lastInteractionAt, caregiverLang))}
            </div>
          )}
          {!health.persisted && (
            <Btn
              onClick={() => {
                void health.requestPersist();
              }}
              style={{
                marginTop: 6,
                padding: "6px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: "transparent",
                color: t.text,
                fontFamily: "inherit",
              }}
            >
              {resolvePhrase("ui.provider.settings.offline.check_protection_button", caregiverLang)}
            </Btn>
          )}
        </div>
      )}

      {/* Row 3 — Origin usage estimate */}
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: health.warning ? warnColor : t.muted,
        }}
      >
        {resolvePhrase("ui.provider.settings.offline.origin_usage_estimate", caregiverLang)
          .replace("{used}", formatBytes(health.usage))
          .replace("{total}", formatBytes(health.quota))}
        {health.warning && resolvePhrase("ui.provider.settings.offline.storage_low", caregiverLang)}
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
            ? resolvePhrase("ui.provider.settings.offline.clearing", caregiverLang)
            : rebuildingCache
              ? resolvePhrase("ui.provider.settings.offline.rebuilding", caregiverLang)
                  .replace("{current}", String(rebuildCurrent))
                  .replace("{total}", String(rebuildTotal))
              : resolvePhrase("ui.provider.settings.offline.clear_audio_cache", caregiverLang)}
        </Btn>
      )}

      <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${t.border}` }}>
        <h4
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: t.text,
            margin: "0 0 10px",
          }}
        >
          Recent speech engine outcomes
        </h4>
        <EngineOutcomesPanel t={t} />
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
