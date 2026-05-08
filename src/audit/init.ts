import { openAuditDb } from "./db";
import { initLogger, log } from "./logger";
import { setActivePatientHash } from "./session";
import { patientIdHash } from "./hash";
import { EVENT } from "./events";
import { sweepRetention, scheduleHourlyRetention } from "./retention";
import { sweepAbandonedWorkflows, type AbandonedWorkflow } from "./recovery";

export interface InitOpts {
  activePatientId: string | null;
  /** Called with abandoned workflows after the recovery sweep. The host
   *  app decides what to do per recoveryMode (auto-resume / prompt /
   *  manual). Optional — Phase 1 callers without this argument continue
   *  to work; recovery sweep is silently skipped. */
  onAbandoned?: (abandoned: AbandonedWorkflow[]) => void;
}

// Module-level handles so HMR re-eval or a repeat init() can release
// the prior IDB connection and the hourly-retention interval before
// opening fresh ones. Without this, every Vite hot-reload leaks one
// connection and one timer; production loads the module once so there
// is no accumulation.
let currentDb: IDBDatabase | null = null;
let cancelHourlyRetention: (() => void) | null = null;

function disposeAuditResources(): void {
  if (currentDb) {
    try { currentDb.close(); } catch { /* already closed */ }
    currentDb = null;
  }
  if (cancelHourlyRetention) {
    cancelHourlyRetention();
    cancelHourlyRetention = null;
  }
}

/** Idempotent boot orchestrator. Never throws — failures route to
 *  degraded mode in the logger. Call once after settings hydrate. */
export async function initAudit(opts: InitOpts): Promise<void> {
  disposeAuditResources();

  try {
    const db = await openAuditDb();
    currentDb = db;
    initLogger(db);

    void sweepRetention(db);
    cancelHourlyRetention = scheduleHourlyRetention(db);

    if (opts.onAbandoned) {
      try {
        const abandoned = await sweepAbandonedWorkflows();
        opts.onAbandoned(abandoned);
      } catch (err) {
        console.warn("[audit] recovery sweep failed:", err);
      }
    }

    if (opts.activePatientId) {
      try {
        const hash = await patientIdHash(opts.activePatientId);
        setActivePatientHash(hash);
      } catch (err) {
        console.warn("[audit] hash precompute failed:", err);
      }
    }

    log({ name: EVENT.MODEL_BOOT_START, severity: "INFO" });
  } catch (err) {
    console.error("[audit] init failed; logger remains uninitialised:", err);
  }
}

// Vite HMR: dispose the prior module's resources before this module is
// replaced. Without this, every save during dev leaks an IDB connection
// and a setInterval — visible as duplicate "ov-audit" entries in the
// DevTools Application panel. Production builds skip this branch.
const hmr = (import.meta as { hot?: { dispose: (cb: () => void) => void } }).hot;
if (hmr) {
  hmr.dispose(() => disposeAuditResources());
}
