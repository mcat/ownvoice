# Localization Design

**Status:** Draft for review
**Date:** 2026-04-22
**Scope:** Make the patient-language setting runtime-changeable from Settings, establish the display/spoken locale split, introduce the dual-locale rendering primitive, and prepare the codebase for additional locale translations.

---

## 1. Summary

OwnVoice currently assumes the patient's UI locale and the TTS output locale are the same. A clinical review clarifies the opposite: **the patient's voice must speak the caregiver's language** (so staff can understand), and **each provider's voice must speak the patient's language** (so the patient can understand). Display text also splits by audience — patient surfaces in `patientLang`, provider surfaces in `caregiverLang`.

This spec makes that split explicit, introduces a configurable `caregiverLang` field on `AppSettings` (defaults to `"en"`, set during Setup, changeable from Settings), adds pickers in Settings for both `patientLang` and `caregiverLang` with confirmation dialogs, introduces a `<DualLocaleText>` primitive for co-reading surfaces and the conversation thread, gates voice cloning on Chatterbox Turbo language support, migrates ~180 hardcoded UI strings into the locale registry, and defines a phased rollout for adding additional locales starting with the most ICU-prevalent in the US.

Under the new cache semantics, the two language settings invalidate orthogonal parts of the cache: changing `patientLang` leaves the patient voice clone's cached audio entirely untouched and only regenerates per-provider caches; changing `caregiverLang` is the inverse — patient cache regenerates, provider caches stay warm. Voice cloning is suppressed entirely for languages Chatterbox cannot synthesize; those locales fall back to Web Speech.

## 2. Context and motivation

### 2.1 The voice-direction model

Prior design (per `docs/PRD.md:395–402`):

- Patient taps a phrase → spoken in **patient's language**
- Provider taps a response → spoken in **provider's language (default English)**

Revised design:

- Patient taps a phrase → spoken in **caregiver's language** (so the provider understands)
- Provider taps a phrase → spoken in **patient's language** (so the patient understands)
- Both languages are user-configurable. `patientLang` is picked during Setup and adjustable in Settings. `caregiverLang` is picked during Setup (defaults to English) and also adjustable in Settings — it's expected to be set once per device deployment but the UI doesn't restrict changes.
- When Chatterbox Turbo cannot synthesize the target speech-output locale, voice cloning is suppressed entirely for that direction; the fallback path (Web Speech) is used instead.

### 2.2 Primary scenario

Mid-admission correction: a clinician sets up the device in the wrong language and corrects it from Settings. Expected frequency: <1 per admission. The spec also keeps the door open for a future "shared-floor tablet" scenario without building for it now.

### 2.3 Evidence base

A research brief (Appendix B) surveys published data on ICU language prevalence. Key findings:

- The current 13-language list already covers ~77% of US LEP populations (KFF 2024; ACS 2018–2022).
- The sole US ICU-specific language study (Barwise et al. 2018, n=779) shows Arabic, Spanish, Somali, Cambodian, Vietnamese as the top five — Somali is notably absent from OwnVoice's 13.
- Three high-priority additions have US ICU evidence: **Haitian Creole**, **Somali**, **Hmong**. None are in Chatterbox Turbo's 23-language voice-clone set but all are supported by iPadOS Web Speech, matching the existing fallback path for Vietnamese and Tagalog.
- Two low-cost Chatterbox-native adds for international expansion: **Polish**, **Turkish**.
- No current language should be removed; German and Japanese have thin US ICU evidence but are strategic for international pilots.

## 3. Audience model

Every user-facing string and every speech synthesis call must commit to one of the following categories. This matrix is normative.

| Surface category | Displayed text locale | Spoken audio locale | Example |
|---|---|---|---|
| Patient-only UI | `patientLang` | `caregiverLang` (if spoken) | Quick-phrase buttons, tab bar |
| Provider-only UI | `caregiverLang` | `patientLang` (if spoken) | Settings, Setup wizard, PinGate, Care Team sheet, Listen panel |
| **Co-reading UI** (live, both users engage) | `patientLang` primary **+** `caregiverLang` gloss | n/a | My Wishes topic labels, questions, response options; Pain flow step headings |
| Transcript (Thread) | speaker's UI locale primary + other locale gloss | n/a | Conversation history bubbles |

Notes:

- On co-reading surfaces, the gloss is suppressed entirely when `patientLang === caregiverLang` — no point duplicating identical lines.
- Pain answer *options* (the 6 faces, 13 regions, 9 descriptors) are patient-tap-driven, treated as Patient-only UI, not co-reading.
- The Speaking overlay's former "Care Team" sub-label is replaced by the active provider's name + emoji (e.g. "Speaking to Nurse Maria 👩‍⚕️"), sidestepping institutional-translation awkwardness.

## 4. Architecture

### 4.1 Locale settings

Two locales live on `AppSettings`. Both are BCP 47 strings, both persist through the `settingsStore` IndexedDB layer, both are user-configurable.

```ts
// src/types.ts

export interface AppSettings {
  patientName: string;
  bed: string;
  patientLang: string;    // already present — the patient's preferred language
  caregiverLang: string;  // NEW — the listener/caregiver's language; defaults to "en"
  patientVoice: boolean;
  pin: string;
  providers: Provider[];
  fallbackVoice?: FallbackVoice | null;
  assistiveInput?: boolean;
}
```

**Migration.** Existing persisted `cfg` records lack `caregiverLang`. The Zustand persist layer's `migrate` hook defaults the missing field to `"en"` so no device loses access to its existing setup. New installs get `"en"` from the Setup wizard default.

**Design rationale for a settings field rather than a constant.** The original draft of this spec carried `CAREGIVER_LOCALE = "en"` as a module-level constant on the theory that runtime configurability was a future concern. That's a false economy — the constant would end up replaced by `cfg.caregiverLang` lookups at every use site during the first pilot in a non-English hospital, and the migration would touch every call site we're otherwise about to touch during string extraction. Landing the field now is cheaper than landing it later.

