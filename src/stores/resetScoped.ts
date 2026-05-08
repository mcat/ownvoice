import { useSettingsStore } from "./settingsStore";
import { useAudioCacheStore } from "./audioCacheStore";
import { clearIndex, getAllPatientHashes, removePatientHashes } from "./patientIndex";
import { clearAudioByHashes, clearAudioExcept } from "../models/audioCache";
import * as audioCacheRunner from "../models/audioCacheRunner";
import { openAuditDb } from "../audit/db";
import { patientIdHash } from "../audit/hash";
import { clearAuditForPatient } from "../audit/cascade";

/**
 * Erase all patient data while preserving care-team configuration.
 *
 * Wiped:
 *  - cfg.patients[] (cleared) and activePatientId (set to null)
 *  - audit-log entries for every patient hash (the thread derives from
 *    these — wiped via `clearAuditForPatient` below)
 *  - patient-tracked OPFS audio entries
 *  - patient hash index
 *  - in-memory audio-cache run state for patient speakers
 *
 * Preserved: cfg.providers, caregiverLang, fallbackVoice settings, model
 * weights in OPFS, service-worker caches, theme.
 *
 * After this runs, the user lands back in Setup (cfg.activePatientId is
 * null and patients[] is empty — App.tsx's gate kicks in on next render).
 */
export async function resetPatients(): Promise<void> {
  audioCacheRunner.abort();

  const patientHashes = await getAllPatientHashes();
  await clearAudioByHashes(patientHashes);
  await clearIndex();

  try {
    const db = await openAuditDb();
    for (const hash of patientHashes) {
      await clearAuditForPatient(db, hash);
    }
    db.close();
  } catch (err) {
    console.warn("[audit] cascade cleanup failed:", err);
  }

  useAudioCacheStore.setState({ runs: {}, activeKey: null });

  const cfg = useSettingsStore.getState().cfg;
  if (cfg) {
    useSettingsStore.getState().setCfg({
      ...cfg,
      patients: [],
      activePatientId: null,
    });
  }
}

/**
 * Discharge a single patient — erase all of their data while leaving
 * other patients, the care team, and global config untouched.
 *
 * Wiped (for the given patientId only):
 *  - cfg.patients[] entry
 *  - audit-log entries (the thread derives from these)
 *  - per-phrase OPFS audio cache files keyed by their hashes
 *  - patient hash index entries
 *  - in-memory audio-cache run state for any associated speakers
 *
 * Throws if the patient is the active patient — caller must switch
 * first. Best-effort on the audit/OPFS side: failures are logged but do
 * not block settings/state mutation.
 */
export async function removeOnePatient(patientId: string): Promise<void> {
  // Pause any running pre-gen so we don't race the OPFS removals.
  audioCacheRunner.pauseAll();

  // Mutate settings first so the UI updates immediately. removePatient
  // throws if the patient is active — let it propagate.
  useSettingsStore.getState().removePatient(patientId);

  // Cascade-delete this patient's audit-log entries.
  try {
    const hash = await patientIdHash(patientId);
    const auditDb = await openAuditDb();
    await clearAuditForPatient(auditDb, hash);
    auditDb.close();
  } catch (err) {
    console.warn("[audit] cascade cleanup failed:", err);
  }

  // Clear OPFS audio for any phrase hashes tracked under this patient.
  const hashes = await removePatientHashes(patientId);
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("audio-cache-v3").catch(() => null);
    if (dir) {
      for (const hash of hashes) {
        try { await dir.removeEntry(`${hash}.raw`); } catch { /* ok if missing */ }
      }
    }
  } catch {
    // OPFS not available (e.g. jsdom) — index hashes already cleared
  }

  useAudioCacheStore.getState().discardByPatientId(patientId);
}

/**
 * Erase all care-team data while preserving patients.
 *
 * Wiped:
 *  - cfg.providers[] (cleared)
 *  - non-patient OPFS audio entries (provider clips + orphans)
 *  - in-memory audio-cache run state for provider speakers
 *
 * Preserved: cfg.patients, conversation threads, patient hash index,
 * model weights, service-worker caches, theme, caregiverLang.
 *
 * Provider audio is intentionally never tracked in patientIndex, so the
 * scope is defined as "any cached entry not in the patient hash union".
 * This also sweeps orphan entries left behind by removed patients —
 * acceptable: a clean reset is what the user just asked for.
 */
export async function resetCareTeam(): Promise<void> {
  audioCacheRunner.abort();

  const patientHashes = await getAllPatientHashes();
  await clearAudioExcept(patientHashes);

  // Clear any provider speaker run-state. Provider speaker keys are
  // namespaced "provider:{idx}" — easiest to wipe runs entirely; the
  // pre-gen runner will rebuild for active patient on next launch.
  useAudioCacheStore.setState({ runs: {}, activeKey: null });

  const cfg = useSettingsStore.getState().cfg;
  if (cfg) {
    useSettingsStore.getState().setCfg({ ...cfg, providers: [] });
  }
}
