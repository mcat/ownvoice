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

/** Idempotent boot orchestrator. Never throws — failures route to
 *  degraded mode in the logger. Call once after settings hydrate. */
export async function initAudit(opts: InitOpts): Promise<void> {
  try {
    const db = await openAuditDb();
    initLogger(db);

    void sweepRetention(db);
    scheduleHourlyRetention(db);

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
