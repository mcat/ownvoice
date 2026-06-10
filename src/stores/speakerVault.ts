/**
 * Speaker vault — a redundant per-patient IndexedDB row for speakerData.
 *
 * The primary copy of a patient's voice clone lives inside the single
 * `ov-settings` JSON blob (zustand persist). One torn or corrupt write of
 * that row and the patient is re-enrolling while intubated. The vault
 * keeps an independent copy, written at enrollment time, that
 * `restoreMissingSpeakerData()` (settingsStore) re-attaches on hydration
 * when a `hasVoice` patient record has lost its embedding.
 *
 * Rows live in the same `ownvoice`/`kv` store under
 * `ov-speaker-vault:<patientId>` — `resetAll()`'s clearAll() wipes them
 * with everything else, and `removePatient` deletes per-patient rows.
 *
 * All operations are best-effort and never throw: the vault is a safety
 * net, and a vault failure must not break enrollment or hydration.
 */
import { idbGet, idbSet, idbRemove } from "./idbStorage";
import { f32Replacer, f32Reviver } from "./persistTypedArrays";

/**
 * Embedding-compatibility era. Bump IN LOCKSTEP with any settingsStore
 * migration that intentionally clears speakerData (encoder swaps — see
 * the v2→v3 and v3→v4 migrations). Restore ignores rows from another
 * era, so the vault can never resurrect embeddings a migration meant to
 * kill. Current era: 4 (matches settingsStore STORE_VERSION 4).
 */
export const SPEAKER_VAULT_ERA = 4;

const VAULT_PREFIX = "ov-speaker-vault:";

export function vaultKey(patientId: string): string {
  return `${VAULT_PREFIX}${patientId}`;
}

interface VaultRow {
  era: number;
  savedAt: number;
  data: unknown;
}

/** Write a redundant copy of a patient's speakerData. Never throws. */
export async function backupSpeakerData(
  patientId: string,
  data: unknown,
): Promise<void> {
  if (!data) return;
  try {
    const row: VaultRow = { era: SPEAKER_VAULT_ERA, savedAt: Date.now(), data };
    await idbSet(vaultKey(patientId), JSON.stringify(row, f32Replacer));
  } catch (err) {
    console.error(
      `[OwnVoice:Persist] speaker vault backup failed for patient ${patientId}`,
      err,
    );
  }
}

/**
 * Read a patient's vaulted speakerData. Returns null when the row is
 * missing, unparseable, or from a different embedding era.
 */
export async function readSpeakerBackup(patientId: string): Promise<unknown | null> {
  try {
    const raw = await idbGet(vaultKey(patientId));
    if (raw == null) return null;
    const row = JSON.parse(raw, f32Reviver) as VaultRow;
    if (row?.era !== SPEAKER_VAULT_ERA || row.data == null) {
      return null;
    }
    return row.data;
  } catch (err) {
    console.warn(
      `[OwnVoice:Persist] speaker vault read failed for patient ${patientId}`,
      err,
    );
    return null;
  }
}

/** Remove a patient's vault row (patient discharged/removed). Never throws. */
export async function deleteSpeakerBackup(patientId: string): Promise<void> {
  try {
    await idbRemove(vaultKey(patientId));
  } catch (err) {
    console.warn(
      `[OwnVoice:Persist] speaker vault delete failed for patient ${patientId}`,
      err,
    );
  }
}