**Why it appears in Setup.** A device deployed in a Spanish-speaking hospital would want caregiverLang defaulted to `es` so the first patient's setup doesn't flash an English-only UI. Setup exposes both language pickers so the device's nominal locale is set from the start.

### 4.2 Phrase registry helpers — split by intent

The flat-list helpers consumed by `audioCacheRunner.buildPlan` rename to make their audience explicit:

```ts
// before
getPatientSpeakablePhrases(locale: string): string[]
getProviderSpeakablePhrases(locale: string): string[]
getPatientPainSentences(locale: string): string[]

// after
/** Flat phrase list for the patient-voice audio cache runner.
 *  Speaks in the caregiver's language — pass cfg.caregiverLang. */
getPatientSpokenPhrases(caregiverLocale: string): string[]

/** Flat phrase list for each provider-voice audio cache runner.
 *  Speaks in the patient's language — pass cfg.patientLang. */
getProviderSpokenPhrases(patientLocale: string): string[]

/** 702 composed pain sentences for the patient-voice cache runner
 *  (GPU-only pass). Speaks in the caregiver's language. */
getPatientPainSentencesForSpeech(caregiverLocale: string): string[]
```

No defaults — the caller is always in the settings context and can pass the locale explicitly. No `*ForDisplay` variants: the UI consumes structured helpers (`getCategories`, `getWishTopics`, `getEmojiFPS`, `getPainDescriptors`, `getBodyRegions`, `getTimeSuggestionsForPeriod`, `getSuggestionTree`, `getProviderCategories`) and passes the right locale at the call site — `cfg.patientLang` on patient surfaces, `cfg.caregiverLang` on provider surfaces. Adding unused flat-list variants would be dead code.

The structured helpers return types change to carry keys instead of pre-resolved strings, so a single selection can be re-rendered in different locales (required for co-reading surfaces and speech-vs-display):

```ts
interface PainDescriptor {
  key: PhraseKey;       // was: text: string
  icon: string;
}

interface PainFace {
  n: number;
  face: string;
  labelKey: PhraseKey;  // was: label: string
}

interface WishTopic {
  id: string;
  icon: string;
  labelKey: PhraseKey;       // was: label: string
  questionKey: PhraseKey;    // was: question: string
  stemKey: PhraseKey;        // was: stem: string
  responseKeys: PhraseKey[]; // was: responses: string[]
}

// getBodyRegions returns { key: PhraseKey }[] instead of string[]
```

Callers resolve via `t(obj.key, locale)` at render or speech time.

Composed-sentence helpers operate on keys and take an explicit locale:

```ts
composePainSentence({
  locale: string,
  descriptorKey: PhraseKey,
  regionKey: PhraseKey,
  severity: number,
}): string

composeWishSentence({
  locale: string,
  topicId: string,
  selectedResponseKeys: PhraseKey[],
}): string
```

Callers render display by passing `cfg.patientLang` and synthesize speech by passing `cfg.caregiverLang` against the same key-valued state.

**Call-site impact of the breaking signature change.** The existing `composePainSentence(locale, descriptor, region, severity)` and `composeWishSentence(locale, topic, selected)` are called from:

- `src/components/pain/PainFlow.tsx:67`
- `src/components/wishes/MyWishes.tsx:58, 80, 116`
- `src/data/phraseRegistry.ts:511` (internal, inside `getPatientPainSentences`)
- Their unit tests (`src/data/wishes.test.ts`, any pain tests)

No other consumers exist. Blast radius is contained to these five files + tests; the migration is straightforward because the keys these call sites would need are already in local component state after the §4.3 refactor.

### 4.3 Keys-in-state refactor

Three components currently store **resolved strings** in local state. They must carry **phrase keys** so the same selection can be rendered in either locale on demand.

- `src/components/pain/PainFlow.tsx` — state holds `descriptorKey: PhraseKey`, `regionKey: PhraseKey`, `severity: number`. Display renders via `t(descriptorKey, cfg.patientLang)` etc.; speech resolves via `t(descriptorKey, cfg.caregiverLang)`.
- `src/components/wishes/MyWishes.tsx` — state holds `topicId`, `selectedResponseKeys: PhraseKey[]`. Same dual-resolution at render vs. speak time.
- `src/components/builder/SentenceBuilder.tsx` — tokens carried by state are keys (or a tagged union `{ key: PhraseKey } | { freeText: string }` to accommodate typed input).

`composePainSentence` and `composeWishSentence` gain a `locale` argument and operate on keys:

```ts
composePainSentence({
  locale: string,
  descriptorKey: PhraseKey,
  regionKey: PhraseKey,
  severity: number,
}): string

composeWishSentence({
  locale: string,
  topicId: string,
  selectedResponseKeys: PhraseKey[],
}): string
```

### 4.4 Cache runner changes

`src/models/audioCacheRunner.ts` — `buildPlan`:

| Plan entry | Before | After |
|---|---|---|
| `patient` | `getPatientSpeakablePhrases(cfg.patientLang)` | `getPatientSpokenPhrases(cfg.caregiverLang)` |
| `provider:${i}` | `getProviderSpeakablePhrases(cfg.patientLang)` | `getProviderSpokenPhrases(cfg.patientLang)` |
| `patient:pain` (GPU-only) | `getPatientPainSentences(cfg.patientLang)` | `getPatientPainSentencesForSpeech(cfg.caregiverLang)` |

Each plan entry also short-circuits when the target speech-output locale isn't Chatterbox-supported (see §4.8).

`src/App.tsx:130` `embeddingKey` factors both locales explicitly:

```ts
// before
return `${cfg.patientLang}|${patientFp}|${providerFps}`;
// after — patient cache depends on caregiverLang; provider caches depend on patientLang
return `${cfg.caregiverLang}:${patientFp}|${cfg.patientLang}:${providerFps}`;
```

Consequences — cache invalidation is orthogonal across the two settings:

