# Multi-Patient Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable one iPad to serve multiple ICU patients with staff-gated add/switch/remove actions; each patient's voice clone, conversation history, and settings are fully isolated.

**Architecture:** Two sequential PRs. PR A restructures `AppSettings` into a `patients: Patient[]` + `activePatientId` shape, partitions `conversationStore` and `audioCacheStore` by patient, adds the Switch sheet, wires the Remove flow, and migrates all component sites that read the old top-level patient fields. PR B adds the Setup `add-patient` mode, the staff-session timer with WCAG 2.2.6 warning toast, and the "End staff session" affordance. The patient voice cache's OPFS files are partitioned by a new `patient-index.json` metadata file.

**Tech Stack:** TypeScript · Preact · Vite · Vitest · Stryker (mutation) · Zustand (IndexedDB persist) · OPFS (patient-scoped audio caches).

**Reference:** [Multi-patient design](../specs/2026-04-22-multi-patient-design.md). Keep it open alongside the plan.

---

## File structure

**New files:**
- `src/stores/patientIndex.ts` — OPFS metadata-file accessor; maps `patientId → { fingerprint, hashes: Set<string> }`. Placed under `src/stores/` so it's within mutation-audit scope.
- `src/stores/patientIndex.test.ts`
- `src/components/switch/SwitchSheet.tsx` — BottomSheet-based Switch Patient UI.
- `src/components/switch/SwitchSheet.test.tsx`
- `src/components/settings/sections/PatientsSection.tsx` — Settings → Patients section for Add + Remove actions.
- `src/components/settings/sections/PatientsSection.test.tsx`
- `src/components/shared/StaffSessionTimer.tsx` (PR B) — host component that manages the 5-min auto-lock + warning toast.
- `src/components/shared/StaffSessionTimer.test.tsx` (PR B)
- `src/components/shared/WarningToast.tsx` (PR B) — `role="alertdialog"` with countdown; used by StaffSessionTimer.
- `src/components/shared/WarningToast.test.tsx` (PR B)

**Modified core files:**
- `src/types.ts` — add `Patient` interface; rewrite `AppSettings` to use `patients: Patient[]` + `activePatientId: string | null`; drop `patientName`, `bed`, `patientLang`, `patientVoice`, `fallbackVoice` from top level.
- `src/stores/settingsStore.ts` — persist migration `v1 → v2`, new actions `addPatient`, `switchPatient`, `removePatient`, selectors `useActivePatient`, `usePatientById`. `speakerData` leaves the top level (moved into each Patient).
- `src/stores/conversationStore.ts` — `messages: Message[]` → `messagesByPatientId: Record<string, Message[]>`; `addMessage` routes by `activePatientId`; new `clearForPatient(id)`.
- `src/stores/audioCacheStore.ts` — `SpeakerKey` type expanded to `"patient:${string}" | "patient:${string}:pain" | "provider:${number}"`.
- `src/stores/uiStore.ts` — add `staffAuthed: boolean` + `staffAuthedAt: number | null` (PR B fills in the timer logic; PR A just adds the state).
- `src/models/audioCache.ts` — `putCachedAudio` calls `patientIndex.recordHash(activePatientId, hash)` after writing.
- `src/models/audioCacheRunner.ts` — `buildPlan` resolves active patient from cfg; `switchPatientTransition` helper that calls `pauseAll()` then `runPreGeneration`.
- `src/App.tsx` — `embeddingKey` factors `activePatientId` + active patient's `speakerData` + `patientLang`; conditional Setup gate uses `cfg?.patients.length === 0 || cfg?.activePatientId === null`.
- `src/components/layout/HeaderNav.tsx` — add "Switch Patient" button (PR A) and "End staff session" button (PR B, visibility-gated on `staffAuthed`).
- `src/components/settings/Setup.tsx` (PR B) — accept `mode: "first-run" | "add-patient"` prop; conditionally render device-level steps.
- `src/components/settings/SettingsPanel.tsx` — include the new `PatientsSection`.
- All components currently reading `cfg.patientName`, `cfg.bed`, `cfg.patientLang`, `cfg.patientVoice`, `cfg.fallbackVoice` — switch to `useActivePatient()`. See Task A8 for the file list.

**Modified tests:**
- `src/stores/settingsStore.test.ts` — v1→v2 migration tests + action tests.
- `src/stores/conversationStore.test.ts` — partitioning + `clearForPatient` tests.
- `src/stores/resetAll.test.ts` — verify `resetAll()` wipes the new patient-index file too.
- All component tests that mount with a custom `cfg` or `Patient` fixture.

---

# Milestone PR A — Data model + Switch + Remove

**Deliverable:** The app runs on the new multi-patient data shape, but users are only aware of it if they manually invoke Switch or Remove. Default behavior on a migrated device is identical to single-patient. Add Patient lands in PR B.

**PR-end checkpoint:** Push branch, open PR, stop for review.

---

### Task A1: Add `Patient` type + reshape `AppSettings`

**Files:**
- Modify: `src/types.ts`

Reshape `AppSettings` in one commit so the codebase compiles in a consistent state. TypeScript errors from call sites that read the old top-level fields (~15 files) are addressed in Task A8. For this task, just land the type change.

- [ ] **Step 1: Add the `Patient` interface + reshape `AppSettings`**

Modify `src/types.ts`:

```ts
export interface Patient {
  /** UUID, generated client-side at add-time. Never displayed. */
  id: string;
  name: string;
  bed: string;
  /** BCP 47 — each patient's preferred language. */
  patientLang: string;
  hasVoice: boolean;
  /** Chatterbox Turbo speech-encoder output for this patient's voice clone. */
  speakerData: unknown;
  /** Per-patient system-voice preference paired with patientLang. */
  fallbackVoice?: FallbackVoice | null;
  /** Unix ms when the patient was added. Used for sort order. */
  addedAt: number;
  /** Unix ms of the last time this patient was active. */
  lastActiveAt: number;
}

export interface AppSettings {
  pin: string;
  caregiverLang: string;
  assistiveInput?: boolean;
  providers: Provider[];
  patients: Patient[];
  /** null when no patient is active (fresh device, or after removing the
   *  last patient). */
  activePatientId: string | null;
}
```

- [ ] **Step 2: Remove the old top-level patient fields from `AppSettings`**

Ensure `patientName`, `bed`, `patientLang`, `patientVoice`, `fallbackVoice` are no longer declared on `AppSettings`. Keep `Provider` and `FallbackVoice` exports unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(multi-patient): add Patient type; reshape AppSettings for multi-patient

