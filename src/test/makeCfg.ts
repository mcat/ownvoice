import type { AppSettings, Patient } from "../types";

/**
 * Build a minimal AppSettings with multi-patient shape for tests.
 * Reduces boilerplate across audioCacheRunner, component, and store tests.
 */
export function makeTestCfg(
  partial: {
    patient?: Partial<Patient>;
    patients?: Patient[];
    cfg?: Partial<AppSettings>;
  } = {},
): AppSettings {
  const patient: Patient = {
    id: "test-patient-1",
    name: "Test Patient",
    bed: "",
    patientLang: "en",
    hasVoice: false,
    speakerData: null,
    addedAt: 0,
    lastActiveAt: 0,
    ...partial.patient,
  };
  const patients = partial.patients ?? [patient];
  return {
    pin: "",
    caregiverLang: "en",
    providers: [],
    patients,
    activePatientId: patients[0]?.id ?? null,
    ...partial.cfg,
  };
}
