import { useSettingsStore } from "./settingsStore";
import { useAudioCacheStore } from "./audioCacheStore";
import { clearIndex, getAllPatientHashes } from "./patientIndex";
import { clearAudioByHashes, clearAudioExcept } from "../models/audioCache";
import * as audioCacheRunner from "../models/audioCacheRunner";
import { openAuditDb } from "../audit/db";
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