| Setting changed | Patient cache | Provider caches |
|---|---|---|
| `patientLang` (e.g. en → es) | Untouched | Regenerate (new phrase text → new cache keys) |
| `caregiverLang` (e.g. en → es) | Regenerate | Untouched |
| Both at once | Regenerate | Regenerate |

- Old cached clips sit orphaned in OPFS after invalidation — nothing is deleted. The "don't lose generated audio" constraint holds by construction.
- Patient-cache regeneration is the expensive case: ~150 base phrases plus ~702 pain-matrix clips. This only happens on `caregiverLang` change, which is expected to be rare (deployment-time setting). The confirmation dialog for that change must name the scope (see §5.3).
- Provider-cache regeneration is lighter: ~30 phrases per provider. This is the common case and is what the "mid-admission patient language correction" scenario optimizes for.

### 4.5 Dual-locale rendering primitive

New component `src/components/shared/DualLocaleText.tsx`:

```ts
interface DualLocaleTextProps {
  /** Phrase key to resolve. */
  primaryKey: PhraseKey;
  /** Locale for the main rendering. */
  primaryLocale: string;
  /** Locale for the gloss. For patient-surface co-reading UI, pass
   *  cfg.caregiverLang. For Thread transcript bubbles, pass the
   *  listener's locale (opposite of the speaker's locale). */
  glossLocale: string;
  /** Transcript (Thread): small gloss. Co-read (Wishes/Pain): readable gloss. */
  variant: "transcript" | "co-read";
  /** Optional override for the primary. Lets Thread use msg.text directly
   *  instead of a registry lookup, while still showing a gloss. */
  primaryText?: string;
}
```

Behavior:

- If `primaryLocale === glossLocale` (both `"en"` in the common case), render only the primary line.
- Otherwise render the primary (bold/large) above the gloss (regular/smaller).
- Size variants: `transcript` → 18 / 14. `co-read` → 24-bold / 18-regular.
- Accessibility: primary carries the `aria-label` / is-the-primary-readable line. Gloss is `aria-hidden="true"` for the transcript variant (screen-reader already gets the primary) and `aria-hidden="false"` for co-read (both provider and patient may be using assistive tech).

### 4.6 Message type gains `gloss`

```ts
// src/types.ts
export interface Message {
  from: "patient" | "provider";
  text: string;    // primary: the speaker's own UI locale
  gloss?: string;  // secondary: the listener's locale
  time: string;
  label: string;
}
```

Populated at add time in `useSpeakActions`. For composed sentences, the gloss is derived by re-composing against the opposite locale.

### 4.7 ConfirmDialog primitive

Two existing `window.confirm` call sites (`Setup.tsx:152`, `OfflineReadinessSection.tsx:77`) bypass the locale layer because native dialogs render in the OS locale. Replace with a new `src/components/shared/ConfirmDialog.tsx` that:

- Renders a modal with focus-trap and escape-to-cancel (WCAG 2.1.2, 2.4.3).
- Accepts `title`, `body`, `confirmLabel`, `cancelLabel`, `tone: "destructive" | "default"`.
- Returns via promise: `confirm(opts): Promise<boolean>`.

This unblocks full localization of destructive-action prompts and is a dependency of the Settings language-change UX below.

### 4.8 Chatterbox language gating

Chatterbox Turbo synthesizes 23 languages. The other locales OwnVoice may support (Vietnamese, Tagalog, Somali, Haitian Creole, Hmong, plus any later additions) use Web Speech on iPad for speech output. Voice *cloning* only makes sense when Chatterbox can synthesize the target locale — a cloned voice embedding is useless if the engine can't speak the target language. Recording a 30-second voice sample to produce an unusable clone is a worse UX than not offering the feature at all.

```ts
// src/data/chatterboxLocales.ts (new file — placed in src/data/ rather than
// src/models/ so it falls inside the project's mutation-audit scope; see §8.4)

/** BCP 47 locales Chatterbox Turbo can synthesize with a cloned embedding.
 *  If the target speech-output locale isn't in this set, Web Speech is
 *  the best we can do; voice cloning is suppressed. */
export const CHATTERBOX_LOCALES: ReadonlySet<string> = new Set([
  "ar", "zh", "da", "nl", "en", "fi", "fr", "de", "el", "he",
  "hi", "it", "ja", "ko", "ms", "no", "pl", "pt", "ru", "es",
  "sw", "sv", "tr",
]);

export function canCloneForLocale(locale: string): boolean {
  return CHATTERBOX_LOCALES.has(locale);
}
```

**Gating rules.** The rule is always "the voice must be able to speak its target language":

- **Patient voice clone** is offered iff `canCloneForLocale(cfg.caregiverLang)`. (Patient voice speaks the caregiver's language.)
- **Each provider's voice clone** is offered iff `canCloneForLocale(cfg.patientLang)`. (Provider voices speak the patient's language.)

**UI behavior.**

- When the relevant clone direction is unsupported, `VoiceCapture` renders a notice instead of the record UI:

  > Voice cloning isn't available for {LanguageLabel}. {PatientName|ProviderName} will use the device's system voice.

- Setup wizard steps that offer voice capture are skipped with a brief explanation when the chosen languages make cloning unsupported in that direction.
- Existing embeddings on disk are preserved, not deleted. If the relevant locale later changes back to a supported one, the clone reactivates without re-recording.
- Settings-panel VoiceCapture rows mirror the same notice pattern — tapping "Remove" on an unusable-but-still-stored embedding becomes explicit rather than implicit.

**Cache runner behavior.** `audioCacheRunner.buildPlan`:

- Patient entry (+ pain matrix) short-circuited when `!canCloneForLocale(cfg.caregiverLang)`.
- Provider entries short-circuited per-provider when `!canCloneForLocale(cfg.patientLang)`.
- No pre-generation time is burned synthesizing for locales where the output would be unusable.

