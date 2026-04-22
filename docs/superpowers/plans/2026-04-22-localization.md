# Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `patientLang` runtime-changeable from Settings, add a configurable `caregiverLang` alongside it, gate voice cloning on Chatterbox Turbo language support, introduce dual-locale rendering for co-reading and transcript surfaces, and migrate ~191 hardcoded UI strings into the locale registry.

**Architecture:** Five sequential PRs. (1) Primitives — types, helpers, primitives, key-based composition. (2) String extraction into `en.ts`. (3) Cache-runner behavior + Web Speech locale threading. (4) Settings UX + Thread/co-reading gloss rendering. (5) Docs + final mutation baseline. Under the new model the patient-voice cache becomes language-invariant across `patientLang` changes (only provider caches regenerate); changing `caregiverLang` is the inverse.

**Tech Stack:** TypeScript · Preact · Vite · Vitest · Stryker (mutation) · Zustand (IndexedDB persist via `src/stores/idbStorage.ts`).

**Reference:** [Localization design](../specs/2026-04-22-localization-design.md). Keep this open alongside the plan — each task references sections of the spec rather than duplicating rationale.

---

## File structure

**New files:**
- `src/data/chatterboxLocales.ts` — `CHATTERBOX_LOCALES` set + `canCloneForLocale(locale)` predicate. Placed under `src/data/` (not `src/models/`) so it falls within the project's mutation-audit scope.
- `src/data/chatterboxLocales.test.ts` — unit tests for the set and predicate.
- `src/components/shared/DualLocaleText.tsx` — dual-locale renderer with `transcript` / `co-read` variants; suppresses gloss when locales match.
- `src/components/shared/DualLocaleText.test.tsx`
- `src/components/shared/ConfirmDialog.tsx` — modal with focus-trap + escape-to-cancel; replaces `window.confirm` at two call sites.
- `src/components/shared/ConfirmDialog.test.tsx`

**Modified core files:**
- `src/types.ts` — `AppSettings.caregiverLang`, `Message.gloss`, data-shape updates to `PainDescriptor`, `PainFace`, `WishTopic`.
- `src/stores/settingsStore.ts` — Zustand persist `migrate` hook defaulting `caregiverLang` to `"en"`.
- `src/data/phraseRegistry.ts` — four new flat-list helpers, key-based `composePainSentence`/`composeWishSentence`, updated data-shape getters.
- `src/data/locales/en.ts` — add `ui.patient.*`, `ui.provider.*`, `ui.dual.*` namespaces for ~191 strings; remove orphan `emergency.help` key.
- `src/models/audioCacheRunner.ts` — `buildPlan` uses `cfg.caregiverLang` for patient, short-circuits on `!canCloneForLocale(...)`.
- `src/App.tsx` — `embeddingKey` factors both locales.
- `src/speak.ts` — Web Speech voice selection threads the correct locale per speaker.
- `src/hooks/useSpeakActions.ts` — populate `Message.gloss` at add-time.

**Modified component files:**
- `src/components/pain/PainFlow.tsx`, `src/components/wishes/MyWishes.tsx`, `src/components/builder/SentenceBuilder.tsx` — keys-in-state refactor; consume `DualLocaleText` on co-reading surfaces.
- `src/components/conversation/Thread.tsx` — render `msg.gloss` beneath `msg.text`.
- `src/components/layout/{TabBar,Header,HeaderNav}.tsx` — extract chrome to locale keys.
- `src/components/provider/{ProviderPanel,ListenPanel}.tsx` — extract chrome; move `getProviderCategories("en")` into the component body with `cfg.caregiverLang`.
- `src/components/shared/{Speaking,VoiceCapture,PinGate,FallbackVoicePicker}.tsx` — extract chrome; VoiceCapture gates on `canCloneForLocale`.
- `src/components/settings/Setup.tsx` — dual-language Step 0 picker; extract all chrome; replace `window.confirm`.
- `src/components/settings/SettingsPanel.tsx`, `src/components/settings/VoiceCacheProgress.tsx`, and all `src/components/settings/sections/*.tsx` — extract chrome; PatientInfoSection gains two pickers + two ConfirmDialogs; OfflineReadinessSection replaces `window.confirm`.

**Modified docs:**
- `docs/PRD.md` — lines 99 and 395–402 rewritten to reflect inverted voice-direction and dual-configurable locales.
- `docs/BIBLIOGRAPHY.md` — add §11 "Language Prevalence in ICU Populations" with citations.

---

# Milestone PR 1 — Primitives

**Deliverable:** Types, helpers, and primitives land with no behavior change visible to a user. The app compiles and runs identically; internal shape is ready for PRs 2–5 to wire up.

**PR-end checkpoint:** Push branch, open PR, stop for review. Do not merge until approved.

---

### Task 1: Add `caregiverLang` field to `AppSettings`

**Files:**
- Modify: `src/types.ts:70-82`
- Modify: `src/stores/settingsStore.ts` — add persist `migrate` function
- Modify: `src/components/settings/Setup.tsx` — `defaults()` returns new field
- Test: `src/stores/settingsStore.test.ts`

- [ ] **Step 1: Write the failing test for migration**

Add to `src/stores/settingsStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";

describe("settingsStore persist migration", () => {
  beforeEach(() => {
    indexedDB.deleteDatabase("keyval-store");
  });

  it("fills in caregiverLang='en' for a stored config missing the field", async () => {
    // Simulate an old persisted record — note: no caregiverLang
    const old = {
      state: {
        cfg: {
          patientName: "Maria",
          bed: "4B-12",
          patientLang: "es",
          patientVoice: true,
          pin: "",
          providers: [],
        },
        speakerData: null,
      },
      version: 0,
    };
    // Write directly to IDB under the same key the store uses
    const { createDebouncedIDBStorage } = await import("../stores/idbStorage");
    const storage = createDebouncedIDBStorage(0);
    await storage.setItem("ov-settings", JSON.stringify(old));

    // Rehydrate
    const { useSettingsStore } = await import("../stores/settingsStore");
    await new Promise<void>((resolve) => {
      const unsub = useSettingsStore.subscribe((s) => {
        if (s._hasHydrated) { unsub(); resolve(); }
      });
    });

    const cfg = useSettingsStore.getState().cfg!;
    expect(cfg.caregiverLang).toBe("en");
    expect(cfg.patientLang).toBe("es"); // unchanged
    expect(cfg.patientName).toBe("Maria"); // unchanged
  });

  it("leaves caregiverLang alone when already present", async () => {
    const current = {
      state: {
        cfg: {
          patientName: "Jean",
          bed: "",
          patientLang: "fr",
          caregiverLang: "de", // already present, deliberately non-default
          patientVoice: false,
          pin: "",
          providers: [],
        },
        speakerData: null,
      },
      version: 1,
    };
    const { createDebouncedIDBStorage } = await import("../stores/idbStorage");
    await createDebouncedIDBStorage(0).setItem("ov-settings", JSON.stringify(current));

    const { useSettingsStore } = await import("../stores/settingsStore");
    await new Promise<void>((resolve) => {
      const unsub = useSettingsStore.subscribe((s) => {
        if (s._hasHydrated) { unsub(); resolve(); }
      });
    });

    expect(useSettingsStore.getState().cfg!.caregiverLang).toBe("de");
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm test -- settingsStore.test.ts`
Expected: FAIL — `caregiverLang` is undefined on the hydrated cfg.

- [ ] **Step 3: Add `caregiverLang` to `AppSettings`**

Modify `src/types.ts`:

```ts
export interface AppSettings {
  patientName: string;
  bed: string;
  patientLang: string;
  /** The caregiver/listener's language. Controls the language the patient
   *  voice speaks and the language provider-facing UI renders. Defaults
   *  to "en"; adjustable from Setup and Settings. */
  caregiverLang: string;
  patientVoice: boolean;
  pin: string;
  providers: Provider[];
  fallbackVoice?: FallbackVoice | null;
  assistiveInput?: boolean;
}
```

