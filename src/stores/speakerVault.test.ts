/**
 * Speaker vault: a redundant, per-patient IndexedDB row for speakerData.
 *
 * Why it exists: the patient's voice clone normally lives inside the
 * single `ov-settings` JSON blob. One torn/corrupt write of that row and
 * the patient is re-enrolling while intubated. The vault keeps an
 * independent copy keyed per patient, written at enrollment time, and a
 * hydration-time restore path re-attaches it when a patient record has
 * `hasVoice: true` but no speakerData.
 *
 * Era rule: vault rows are tagged with SPEAKER_VAULT_ERA. Migrations
 * that intentionally clear embeddings (encoder swaps) bump the era, so
 * restore can never resurrect embeddings the migration meant to kill.
 */
import {
  backupSpeakerData,
  readSpeakerBackup,
  deleteSpeakerBackup,
  vaultKey,
  SPEAKER_VAULT_ERA,
} from "./speakerVault";
import { createIDBStorage } from "./idbStorage";
import { useSettingsStore, restoreMissingSpeakerData } from "./settingsStore";
import type { AppSettings, Patient } from "../types";

function makePatient(partial: Partial<Patient> = {}): Patient {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Test Patient",
    bed: "4B",
    patientLang: "en",
    hasVoice: true,
    speakerData: null,
    fallbackVoice: null,
    addedAt: now,
    lastActiveAt: now,
    ...partial,
  };
}

function makeCfg(patients: Patient[]): AppSettings {
  return {
    pin: "1234",
    caregiverLang: "en",
    assistiveInput: false,
    providers: [],
    patients,
    activePatientId: patients[0]?.id ?? null,
  };
}

const sampleSpeakerData = () => ({
  condEmb: new Float32Array([0.1, 0.2, 0.3]),
  promptToken: 7,
});

describe("speakerVault row operations", () => {
  it("round-trips speakerData including Float32Array fields", async () => {
    const id = crypto.randomUUID();
    await backupSpeakerData(id, sampleSpeakerData());

    const restored = (await readSpeakerBackup(id)) as {
      condEmb: Float32Array;
      promptToken: number;
    };
    expect(restored).not.toBeNull();
    expect(restored.condEmb).toBeInstanceOf(Float32Array);
    expect(Array.from(restored.condEmb)).toEqual(
      expect.arrayContaining([expect.closeTo(0.1), expect.closeTo(0.2)]),
    );
    expect(restored.promptToken).toBe(7);
  });

  it("returns null for a patient with no backup", async () => {
    expect(await readSpeakerBackup(crypto.randomUUID())).toBeNull();
  });

  it("returns null for a backup written in a different era", async () => {
    const id = crypto.randomUUID();
    const raw = createIDBStorage();
    await raw.setItem(
      vaultKey(id),
      JSON.stringify({ era: SPEAKER_VAULT_ERA - 1, savedAt: Date.now(), data: { x: 1 } }),
    );
    expect(await readSpeakerBackup(id)).toBeNull();
  });

  it("returns null (not a throw) for a corrupt vault row", async () => {
    const id = crypto.randomUUID();
    const raw = createIDBStorage();
    await raw.setItem(vaultKey(id), "not-json{");
    expect(await readSpeakerBackup(id)).toBeNull();
  });

  it("deleteSpeakerBackup removes the row", async () => {
    const id = crypto.randomUUID();
    await backupSpeakerData(id, sampleSpeakerData());
    await deleteSpeakerBackup(id);
    expect(await readSpeakerBackup(id)).toBeNull();
  });
});

describe("settingsStore vault integration", () => {
  beforeEach(() => {
    useSettingsStore.setState({ cfg: null, speakerData: null, _hasHydrated: true });
  });

  it("updatePatient with speakerData writes a vault backup", async () => {
    const patient = makePatient();
    useSettingsStore.setState({ cfg: makeCfg([patient]) });

    useSettingsStore.getState().updatePatient(patient.id, {
      speakerData: sampleSpeakerData(),
    });

    // Backup is fire-and-forget; poll briefly for the row.
    await vi.waitFor(async () => {
      expect(await readSpeakerBackup(patient.id)).not.toBeNull();
    });
  });

  it("removePatient deletes the vault backup", async () => {
    const keep = makePatient();
    const drop = makePatient();
    useSettingsStore.setState({
      cfg: { ...makeCfg([keep, drop]), activePatientId: keep.id },
    });
    await backupSpeakerData(drop.id, sampleSpeakerData());

    useSettingsStore.getState().removePatient(drop.id);

    await vi.waitFor(async () => {
      expect(await readSpeakerBackup(drop.id)).toBeNull();
    });
  });

  it("restoreMissingSpeakerData re-attaches a vaulted clone to a hasVoice patient", async () => {
    const patient = makePatient({ hasVoice: true, speakerData: null });
    await backupSpeakerData(patient.id, sampleSpeakerData());
    useSettingsStore.setState({ cfg: makeCfg([patient]) });

    const restored = await restoreMissingSpeakerData();

    expect(restored).toBe(1);
    const p = useSettingsStore.getState().cfg?.patients[0];
    expect(p?.speakerData).toBeTruthy();
    expect(
      (p?.speakerData as { condEmb: Float32Array }).condEmb,
    ).toBeInstanceOf(Float32Array);
  });

  it("restoreMissingSpeakerData skips patients who declined voice cloning", async () => {
    const patient = makePatient({ hasVoice: false, speakerData: null });
    await backupSpeakerData(patient.id, sampleSpeakerData());
    useSettingsStore.setState({ cfg: makeCfg([patient]) });

    const restored = await restoreMissingSpeakerData();

    expect(restored).toBe(0);
    expect(useSettingsStore.getState().cfg?.patients[0]?.speakerData).toBeNull();
  });

  it("restoreMissingSpeakerData does not overwrite existing speakerData", async () => {
    const existing = sampleSpeakerData();
    const patient = makePatient({ hasVoice: true, speakerData: existing });
    await backupSpeakerData(patient.id, { condEmb: new Float32Array([9]) });
    useSettingsStore.setState({ cfg: makeCfg([patient]) });

    const restored = await restoreMissingSpeakerData();

    expect(restored).toBe(0);
    expect(useSettingsStore.getState().cfg?.patients[0]?.speakerData).toBe(existing);
  });
});