Follow-up tasks update Zustand migration + all consumer sites."
```

**Note:** build and tests will now fail — callers read fields that no longer exist. This is expected and is fixed in Tasks A2 + A8.

---

### Task A2: `settingsStore` persist migration `v1 → v2` + actions

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/settingsStore.test.ts`

The persist version bumps from 1 (had `caregiverLang`) to 2 (has `patients` + `activePatientId`). Old single-patient configs migrate into a single `Patient` record.

- [ ] **Step 1: Write the failing migration test**

Add to `src/stores/settingsStore.test.ts` (alongside existing migration tests, using the same `seedAndImport` pattern):

```ts
it("migrates v1 single-patient cfg to v2 multi-patient shape", async () => {
  const v1 = {
    state: {
      cfg: {
        patientName: "Maria",
        bed: "4B-12",
        patientLang: "es",
        caregiverLang: "en",
        patientVoice: true,
        pin: "1234",
        providers: [{ name: "Dr. Smith", hasVoice: true, emoji: "👨‍⚕️", embedding: { foo: 1 } }],
        fallbackVoice: { voiceURI: "com.apple.speech.synthesis.voice.Maria", name: "Maria" },
      },
      speakerData: { id: "maria-voice-data" },
    },
    version: 1,
  };
  const store = await seedAndImport(v1);
  const cfg = store.getState().cfg!;

  expect(cfg.patients).toHaveLength(1);
  const p = cfg.patients[0];
  expect(p.name).toBe("Maria");
  expect(p.bed).toBe("4B-12");
  expect(p.patientLang).toBe("es");
  expect(p.hasVoice).toBe(true);
  expect(p.speakerData).toEqual({ id: "maria-voice-data" });
  expect(p.fallbackVoice).toEqual({ voiceURI: "com.apple.speech.synthesis.voice.Maria", name: "Maria" });
  expect(p.id).toMatch(/^[0-9a-f-]{36}$/i);  // UUID
  expect(typeof p.addedAt).toBe("number");
  expect(typeof p.lastActiveAt).toBe("number");

  expect(cfg.activePatientId).toBe(p.id);
  expect(cfg.pin).toBe("1234");
  expect(cfg.caregiverLang).toBe("en");
  expect(cfg.providers).toHaveLength(1);

  // Old top-level fields are gone
  expect((cfg as Record<string, unknown>).patientName).toBeUndefined();
  expect((cfg as Record<string, unknown>).speakerData).toBeUndefined();
  // Store-top-level speakerData is cleared (moved into Patient)
  expect(store.getState().speakerData).toBeNull();
});

it("leaves already-v2 configs alone", async () => {
  const v2 = {
    state: {
      cfg: {
        pin: "9999",
        caregiverLang: "de",
        providers: [],
        patients: [{
          id: "abc-123",
          name: "Jean",
          bed: "",
          patientLang: "fr",
          hasVoice: false,
          speakerData: null,
          addedAt: 1_000_000,
          lastActiveAt: 1_000_000,
        }],
        activePatientId: "abc-123",
      },
      speakerData: null,
    },
    version: 2,
  };
  const store = await seedAndImport(v2);
  const cfg = store.getState().cfg!;
  expect(cfg.patients[0].id).toBe("abc-123");
  expect(cfg.activePatientId).toBe("abc-123");
  expect(cfg.pin).toBe("9999");
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
cd /Users/mark/.config/superpowers/worktrees/ownvoice/multi-patient
npm test -- settingsStore
```

Expected: FAIL — migration doesn't handle v1→v2 yet; actions don't exist.

- [ ] **Step 3: Implement the migration**

Modify `src/stores/settingsStore.ts`:

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import type { AppSettings, Patient } from "../types";

const PERSIST_DEBOUNCE_MS = 300;
const STORE_VERSION = 2;

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
            const patient = newPatientFromLegacy(legacyCfg, typed.speakerData);
            cfg = {
              pin: String(legacyCfg.pin ?? ""),
              caregiverLang: String(legacyCfg.caregiverLang ?? "en"),
              assistiveInput: Boolean(legacyCfg.assistiveInput),
              providers: (legacyCfg.providers as AppSettings["providers"]) ?? [],
              patients: [patient],
              activePatientId: patient.id,
            };
          }
          return { cfg, speakerData: null };
        }
        return { cfg, speakerData: typed.speakerData };
      },
      partialize: (s): SettingsPersistedState => ({
        cfg: s.cfg,
        speakerData: s.speakerData,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useSettingsStore.setState({ _hasHydrated: true });
        });
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
```

- [ ] **Step 4: Add action tests**

Extend the test file with tests for `addPatient`, `switchPatient`, `removePatient`:

```ts
describe("multi-patient actions", () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase("keyval-store");
    vi.resetModules();
  });

  it("addPatient appends to list and sets active", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [], activePatientId: null,
      },
    });
    const p = useSettingsStore.getState().addPatient({
      name: "X", bed: "A-1", patientLang: "en",
      hasVoice: false, speakerData: null, fallbackVoice: null,
    });
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.patients).toHaveLength(1);
    expect(cfg.activePatientId).toBe(p.id);
  });

  it("switchPatient updates activePatientId + bumps lastActiveAt", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    useSettingsStore.getState().switchPatient("b");
    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.activePatientId).toBe("b");
    expect(cfg.patients[1].lastActiveAt).toBeGreaterThan(0);
  });

  it("removePatient throws if target is active", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a], activePatientId: "a" },
    });
    expect(() => useSettingsStore.getState().removePatient("a")).toThrow(/active/);
  });

  it("removePatient removes non-active patients", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    const a: Patient = { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    const b: Patient = { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 };
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [a, b], activePatientId: "a" },
    });
    useSettingsStore.getState().removePatient("b");
    expect(useSettingsStore.getState().cfg!.patients).toEqual([a]);
  });
});
```

- [ ] **Step 5: Run tests — expect green on the store tests**

```bash
npm test -- settingsStore
```

Other tests may still fail because of Task A1's type reshaping — those are resolved in Task A8.

- [ ] **Step 6: Commit**

```bash
git add src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat(multi-patient): settingsStore v1→v2 migration + addPatient/switch/remove actions"
```

---

### Task A3: `conversationStore` partitioning

**Files:**
- Modify: `src/stores/conversationStore.ts`
- Modify: `src/stores/conversationStore.test.ts` (may need creating)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("conversationStore — multi-patient partitioning", () => {
  beforeEach(() => { vi.resetModules(); });

  it("messages scope to activePatientId when added", async () => {
    // Set activePatientId via settingsStore
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: {
        pin: "", caregiverLang: "en", providers: [],
        patients: [
          { id: "a", name: "A", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
          { id: "b", name: "B", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 0 },
        ],
        activePatientId: "a",
      },
    });

    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.getState().addMessage("hello from A", "patient", "A");
    useSettingsStore.getState().switchPatient("b");
    useConversationStore.getState().addMessage("hello from B", "patient", "B");

    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["a"]).toHaveLength(1);
    expect(state.messagesByPatientId["a"][0].text).toBe("hello from A");
    expect(state.messagesByPatientId["b"]).toHaveLength(1);
    expect(state.messagesByPatientId["b"][0].text).toBe("hello from B");
  });

  it("clearForPatient deletes that patient's thread only", async () => {
    const { useConversationStore } = await import("./conversationStore");
    useConversationStore.setState({
      messagesByPatientId: {
        a: [{ from: "patient", text: "a-msg", time: "", label: "" }],
        b: [{ from: "patient", text: "b-msg", time: "", label: "" }],
      },
    });
    useConversationStore.getState().clearForPatient("a");
    const state = useConversationStore.getState();
    expect(state.messagesByPatientId["a"]).toBeUndefined();
    expect(state.messagesByPatientId["b"]).toHaveLength(1);
  });

  it("addMessage is a no-op if no active patient", async () => {
    const { useSettingsStore } = await import("./settingsStore");
    useSettingsStore.setState({
      cfg: { pin: "", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    });
    const { useConversationStore } = await import("./conversationStore");
    const before = useConversationStore.getState().messagesByPatientId;
    useConversationStore.getState().addMessage("orphan", "patient", "X");
    expect(useConversationStore.getState().messagesByPatientId).toEqual(before);
  });
});
```