- [ ] **Step 4: Add the persist migration**

Modify `src/stores/settingsStore.ts` to add a `migrate` and `version` to the persist config:

```ts
// Inside the create(persist(..., { ... }) options object:
{
  name: "ov-settings",
  version: 1,
  storage: createJSONStorage(() => createDebouncedIDBStorage(PERSIST_DEBOUNCE_MS)),
  migrate: (persisted: unknown, fromVersion: number): SettingsPersistedState => {
    const typed = persisted as SettingsPersistedState;
    if (fromVersion < 1 && typed?.cfg && !("caregiverLang" in typed.cfg)) {
      return {
        ...typed,
        cfg: { ...typed.cfg, caregiverLang: "en" },
      };
    }
    return typed;
  },
  partialize: /* unchanged */,
  onRehydrateStorage: /* unchanged */,
}
```

- [ ] **Step 5: Update Setup's `defaults()` to include the field**

Modify `src/components/settings/Setup.tsx:28-37`:

```ts
function defaults(): AppSettings {
  return {
    patientName: "",
    bed: "",
    patientLang: "en",
    caregiverLang: "en",
    patientVoice: false,
    pin: "",
    providers: [],
  };
}
```

- [ ] **Step 6: Fix any test fixtures that construct an `AppSettings` literal**

Run: `npm test`
Observe the failures. For each failing test that builds an `AppSettings` literal without `caregiverLang`, add `caregiverLang: "en"`. Expected places include any `cfg.ts` test helpers and individual component tests that mount with a custom `cfg`.

- [ ] **Step 7: Run tests again to confirm green**

Run: `npm test`
Expected: PASS (all existing tests + the two new migration tests).

- [ ] **Step 8: Type-check**

Run: `npm run build`
Expected: success (no unused var / missing field errors).

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/stores/settingsStore.ts src/stores/settingsStore.test.ts src/components/settings/Setup.tsx
git add -u src/   # pick up any test-fixture updates
git commit -m "feat(i18n): add caregiverLang to AppSettings with persist migration"
```

---

### Task 2: Create `src/data/chatterboxLocales.ts`

**Files:**
- Create: `src/data/chatterboxLocales.ts`
- Create: `src/data/chatterboxLocales.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/data/chatterboxLocales.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { CHATTERBOX_LOCALES, canCloneForLocale } from "./chatterboxLocales";

describe("CHATTERBOX_LOCALES", () => {
  it("contains exactly 23 locales", () => {
    expect(CHATTERBOX_LOCALES.size).toBe(23);
  });

  it("includes English and a representative from each family", () => {
    // European Romance/Germanic
    expect(CHATTERBOX_LOCALES.has("en")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("es")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("de")).toBe(true);
    // CJK
    expect(CHATTERBOX_LOCALES.has("zh")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ja")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ko")).toBe(true);
    // RTL / Semitic
    expect(CHATTERBOX_LOCALES.has("ar")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("he")).toBe(true);
    // Slavic / Turkic
    expect(CHATTERBOX_LOCALES.has("pl")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("tr")).toBe(true);
    expect(CHATTERBOX_LOCALES.has("ru")).toBe(true);
  });

  it("does NOT include Vietnamese, Tagalog, Somali, Haitian Creole, Hmong", () => {
    expect(CHATTERBOX_LOCALES.has("vi")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("tl")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("so")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("ht")).toBe(false);
    expect(CHATTERBOX_LOCALES.has("hmn")).toBe(false);
  });
});

