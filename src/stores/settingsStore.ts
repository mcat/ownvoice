import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import { isValidQualityResult } from "../models/voiceQuality";
import type { AppSettings, Patient, Provider } from "../types";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import { patientIdHash } from "../audit/hash";
import { setActivePatientHash } from "../audit/session";

// 300 ms debounce on IDB persistence — avoids a round-trip per keystroke
// when the Settings panel auto-saves text fields as the user types.
// In-memory Zustand updates stay synchronous so controlled inputs don't
// lag; only the disk write is batched.
const PERSIST_DEBOUNCE_MS = 300;
const STORE_VERSION = 4;

interface SettingsPersistedState {
  cfg: AppSettings | null;
  /** Legacy: v1 stored speakerData here. v2 moves it into each Patient.
   *  Kept on the persisted shape for migration compatibility; set to null
   *  after migration and on v2 writes. */
  speakerData: unknown | null;
}

interface SettingsState extends SettingsPersistedState {
  _hasHydrated: boolean;
  setCfg: (cfg: AppSettings) => void;
  updateCfg: (partial: Partial<AppSettings>) => void;
  setSpeakerData: (data: unknown) => void;
  setHasHydrated: (v: boolean) => void;
  reset: () => void;

  // Multi-patient actions
  addPatient: (data: Omit<Patient, "id" | "addedAt" | "lastActiveAt">) => Patient;
  switchPatient: (id: string) => void;
  removePatient: (id: string) => void;
  updatePatient: (id: string, partial: Partial<Omit<Patient, "id">>) => void;
  updateActivePatient: (partial: Partial<Omit<Patient, "id">>) => void;
  setPatientPendingVoiceBlob: (patientId: string, base64: string) => void;
  clearPatientPendingVoiceBlob: (patientId: string) => void;

  // Audit-aware named setters (Phase 1)
  /** Sets the active patient and emits an audit event. Computes the patient
   *  id hash and tags subsequent audit log calls via `setActivePatientHash`.
   *  Pass `null` to clear the active patient (also clears the session hash). */
  setActivePatient: (id: string | null) => Promise<void>;
  /** Sets the caregiver language and emits an audit event. */
  setCaregiverLang: (lang: string) => void;
  /** Appends a provider to the providers list and emits an audit event. */
  addProvider: (provider: Provider) => void;
}

/** Drops the `quality` field on a SpeakerData blob if it fails the runtime
 *  shape check. Returns the rest of the SpeakerData intact. Used during
 *  store hydration so a corrupted quality field can't destroy the encoder
 *  outputs that ride alongside it. */
export function scrubQualityIfInvalid<T>(speakerData: T): T {
  if (!speakerData || typeof speakerData !== "object") return speakerData;
  const sd = speakerData as Record<string, unknown>;
  if (sd.quality !== undefined && !isValidQualityResult(sd.quality)) {
    const { quality: _drop, ...rest } = sd;
    return rest as T;
  }
  return speakerData;
}