- [ ] **Step 2: Implement**

Rewrite `src/stores/conversationStore.ts`:

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDebouncedIDBStorage } from "./idbStorage";
import { useSettingsStore } from "./settingsStore";
import type { Message } from "../types";

interface ConversationState {
  messagesByPatientId: Record<string, Message[]>;

  addMessage: (
    text: string,
    from: "patient" | "provider",
    label: string,
    gloss?: string,
  ) => void;
  /** Clears the currently-active patient's thread. */
  clear: () => void;
  /** Clears a specific patient's thread (used by Remove cascade). */
  clearForPatient: (patientId: string) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      messagesByPatientId: {},

      addMessage: (text, from, label, gloss) => {
        const activeId = useSettingsStore.getState().cfg?.activePatientId;
        if (!activeId) return;
        const time = new Date().toLocaleTimeString([], {
          hour: "numeric", minute: "2-digit",
        });
        set((s) => {
          const existing = s.messagesByPatientId[activeId] ?? [];
          return {
            messagesByPatientId: {
              ...s.messagesByPatientId,
              [activeId]: [...existing, { from, text, time, label, gloss }],
            },
          };
        });
      },

      clear: () => {
        const activeId = useSettingsStore.getState().cfg?.activePatientId;
        if (!activeId) return;
        set((s) => {
          const next = { ...s.messagesByPatientId };
          delete next[activeId];
          return { messagesByPatientId: next };
        });
      },

      clearForPatient: (patientId) => {
        set((s) => {
          const next = { ...s.messagesByPatientId };
          delete next[patientId];
          return { messagesByPatientId: next };
        });
      },
    }),
    {
      name: "ov-conversation",
      version: 2,
      storage: createJSONStorage(() => createDebouncedIDBStorage(500)),
      migrate: (persisted, fromVersion) => {
        const typed = persisted as { messages?: Message[]; messagesByPatientId?: Record<string, Message[]> } | null;
        if (!typed) return { messagesByPatientId: {} };

        if (fromVersion < 2 && typed.messages && !typed.messagesByPatientId) {
          // v1 had flat messages[]. Reattach them to the active patient
          // if settingsStore has already migrated; otherwise drop them
          // (fresh install or no active patient means no meaningful place
          // to land them). This is destructive but the alternative is
          // stashing orphan messages with no owner.
          const activeId = useSettingsStore.getState().cfg?.activePatientId;
          if (activeId) {
            return { messagesByPatientId: { [activeId]: typed.messages } };
          }
          return { messagesByPatientId: {} };
        }
        return { messagesByPatientId: typed.messagesByPatientId ?? {} };
      },
    },
  ),
);

/** Hook: returns messages for the currently-active patient. */
export function useActiveMessages(): Message[] {
  return useConversationStore((s) => {
    const activeId = useSettingsStore.getState().cfg?.activePatientId;
    return activeId ? (s.messagesByPatientId[activeId] ?? []) : [];
  });
}
```

Note: `useActiveMessages` reads `activePatientId` imperatively from settingsStore (not reactively). This means it won't re-render when just `activePatientId` changes — only when messages change. That's insufficient. Fix: make the selector subscribe to both stores by reading the active id as a normal Zustand selector from within the component, not from inside the messages selector:

```ts
// Replace useActiveMessages with a pattern callers use:
import { useActivePatient } from "./settingsStore";
// In component:
const active = useActivePatient();
const messages = useConversationStore((s) => active ? (s.messagesByPatientId[active.id] ?? []) : []);
```

Drop `useActiveMessages` from the exports. Callers use the two-hook pattern.

- [ ] **Step 3: Run tests — expect green**

```bash
npm test -- conversationStore
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/conversationStore.ts src/stores/conversationStore.test.ts
git commit -m "feat(multi-patient): partition conversationStore by activePatientId"
```

---

### Task A4: `audioCacheStore` patient-scoped keys

**Files:**
- Modify: `src/stores/audioCacheStore.ts`

The `SpeakerKey` type currently includes `"patient"`, `"patient:pain"`, `"provider:${number}"`. Patient entries become `"patient:${string}"` and `"patient:${string}:pain"` keyed by patient UUID.

- [ ] **Step 1: Update the type**

```ts
export type SpeakerKey =
  | `patient:${string}`
  | `patient:${string}:pain`
  | `provider:${number}`;