**Playback fallback.** `speak.ts` already has a cloned-TTS → Web Speech → confirmation-tone chain. When cloning is gated, the first step is skipped outright and Web Speech becomes the primary path. Web Speech voice selection must thread the target locale to `SpeechSynthesisUtterance.lang` — already true for the patient direction, but the provider direction currently inherits the patient's Web-Speech voice, which must switch to `cfg.patientLang`-scoped voice selection during this extraction.

**Who sees the locale-change consequences.** When a clinician changes `patientLang` from Spanish (Chatterbox-supported) to Vietnamese (not supported), the Settings UI must surface that provider clones have become unusable. The confirmation dialog for the language change covers this case (see §5.3).

## 5. UX design

### 5.1 Settings language pickers

Two pickers live on the patient-information section of `SettingsPanel`:

- **Patient language** — replaces the current read-only row in `PatientInfoSection.tsx:50-55`.
- **Caregiver language** — new row immediately below, with a brief helper text: *"The language your care team understands. Usually set once per device."* Both pickers use the chip-grid UI pattern from the Setup wizard's Step 0 (`Setup.tsx:381-407`).

Tapping a chip that matches the current value is a no-op. Tapping a different chip opens `ConfirmDialog` with copy tailored to which setting changed (see §5.2 and §5.3).

### 5.2 Patient-language change dialog

- **Title** (in destination patient locale): *"Change patient language to Español?"*
- **Body** (in `cfg.caregiverLang`):

  > Your voice clone stays ready — the phrases you tap will still sound the same. We'll prepare Spanish audio for {providerCount} care-team {providerCount === 1 ? "voice" : "voices"}. Estimated time: ~{estimatedMinutes} min. You can keep using the app while this happens.

  If the destination locale isn't Chatterbox-supported, append:

  > Care-team voice clones aren't available in Spanish — the system voice will be used instead. Your existing recordings are kept in case you switch to a supported language later.

  If there are no providers with voice clones, the body is:

  > The phrases you tap will still sound the same. No care-team voices are configured, so nothing will need to regenerate.

- **Confirm label**: *"Change language"* (in destination patient locale)
- **Cancel label**: *"Cancel"* (in `cfg.caregiverLang`)
- **Estimate**: `Math.ceil((providerPhraseCount * providerCountWithVoice) / (isGPUReady() ? 60 : 5))`, minimum 1 min.

### 5.3 Caregiver-language change dialog

Changing `caregiverLang` regenerates the patient cache — 150 phrases plus ~702 pain-matrix clips — which is the larger regeneration job. The dialog names this scope honestly.

- **Title** (in destination caregiver locale): *"Change caregiver language to Español?"*
- **Body** (in destination caregiver locale, since the audience of the reassurance is the new caregiver):

  > Your care-team voice clones stay ready. We'll prepare Spanish audio for the patient's voice clone — about {estimatedMinutes} min. You can keep using the app while this happens.

  If the destination locale isn't Chatterbox-supported, append:

  > The patient's voice clone isn't available in Spanish — the system voice will be used instead. The recorded patient voice sample is kept in case you switch to a supported language later.