function newPatientFromLegacy(legacyCfg: Record<string, unknown>, speakerData: unknown): Patient {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: String(legacyCfg.patientName ?? ""),
    bed: String(legacyCfg.bed ?? ""),
    patientLang: String(legacyCfg.patientLang ?? "en"),
    hasVoice: Boolean(legacyCfg.patientVoice),
    speakerData: speakerData ?? null,
    fallbackVoice: (legacyCfg.fallbackVoice ?? null) as Patient["fallbackVoice"],
    addedAt: now,
    lastActiveAt: now,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      cfg: null,
      speakerData: null,
      _hasHydrated: false,

      setCfg: (cfg) => set({ cfg }),
      updateCfg: (partial) =>
        set((s) => (s.cfg ? { cfg: { ...s.cfg, ...partial } } : {})),
      setSpeakerData: (speakerData) => set({ speakerData }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      reset: () => set({ cfg: null, speakerData: null }),

      addPatient: (data) => {
        const now = Date.now();
        const patient: Patient = {
          ...data,
          id: crypto.randomUUID(),
          addedAt: now,
          lastActiveAt: now,
        };
        set((s) => s.cfg ? {
          cfg: {
            ...s.cfg,
            patients: [...s.cfg.patients, patient],
            activePatientId: patient.id,
          },
        } : {});
        log({
          name: EVENT.SETTINGS_PATIENT_ADD,
          attributes: { [ATTR.PATIENT_LANG]: patient.patientLang },
        });
        return patient;
      },

      switchPatient: (id) => {
        const s = get();
        if (!s.cfg) return;
        const target = s.cfg.patients.find((p) => p.id === id);
        if (!target) {
          console.warn(`[settingsStore] switchPatient: id ${id} not found`);
          return;
        }
        const now = Date.now();
        set({
          cfg: {
            ...s.cfg,
            activePatientId: id,
            patients: s.cfg.patients.map((p) =>
              p.id === id ? { ...p, lastActiveAt: now } : p,
            ),
          },
        });
      },

      removePatient: (id) => {
        const s = get();
        if (!s.cfg) return;
        if (s.cfg.activePatientId === id) {
          throw new Error(
            "removePatient: cannot remove the active patient; switch first",
          );
        }
        set({
          cfg: {
            ...s.cfg,
            patients: s.cfg.patients.filter((p) => p.id !== id),
          },
        });
        log({ name: EVENT.SETTINGS_PATIENT_REMOVE });
      },

      updatePatient: (id, partial) => {
        const s = get();
        if (!s.cfg) return;
        if (!s.cfg.patients.some((p) => p.id === id)) {
          console.warn(`[settingsStore] updatePatient: id ${id} not found`);
          return;
        }
        set({
          cfg: {
            ...s.cfg,
            patients: s.cfg.patients.map((p) =>
              p.id === id ? { ...p, ...partial } : p,
            ),
          },
        });
      },

      updateActivePatient: (partial) => {
        const s = get();
        if (!s.cfg || !s.cfg.activePatientId) return;
        get().updatePatient(s.cfg.activePatientId, partial);
      },

      setPatientPendingVoiceBlob: (patientId, base64) =>
        set((s) => {
          if (!s.cfg) return {};
          const patients = s.cfg.patients.map((p) =>
            p.id === patientId ? { ...p, pendingVoiceBlob: base64 } : p,
          );
          return { cfg: { ...s.cfg, patients } };
        }),

      clearPatientPendingVoiceBlob: (patientId) =>
        set((s) => {
          if (!s.cfg) return {};
          const patients = s.cfg.patients.map((p) =>
            p.id === patientId ? { ...p, pendingVoiceBlob: null } : p,
          );
          return { cfg: { ...s.cfg, patients } };
        }),

      setActivePatient: async (id) => {
        set((s) => (s.cfg ? { cfg: { ...s.cfg, activePatientId: id } } : {}));
        if (id) {
          const hash = await patientIdHash(id);
          setActivePatientHash(hash);
          log({
            name: EVENT.SETTINGS_PATIENT_ACTIVATE,
            attributes: { [ATTR.PATIENT_ID_HASH]: hash },
          });
        } else {
          setActivePatientHash(null);
        }
      },

      setCaregiverLang: (lang) => {
        set((s) => (s.cfg ? { cfg: { ...s.cfg, caregiverLang: lang } } : {}));
        log({
          name: EVENT.SETTINGS_LANG_CHANGE,
          attributes: { [ATTR.CAREGIVER_LANG]: lang },
        });
      },

      addProvider: (provider) => {
        set((s) =>
          s.cfg
            ? { cfg: { ...s.cfg, providers: [...s.cfg.providers, provider] } }
            : {},
        );
        log({
          name: EVENT.SETTINGS_PROVIDER_ADD,
          attributes: { [ATTR.PROVIDER_NAME]: provider.name },
        });
      },
    }),
    {
      name: "ov-settings",
      version: STORE_VERSION,
      storage: createJSONStorage(() => createDebouncedIDBStorage(PERSIST_DEBOUNCE_MS)),
      migrate: (persisted, fromVersion): SettingsPersistedState => {
        const typed = persisted as SettingsPersistedState | null;
        if (!typed) return { cfg: null, speakerData: null };

        // v0 → v1: add caregiverLang (from previous migration)
        let cfg = typed.cfg;
        let speakerData = typed.speakerData;
        if (fromVersion < 1 && cfg) {
          const c = cfg as unknown as Record<string, unknown>;
          if (!("caregiverLang" in c)) {
            cfg = { ...cfg, caregiverLang: "en" } as AppSettings;
          }
        }

        // v1 → v2: migrate single-patient fields into patients[] + activePatientId
        if (fromVersion < 2 && cfg) {
          const legacyCfg = cfg as unknown as Record<string, unknown>;
          if (!Array.isArray(legacyCfg.patients)) {
            const patient = newPatientFromLegacy(legacyCfg, speakerData);
            cfg = {
              pin: String(legacyCfg.pin ?? ""),
              caregiverLang: String(legacyCfg.caregiverLang ?? "en"),
              assistiveInput: Boolean(legacyCfg.assistiveInput),
              providers: (legacyCfg.providers as AppSettings["providers"]) ?? [],
              patients: [patient],
              activePatientId: patient.id,
            };
          }
          speakerData = null;
        }

        // v2 → v3: Chatterbox Turbo → Multilingual model swap.
        // Existing speaker embeddings are incompatible with the new speech
        // encoder — force re-enrollment by clearing speakerData/embedding
        // and setting hasVoice = false on every patient and provider.
        // v3 → v4: enrollment now passes raw decoded audio to the speech
        // encoder (previously fed preprocessed audio). Existing embeddings
        // were extracted from filtered/normalized audio and bake in
        // identity-distorting artifacts — re-enroll to recapture identity.
        if (fromVersion < 4 && cfg) {
          cfg = {
            ...cfg,
            patients: cfg.patients.map((p) => ({
              ...p,
              speakerData: null,
              hasVoice: false,
            })),
            providers: cfg.providers.map((p) => ({
              ...p,
              embedding: undefined,
              hasVoice: false,
            })),
          };
          speakerData = null;
        }

        // Final pass: scrub any malformed `quality` field on per-patient
        // speakerData / per-provider embedding blobs. Optional field, so
        // legacy speakers without it pass through unchanged.
        if (cfg) {
          cfg = {
            ...cfg,
            patients: cfg.patients.map((p) => ({
              ...p,
              speakerData: scrubQualityIfInvalid(p.speakerData),
            })),
            providers: cfg.providers.map((pr) => ({
              ...pr,
              embedding: scrubQualityIfInvalid(pr.embedding),
            })),
          };
        }
        // Also scrub the legacy top-level speakerData (v1 layout) just in case.
        speakerData = scrubQualityIfInvalid(speakerData);

        return { cfg, speakerData };
      },
      partialize: (s): SettingsPersistedState => ({
        cfg: s.cfg,
        speakerData: s.speakerData,
      }),
      onRehydrateStorage: () => {
        // Return the post-hydration callback.
        // IMPORTANT: Do NOT reference useSettingsStore here — it's not
        // initialized yet (we're inside create()). Use the `state` param
        // or defer with queueMicrotask.
        return () => {
          queueMicrotask(() => {
            useSettingsStore.setState({ _hasHydrated: true });
          });
        };
      },
    },
  ),
);

/** Hook: returns the currently-active Patient, or null if none. */
export function useActivePatient(): Patient | null {
  return useSettingsStore((s) => {
    const id = s.cfg?.activePatientId;
    if (!id) return null;
    return s.cfg?.patients.find((p) => p.id === id) ?? null;
  });
}

/** Hook: returns a specific patient by id. */
export function usePatientById(id: string | null): Patient | null {
  return useSettingsStore((s) =>
    !id ? null : s.cfg?.patients.find((p) => p.id === id) ?? null,
  );
}