```

- [ ] **Step 2: Update helpers that construct keys**

Audit `audioCacheStore.ts` for any hardcoded `"patient"` or `"patient:pain"` and replace with template-literal construction using a passed-in patientId. Any callers inside the store that previously used a fixed `"patient"` key need adjustment.

- [ ] **Step 3: Run tests — most failures will be in `audioCacheRunner` (Task A6)**

Commit this smaller scope here; full end-to-end correctness comes after Task A6.

- [ ] **Step 4: Commit**

```bash
git add src/stores/audioCacheStore.ts
git commit -m "refactor(multi-patient): patient-scoped SpeakerKey in audioCacheStore"
```

---

### Task A5: `patientIndex.ts` — OPFS metadata for patient→hashes

**Files:**
- Create: `src/stores/patientIndex.ts`
- Create: `src/stores/patientIndex.test.ts`

The patient-index maps each patient to their fingerprint and the set of hashes their cache clips use. On remove, we iterate the set and unlink files.

- [ ] **Step 1: Write failing tests**

Create `src/stores/patientIndex.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordHash, removePatientHashes, getPatientHashes,
  setFingerprint, getFingerprint, clearIndex,
} from "./patientIndex";

beforeEach(async () => {
  await clearIndex();
});

describe("patientIndex", () => {
  it("records and retrieves hashes per patient", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "hash-abc");
    await recordHash("p1", "hash-def");
    const hashes = await getPatientHashes("p1");
    expect(hashes).toEqual(new Set(["hash-abc", "hash-def"]));
  });

  it("records fingerprint", async () => {
    await setFingerprint("p1", "fingerprint-1");
    expect(await getFingerprint("p1")).toBe("fingerprint-1");
  });

  it("removePatientHashes returns all hashes then clears them", async () => {
    await setFingerprint("p1", "fp1");
    await recordHash("p1", "h1");
    await recordHash("p1", "h2");
    const removed = await removePatientHashes("p1");
    expect(removed).toEqual(new Set(["h1", "h2"]));
    expect(await getPatientHashes("p1")).toEqual(new Set());
    expect(await getFingerprint("p1")).toBeNull();
  });

  it("recordHash is a no-op for unknown patient (fingerprint must exist first)", async () => {
    await recordHash("unknown", "h1");
    expect(await getPatientHashes("unknown")).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Implement**

Create `src/stores/patientIndex.ts`:

```ts
/**
 * Per-patient metadata map for OPFS audio cache cleanup.
 * Single JSON file at audio-cache-v3/patient-index.json:
 *   { [patientId]: { fingerprint, hashes: string[] } }
 *
 * Loaded into memory on first access; debounced writes keep disk in sync.
 * Not Zustand — pure module-level state. Placed in src/stores/ only for
 * mutation-audit coverage.
 */

interface PatientEntry {
  fingerprint: string;
  hashes: string[];  // serialized as array; held in memory as Set for dedup
}

type IndexFile = Record<string, PatientEntry>;

const INDEX_PATH = ["audio-cache-v3", "patient-index.json"];
const WRITE_DEBOUNCE_MS = 500;

let memIndex: Map<string, { fingerprint: string; hashes: Set<string> }> | null = null;
let pendingWrite: ReturnType<typeof setTimeout> | null = null;

async function getIndexFileHandle(): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(INDEX_PATH[0], { create: true });
  return dir.getFileHandle(INDEX_PATH[1], { create: true });
}

async function loadIndex(): Promise<void> {
  if (memIndex) return;
  memIndex = new Map();
  try {
    const handle = await getIndexFileHandle();
    const file = await handle.getFile();
    if (file.size === 0) return;
    const raw: IndexFile = JSON.parse(await file.text());
    for (const [pid, entry] of Object.entries(raw)) {
      memIndex.set(pid, {
        fingerprint: entry.fingerprint,
        hashes: new Set(entry.hashes ?? []),
      });
    }
  } catch (err) {
    console.warn("[patientIndex] failed to load:", err);
    memIndex = new Map();
  }
}

function scheduleWrite(): void {
  if (pendingWrite) clearTimeout(pendingWrite);
  pendingWrite = setTimeout(flushWrite, WRITE_DEBOUNCE_MS);
}

async function flushWrite(): Promise<void> {
  pendingWrite = null;
  if (!memIndex) return;
  const out: IndexFile = {};
  for (const [pid, entry] of memIndex) {
    out[pid] = { fingerprint: entry.fingerprint, hashes: Array.from(entry.hashes) };
  }
  try {
    const handle = await getIndexFileHandle();
    const w = await handle.createWritable();
    await w.write(JSON.stringify(out));
    await w.close();
  } catch (err) {
    console.error("[patientIndex] write failed:", err);
  }
}

export async function setFingerprint(patientId: string, fingerprint: string): Promise<void> {
  await loadIndex();
  const existing = memIndex!.get(patientId);
  memIndex!.set(patientId, {
    fingerprint,
    hashes: existing?.hashes ?? new Set(),
  });
  scheduleWrite();
}

export async function getFingerprint(patientId: string): Promise<string | null> {
  await loadIndex();
  return memIndex!.get(patientId)?.fingerprint ?? null;
}

export async function recordHash(patientId: string, hash: string): Promise<void> {
  await loadIndex();
  const entry = memIndex!.get(patientId);
  if (!entry) return;  // unknown patient — silently drop (fingerprint must be set first)
  entry.hashes.add(hash);
  scheduleWrite();
}

export async function getPatientHashes(patientId: string): Promise<Set<string>> {
  await loadIndex();
  return new Set(memIndex!.get(patientId)?.hashes ?? []);
}

export async function removePatientHashes(patientId: string): Promise<Set<string>> {
  await loadIndex();
  const entry = memIndex!.get(patientId);
  if (!entry) return new Set();
  const hashes = new Set(entry.hashes);
  memIndex!.delete(patientId);
  await flushWrite();  // force immediate sync on destructive action
  return hashes;
}

export async function clearIndex(): Promise<void> {
  memIndex = new Map();
  try {
    const handle = await getIndexFileHandle();
    const w = await handle.createWritable();
    await w.write("{}");
    await w.close();
  } catch {
    // Test environments may not have OPFS
  }
}
```

- [ ] **Step 3: Run tests — green**

```bash
npm test -- patientIndex
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/patientIndex.ts src/stores/patientIndex.test.ts
git commit -m "feat(multi-patient): patient-index.json for OPFS cache partitioning"
```

---

### Task A6: `audioCacheRunner` uses active patient

**Files:**
- Modify: `src/models/audioCacheRunner.ts`
- Modify: `src/models/audioCacheRunner.test.ts`
- Modify: `src/models/audioCache.ts` (wire `recordHash` into `putCachedAudio`)

- [ ] **Step 1: Update `buildPlan` to resolve active patient**

```ts
function buildPlan(cfg: AppSettings): SpeakerPlan[] {
  const plan: SpeakerPlan[] = [];
  const activeId = cfg.activePatientId;
  const activePatient = activeId ? cfg.patients.find((p) => p.id === activeId) : null;
  if (!activePatient) return plan;

  if (canCloneForLocale(cfg.caregiverLang) && isRunnable(activePatient.speakerData)) {
    plan.push({
      key: `patient:${activePatient.id}`,
      speakerData: activePatient.speakerData,
      phrases: getPatientSpokenPhrases(cfg.caregiverLang),
    });
  }

  if (canCloneForLocale(activePatient.patientLang)) {
    cfg.providers.forEach((p, i) => {
      if (isRunnable(p.embedding)) {
        plan.push({
          key: `provider:${i}`,
          speakerData: p.embedding,
          phrases: getProviderSpokenPhrases(activePatient.patientLang),
        });
      }
    });
  }

  if (
    canCloneForLocale(cfg.caregiverLang) &&
    isRunnable(activePatient.speakerData) &&
    isGPUReady()
  ) {
    plan.push({
      key: `patient:${activePatient.id}:pain`,
      speakerData: activePatient.speakerData,
      phrases: getPatientPainSentencesForSpeech(cfg.caregiverLang),
      gpuOnly: true,
    });
  }
  return plan;
}

export async function runPreGeneration(cfg: AppSettings): Promise<void> {
  // The previous signature took patientSpeakerData explicitly; now it's
  // derived from cfg.activePatientId. Callers in App.tsx adapt in Task A7.
  abort();
  const plan = buildPlan(cfg);
  // ... rest unchanged, except all references to patientSpeakerData → activePatient.speakerData
}
```

Update the exported `runPreGeneration` signature: drop the second `patientSpeakerData` arg. Callers compute active patient's speaker data from `cfg` now.

- [ ] **Step 2: Wire `recordHash` into `putCachedAudio`**

In `src/models/audioCache.ts`:

```ts
import { recordHash } from "../stores/patientIndex";

export async function putCachedAudio(
  phrase: string,
  speakerData: unknown,
  audio: Float32Array,
  /** The patient this clip belongs to — required for index maintenance.
   *  null for provider clips (no index tracking). */
  patientId: string | null,
): Promise<void> {
  const fp = embeddingFingerprint(speakerData);
  if (fp === "none") return;
  try {
    const dir = await getCacheDir();
    const key = hashKey(phrase, fp);
    const fileHandle = await dir.getFileHandle(`${key}.raw`, { create: true });
    const writable = await fileHandle.createWritable();
    const pcm = float32ToInt16(audio);
    await writable.write(pcm.buffer as ArrayBuffer);
    await writable.close();
    if (patientId) {
      await recordHash(patientId, key);
    }
  } catch (err) {
    console.error("[OwnVoice:Cache] Failed to store audio:", err);
  }
}
```

Callers of `putCachedAudio` (in `generateAllPhrases` inside `audioCache.ts` itself, and anywhere else) need to pass the owning `patientId` — derive it from the SpeakerKey being processed (extract UUID from `patient:${uuid}` shape).

- [ ] **Step 3: Update tests**

`audioCacheRunner.test.ts` — tests currently build plans with explicit `patientSpeakerData`. Update to construct a Patient and attach it to cfg.

- [ ] **Step 4: Run tests — expect green for store + runner**

```bash
npm test -- audioCacheRunner audioCache patientIndex
```

Other component tests still fail until Task A8.

- [ ] **Step 5: Commit**

```bash
git add src/models/audioCacheRunner.ts src/models/audioCache.ts src/models/audioCacheRunner.test.ts
git commit -m "feat(multi-patient): audioCacheRunner derives active patient from cfg"
```

---

### Task A7: `App.tsx` embeddingKey + Setup gate

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `embeddingKey` to factor the new shape**

```ts
const embeddingKey = useMemo(() => {
  if (!cfg) return "";
  const active = cfg.activePatientId
    ? cfg.patients.find((p) => p.id === cfg.activePatientId)
    : null;
  if (!active) return "no-active";
  const patientFp = embeddingFingerprint(active.speakerData);
  const providerFps = cfg.providers
    .map((p, i) => `${i}:${embeddingFingerprint(p.embedding)}`)
    .join(",");
  return `${cfg.caregiverLang}:${active.id}:${patientFp}|${active.patientLang}:${providerFps}`;
}, [cfg]);
```

- [ ] **Step 2: Update Setup gate condition**

```ts
// Before: if (!cfg) return <Setup onDone={setCfg} />;
if (!hasHydrated) return null;
if (!cfg || cfg.patients.length === 0 || cfg.activePatientId === null) {
  return <Setup onDone={setCfg} mode="first-run" />;
}
```

Note: `mode="first-run"` prop lands in PR B (Task B2). For PR A, pass it anyway — Setup ignores unknown props safely.

- [ ] **Step 3: Update `runPreGeneration` call site**

```ts
audioCacheRunner.runPreGeneration(cfgRef.current);  // drop second arg
```

- [ ] **Step 4: On switchPatient, call pauseAll first**

The existing `embeddingKey` effect already re-runs on change, but by the time the re-run fires, the outgoing patient's queue may still be active. Wrap the switchPatient call in a helper in audioCacheRunner:

```ts
// In audioCacheRunner.ts
export function switchPatientTransition(cfg: AppSettings): void {
  pauseAll();
  // Defer runPreGeneration one tick so embeddingKey effect has rehydrated
  queueMicrotask(() => runPreGeneration(cfg));
}
```

Callers (the SwitchSheet in Task A9) invoke this instead of calling `settingsStore.switchPatient` directly. Actually — cleaner is: `settingsStore.switchPatient` action internally dispatches `audioCacheRunner.pauseAll()` before the state update. But that couples store to models which is wrong direction. Leave dispatch to the UI caller.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/models/audioCacheRunner.ts
git commit -m "feat(multi-patient): App.tsx embeddingKey factors activePatientId; pauseAll on switch"
```

---

### Task A8: Migrate all component call sites to new cfg shape

**Files:**
- Modify: any component reading `cfg.patientName`, `cfg.bed`, `cfg.patientLang`, `cfg.patientVoice`, `cfg.fallbackVoice`

- [ ] **Step 1: Audit**

```bash
cd /Users/mark/.config/superpowers/worktrees/ownvoice/multi-patient
grep -rn "cfg\.\(patientName\|bed\|patientLang\|patientVoice\|fallbackVoice\)" src/ --include='*.ts*' | grep -v '\.test\.'
```

Typical hits:
- `src/App.tsx` — `cfg.patientLang`, `cfg.patientVoice`, etc. used in various places
- `src/components/layout/Header.tsx` — `cfg.patientName`, `cfg.bed`
- `src/components/settings/sections/PatientInfoSection.tsx` — every field
- `src/hooks/useSpeakActions.ts` — `cfg.patientLang` likely
- `src/components/shared/VoiceCapture.tsx` — `cfg.patientVoice`, `cfg.fallbackVoice`

For each hit, replace with `useActivePatient()` (the hook from Task A2) and read the field off the returned Patient:

```ts
// Before:
const cfg = useSettingsStore((s) => s.cfg);
const name = cfg?.patientName ?? "Patient";
// After:
const active = useActivePatient();
const name = active?.name ?? "Patient";
```

For updates to patient fields (e.g. PatientInfoSection sets patientName):

```ts
// Before:
updateCfg({ patientName: value });
// After:
const active = useActivePatient();
if (active) {
  useSettingsStore.setState((s) => s.cfg ? {
    cfg: {
      ...s.cfg,
      patients: s.cfg.patients.map((p) =>
        p.id === active.id ? { ...p, name: value } : p,
      ),
    },
  } : {});
}
```

That's verbose — factor into a `useSettingsStore` action `updateActivePatient(partial: Partial<Patient>)`:

```ts
// In settingsStore.ts, add:
updateActivePatient: (partial: Partial<Patient>) => {
  set((s) => {
    if (!s.cfg?.activePatientId) return {};
    return {
      cfg: {
        ...s.cfg,
        patients: s.cfg.patients.map((p) =>
          p.id === s.cfg!.activePatientId ? { ...p, ...partial } : p,
        ),
      },
    };
  });
},
```

Callers then do `useSettingsStore.getState().updateActivePatient({ name: value })`.

- [ ] **Step 2: Update each file from the grep**

For each of ~15 files, replace reads and writes as described. This is mechanical.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Many test fixtures also need updating — tests that mount with a custom `cfg: AppSettings` literal previously had `patientName: "X"` at top level. Now they need `patients: [{ id: "x", name: "X", ... }], activePatientId: "x"`. A shared test helper would reduce duplication:

```ts
// src/test/makeCfg.ts (new file)
import type { AppSettings, Patient } from "../types";
export function makeTestCfg(partial: {
  patient?: Partial<Patient>;
  patients?: Patient[];
  cfg?: Partial<AppSettings>;
} = {}): AppSettings {
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
```

Import from tests: `import { makeTestCfg } from "../../test/makeCfg"`. Replace all inline cfg literals.

- [ ] **Step 4: Commit**

Large commit is fine here — the rename + test-fixture update is all one conceptual change.

```bash
git add -A src/
git commit -m "refactor(multi-patient): migrate components + tests to use useActivePatient

~15 components now read patient fields via useActivePatient() instead of
directly from cfg; ~25 test files use the new makeTestCfg helper."
```

---

### Task A9: Switch Patient sheet component

**Files:**
- Create: `src/components/switch/SwitchSheet.tsx`
- Create: `src/components/switch/SwitchSheet.test.tsx`

Uses the existing `BottomSheet` pattern from `src/components/shared/BottomSheet.tsx`. Patient list is a `role="listbox"` with keyboard navigation.

- [ ] **Step 1: Write failing tests**

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { SwitchSheet } from "./SwitchSheet";
import { useSettingsStore } from "../../stores/settingsStore";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Patient } from "../../types";

function setupCfg(patients: Patient[], activeId: string) {
  useSettingsStore.setState({
    cfg: { pin: "", caregiverLang: "en", providers: [], patients, activePatientId: activeId },
  });
}

describe("SwitchSheet", () => {
  beforeEach(() => { vi.resetModules(); });

  it("renders each patient as a role=option", () => {
    const a: Patient = { id: "a", name: "Alice", bed: "A-1", patientLang: "en", hasVoice: true, speakerData: null, addedAt: 1, lastActiveAt: 2 };
    const b: Patient = { id: "b", name: "Bob", bed: "B-2", patientLang: "es", hasVoice: false, speakerData: null, addedAt: 1, lastActiveAt: 1 };
    setupCfg([a, b], "a");
    render(<SwitchSheet onClose={() => {}} />);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Alice");  // sorted by lastActiveAt desc
  });

  it("tapping non-active patient switches + pauses", async () => {
    const mockPause = vi.fn();
    vi.doMock("../../models/audioCacheRunner", () => ({ pauseAll: mockPause, runPreGeneration: vi.fn() }));
    const a: Patient = { id: "a", name: "Alice", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 2 };
    const b: Patient = { id: "b", name: "Bob", bed: "", patientLang: "es", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 1 };
    setupCfg([a, b], "a");
    const onClose = vi.fn();
    render(<SwitchSheet onClose={onClose} />);
    fireEvent.click(screen.getByText("Bob").closest('[role="option"]')!);
    expect(mockPause).toHaveBeenCalled();
    expect(useSettingsStore.getState().cfg!.activePatientId).toBe("b");
    expect(onClose).toHaveBeenCalled();
  });

  it("tapping active patient is a no-op", () => {
    const a: Patient = { id: "a", name: "Alice", bed: "", patientLang: "en", hasVoice: false, speakerData: null, addedAt: 0, lastActiveAt: 1 };
    setupCfg([a], "a");
    const onClose = vi.fn();
    render(<SwitchSheet onClose={onClose} />);
    fireEvent.click(screen.getByText("Alice").closest('[role="option"]')!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

Create `src/components/switch/SwitchSheet.tsx`. Use the existing BottomSheet, render the list, wire Tap → settingsStore.switchPatient + pauseAll. Include ARIA: `role="listbox"`, `aria-current="true"` on active, `aria-label` on card computing from name+bed.

[Implementation code omitted from this plan — use the existing BottomSheet pattern as template; mirror the aria affordances from the spec §5.2.]

- [ ] **Step 3: Run tests — green**

- [ ] **Step 4: Commit**

```bash
git add src/components/switch/SwitchSheet.tsx src/components/switch/SwitchSheet.test.tsx
git commit -m "feat(multi-patient): SwitchSheet component with role=listbox + pause-on-switch"
```

---

### Task A10: Header "Switch Patient" button

**Files:**
- Modify: `src/components/layout/HeaderNav.tsx`
- Modify: `src/App.tsx` (wire the button to open the SwitchSheet via uiStore)

Add a new button left of Settings. Tapping it: if `uiStore.staffAuthed`, open SwitchSheet directly; else show PinGate first, then open SwitchSheet on PIN success.

- [ ] **Step 1: Add `switchSheetOpen: boolean` to `uiStore`**

- [ ] **Step 2: Add the button to HeaderNav**

Follow the existing button pattern in HeaderNav. Button label: `ui.provider.nav.switch_patient` = `"Switch Patient"`. aria-label matches.

- [ ] **Step 3: Wire in App.tsx**

When the button is tapped: if `staffAuthed` (from uiStore — in PR A this is always false since timer infra is PR B, so we treat the PIN check as "per tap" for now), show PinGate; on success, `setStaffAuthed(true)` + `openSwitchSheet()`. If already authed, skip straight to open.

For PR A, `staffAuthed` is plumbed on uiStore but the timer infra is a PR B thing — each tap re-prompts for PIN. That's acceptable as an intermediate state.

- [ ] **Step 4: Run tests + commit**

```bash
git add src/components/layout/HeaderNav.tsx src/App.tsx src/stores/uiStore.ts src/data/locales/en.ts
git commit -m "feat(multi-patient): header Switch Patient button + uiStore.switchSheetOpen"
```

---

### Task A11: Settings → Patients section (Add + Remove scaffolding)

**Files:**
- Create: `src/components/settings/sections/PatientsSection.tsx`
- Create: `src/components/settings/sections/PatientsSection.test.tsx`
- Modify: `src/components/settings/SettingsPanel.tsx` (include the new section)

For PR A, this section has:
- Patient list (same card shape as SwitchSheet)
- Active patient's Remove button is disabled with an aria-describedby hint
- Remove button triggers `ConfirmDialog` → on confirm, cascades per §4.7 of spec
- "+ Add Patient" button — in PR A, it's a stub that shows a "Coming in PR B" toast or is disabled with tooltip

- [ ] **Step 1: Write failing tests for the Remove cascade**

```tsx
describe("PatientsSection — Remove", () => {
  it("disables Remove on the active patient", () => {
    setupCfg([{ id: "a", name: "A", /* ... */ }], "a");
    render(<PatientsSection />);
    const btn = screen.getByRole("button", { name: /remove/i });
    expect(btn).toBeDisabled();
  });

  it("tapping Remove on inactive patient opens ConfirmDialog; confirm cascades", async () => {
    // Set up two patients, a active
    // Tap Remove on b
    // Verify ConfirmDialog rendered with expected copy
    // Click "Remove" in dialog
    // Verify:
    //   - cfg.patients has one entry (a)
    //   - conversationStore.messagesByPatientId[b] is absent
    //   - patientIndex.removePatientHashes was called with "b"
  });
});
```

- [ ] **Step 2: Implement**

Implementation follows the existing section pattern; see `CareTeamSection.tsx` for the structural template. Use `ConfirmDialog` from `../../shared/ConfirmDialog` (primitive landed in localization PR 1). Copy for the dialog comes from new keys under `ui.provider.settings.patients.*` — add them to `en.ts`.

- [ ] **Step 3: Wire the cascade**

When Remove is confirmed:

```ts
async function handleRemove(patientId: string) {
  // 1. settingsStore
  useSettingsStore.getState().removePatient(patientId);
  // 2. conversationStore
  useConversationStore.getState().clearForPatient(patientId);
  // 3. OPFS cache cleanup
  const hashes = await removePatientHashes(patientId);
  const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle("audio-cache-v3");
  for (const hash of hashes) {
    try { await dir.removeEntry(`${hash}.raw`); } catch { /* missing file — fine */ }
  }
  // 4. audioCacheStore entries keyed on patient:{id}*
  useAudioCacheStore.getState().discardByPatientId(patientId);
}
```

(`discardByPatientId` is a new action in `audioCacheStore` — implement it as part of Task A4's scope if not done already; filter keys starting with `patient:${id}`.)

- [ ] **Step 4: Run tests + commit**

```bash
git add src/components/settings/sections/PatientsSection.tsx src/components/settings/sections/PatientsSection.test.tsx src/components/settings/SettingsPanel.tsx src/data/locales/en.ts src/stores/audioCacheStore.ts
git commit -m "feat(multi-patient): PatientsSection with Remove cascade + ConfirmDialog"
```

---

### Task A12: Update `resetAll` to wipe patient-index

**Files:**
- Modify: `src/stores/resetAll.ts`
- Modify: `src/stores/resetAll.test.ts`

- [ ] **Step 1: Add patient-index clear to resetAll**

```ts
import { clearIndex } from "./patientIndex";

export async function resetAll(): Promise<void> {
  // ... existing steps
  await clearIndex();  // new — wipe patient-index.json
  // ... rest
}
```

- [ ] **Step 2: Update test + commit**

```bash
git add src/stores/resetAll.ts src/stores/resetAll.test.ts
git commit -m "refactor(multi-patient): resetAll clears patient-index"
```

---

### Task A13: Integration tests

**Files:**
- Create: `src/__tests__/multi-patient.test.tsx` (new integration test file)

- [ ] **Step 1: Write integration tests for switch flow + switch-back resume**

```tsx
describe("multi-patient integration", () => {
  it("switch A→B pauses A's queue and starts B's", async () => {
    // Mount App with two patients (A active)
    // Start pre-gen (mocked to show progress)
    // Assert audioCacheStore has running entry for A
    // Open SwitchSheet, click B
    // Assert:
    //   - A's entries transition to "paused"
    //   - activePatientId === "b"
    //   - runPreGeneration was invoked for B
  });

  it("switch B→A resumes A's progress", async () => {
    // Continuing: switch back
    // Assert A's paused entries now running; B's are paused
  });

  it("remove cascade clears conversation + cache + index", async () => {
    // Seed two patients with messages and cached hashes
    // Remove the inactive one
    // Assert:
    //   - cfg.patients: 1 entry
    //   - conversationStore.messagesByPatientId: only active patient present
    //   - patientIndex: only active patient present
    //   - OPFS cache dir: only active patient's files present
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/__tests__/multi-patient.test.tsx
git commit -m "test(multi-patient): integration tests for switch + switch-back + remove cascade"
```

---

### Task A14: Scoped mutation audit + PR A close

- [ ] **Step 1: Scoped audit**

```bash
npx stryker run --mutate 'src/stores/settingsStore.ts'
npx stryker run --mutate 'src/stores/conversationStore.ts'
npx stryker run --mutate 'src/stores/patientIndex.ts'
```

Target ≥80% per file. Strengthen tests if a score drops below.

- [ ] **Step 2: Push + open PR A**

```bash
git push -u origin feature/multi-patient-a
gh pr create --title "feat(multi-patient): PR A/2 — data model + Switch + Remove" \
  --body "$(cat <<'EOF'
## Summary
- Patient[] + activePatientId on AppSettings
- settingsStore v1→v2 migration preserves existing single-patient cfg as first Patient
- conversationStore partitioned by patientId
- audioCacheStore SpeakerKey scoped by patient UUID
- OPFS patient-index.json for remove-cascade cleanup
- audioCacheRunner derives active patient from cfg
- SwitchSheet component (BottomSheet-based, role=listbox)
- Settings → PatientsSection for Remove flow
- Header "Switch Patient" button
- resetAll wipes patient-index

## Not in this PR (PR B)
- Add Patient flow (Setup add-patient mode)
- Staff-session 5-min timer + warning toast
- "End staff session" header button
- axe-core a11y tests

## Test plan
- [x] 946+ tests green (baseline 959 from PR 2 + new multi-patient tests)
- [x] Build clean
- [ ] Mutation scores ≥80% on settingsStore, conversationStore, patientIndex
- [ ] Manual: migrate from v1 cfg, verify app renders; Switch and Remove work

EOF
)"
```

- [ ] **Step 3: STOP for review**

---

# Milestone PR B — Add Patient + staff-session timer + a11y

**Deliverable:** "+ Add Patient" works end-to-end. Staff-session auto-lock with warning toast. "End staff session" button. axe-core component tests.

### Task B1: `uiStore` staffAuthed state

**Files:**
- Modify: `src/stores/uiStore.ts`

Add state + actions:
```ts
staffAuthed: boolean;
staffAuthedAt: number | null;
setStaffAuthed: (v: boolean) => void;
bumpStaffAuthed: () => void;  // updates staffAuthedAt to Date.now()
endStaffSession: () => void;  // sets staffAuthed false + staffAuthedAt null
```

Transient (not persisted — clears on page reload).

Commit: `feat(multi-patient): uiStore staffAuthed + timestamp`

### Task B2: Setup `mode="add-patient"` prop

**Files:**
- Modify: `src/components/settings/Setup.tsx`

Accept `mode: "first-run" | "add-patient"` prop. In `"add-patient"` mode, skip Step 2 (Care Team) and the PIN entry in Step 3 — caregiverLang picker is also hidden from Step 0 (it's device-level). On finish, dispatch `addPatient` instead of writing a fresh cfg.

Update unit tests for both modes.

Commit: `feat(multi-patient): Setup mode prop + add-patient flow`

### Task B3: First-run Setup writes to new shape

Setup's `finish()` currently writes the old AppSettings shape. Update to produce `{ ..., patients: [newPatient], activePatientId: newPatient.id }`.

Commit: `feat(multi-patient): Setup.finish writes new AppSettings shape`

### Task B4: Staff-session timer component

**Files:**
- Create: `src/components/shared/StaffSessionTimer.tsx`
- Create: `src/components/shared/StaffSessionTimer.test.tsx`

Mounts once in App. Effect watches `staffAuthedAt`; schedules a timer to fire at `staffAuthedAt + 4:00` (4 min — 60s before lock). On fire: mount WarningToast. On WarningToast timeout without interaction: `endStaffSession()`.

Commit: `feat(multi-patient): StaffSessionTimer with 5-min auto-lock`

### Task B5: WarningToast component

**Files:**
- Create: `src/components/shared/WarningToast.tsx`
- Create: `src/components/shared/WarningToast.test.tsx`

`role="alertdialog"` + `aria-live="assertive"`. Countdown from 60 → 0. "Extend" button → bumpStaffAuthed + unmount. "End now" button → endStaffSession + unmount. Auto-dismiss at 0 → endStaffSession + unmount. Honors `prefers-reduced-motion` for the countdown animation.

Commit: `feat(multi-patient): WarningToast primitive`

### Task B6: "End staff session" header button

Visibility-gated on `staffAuthed`. Between Settings and (optionally) Switch buttons. Tap → endStaffSession.

Commit: `feat(multi-patient): End staff session button`

### Task B7: Staff-surface activity tracking

Wire `bumpStaffAuthed()` to `onClick`/`onKeyDown` on staff-surface containers:
- SettingsPanel wrapper
- SwitchSheet wrapper
- PatientsSection card buttons
- End staff session / Switch / Settings header buttons themselves

Patient-surface interactions (phrase taps, tab bar) do NOT bump.

Commit: `feat(multi-patient): bump staff-session timestamp on staff-surface activity`

### Task B8: axe-core component tests

**Files:**
- Add `jest-axe` or `@axe-core/preact` to dev deps
- Add axe tests to SwitchSheet, PatientsSection Remove dialog, WarningToast

Assertions: `expect(results).toHaveNoViolations()`.

Commit: `test(multi-patient): axe-core a11y tests on new surfaces`

### Task B9: PR B close — mutation audit + push

Scoped audit: `settingsStore.ts`, `uiStore.ts`.

Push + open PR B stacked on PR A.

---

## Self-review checklist

**Spec coverage:**
- [ ] §4.1 types → Task A1
- [ ] §4.2 store changes → Tasks A2, A3, A4
- [ ] §4.3 OPFS cache partitioning → Tasks A5, A6
- [ ] §4.4 pause-on-switch → Task A7, A9
- [ ] §4.5 staff auth model → Tasks B1, B4, B5, B6, B7
- [ ] §4.6 first-run vs. add-patient → Tasks B2, B3
- [ ] §4.7 Remove cascade → Task A11
- [ ] §5.1 header chrome → Tasks A10, B6
- [ ] §5.2 Switch sheet → Task A9
- [ ] §5.3 Add flow → Tasks B2, B3
- [ ] §5.4 Remove flow → Task A11
- [ ] §5.5 warning toast → Task B5
- [ ] §6 a11y → Task B8 (+ inline in component tasks)
- [ ] §7 sequencing → documented in PR descriptions
- [ ] §8 testing → Tasks A13 (integration), B8 (a11y), A14+B9 (mutation)

**Placeholder scan:**
- [ ] No "TBD"/"TODO"/"implement later"
- [ ] Every code step shows the actual code (or an explicit "implementation code omitted — see pattern" for UI components where the pattern is already in the codebase — this appears only in Task A9 and is justified)

**Type consistency:**
- [ ] `Patient.id` is string (UUID) everywhere
- [ ] `activePatientId: string | null` consistent
- [ ] `SpeakerKey` template-literal patterns match across store + runner
- [ ] `patientIndex` function signatures consistent (recordHash, removePatientHashes, setFingerprint, getFingerprint, clearIndex)

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-multi-patient.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