describe("canCloneForLocale", () => {
  it("returns true for supported locales", () => {
    expect(canCloneForLocale("en")).toBe(true);
    expect(canCloneForLocale("es")).toBe(true);
    expect(canCloneForLocale("ar")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(canCloneForLocale("vi")).toBe(false);
    expect(canCloneForLocale("tl")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(canCloneForLocale("")).toBe(false);
  });

  it("returns false for garbage input", () => {
    expect(canCloneForLocale("xx-YZ")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests — expect failures**

Run: `npm test -- chatterboxLocales.test.ts`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Create the module**

Create `src/data/chatterboxLocales.ts`:

```ts
/**
 * BCP 47 locales Chatterbox Turbo can synthesize with a cloned voice
 * embedding. If the target speech-output locale isn't in this set,
 * voice cloning is suppressed and the app falls back to Web Speech.
 *
 * Placed under src/data/ so it sits inside the project's mutation-audit
 * scope (see .claude/skills/mutation-audit/skill.md §"File risk rankings").
 */
export const CHATTERBOX_LOCALES: ReadonlySet<string> = new Set([
  "ar", "zh", "da", "nl", "en", "fi", "fr", "de", "el", "he",
  "hi", "it", "ja", "ko", "ms", "no", "pl", "pt", "ru", "es",
  "sw", "sv", "tr",
]);

/**
 * True when Chatterbox Turbo can synthesize the given locale from a
 * cloned voice embedding. Pass `cfg.caregiverLang` to decide whether
 * the patient clone is usable, or `cfg.patientLang` to decide whether
 * each provider clone is usable.
 */
export function canCloneForLocale(locale: string): boolean {
  return CHATTERBOX_LOCALES.has(locale);
}
```

- [ ] **Step 4: Run tests to confirm green**

Run: `npm test -- chatterboxLocales.test.ts`
Expected: PASS (13+ assertions).

- [ ] **Step 5: Scoped mutation audit**

Run: `npx stryker run --mutate 'src/data/chatterboxLocales.ts'`
Expected: mutation score ≥80%. The `CHATTERBOX_LOCALES.size === 23` assertion kills `ArrayDeclaration` mutants that empty the set; the explicit positive/negative cases kill the always-true and always-false predicate mutants.

- [ ] **Step 6: Commit**

```bash
git add src/data/chatterboxLocales.ts src/data/chatterboxLocales.test.ts
git commit -m "feat(i18n): add Chatterbox locale support set + canCloneForLocale"
```

---

### Task 3: Rename flat-list helpers in `phraseRegistry.ts`

**Files:**
- Modify: `src/data/phraseRegistry.ts:486-562` — rename three helpers, update internal usage
- Modify: `src/data/phrases.test.ts` — update the tests that reference the old names

- [ ] **Step 1: Search call sites of the old names**

Run:
```bash
grep -rn "getPatientSpeakablePhrases\|getProviderSpeakablePhrases\|getPatientPainSentences\b" src/
```
Expected: hits in `src/models/audioCacheRunner.ts`, `src/data/phraseRegistry.ts` (internal), `src/data/phrases.test.ts`. Note these — every match must be updated.

- [ ] **Step 2: Rename the three helpers**

Modify `src/data/phraseRegistry.ts`. At lines ~486–562, rename:
- `getPatientSpeakablePhrases` → `getPatientSpokenPhrases`
- `getProviderSpeakablePhrases` → `getProviderSpokenPhrases`
- `getPatientPainSentences` → `getPatientPainSentencesForSpeech`

Update the JSDoc on each:

```ts
/**
 * Flat phrase list for the patient-voice audio cache runner. The patient's
 * voice speaks the caregiver's language, so callers pass cfg.caregiverLang.
 * Includes every tappable phrase on a patient surface (except composed
 * sentences — pain and wishes assemble those at runtime via key-based
 * composers).
 */
export function getPatientSpokenPhrases(caregiverLocale: string): string[] {
  // body unchanged; internally uses caregiverLocale as its resolution locale
}

/**
 * Flat phrase list for each provider-voice audio cache runner. Provider
 * voices speak the patient's language, so callers pass cfg.patientLang.
 */
export function getProviderSpokenPhrases(patientLocale: string): string[] {
  // body unchanged
}

/**
 * 702 composed pain sentences for the patient-voice cache runner (GPU-only
 * pass). Speaks in the caregiver's language.
 */
export function getPatientPainSentencesForSpeech(caregiverLocale: string): string[] {
  // body unchanged
}
```

Inside `getPatientPainSentencesForSpeech`, change the internal call from `composePainSentence(locale, d.text, r, s.n)` — it'll use the new key-based API from Task 4. For now, **temporarily** leave the existing signature (we'll update in Task 4 after composePainSentence changes).

Inside `getPatientSpokenPhrases`, remove the line `phrases.add(t("emergency.help", locale));` — see Task 14 in PR 2 for the rest of the emergency cleanup. Keep the removal here because the helper is being renamed anyway.

- [ ] **Step 3: Update `src/models/audioCacheRunner.ts:51-85`**

```ts
// In buildPlan:
if (isRunnable(patientSpeakerData)) {
  plan.push({
    key: "patient",
    speakerData: patientSpeakerData,
    phrases: getPatientSpokenPhrases(cfg.caregiverLang),
  });
}
cfg.providers.forEach((p, i) => {
  if (isRunnable(p.embedding)) {
    plan.push({
      key: `provider:${i}`,
      speakerData: p.embedding,
      phrases: getProviderSpokenPhrases(cfg.patientLang),
    });
  }
});
if (isRunnable(patientSpeakerData) && isGPUReady()) {
  plan.push({
    key: "patient:pain",
    speakerData: patientSpeakerData,
    phrases: getPatientPainSentencesForSpeech(cfg.caregiverLang),
    gpuOnly: true,
  });
}
```

(Don't add Chatterbox short-circuits yet — that's PR 3 Task 30. Only the rename here.)

- [ ] **Step 4: Update `src/data/phrases.test.ts` and `src/data/wishes.test.ts`**

Replace old helper names with new. Adjust expected outputs if the emergency-phrase removal changes counts.

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/phraseRegistry.ts src/models/audioCacheRunner.ts src/data/phrases.test.ts src/data/wishes.test.ts
git commit -m "refactor(i18n): rename flat-list helpers to split display vs. spoken intent"
```

---

### Task 4: Convert `composePainSentence` + `composeWishSentence` to key-based signatures

**Files:**
- Modify: `src/data/phraseRegistry.ts:257-267` (`composePainSentence`)
- Modify: `src/data/phraseRegistry.ts:326-342` (`composeWishSentence`)
- Modify: `src/data/phraseRegistry.ts:503-516` (`getPatientPainSentencesForSpeech` internal callers)
- Modify: `src/components/pain/PainFlow.tsx:67`
- Modify: `src/components/wishes/MyWishes.tsx:58,80,116`
- Modify: `src/data/wishes.test.ts` — signature updates
- Modify: any existing pain-sentence tests

- [ ] **Step 1: Write failing tests for the new signatures**

Add to `src/data/wishes.test.ts` (or adjust existing tests):

```ts
import { composeWishSentence, getWishTopics } from "./phraseRegistry";

describe("composeWishSentence — key-based", () => {
  it("composes a goals sentence in English from keys", () => {
    const goalsTopic = getWishTopics("en").find((t) => t.id === "goals")!;
    const out = composeWishSentence({
      locale: "en",
      topicId: "goals",
      selectedResponseKeys: ["wishes.goals.r.family", "wishes.goals.r.peace"],
    });
    // Exact string so StringLiteral mutants die loudly.
    expect(out).toBe("What matters most to me is being with my family and being at peace.");
  });

  it("returns empty string for no selected keys", () => {
    const out = composeWishSentence({
      locale: "en",
      topicId: "goals",
      selectedResponseKeys: [],
    });
    expect(out).toBe("");
  });
});
```

Add analog for `composePainSentence`:

```ts
import { composePainSentence } from "./phraseRegistry";

describe("composePainSentence — key-based", () => {
  it("composes a pain sentence in English", () => {
    const out = composePainSentence({
      locale: "en",
      descriptorKey: "pain.descriptor.burning",
      regionKey: "pain.region.chest",
      severity: 8,
    });
    expect(out).toBe("I have burning pain in my chest, level 8 out of 10");
  });
});
```

- [ ] **Step 2: Run the tests — expect failures**

Run: `npm test -- phraseRegistry.test.ts wishes.test.ts`
Expected: FAIL — signature mismatch, compose still takes positional args.

- [ ] **Step 3: Change the signatures**

Modify `src/data/phraseRegistry.ts`:

```ts
export function composePainSentence(opts: {
  locale: string;
  descriptorKey: PhraseKey;
  regionKey: PhraseKey;
  severity: number;
}): string {
  const { locale, descriptorKey, regionKey, severity } = opts;
  const descriptor = t(descriptorKey, locale).toLowerCase();
  const region = t(regionKey, locale);
  return t("pain.sentence", locale)
    .replace("{descriptor}", descriptor)
    .replace("{region}", region)
    .replace("{severity}", String(severity));
}

export function composeWishSentence(opts: {
  locale: string;
  topicId: string;
  selectedResponseKeys: PhraseKey[];
}): string {
  const { locale, topicId, selectedResponseKeys } = opts;
  if (!selectedResponseKeys.length) return "";
  const topic = /* look up by topicId — helper below */ findTopicById(topicId);
  if (!topic) return "";
  const items = selectedResponseKeys.map((k) => t(k, locale).toLowerCase());
  const list =
    items.length === 1
      ? items[0]
      : items.length === 2
        ? `${items[0]} and ${items[1]}`
        : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  const stem = t(`wishes.${topicId}.stem` as PhraseKey, locale);
  return t("wishes.compose", locale)
    .replace("{stem}", stem)
    .replace("{list}", list);
}

// private helper — topics are defined by WISH_IDS
function findTopicById(id: string): { id: string } | undefined {
  return WISH_IDS.includes(id as typeof WISH_IDS[number])
    ? { id }
    : undefined;
}
```

- [ ] **Step 4: Update internal use inside `getPatientPainSentencesForSpeech`**

```ts
export function getPatientPainSentencesForSpeech(caregiverLocale: string): string[] {
  const phrases = new Set<string>();
  const descriptors = getPainDescriptors(caregiverLocale);
  const regions = getBodyRegions(caregiverLocale);
  const severities = getEmojiFPS(caregiverLocale);
  for (const d of descriptors) {
    for (const r of regions) {
      for (const s of severities) {
        phrases.add(composePainSentence({
          locale: caregiverLocale,
          descriptorKey: d.key,
          regionKey: r.key,
          severity: s.n,
        }));
      }
    }
  }
  return Array.from(phrases);
}
```

Note this depends on the structured-helper data-shape change in Task 5 (`PainDescriptor.key`). If you execute tasks strictly in order, this step will briefly reference `d.key` before the shape change lands. That's fine — do Tasks 4 and 5 together in one commit if you prefer.

- [ ] **Step 5: Update component call sites**

`src/components/pain/PainFlow.tsx:67`:
```ts
// before: composePainSentence(locale, desc, location!, severity!);
const sentence = composePainSentence({
  locale,
  descriptorKey: descriptorKey!,
  regionKey: regionKey!,
  severity: severity!,
});
```
(PainFlow keys-in-state refactor in Task 6 will rename the state variables — use placeholders now and reconcile in Task 6.)

`src/components/wishes/MyWishes.tsx:58,80,116`:
```ts
// before: composeWishSentence(locale, topic, selected);
const sentence = composeWishSentence({
  locale,
  topicId: topic.id,
  selectedResponseKeys: selectedResponseKeys,
});
```
Same note about Task 7 renaming state — these call sites finalize in Task 7.

- [ ] **Step 6: Run tests — the new compose tests should pass**

Run: `npm test -- phraseRegistry wishes`
Expected: PASS for the new assertions. Component-side failures (PainFlow, MyWishes) will appear because of the state-variable names — resolve in Tasks 6 & 7.

- [ ] **Step 7: Commit this logical slice**

```bash
git add src/data/phraseRegistry.ts src/data/phrases.test.ts src/data/wishes.test.ts
git commit -m "refactor(i18n): key-based composePain/composeWish signatures"
```

---

### Task 5: Update structured helper return types (`PainDescriptor`, `PainFace`, `WishTopic`)

**Files:**
- Modify: `src/types.ts` — `PainDescriptor`, `PainFace`, `WishTopic`
- Modify: `src/data/phraseRegistry.ts` — `getEmojiFPS`, `getPainDescriptors`, `getBodyRegions`, `getWishTopics`
- Modify: call sites in components (will resolve in Tasks 6 & 7, but compile fixes now)

- [ ] **Step 1: Update the type definitions**

Modify `src/types.ts`:

```ts
import type { PhraseKey } from "./data/locales/en";

export interface PainFace {
  n: number;
  face: string;
  labelKey: PhraseKey;
}

export interface PainDescriptor {
  key: PhraseKey;
  icon: string;
}

export interface WishTopic {
  id: string;
  icon: string;
  labelKey: PhraseKey;
  questionKey: PhraseKey;
  stemKey: PhraseKey;
  responseKeys: PhraseKey[];
}
```

- [ ] **Step 2: Update `getEmojiFPS` in `phraseRegistry.ts:213-222`**

```ts
export function getEmojiFPS(_locale?: string): PainFace[] {
  // locale arg is no longer needed — callers resolve via t(labelKey, locale)
  return [
    { n: 0,  face: "😀", labelKey: "pain.face.0" },
    { n: 2,  face: "🙂", labelKey: "pain.face.2" },
    { n: 4,  face: "😐", labelKey: "pain.face.4" },
    { n: 6,  face: "🙁", labelKey: "pain.face.6" },
    { n: 8,  face: "😣", labelKey: "pain.face.8" },
    { n: 10, face: "😭", labelKey: "pain.face.10" },
  ];
}
```

(Locale-agnostic now. The `_locale?: string` is kept for call-site compat during this PR; Task 6 removes the param from callers.)

- [ ] **Step 3: Update `getPainDescriptors` similarly**

```ts
export function getPainDescriptors(_locale?: string): PainDescriptor[] {
  return [
    { key: "pain.descriptor.aching",        icon: "〰️" },
    { key: "pain.descriptor.burning",       icon: "🔥" },
    { key: "pain.descriptor.sharp",         icon: "⚡" },
    { key: "pain.descriptor.throbbing",     icon: "💢" },
    { key: "pain.descriptor.cramping",      icon: "🔄" },
    { key: "pain.descriptor.constant",      icon: "➡️" },
    { key: "pain.descriptor.comes_and_goes", icon: "↔️" },
    { key: "pain.descriptor.numb",          icon: "❄️" },
    { key: "pain.descriptor.pressure",      icon: "⬇️" },
  ];
}
```

- [ ] **Step 4: Update `getBodyRegions` to return keys**

```ts
export interface BodyRegion { key: PhraseKey; }
export function getBodyRegions(_locale?: string): BodyRegion[] {
  return [
    { key: "pain.region.head" },
    { key: "pain.region.face" },
    { key: "pain.region.neck" },
    { key: "pain.region.chest" },
    { key: "pain.region.left_shoulder" },
    { key: "pain.region.right_shoulder" },
    { key: "pain.region.left_arm" },
    { key: "pain.region.right_arm" },
    { key: "pain.region.stomach" },
    { key: "pain.region.upper_back" },
    { key: "pain.region.lower_back" },
    { key: "pain.region.left_leg" },
    { key: "pain.region.right_leg" },
  ];
}
```

Add `BodyRegion` to the exports in `src/types.ts` too.

- [ ] **Step 5: Update `getWishTopics`**

```ts
export function getWishTopics(_locale?: string): WishTopic[] {
  return WISH_IDS.map((id) => ({
    id,
    icon: WISH_ICONS[id],
    labelKey: `wishes.${id}.label` as PhraseKey,
    questionKey: `wishes.${id}.question` as PhraseKey,
    stemKey: `wishes.${id}.stem` as PhraseKey,
    responseKeys: WISH_RESPONSE_KEYS[id],
  }));
}
```

- [ ] **Step 6: Run the build and test suite**

Run: `npm run build && npm test`
Expected: type errors at component call sites that still use `.text`, `.label`, `.question`, `.responses`. These are resolved in Tasks 6 and 7. Tests for structured helpers themselves should pass.

- [ ] **Step 7: Commit the data-shape change on its own**

This change is incomplete without Tasks 6 and 7, but the type errors it creates are the checkpoint that forces the component refactors. Commit now, fix in Tasks 6 and 7.

```bash
git add src/types.ts src/data/phraseRegistry.ts
git commit -m "refactor(i18n): structured helpers return phrase keys instead of resolved text"
```

---

### Task 6: PainFlow keys-in-state refactor

**Files:**
- Modify: `src/components/pain/PainFlow.tsx`
- Modify: `src/components/pain/PainFlow.test.tsx`

- [ ] **Step 1: Read the current PainFlow state**

Read the current `useState` declarations and selection handlers in `PainFlow.tsx`. Today they likely store resolved strings from `PainDescriptor.text` and from body region strings.

- [ ] **Step 2: Update the state types**

```ts
const [severity, setSeverity] = useState<number | null>(null);
const [regionKey, setRegionKey] = useState<PhraseKey | null>(null);
const [descriptorKey, setDescriptorKey] = useState<PhraseKey | null>(null);
```

Remove the `locale` prop destructuring for selection storage — only use it for display via `t(key, locale)`.

- [ ] **Step 3: Update the button handlers**

Where a descriptor was previously stored from `PainDescriptor.text`, store `.key` instead. Same for region.

- [ ] **Step 4: Update display renders to call `t(key, locale)`**

Where the UI previously showed `descriptor.text`, replace with `t(descriptor.key, locale)`. Same for regions and face labels (`t(face.labelKey, locale)`). Import `t` from `../../data/phraseRegistry`.

- [ ] **Step 5: Update the final compose call**

The `handleShare` / `composeSentence` step in PainFlow reads selected state and calls compose. Update:

```ts
const sentence = composePainSentence({
  locale,
  descriptorKey: descriptorKey!,
  regionKey: regionKey!,
  severity: severity!,
});
// sentence is used for adding to the thread (patient utterance, patientLang)
```

- [ ] **Step 6: Run PainFlow tests**

Run: `npm test -- PainFlow`
Expected: some tests may need updates because they interact with stored descriptor text. Update tests to match the new state shape — the tests should still drive the user-observable behavior (taps produce expected composed sentences), not internal state.

- [ ] **Step 7: Commit**

```bash
git add src/components/pain/PainFlow.tsx src/components/pain/PainFlow.test.tsx
git commit -m "refactor(i18n): PainFlow stores phrase keys in state"
```

---

### Task 7: MyWishes keys-in-state refactor

**Files:**
- Modify: `src/components/wishes/MyWishes.tsx`
- Modify: `src/components/wishes/MyWishes.test.tsx`

- [ ] **Step 1: Identify existing state**

Current state likely holds a `selections: Record<topicId, string[]>` where the `string[]` is resolved response text. Change to `selectedResponseKeys: Record<string, PhraseKey[]>`.

- [ ] **Step 2: Update response chip handlers**

Where a tap previously appended `response` (resolved string) to selections, append `responseKey` instead.

- [ ] **Step 3: Update chip rendering**

Render each chip via `t(responseKey, locale)` where previously the raw string was used. Same for the topic label, question, stem — all resolved from keys at render time.

- [ ] **Step 4: Update compose calls**

```ts
const sentence = composeWishSentence({
  locale,
  topicId: topic.id,
  selectedResponseKeys: selectedResponseKeys[topic.id] ?? [],
});
```

- [ ] **Step 5: Run MyWishes tests**

Run: `npm test -- MyWishes`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/wishes/MyWishes.tsx src/components/wishes/MyWishes.test.tsx
git commit -m "refactor(i18n): MyWishes stores phrase keys in state"
```

---

### Task 8: SentenceBuilder keys-in-state refactor

**Files:**
- Modify: `src/components/builder/SentenceBuilder.tsx`

The builder has a mix of key-driven suggestions (from `getSuggestionTree`) and typed free-text. Introduce a tagged union in state:

```ts
type Token = { kind: "key"; key: PhraseKey } | { kind: "free"; text: string };
const [tokens, setTokens] = useState<Token[]>([]);
```

When a suggestion chip is tapped, push `{ kind: "key", key: chipKey }`. When the user types or LLM-generated free text is accepted, push `{ kind: "free", text: value }`.

Render tokens as `tokens.map((tok) => tok.kind === "key" ? t(tok.key, locale) : tok.text).join(" ")`. When composing for speech, render with `locale = cfg.caregiverLang` (done in PR 3 as part of speak wiring).

- [ ] **Step 1: Write failing test for the token shape**

(Detail omitted for brevity — exercise that a key-based suggestion renders differently under `patientLang="es"` vs `patientLang="en"`, and that free text renders identically regardless of locale.)

- [ ] **Step 2-6: Refactor state + render**

Implement per the sketch above. Update existing tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/builder/SentenceBuilder.tsx src/components/builder/SentenceBuilder.test.tsx
git commit -m "refactor(i18n): SentenceBuilder tokens carry phrase keys vs free text"
```

---

### Task 9: Create `<DualLocaleText>` component

**Files:**
- Create: `src/components/shared/DualLocaleText.tsx`
- Create: `src/components/shared/DualLocaleText.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `DualLocaleText.test.tsx`:

```tsx
import { render, screen } from "@testing-library/preact";
import { DualLocaleText } from "./DualLocaleText";
import { describe, it, expect } from "vitest";

describe("DualLocaleText", () => {
  it("renders only primary when locales match", () => {
    render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="en"
        variant="co-read"
      />,
    );
    expect(
      screen.getAllByText(/What are your most important goals/).length,
    ).toBe(1);
  });

  it("renders both primary and gloss when locales differ", () => {
    render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="en"   // stub — replace with a non-en locale once another locale file exists
        variant="co-read"
      />,
    );
    // When only "en" exists, both resolve to the same string — this test
    // acts as a regression canary. A subsequent test (Phase B) asserts
    // true dual rendering once "es" content is populated.
  });

  it("uses larger sizing in co-read variant", () => {
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="en"
        variant="co-read"
      />,
    );
    const primary = container.querySelector('[data-dual-primary]') as HTMLElement;
    // co-read uses 24px primary; transcript uses 18px
    expect(primary.style.fontSize).toBe("24px");
  });

  it("uses smaller sizing in transcript variant", () => {
    const { container } = render(
      <DualLocaleText
        primaryKey="wishes.goals.question"
        primaryLocale="en"
        glossLocale="en"
        variant="transcript"
      />,
    );
    const primary = container.querySelector('[data-dual-primary]') as HTMLElement;
    expect(primary.style.fontSize).toBe("18px");
  });

  it("accepts primaryText override (for Thread bubbles rendering composed sentences)", () => {
    render(
      <DualLocaleText
        primaryKey={"wishes.compose" as PhraseKey}
        primaryLocale="en"
        glossLocale="en"
        variant="transcript"
        primaryText="I have burning pain in my chest, level 8 out of 10"
      />,
    );
    expect(
      screen.getByText("I have burning pain in my chest, level 8 out of 10"),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

Run: `npm test -- DualLocaleText`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create the component**

Create `src/components/shared/DualLocaleText.tsx`:

```tsx
import type { JSX } from "preact";
import { t } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/locales/en";

export interface DualLocaleTextProps {
  primaryKey: PhraseKey;
  primaryLocale: string;
  glossLocale: string;
  variant: "transcript" | "co-read";
  primaryText?: string;
  /** Resolved text for the gloss side, used when the gloss is a composed
   *  sentence rather than a single phrase key. */
  glossText?: string;
  style?: JSX.CSSProperties;
}

const SIZES = {
  transcript: { primary: 18, gloss: 14, primaryWeight: 500 },
  "co-read":  { primary: 24, gloss: 18, primaryWeight: 700 },
} as const;

export function DualLocaleText(props: DualLocaleTextProps) {
  const {
    primaryKey, primaryLocale, glossLocale, variant,
    primaryText, glossText, style,
  } = props;
  const sizes = SIZES[variant];
  const primary = primaryText ?? t(primaryKey, primaryLocale);
  const localesMatch = primaryLocale === glossLocale;

  return (
    <div style={style}>
      <div
        data-dual-primary=""
        style={{ fontSize: sizes.primary, fontWeight: sizes.primaryWeight }}
      >
        {primary}
      </div>
      {!localesMatch && (
        <div
          data-dual-gloss=""
          style={{
            fontSize: sizes.gloss,
            opacity: 0.72,
            marginTop: 4,
          }}
          aria-hidden={variant === "transcript"}
        >
          {glossText ?? t(primaryKey, glossLocale)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to green**

Run: `npm test -- DualLocaleText`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/DualLocaleText.tsx src/components/shared/DualLocaleText.test.tsx
git commit -m "feat(i18n): add DualLocaleText primitive for co-read + transcript surfaces"
```

---

### Task 10: Create `<ConfirmDialog>` component

**Files:**
- Create: `src/components/shared/ConfirmDialog.tsx`
- Create: `src/components/shared/ConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `ConfirmDialog.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { ConfirmDialog, confirm } from "./ConfirmDialog";
import { describe, it, expect, vi } from "vitest";

describe("ConfirmDialog", () => {
  it("resolves true when confirm is clicked", async () => {
    const promise = confirm({
      title: "Do the thing?",
      body: "This is irreversible.",
      confirmLabel: "Do it",
      cancelLabel: "Nope",
    });
    // Yield a microtask for the component to mount
    await Promise.resolve();
    fireEvent.click(screen.getByRole("button", { name: "Do it" }));
    await expect(promise).resolves.toBe(true);
  });

  it("resolves false when cancel is clicked", async () => {
    const promise = confirm({
      title: "Do the thing?",
      body: "This is irreversible.",
      confirmLabel: "Do it",
      cancelLabel: "Nope",
    });
    await Promise.resolve();
    fireEvent.click(screen.getByRole("button", { name: "Nope" }));
    await expect(promise).resolves.toBe(false);
  });

  it("resolves false on Escape key", async () => {
    const promise = confirm({
      title: "x", body: "y", confirmLabel: "ok", cancelLabel: "no",
    });
    await Promise.resolve();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await expect(promise).resolves.toBe(false);
  });

  it("focus-traps inside the dialog (Tab does not escape)", async () => {
    const promise = confirm({
      title: "x", body: "y", confirmLabel: "ok", cancelLabel: "no",
    });
    await Promise.resolve();
    // After mount, focus should be inside the dialog
    expect(
      document.activeElement?.closest('[role="dialog"]'),
    ).toBeTruthy();
    // Resolve to clean up
    fireEvent.click(screen.getByRole("button", { name: "no" }));
    await promise;
  });
});
```

- [ ] **Step 2: Create the component**

```tsx
import { createPortal } from "preact/compat";
import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

export interface ConfirmDialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "destructive" | "default";
}

type Pending = ConfirmDialogOptions & {
  resolve: (v: boolean) => void;
};

let pushDialog: ((p: Pending) => void) | null = null;

export function confirm(opts: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushDialog) {
      // Host wasn't mounted — this is a programming error; fail closed.
      console.warn("[ConfirmDialog] host not mounted, resolving false");
      resolve(false);
      return;
    }
    pushDialog({ ...opts, resolve });
  });
}

/** Mount this once near the app root so `confirm(...)` works globally. */
export function ConfirmDialogHost() {
  const [queue, setQueue] = useState<Pending[]>([]);
  useEffect(() => {
    pushDialog = (p) => setQueue((q) => [...q, p]);
    return () => { pushDialog = null; };
  }, []);
  if (queue.length === 0) return null;
  const current = queue[0];
  return createPortal(
    <ConfirmDialog
      opts={current}
      onClose={(value) => {
        current.resolve(value);
        setQueue((q) => q.slice(1));
      }}
    />,
    document.body,
  );
}

function ConfirmDialog(props: {
  opts: ConfirmDialogOptions;
  onClose: (value: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose(false);
      if (e.key === "Tab") {
        const focusables = [cancelRef.current, confirmRef.current].filter(
          (x): x is HTMLButtonElement => !!x,
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus(); e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus(); e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ov-confirm-title"
      style={overlayStyle}
    >
      <div style={dialogStyle}>
        <h2 id="ov-confirm-title" style={titleStyle}>{props.opts.title}</h2>
        <p style={bodyStyle}>{props.opts.body}</p>
        <div style={buttonRowStyle}>
          <button ref={cancelRef} onClick={() => props.onClose(false)}>
            {props.opts.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => props.onClose(true)}
            style={props.opts.tone === "destructive" ? destructiveStyle : defaultConfirmStyle}
          >
            {props.opts.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: JSX.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999,
};
const dialogStyle: JSX.CSSProperties = {
  background: "#FFFFFF", borderRadius: 14, padding: 24,
  width: "min(480px, 90vw)",
};
const titleStyle: JSX.CSSProperties = { fontSize: 20, fontWeight: 700, margin: 0 };
const bodyStyle: JSX.CSSProperties = { fontSize: 16, color: "#374151", margin: "12px 0 24px" };
const buttonRowStyle: JSX.CSSProperties = { display: "flex", gap: 12, justifyContent: "flex-end" };
const destructiveStyle: JSX.CSSProperties = { background: "#DC2626", color: "#FFFFFF" };
const defaultConfirmStyle: JSX.CSSProperties = { background: "#2563EB", color: "#FFFFFF" };
```

- [ ] **Step 3: Mount the host at the app root**

Modify `src/App.tsx` to render `<ConfirmDialogHost />` once, alongside the existing overlays.

- [ ] **Step 4: Run tests**

Run: `npm test -- ConfirmDialog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ConfirmDialog.tsx src/components/shared/ConfirmDialog.test.tsx src/App.tsx
git commit -m "feat(i18n): add ConfirmDialog primitive with focus-trap + Escape handling"
```

---

### Task 11: Add `Message.gloss` to types

**Files:**
- Modify: `src/types.ts:50-55`

- [ ] **Step 1: Add the field**

```ts
export interface Message {
  from: "patient" | "provider";
  text: string;
  /** Optional secondary-locale rendering for Thread dual-locale display.
   *  Populated by useSpeakActions at add time. */
  gloss?: string;
  time: string;
  label: string;
}
```

(Populating `gloss` is PR 4 Task 42. Type-only change here so PR 2 string extraction and PR 3 cache work aren't blocked.)

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat(i18n): add optional Message.gloss for dual-locale Thread rendering"
```

---

### Task 12: Scoped mutation audit + PR 1 close

- [ ] **Step 1: Run scoped Stryker on `phraseRegistry.ts`**

```bash
npx stryker run --mutate 'src/data/phraseRegistry.ts'
```

Target: ≥80% mutation score on the composition functions. If the score drops ≥5% from the prior baseline, strengthen tests until restored.

- [ ] **Step 2: Run scoped Stryker on `settingsStore.ts`**

```bash
npx stryker run --mutate 'src/stores/settingsStore.ts'
```

Target: ≥80% including the new migration branch. Typical gap: if a test doesn't assert `patientLang` is untouched, a mutant that changes migration to `{ ...typed.cfg, caregiverLang: "en", patientLang: "zz" }` might survive — add an explicit assertion that `patientLang` is preserved.

- [ ] **Step 3: Run scoped Stryker on `chatterboxLocales.ts`**

```bash
npx stryker run --mutate 'src/data/chatterboxLocales.ts'
```

- [ ] **Step 4: Full suite one more time**

```bash
npm test
```
Expected: all green.

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin <branch-name>
gh pr create --title "feat(i18n): locale primitives for dual-locale audio-direction model" --body "$(cat <<'EOF'
## Summary
- Adds `caregiverLang` to `AppSettings` with Zustand persist migration (defaults to `"en"`).
- Introduces `CHATTERBOX_LOCALES` + `canCloneForLocale` predicate for voice-clone gating.
- Renames the audio-cache flat helpers to disambiguate display vs. spoken intent.
- Converts `composePainSentence` and `composeWishSentence` to key-based signatures; structured helpers return phrase keys.
- Refactors PainFlow, MyWishes, SentenceBuilder state to carry phrase keys.
- Adds `<DualLocaleText>` and `<ConfirmDialog>` primitives.
- Adds optional `Message.gloss` field.

This is PR 1 of 5 implementing [2026-04-22-localization-design.md](docs/superpowers/specs/2026-04-22-localization-design.md). No user-visible behavior change.

## Test plan
- [ ] `npm test` — full suite passes
- [ ] `npx stryker run --mutate 'src/data/phraseRegistry.ts'` ≥80%
- [ ] `npx stryker run --mutate 'src/stores/settingsStore.ts'` ≥80%
- [ ] `npx stryker run --mutate 'src/data/chatterboxLocales.ts'` ≥80%
- [ ] `npm run build` — typecheck clean
- [ ] Manual smoke: boot the app, confirm existing flows still work
EOF
)"
```

- [ ] **Step 6: STOP for review**

Do not merge. Wait for approval.

---

# Milestone PR 2 — String extraction

**Deliverable:** All ~191 hardcoded UI strings move into `en.ts` under three namespaces (`ui.patient.*`, `ui.provider.*`, `ui.dual.*`). `window.confirm` usages migrate to `ConfirmDialog`. `emergency.help` cleanup. PainFlow `STEP_LABELS` dedup. `ProviderPanel` becomes locale-reactive. No user-visible change apart from what the cleanup implies (native confirm dialogs become in-app).

Tasks in this milestone are short and repetitive — one per file or file cluster. Each task follows this shape:
1. Identify the hardcoded strings in the file (see Appendix A of the spec for the full list).
2. Add matching keys to `src/data/locales/en.ts` under the appropriate namespace.
3. Replace the literal with `t(key, locale)` at the call site, threading either `cfg.patientLang` or `cfg.caregiverLang` depending on the audience rule from the spec §3.
4. Run `npm test` against updated component snapshots.
5. Commit.

### Task 13: Add `ui.patient.*` / `ui.provider.*` / `ui.dual.*` namespace keys to `en.ts`

**Files:**
- Modify: `src/data/locales/en.ts`

Add all ~191 keys at once, grouped by component. Source: Appendix A of the spec. Use a consistent key shape: `ui.<audience>.<component>.<specific>`. Example:

```ts
"ui.patient.tabbar.say_more": "Say More",
"ui.patient.tabbar.home": "Home",
"ui.patient.pain.heading.severity": "How much pain do you have?",
"ui.patient.pain.heading.location": "Where is your pain?",
"ui.patient.pain.heading.descriptor": "What does the pain feel like?",
"ui.patient.pain.step_of": "Step {n} of {total}",
"ui.dual.wishes.closing_title": "{name}'s Wishes",
"ui.dual.wishes.my_wishes": "My Wishes",
// … etc. for each row of Appendix A
```

(The exact key names are left to the engineer; consistency and grep-ability matter more than specific wording. Follow the existing `quick.*`, `needs.*` convention — dotted paths with lowercase-underscore leaf segments.)

- [ ] Commit: `chore(i18n): define ui.*.* namespace keys in en.ts`

### Task 14: Remove orphan `emergency.help` key + its usage

**Files:**
- Modify: `src/data/locales/en.ts` — remove `"emergency.help"`
- Modify: `src/data/phraseRegistry.ts` — already removed in Task 3 Step 2; verify.
- Modify: `src/data/phrases.test.ts` — remove any emergency-related assertions.

- [ ] Commit: `chore(i18n): remove orphan emergency.help key`

### Task 15: Fix PainFlow `STEP_LABELS` duplication

**Files:**
- Modify: `src/components/pain/PainFlow.tsx:21-24`

Replace:
```ts
const STEP_LABELS = ["Severity", "Location", "Describe"];
```
with a runtime call:
```ts
const stepLabels = (locale: string) => [
  t("pain.step.severity", locale),
  t("pain.step.location", locale),
  t("pain.step.descriptor", locale),
];
```
The existing `pain.step.*` keys already exist in `en.ts`.

- [ ] Commit: `refactor(i18n): drop PainFlow STEP_LABELS in favor of existing pain.step.* keys`

### Task 16: Extract strings from `src/App.tsx`

2 strings: "OwnVoice — {name} conversation" and "Patient" fallback. Thread `cfg.patientLang` for rendering.
- [ ] Commit.

### Task 17: Extract `src/components/layout/{Header,HeaderNav,TabBar}.tsx` strings

See Appendix A for the list (9 strings across three files). `Wishes`, `Say More` go to `patientLang`; `Settings`, `Staff`, `Listen`, `Auto/Light/Dark` go to `caregiverLang`.
- [ ] Commit.

### Task 18: Extract `src/components/pain/PainFlow.tsx` chrome + apply `DualLocaleText` to headings

- Replace the 3 step headings with `<DualLocaleText variant="co-read" primaryKey="ui.patient.pain.heading.severity" primaryLocale={cfg.patientLang} glossLocale={cfg.caregiverLang} />` etc.
- Step-of chrome to patientLang via `t(...)`.
- [ ] Commit.

### Task 19: Extract `src/components/wishes/MyWishes.tsx` chrome + `DualLocaleText` for topic labels, questions, response options

Topic labels, questions, and response chips are co-reading — wrap each in `<DualLocaleText variant="co-read" ...>`. Chrome (buttons, "Step N of M", "Close", etc.) is patientLang single-locale.
- [ ] Commit.

### Task 20: Extract `src/components/builder/SentenceBuilder.tsx` chrome

9 strings. Thread `cfg.patientLang`. The token-rendering logic already landed in Task 8.
- [ ] Commit.

### Task 21: Extract `src/components/conversation/Thread.tsx` `aria-label`

1 string. Uses `cfg.patientLang` (patient-visible chrome). Note: the gloss-rendering update comes in PR 4 Task 41.
- [ ] Commit.

### Task 22: Extract `src/components/provider/*.tsx` strings and make `ProviderPanel` reactive

- `ProviderPanel` (6 strings): extract, move the `getProviderCategories("en")` call into the component body and pass `cfg.caregiverLang`.
- `ListenPanel` (9 strings): extract under `ui.provider.listen.*`.
- [ ] Commit.

### Task 23: Extract `src/components/shared/{Speaking,PinGate,VoiceCapture,FallbackVoicePicker}.tsx` strings

- Speaking (2 strings): the "Care Team" sub-label becomes the active provider's name + emoji (per spec §3 note).
- PinGate (5 strings): provider-facing.
- VoiceCapture (~25 strings): provider-facing. No gating logic yet (that's PR 4 Task 39).
- FallbackVoicePicker (7 strings): provider-facing.
- [ ] Commit.

### Task 24: Extract `src/components/settings/Setup.tsx` strings + replace `window.confirm`

~35 strings. Replace `window.confirm(...)` at line 152 with `await confirm({ title, body, confirmLabel, cancelLabel })` from the ConfirmDialog primitive. Copy for the dialog is provider-facing caregiverLang. Dual-language picker in Step 0 is PR 4 Task 40 — for now, keep the single patient-language picker.
- [ ] Commit.

### Task 25: Extract `src/components/settings/{SettingsPanel,VoiceCacheProgress}.tsx` strings

- SettingsPanel (3 strings).
- VoiceCacheProgress (~12 strings).
- [ ] Commit.

### Task 26: Extract `src/components/settings/sections/*.tsx` strings

- AboutSection, ResetSection, AccessibilitySection, CareTeamSection, PatientInfoSection (~50 strings total).
- OfflineReadinessSection: also replace `window.confirm(...)` at line 77 with ConfirmDialog.
- [ ] Commit per section for reviewability.

### Task 27: PR 2 close

- [ ] Run `npm test` — all green.
- [ ] Run `npm run build`.
- [ ] Push branch and open PR titled `feat(i18n): extract ~191 UI strings into locale registry`. Body lists the touched files grouped by audience.
- [ ] Mutation audit for PR 2: **none in scope** (locale files excluded).
- [ ] STOP for review.

---

# Milestone PR 3 — Cache runner + Web Speech locale

**Deliverable:** Cache runner short-circuits on unsupported locales. `embeddingKey` factors both locales. Web Speech provider utterances thread `cfg.patientLang`. No user-visible change other than correct voice selection when cloning is unsupported.

### Task 28: Thread `cfg.caregiverLang` into `buildPlan` (already partial from Task 3) + add Chatterbox short-circuits

**Files:**
- Modify: `src/models/audioCacheRunner.ts`

Finalize the buildPlan changes started in Task 3:

```ts
import { canCloneForLocale } from "../data/chatterboxLocales";

function buildPlan(cfg: AppSettings, patientSpeakerData: unknown): SpeakerPlan[] {
  const plan: SpeakerPlan[] = [];

  // Patient cache: only when caregiver locale is Chatterbox-supported
  if (canCloneForLocale(cfg.caregiverLang) && isRunnable(patientSpeakerData)) {
    plan.push({
      key: "patient",
      speakerData: patientSpeakerData,
      phrases: getPatientSpokenPhrases(cfg.caregiverLang),
    });
  }

  // Provider caches: only when patient locale is Chatterbox-supported
  if (canCloneForLocale(cfg.patientLang)) {
    cfg.providers.forEach((p, i) => {
      if (isRunnable(p.embedding)) {
        plan.push({
          key: `provider:${i}`,
          speakerData: p.embedding,
          phrases: getProviderSpokenPhrases(cfg.patientLang),
        });
      }
    });
  }

  // Pain matrix follows the patient rule (caregiver-locale supported + GPU)
  if (
    canCloneForLocale(cfg.caregiverLang) &&
    isRunnable(patientSpeakerData) &&
    isGPUReady()
  ) {
    plan.push({
      key: "patient:pain",
      speakerData: patientSpeakerData,
      phrases: getPatientPainSentencesForSpeech(cfg.caregiverLang),
      gpuOnly: true,
    });
  }

  return plan;
}
```

Tests to add in `audioCacheRunner.test.ts`:
- Changing `patientLang` produces a plan with identical patient phrases and changed provider phrases.
- Changing `caregiverLang` produces a plan with changed patient phrases and identical provider phrases.
- `patientLang="vi"` → plan omits provider entries.
- `caregiverLang="vi"` → plan omits patient and pain entries.

- [ ] Commit.

### Task 29: Update `App.tsx` `embeddingKey`

**Files:**
- Modify: `src/App.tsx:124-131`

```ts
return `${cfg.caregiverLang}:${patientFp}|${cfg.patientLang}:${providerFps}`;
```

- [ ] Commit.

### Task 30: Thread `cfg.patientLang` through provider Web Speech utterances

**Files:**
- Modify: `src/speak.ts`
- Modify: `src/hooks/useSpeakActions.ts`

Provider `speak()` calls must pass the patient's locale to the Web Speech fallback so `SpeechSynthesisUtterance.lang` is correct when there's no clone.

Audit current `speak()` signature and callers. Likely `speak(text, speaker)` where `speaker: Speaker`. Extend with an explicit `locale` argument, or read `speaker.lang` consistently. Update the Web Speech path to pass `lang` to the utterance.

- [ ] Add a unit test: synthesize via the Web Speech path with `speaker.lang = "vi"` and assert the created `SpeechSynthesisUtterance.lang === "vi"`. (Mock `window.speechSynthesis`.)
- [ ] Commit.

### Task 31: PR 3 close

- [ ] `npm test` green.
- [ ] Push branch + open PR titled `fix(i18n): cache runner dual-locale + Web Speech provider locale`. STOP for review.

No scoped mutation audit for this PR — `audioCacheRunner.ts` and `speak.ts` are in `src/models/` (excluded). The compensating control is the unit-test coverage above.

---

# Milestone PR 4 — Settings UX + Thread gloss

**Deliverable:** Two language pickers in Settings with confirmation dialogs. Setup wizard gains caregiver-language picker. VoiceCapture gates on Chatterbox support. Thread bubbles render `gloss`. User-visible changes land here.

### Task 32: Dual-language picker in Setup's Step 0

**Files:**
- Modify: `src/components/settings/Setup.tsx:325-410` (`StepPatient`)

Add a second chip-grid beneath the patient-language one, bound to `caregiverLang` state. Keep the visual hierarchy so patient language is primary; caregiver language is a secondary row.

- [ ] Commit.

### Task 33: Patient-language picker in `PatientInfoSection`

**Files:**
- Modify: `src/components/settings/sections/PatientInfoSection.tsx:50-55`

Replace the read-only language row with a chip-grid identical to Setup's Step 0. On tap, invoke `confirm(...)` with the patient-change copy from spec §5.2.

Confirmation copy (English; locale-aware title):
```ts
await confirm({
  title: t("ui.provider.settings.lang.patient_dialog.title", destLocale),
  // e.g. "Change patient language to Español?"
  body: buildPatientChangeBody({
    destLocale, providerCount, isGPUReady,
    chatterboxSupported: canCloneForLocale(destLocale),
  }),
  confirmLabel: t("ui.provider.settings.lang.change", destLocale),
  cancelLabel: t("ui.provider.settings.cancel", cfg.caregiverLang),
});
```

Implement `buildPatientChangeBody` per the spec §5.2 body template, including the "not available in {lang}" branch when `!canCloneForLocale(destLocale)`.

- [ ] Commit.

### Task 34: Caregiver-language picker in `PatientInfoSection`

Second chip-grid below the patient picker. Uses the caregiver-change dialog from spec §5.3. Copy is in destination caregiver locale (the audience of the reassurance is the new caregiver).

- [ ] Commit.

### Task 35: VoiceCapture gating on Chatterbox support

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`

When the target speech-output locale isn't Chatterbox-supported, render a notice instead of the record UI:

```tsx
if (!canCloneForLocale(targetLocale)) {
  return (
    <div style={noticeStyle}>
      {t("ui.provider.voice_capture.unsupported_locale", cfg.caregiverLang, {
        lang: LANGUAGE_LABELS[targetLocale],
        name: speakerName,
      })}
    </div>
  );
}
```

Helper: `LANGUAGE_LABELS` maps BCP 47 → user-visible label (e.g. `"vi" → "Tiếng Việt"`). Pulled from `src/data/phrases.ts` (already has flag + label pairs).

The `targetLocale` is:
- For patient VoiceCapture: `cfg.caregiverLang`
- For provider VoiceCapture: `cfg.patientLang`

Thread this via a new prop `targetLocale` rather than reading from settings inside.

Existing embeddings on disk are preserved — simply not used. No OPFS deletion.

- [ ] Commit.

### Task 36: Thread bubble dual-locale rendering

**Files:**
- Modify: `src/components/conversation/Thread.tsx:98` area

Replace single-line rendering with `<DualLocaleText variant="transcript" />`. Use `primaryText={msg.text}` and `glossText={msg.gloss}` (both resolved strings; no key lookup needed for transcripts). Suppress gloss when `msg.gloss` is missing or matches `msg.text`.

- [ ] Commit.

### Task 37: `useSpeakActions` populates `Message.gloss`

**Files:**
- Modify: `src/hooks/useSpeakActions.ts`

When adding a patient utterance, set `text` to the resolved patient-locale string and `gloss` to the resolved caregiver-locale string. When adding a provider utterance, reverse. For composed sentences (pain, wishes, sentence-builder), re-compose against the opposite locale using the key-based compose API.

- [ ] Add a unit test that verifies both sides are populated.
- [ ] Commit.

### Task 38: Component tests with `patientLang: "es"`

Create a stub `src/data/locales/es.ts` that prefixes every English value with `"[es] "`. (Deliberately not a real translation — we want mismatches between hardcoded strings and the stub to show as failing assertions.) Register it in `LOCALES`.

Write component render tests for `MyWishes`, `PainFlow`, `Thread`, `TabBar`, `SentenceBuilder` with `patientLang: "es"` and confirm:
- No `[es] `-prefixed string is missing from the rendered output where the audience matrix says `patientLang` should show.
- No hardcoded English slips through on a patient-surface.

Delete the `es.ts` stub at the end of the task — it's a test fixture, not content. (Or keep it under a test-only path.)

- [ ] Commit.

### Task 39: PR 4 close

- [ ] Manual verification per spec §8.3.
- [ ] Scoped mutation audit: `npx stryker run --mutate 'src/stores/settingsStore.ts'` — confirm ≥80% after the picker work.
- [ ] Push PR titled `feat(i18n): dual-language Settings pickers + Thread gloss`. STOP for review.

---

# Milestone PR 5 — Docs + final baseline

### Task 40: Update `docs/PRD.md`

- Lines 395–402: rewrite per spec Appendix C.
- Line 99: update for internal consistency.
- Add a "Design history" note referencing `docs/superpowers/specs/2026-04-22-localization-design.md`.
- [ ] Commit.

### Task 41: Add `docs/BIBLIOGRAPHY.md` §11

Append "11. Language Prevalence in ICU Populations" section with the full research brief from spec Appendix B, including primary citations in the house format.
- [ ] Commit.

### Task 42: Full mutation baseline

```bash
npm run test:mutation
```

Target overall mutation score: ≥80% on `src/data/**` and `src/stores/**`. Record score per file in the PR description. If any HIGH-priority file dropped below its prior baseline, strengthen tests before closing.

Expected runtime: ~40 min. Run once, don't re-run unless fixes land.

- [ ] Commit any test strengthening.

### Task 43: PR 5 close

- [ ] Push PR titled `docs(i18n): PRD + BIBLIOGRAPHY updates + mutation baseline`. STOP for review.

---

## Self-review checklist (for the plan author)

Before declaring the plan done:

**Spec coverage**
- [ ] §4.1 locale settings → PR 1 Task 1.
- [ ] §4.2 helper split → PR 1 Task 3.
- [ ] §4.3 keys-in-state → PR 1 Tasks 6, 7, 8.
- [ ] §4.4 cache runner → PR 3 Task 28.
- [ ] §4.5 DualLocaleText → PR 1 Task 9.
- [ ] §4.6 Message.gloss → PR 1 Task 11 (type), PR 4 Task 37 (populate), PR 4 Task 36 (render).
- [ ] §4.7 ConfirmDialog → PR 1 Task 10.
- [ ] §4.8 Chatterbox gating → PR 1 Task 2, PR 3 Task 28, PR 4 Task 35.
- [ ] §5.1–5.4 Settings UX → PR 4 Tasks 33, 34.
- [ ] §6 Phase A items 1–16 → all PRs.
- [ ] §7 PRD + BIBLIOGRAPHY → PR 5 Tasks 40, 41.
- [ ] §8.1 unit tests → embedded in PR 1 tasks.
- [ ] §8.2 component tests → PR 4 Task 38.
- [ ] §8.3 manual verification → PR 4 Task 39.
- [ ] §8.4 mutation plan → PR 1 Task 12, PR 4 Task 39, PR 5 Task 42.

**Placeholder scan**
- [ ] No "TBD", "TODO", "implement later", "fill in details".
- [ ] No "add appropriate error handling" or "handle edge cases" without specifics.
- [ ] Every code step shows the actual code.

**Type consistency**
- [ ] `caregiverLang`, `patientLang` used consistently.
- [ ] `canCloneForLocale` called the same way everywhere.
- [ ] `DualLocaleText` props match across tasks.
- [ ] `Message.gloss` field name consistent.
- [ ] `composePainSentence` / `composeWishSentence` call sites use the opts-object form.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-localization.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch with checkpoints.

**Which approach?**