- **Confirm label**: *"Change language"* (in destination caregiver locale)
- **Cancel label**: *"Cancel"* (in current caregiver locale)
- **Estimate**: `Math.ceil((patientPhraseCount + painSentenceCount) / (isGPUReady() ? 60 : 5))`, minimum 1 min. Pain matrix is only counted when GPU is ready (it's GPU-only).

### 5.4 Progress surfacing during regeneration

Existing `VoiceCacheProgress` rows in Settings already display per-speaker progress. No new UI is required for the regeneration itself; the rows will naturally show a "Preparing…" state for whichever speaker is regenerating in the new locale.

## 6. Scope and rollout

### Phase A — this spec (infrastructure only)

Ships with English content only. No new translations; the architecture is in place but every new locale file is a follow-up.

1. `AppSettings.caregiverLang` field + Zustand persist migration defaulting existing configs to `"en"`. Setup wizard gains a caregiver-language picker (defaults to `"en"`, typically left alone).
2. Four split helpers + composed-sentence key-based API.
3. `<DualLocaleText>` and `<ConfirmDialog>` primitives.
4. Keys-in-state refactor in PainFlow, MyWishes, SentenceBuilder.
5. Chatterbox language-support gating: new `src/data/chatterboxLocales.ts` module with `CHATTERBOX_LOCALES` and `canCloneForLocale`. Placed in `src/data/` (not `src/models/`) so it falls within the project's mutation-audit scope. Wire into `VoiceCapture`, the Setup voice step, and the cache runner.
6. Cache runner behavior change per §4.4 (dual-locale invalidation + Chatterbox short-circuit).
7. Extract all ~191 hardcoded UI strings (inventoried in Appendix A) into `en.ts` under three new namespaces: `ui.patient.*` (patient-facing chrome), `ui.provider.*` (provider-facing chrome), `ui.dual.*` (co-reading chrome).
8. Settings: two language pickers (patient, caregiver) + two confirmation dialogs per §5.2 and §5.3.
9. `Message.gloss` population + Thread bubble renderer update.
10. Replace `window.confirm` in the two identified call sites with `ConfirmDialog`.
11. Make `ProviderPanel`'s `getProviderCategories` call reactive (reads `cfg.caregiverLang` from the component body).
12. Fix PainFlow's `STEP_LABELS` duplication of existing `pain.step.*` keys.
13. Web Speech voice selection: thread `cfg.patientLang` into provider speech-synthesis utterances (currently inherits patient path).
14. Remove the now-orphan `emergency.help` key from `en.ts` and its inclusion in `getPatientSpeakablePhrases` (the Emergency button is no longer in the app).
15. PRD and BIBLIOGRAPHY.md edits (§7).
16. Test additions (§8).

Phase A will be sequenced across multiple PRs in the implementation plan. Natural PR boundaries: (i) primitives — `caregiverLang` field + migration, four helpers, `DualLocaleText`, `ConfirmDialog`, Chatterbox gating module, keys-in-state refactor; (ii) string extraction into `en.ts` + emergency-key cleanup; (iii) cache runner changes + Web Speech provider-locale fix; (iv) Settings language pickers + Thread gloss; (v) PRD/BIBLIOGRAPHY + tests. Each PR compiles and ships something useful on its own.

### Phase B — must-have tier, LTR locales (separate PR per locale)

Translate all locale keys into four LTR languages covering most of US LEP:

- `es` (Spanish) — #1 LEP, Chatterbox-native
- `zh` (Mandarin, simplified) — Chatterbox-native
- `vi` (Vietnamese) — Web Speech fallback
- `tl` (Tagalog) — Web Speech fallback

Each locale gate: professional translation + clinical review by a native-speaking clinician before release. Phase A's infrastructure is designed to make each locale addition a self-contained change — one `src/data/locales/{code}.ts` file, one entry in the `LOCALES` map, one line added to the Settings chip-grid.

### Phase B-RTL — Arabic (depends on RTL groundwork)

Arabic is in the must-have clinical tier (#4 US LEP, #1 in the Mayo ICU cohort at 26.4%) but ships only after RTL support lands. RTL groundwork includes:

- `dir="rtl"` on patient-surface containers when `patientLang` is an RTL locale
- Logical CSS properties (`margin-inline-start`, `padding-inline-end`, etc.) replacing directional ones on patient surfaces
- Bidi-safe `composePainSentence` / `composeWishSentence` template handling
- Mirroring review for directional icons (arrows, progress indicators)
- Contrast + size verification with Arabic glyphs (larger x-height affects the 18-size gloss legibility)

RTL groundwork is out of scope for this spec; it gets its own design doc before Phase B-RTL begins. Phase A deliberately avoids introducing *new* LTR-only assumptions (e.g. `DualLocaleText` is neutral on directionality) so RTL doesn't require retrofitting Phase A work.

### Phase C — ICU-prevalence and international tiers (later)

- `so` (Somali) — 8.7% of Mayo ICU LEP cohort, Web Speech fallback
- `ht` (Haitian Creole) — top-6 US healthcare per AMN 2023, Web Speech fallback
- `hmn` (Hmong) — 2.4% of Mayo ICU LEP cohort, Web Speech fallback
- `pl` (Polish) — Chatterbox-native, strong UK/Germany evidence
- `tr` (Turkish) — Chatterbox-native, strong Germany/Australia evidence

## 7. Documentation updates

### 7.1 `docs/PRD.md`

Rewrite lines 395–402 (§ "Dual-language interaction model") to state:

- Patient and caregiver languages are both selected during Setup; either can be changed from Settings.
- **Patient voice speaks in the caregiver's language.** Phrases on the patient surface display in the patient's language.
- **Provider voice speaks in the patient's language.** Phrases on the provider surface display in the caregiver's language.
- Conversation thread shows both languages for every utterance.
- Voice cloning is available only when Chatterbox Turbo supports the target speech-output locale; otherwise the device's system voice is used via Web Speech.

Line 99 similarly rewritten for internal consistency ("When a provider taps a response like 'I will call your family,' it is spoken in the provider's voice, in the patient's language.").

Include a brief "Design history" note referencing this spec so future readers understand the evolution.

### 7.2 `docs/BIBLIOGRAPHY.md`

Add a new section 11, "Language Prevalence in ICU Populations", containing the research brief in Appendix B, with citations integrated in the same format as the existing bibliography.

## 8. Testing strategy

### 8.1 Unit tests

- `phraseRegistry.test.ts`
  - `getPatientSpokenPhrases("es")` vs. `("en")` return structurally equal arrays with distinct strings (proves it threads the caregiver locale, not the patient locale, into resolution).
  - `getProviderSpokenPhrases("es")` vs. `("en")` return structurally equal arrays with distinct strings.
  - Structural coverage: for every locale registered in `LOCALES`, verify it satisfies the `LocaleStrings` type (every `PhraseKey` present).
- `audioCacheRunner.test.ts`
  - `buildPlan` patient entry uses `cfg.caregiverLang` (not `cfg.patientLang`).
  - `buildPlan` provider entries use `cfg.patientLang`.
  - Changing `cfg.patientLang` (en → es) produces a plan with identical patient phrases and changed provider phrases.
  - Changing `cfg.caregiverLang` (en → es) produces a plan with changed patient phrases and identical provider phrases.
  - `buildPlan` omits the patient entry when `!canCloneForLocale(cfg.caregiverLang)`.
  - `buildPlan` omits a provider entry when `!canCloneForLocale(cfg.patientLang)`.
- `chatterboxLocales.test.ts` — `canCloneForLocale` returns true for each of the 23 Chatterbox languages and false for Vietnamese, Tagalog, Somali, Haitian Creole, Hmong.
- `settingsStore.test.ts` — persist-migration test: an old persisted config missing `caregiverLang` hydrates with `caregiverLang === "en"`.

### 8.2 Component tests

- `DualLocaleText.test.tsx`
  - Renders only primary when `primaryLocale === glossLocale`.
  - Renders both lines when locales differ.
  - `transcript` and `co-read` variants apply correct classes / sizes.
- `MyWishes.test.tsx`, `PainFlow.test.tsx`, `Thread.test.tsx` each run with `patientLang: "es"` against an intentionally-stub `es.ts` (English text prefixed with `[es]`) so any hardcoded string shows as a failing assertion.
- `PatientInfoSection.test.tsx`
  - Tapping a different patient-language chip opens the patient-change `ConfirmDialog`.
  - Tapping a different caregiver-language chip opens the caregiver-change `ConfirmDialog` (different copy).
  - Confirming each persists the correct field via `updateCfg`.
  - Canceling either leaves both locales unchanged.
  - Tapping the current language in either picker is a no-op.
- `VoiceCapture.test.tsx`
  - When `canCloneForLocale` is false for the relevant direction, the record UI is replaced by the "Voice cloning isn't available for {lang}" notice.
  - When the locale changes back to a supported one, the record UI returns without state loss.
- `ConfirmDialog.test.tsx` — focus-trap, ESC cancels, enter confirms, promise resolves with booleans.

### 8.3 Manual verification checklist

- Set up a fresh device with `patientLang=es`, `caregiverLang=en`. Verify patient UI is Spanish and provider UI is English.
- Change `patientLang` from Spanish to English. Verify the dialog names the care-team regeneration work and confirms. Provider `VoiceCacheProgress` rows show "Preparing…".
- Change `caregiverLang` from English to Spanish. Verify the dialog names the patient-voice regeneration work. Patient `VoiceCacheProgress` row shows "Preparing…". Provider rows remain warm.
- Set `patientLang=vi`. Verify provider VoiceCapture shows the "not available for Tiếng Việt" notice. Fall back to Web Speech in Vietnamese when a provider phrase is tapped.
- Set `caregiverLang=vi` (hypothetical). Verify patient VoiceCapture shows the unavailable notice. Patient-tap audio uses Web Speech in Vietnamese.
- Thread bubbles: tap a patient phrase; bubble shows patient-language text with an English gloss below. Tap a provider phrase; bubble shows English primary with a patient-language gloss.
- MyWishes active-step screen: the question is shown in patient language with a caregiver-language gloss beneath it, both readable size.

### 8.4 Mutation-testing plan

OwnVoice has a manual mutation-audit practice (`.claude/skills/mutation-audit/skill.md`) using Stryker scoped to `src/data/**` and `src/stores/**`. UI components, workers, and models are deliberately excluded — their tests are mock-heavy and produce noise rather than signal under mutation testing. Mutation audit is manual and on-demand, not CI-enforced (full runs take ~40 min).

This spec's changes affect three files that are (or should be) in mutation-audit scope:

1. **`src/data/phraseRegistry.ts`** (HIGH priority per the skill's ranking — clinical output text). The signature changes to `composePainSentence` and `composeWishSentence` (resolved strings → phrase keys) invalidate existing mutation coverage on these functions. The three new flat-list helpers (`getPatientSpokenPhrases`, `getProviderSpokenPhrases`, `getPatientPainSentencesForSpeech`) also need mutation coverage. Run a scoped audit after the primitives PR lands:
   ```bash
   npx stryker run --mutate 'src/data/phraseRegistry.ts'
   ```
   Target ≥80% mutation score on the composition functions. `pain.ts`'s 100% score is the canary for this family; maintain that baseline.

2. **`src/stores/settingsStore.ts`** (HIGH priority — patient identity, wrong state = wrong patient). Adding `caregiverLang` + the Zustand persist-migration hook introduces new branches. Tests must specifically cover:
   - Fresh install → `caregiverLang` defaults to `"en"`.
   - Migration from a stored config missing the field → `caregiverLang` is filled in as `"en"` and `patientLang` is untouched.
   - Migration is a no-op when `caregiverLang` is already present (even for unusual values).
   - Changing `caregiverLang` via `updateCfg` persists through the debounced IDB write.
   Run:
   ```bash
   npx stryker run --mutate 'src/stores/settingsStore.ts'
   ```
   Target ≥80%.

3. **`src/data/chatterboxLocales.ts`** (new file). Trivial predicate but not trivially tested — a mutant that always returns `true` survives weak tests. Mutation-killing coverage requires:
   - At least one positive case per Chatterbox-supported locale *family* (Western European, CJK, Arabic/Hebrew, Polish/Turkish) so `StringLiteral` mutations on Set entries are killed.
   - At least two negative cases (Vietnamese, Tagalog) so a mutant that unconditionally returns `true` is caught.
   - Assert `CHATTERBOX_LOCALES.size === 23` to kill `ArrayDeclaration` / `ObjectLiteral` mutants that empty the set.
   Run:
   ```bash
   npx stryker run --mutate 'src/data/chatterboxLocales.ts'
   ```

**Out of mutation-audit scope (existing project policy).** The following files change in this spec but are excluded from Stryker's mutate glob:

- `src/models/audioCacheRunner.ts` — gains Chatterbox short-circuit logic in `buildPlan` and new dual-locale invalidation. Branch-sensitive and prone to silent regressions. **Compensating control:** the §8.1 unit tests for `audioCacheRunner.test.ts` must assert both positive and negative outcomes of every branch introduced by this spec (short-circuit on unsupported locale, dual-locale orthogonality). These tests are the primary quality bar since mutation audit won't catch gaps here.
- `src/components/**` — all component changes (VoiceCapture gating, Settings dual pickers, DualLocaleText, ConfirmDialog, Thread bubbles). Covered by component tests in §8.2.
- `src/data/locales/**` — excluded from the mutate glob by default (new locale files in Phase B and beyond don't need mutation testing; they're translation data).

**Scheduling mutation runs across Phase A PRs.** Scoped audits run after each PR that touches in-scope files; a full baseline runs before Phase A is declared complete:

| Phase A PR | Scoped mutation audit target |
|---|---|
| (i) Primitives — helpers, `DualLocaleText`, `ConfirmDialog`, Chatterbox module, keys-in-state | `phraseRegistry.ts`, `chatterboxLocales.ts` |
| (ii) String extraction into `en.ts` | None (locale files excluded) |
| (iii) Cache runner changes + Web Speech provider-locale fix | None (models excluded — rely on §8.1 unit tests) |
| (iv) Settings language pickers + Thread gloss | `settingsStore.ts` |
| (v) PRD / BIBLIOGRAPHY + tests | Full baseline: `npm run test:mutation` |

Record the before → after mutation-score delta in each PR description. If a scoped audit's score drops by ≥5% from the prior baseline for that file, the PR must restore it before merging.

## 9. Open questions and future work

- **RTL support for Arabic.** The `dir="rtl"` attribute must be threaded through to all patient-surface containers when `patientLang === "ar"` (and to provider-surface containers when `caregiverLang` is RTL), and composed sentences need bidi-aware segment ordering. Scope this in a dedicated spec before Phase B-RTL.
- **STT (Whisper) language.** The Listen panel's Whisper model is multilingual but currently invoked without a language hint. Future work: pass either `cfg.patientLang` (when the provider is dictating what the patient said) or `auto` (if we trust Whisper's detection).
- **LLM sentence-builder suggestions.** The LFM2.5-1.2B-Instruct model is instruction-tuned primarily on English. Multi-lingual suggestion quality is an open validation item; the static fallback tree is already locale-aware.
- **Cache retention cap.** Under the shared-floor-tablet scenario (d), orphaned provider caches accumulate without bound. Future work: add a per-locale cache cap with LRU eviction in `audioCache.ts`, gated behind a "shared device" settings flag.
- **Web Speech voice quality across locales.** iPad's Web Speech supports many languages but voice naturalness varies significantly (e.g., Vietnamese voices are robotic vs. the Samantha/Karen family of English voices). A per-locale "best available fallback voice" curation pass — similar to the Enhanced/Novelty filtering already applied for English — would improve the experience on Chatterbox-unsupported locales. Out of scope for Phase A.

---

## Appendix A: UI copy audience inventory (summary)

Full per-component string list produced by the 2026-04-22 inventory agent. Copied here for spec self-containment.

### Already-localized (in `src/data/locales/en.ts`)

All speakable phrases and their structural labels, routed through `t(key, locale)` in `phraseRegistry.ts`:

| Category | Keys (approx) | Audience | Display locale | Spoken locale |
|---|---|---|---|---|
| Patient quick phrases, needs, feelings, questions | ~50 | Patient | patientLang | caregiverLang |
| Pain faces, descriptors, regions, sentence template | ~30 | Patient | patientLang | caregiverLang |
| Pain flow step labels (`pain.step.*`) | 3 | Patient | patientLang | N/A |
| SICG wish topics, responses, stems, compose template | ~60 | Dual (co-read) | patientLang + caregiverLang gloss | caregiverLang |
| Sentence-builder suggestion tree + context overrides | ~130 | Patient | patientLang | caregiverLang |
| Time-of-day suggestions | 12 | Patient | patientLang | caregiverLang |
| Provider phrases (responses, questions, directions, goals of care) | ~30 | Provider | caregiverLang | patientLang |
| Category / subcategory labels | 9 | Mixed | per-surface | N/A |

(The previously-present `emergency.help` key is removed as part of Phase A item 14 since the Emergency button is no longer in the app.)

### Hardcoded strings to extract (Phase A)

Counts by file (full string lists in the inventory output):

- `App.tsx` — 2 (Dual / patientLang)
- `layout/Header.tsx` — 2 (Dual / patientLang)
- `layout/HeaderNav.tsx` — 6 (1 dual co-read, 5 provider)
- `layout/TabBar.tsx` — 1 patient
- `pain/PainFlow.tsx` — 7 patient (step labels duplicate existing keys; see §6 item 10)
- `wishes/MyWishes.tsx` — 9 dual co-read + patient mix
- `builder/SentenceBuilder.tsx` — 9 patient
- `conversation/Thread.tsx` — 1 dual (`aria-label` chrome)
- `provider/ProviderPanel.tsx` — 6 provider
- `provider/ListenPanel.tsx` — 9 provider
- `shared/Speaking.tsx` — 2 (1 dual co-read, 1 changes per §3 to provider name)
- `shared/PinGate.tsx` — 5 provider
- `shared/VoiceCapture.tsx` — ~25 provider (incl. `friendlyVoiceError()` outputs)
- `shared/FallbackVoicePicker.tsx` — 7 provider
- `settings/Setup.tsx` — ~35 provider
- `settings/SettingsPanel.tsx` — 3 provider
- `settings/VoiceCacheProgress.tsx` — ~12 provider
- `settings/sections/*` — ~50 provider across 6 files

Total ≈ **191 strings**, of which ~30 are patient-surface or dual (needing `patientLang` resolution, with some also needing `caregiverLang` for gloss) and ~161 are provider-surface (needing `caregiverLang`). With `caregiverLang` configurable from day one, all 191 strings must live in locale files — none is "safe to hardcode because it'll always be English."

### Ambiguous cases resolved in this spec

1. `window.confirm` in `Setup.tsx:152` and `OfflineReadinessSection.tsx:77` → replaced by `ConfirmDialog` (§4.7).
2. `ProviderPanel` import-time `getProviderCategories("en")` → moved into the component body (Phase A item 9).
3. Thread bubbles lacked a gloss mechanism → `Message.gloss` + `<DualLocaleText variant="transcript">` (§4.5, §4.6).
4. `PainFlow` `STEP_LABELS` duplicates existing `pain.step.*` keys → removed, uses `t()` (Phase A item 10).
5. Speaking overlay "Care Team" → replaced by active provider's name + emoji (§3 notes).

---

## Appendix B: ICU Language Prevalence — Research Brief

Prepared 2026-04-22 via desk research; all citations below are primary or operational sources where available. This full text is intended to land in `docs/BIBLIOGRAPHY.md` §11.

### B.1 US LEP population and ICU language prevalence

Approximately 25.7 million US residents (8% of the population aged 5+) have limited English proficiency. The top five languages among LEP individuals nationally are Spanish (63%), Chinese (7%), Vietnamese (3%), Arabic (2%), and Tagalog (2%) (KFF 2024; ACS 2018–2022).

AMN Healthcare's 2023 study of 204 million minutes of interpretation services across US facilities ranks the top non-English languages as Spanish, Mandarin, Cantonese, Vietnamese, Arabic, Haitian Creole, Russian, Portuguese, Korean. Additional high-demand languages include Nepali, Somali, Ukrainian, Hmong, Amharic, Rohingya.

The only US ICU-specific language study identified is Barwise et al. (2018) at Mayo Clinic: 27,523 ICU admissions, 779 LEP. Distribution: Arabic 26.4%, Spanish 26.3%, Somali 8.7%, Cambodian 4.4%, Vietnamese 2.8%, Lao 2.6%, Hmong 2.4%, ASL 2.3%, Russian 2.1%. LEP patients had 0.6 days longer ICU stays and 2.7 days longer hospital stays (p<.001).

### B.2 Regional variation (likely US pilot markets)

| State | Top LEP languages | Notes |
|---|---|---|
| California | Spanish, Tagalog, Cantonese, Mandarin, Vietnamese, Korean | Tagalog #1 among API languages |
| Texas | Spanish, Vietnamese, Chinese, Hindi, Urdu | Spanish-dominant |
| Florida | Spanish, Haitian Creole, Portuguese, French, Chinese | Haitian Creole critical #2 |
| New York | Spanish, Chinese, Russian, Haitian Creole, Korean | High Haitian Creole and Russian |
| Hawai'i | Ilocano, Tagalog, Japanese, Chinese, Korean, Marshallese, Chuukese | Unique Pacific profile |

### B.3 Global data

UK (NHS): Arabic, Polish, Urdu, Bengali, Somali, Turkish, Romanian, Farsi. Germany: Turkish, Arabic, Russian, Polish. Australia: Arabic, Mandarin, Cantonese, Vietnamese, Turkish. Canada: Mandarin, Punjabi, Cantonese, Arabic. India: 22 scheduled languages; 43% of ICU trainees cite language barriers.

### B.4 Gap analysis vs. current 13-language list

High-priority additions with US ICU evidence (all Web Speech–only in iPadOS):

- **Haitian Creole** — top-6 nationally per AMN 2023, critical in FL and NY
- **Somali** — 8.7% of Mayo ICU LEP, high in MN/OH/ME
- **Hmong** — 2.4% of Mayo ICU LEP, #2 in WI/MN

Low-cost Chatterbox-native additions:

- **Polish** — strong UK/Germany evidence
- **Turkish** — strong Germany/Australia evidence

No current languages warrant removal; German and Japanese have thin US ICU evidence but serve international expansion.

### B.5 Primary citations

> Barwise, A.K., Jaramillo, C., Novotny, P., et al. (2018). Differences in code status and end-of-life decision making in patients with limited English proficiency in the intensive care unit. *Mayo Clinic Proceedings*, 93(9), 1271–1281.

> Barwise, A.K., Nyquist, C.A., Espinosa Suarez, N.R., et al. (2019). End of life decision making for ICU patients with limited English proficiency: A qualitative study of healthcare team insights. *Critical Care Medicine*, 47(10), 1380–1387.

> Twersky, S.E., Jefferson, R., Garcia-Ortiz, L., et al. (2024). The impact of limited English proficiency on healthcare access and outcomes in the U.S.: A scoping review. *Healthcare (Basel)*, 12(3), 364.

> Sliwinski, K., Kutney-Lee, A., McHugh, M.D., Lasater, K.B. (2024). A review of disparities in outcomes of hospitalized patients with limited English proficiency: The importance of nursing resources. *Journal of Health Care for the Poor and Underserved*, 35(1), 359–374.

> Lehman, R., Moriarty, H. (2024). Limited English proficiency and outcomes in the intensive care unit: An integrated review. *Clinical Nurse Specialist*, 38(2), 85–94.

> AMN Healthcare. (2023). AMN Healthcare study tracks 45 languages spoken in patient/provider encounters in U.S. Press release. [Operational data: 204M minutes of interpretation services.]

> Kaiser Family Foundation. (2024). Overview of health coverage and care for individuals with limited English proficiency (LEP). KFF Issue Brief.

> U.S. Census Bureau. (2023). Press release on English proficiency. [American Community Survey 5-year estimates, 2018–2022.]

> Joint Commission. (2026). Language access and interpreter services — understanding the requirements.

> CMS. (2025). HCAHPS: Patients' perspectives of care survey.

> Hawai'i Health Systems Corporation. (2016). Language Access Plan.

> California Health Care Access and Information (HCAI). Preferred languages spoken in California healthcare facilities.

### B.6 Data gaps

No US-wide ICU-specific language census exists. Barwise (2018) is single-site and regionally skewed by local refugee populations. HCAHPS collects language data but does not release national distributions. Joint Commission language-stratified quality requirements are 2026-new; aggregate findings not yet published. Global ICU language data is extremely sparse outside the US. Chatterbox Turbo per-language synthesis quality is not peer-reviewed-benchmarked.

---

## Appendix C: PRD patch

Approximate diff for `docs/PRD.md` (exact text to be confirmed during implementation):

```
-### Dual-language interaction model:
-- Patient selects their preferred language during setup
-- Provider language defaults to English (configurable)
-- When a patient taps a phrase, it is spoken in the patient's language
-  and displayed in both languages in the text bar and conversation thread
-- When a provider taps a response, it is spoken in the provider's language
-  and translated/displayed in the patient's language
+### Voice-direction model (revised 2026-04-22):
+- Patient and caregiver languages are both selected during Setup; either
+  can be changed from Settings mid-admission.
+- Patient voice clone speaks in the CAREGIVER'S language. Patient-surface
+  UI renders in the patient's language.
+- Provider voice clones speak in the PATIENT'S language. Provider-surface
+  UI renders in the caregiver's language.
+- Conversation thread shows both languages for every utterance.
+- Voice cloning is only offered when Chatterbox Turbo supports the target
+  speech-output locale. Otherwise the device's system voice is used.
+- Design history: earlier versions of this PRD described patient voice
+  speaking in the patient's language. The clinical rationale for the
+  revised model is that voiceless ICU patients need their bedside
+  caregivers to understand them; speaking the caregiver's language
+  removes the interpreter bottleneck in acute moments.
```

Line 99 similarly rewritten — patient taps are spoken in caregiver's language; provider taps in patient's language; no language-translation step on either path (the locale choice is where the text came from, not a translation).
