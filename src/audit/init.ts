import { openAuditDb } from "./db";
import { initLogger, log } from "./logger";
import { setActivePatientHash } from "./session";
import { patientIdHash } from "./hash";
import { EVENT } from "./events";
import { sweepRetention, scheduleHourlyRetention } from "./retention";

export interface InitOpts {
  activePatientId: string | null;
}

/** Idempotent boot orchestrator. Never throws — failures route to
 *  degraded mode in the logger. Call once after settings hydrate. */
export async function initAudit(opts: InitOpts): Promise<void> {
  try {
    const db = await openAuditDb();
    initLogger(db);

    void sweepRetention(db);
    scheduleHourlyRetention(db);

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
