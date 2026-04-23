# Multi-Patient Support Design

**Status:** Draft for review
**Date:** 2026-04-22
**Scope:** Enable one iPad in an ICU to serve multiple patients. Healthcare staff can add, switch between, and remove patients. Patients cannot see other patients exist on the device.

---

## 1. Summary

OwnVoice currently assumes one patient per device. Production reality in an ICU is one iPad shared across multiple patients (beds) in the same ward. This spec adds a device-wide patient list, staff-gated add/switch/remove actions, and audio-cache semantics that pause the outgoing patient's regeneration queue on switch so the incoming patient doesn't wait behind someone else's work.

Care team is shared across patients at the device level (nurses serve multiple beds on a shift — cloning their voice once is the whole point of a shared device). Conversation history and voice samples are per-patient and survive switches; they are deleted only on explicit "Remove patient." Staff authentication persists across Settings/Switch actions for 5 minutes of inactivity, with a user-triggered "End staff session" affordance and a 60-second warning before the auto-lock (WCAG 2.2.6, 3.2.5).

## 2. Context and motivation

### 2.1 Deployment reality

The production target is a single iPad Pro stationed in an ICU. It rotates between patient bedsides. Each ICU admission is typically several days to a week; the iPad needs to serve whichever patient the staff member is currently supporting, without leaking one patient's conversation history to the next.

### 2.2 What's on the device today (single-patient)

- `AppSettings` carries `patientName`, `bed`, `patientLang`, `caregiverLang`, `patientVoice`, `pin`, `providers[]`, `fallbackVoice`, `assistiveInput`.
- `settingsStore.speakerData` is the one patient's voice-encoder output.
- `conversationStore.messages` is a flat `Message[]` — one thread.
- `resetAll()` wipes everything (settings, conversation, audio cache, model weights, SW) — a device-factory-reset level primitive.
- `PinGate` exists, PIN-protects entry into Settings.

### 2.3 What needs to change

Every top-level single-patient assumption: the settings shape, the conversation partitioning, the audio-cache runner's view of "who's speaking," and the UX flow for staff-initiated patient management.

## 3. Audience model (who sees what)

| Surface | Audience | Behavior |
|---|---|---|
| Active-patient view (today's entire patient UI) | Patient (possibly with staff at bedside) | Renders using `activePatient`'s data. No indication other patients exist. |
| Header's "Switch Patient" button | Staff | Always visible in the chrome. Tap → PIN gate (if not already authed) → Switch sheet. |
| Switch sheet | Staff only | Lists patients; tapping a card is non-destructive switch. "+ Add Patient" launches the Add flow. |
| Settings → Patients section | Staff only | Contains Add Patient (same as Switch sheet's +) and Remove Patient (destructive) actions. |
| Warning toast before auto-lock | Staff | 60-second warning with Extend / End now actions. |

Patients never see the Switch sheet, the Settings panel, or any indicator of other patients' existence. The patient's view is identical to today's single-patient app.

## 4. Architecture

### 4.1 Types

```ts
// src/types.ts

export interface Patient {
  /** UUID, generated client-side at add-time. Never displayed; used
   *  for activePatientId references, conversation-store keys, and
   *  audio-cache partitioning. */
  id: string;
  name: string;
  bed: string;
  /** BCP 47 — each patient carries their own preferred language. */
  patientLang: string;
  /** true when a voice sample has been captured. */
  hasVoice: boolean;
  /** The Chatterbox Turbo speech-encoder output for this patient's
   *  voice clone. Moved from the single-patient
   *  settingsStore.speakerData. */
  speakerData: unknown;
  /** Per-patient system-voice preference, paired with patientLang. */
  fallbackVoice?: FallbackVoice | null;
  /** Unix ms — used for sort order ("most recently active first")
   *  and display ("Added Tue 10:04am"). */
  addedAt: number;
  /** Unix ms — last time this patient was the active patient.
   *  Updated by setActivePatientId. */
  lastActiveAt: number;
}

export interface AppSettings {
  // Device-wide
  pin: string;
  caregiverLang: string;
  assistiveInput?: boolean;
  providers: Provider[];          // care team shared across patients

  // Patient list + active pointer
  patients: Patient[];
  /** null when between patients (fresh device, or after removing the
   *  last active patient). */
  activePatientId: string | null;
}
```

Fields removed from `AppSettings` (now on `Patient`): `patientName`, `bed`, `patientLang`, `patientVoice`, `fallbackVoice`.

### 4.2 Store changes

**`settingsStore`** — stays the home for `AppSettings`. Gains:

- A new persist migration `v1 → v2`: reshapes the single-patient cfg into `{ patients: [Patient], activePatientId: <that patient's id> }`. A freshly-created Patient object inherits the old cfg's patient fields plus a new UUID; its `speakerData` is populated from the old top-level `settingsStore.speakerData`. On migration, `settingsStore.speakerData` is cleared (it becomes a per-patient field).
- Action selectors:
  - `addPatient(data): Patient` — appends to `patients`, sets `activePatientId` to the new patient.
  - `switchPatient(id: string): void` — updates `activePatientId`, bumps the outgoing patient's `lastActiveAt`. (Audio-cache pause/resume is wired on top of this; see §4.4.)
  - `removePatient(id: string): void` — removes from `patients`. Errors if the target is the active patient.
  - Selectors for `useActivePatient()` and `usePatientById(id)`.

**`conversationStore`** — `messages: Message[]` → `messagesByPatientId: Record<string, Message[]>`. Existing `addMessage` takes the active patient from `settingsStore.getState().cfg.activePatientId` implicitly. `clear()` clears only the active patient's thread. A new `clearForPatient(id: string)` supports the Remove cascade.

**`audioCacheStore`** — `SpeakerKey` currently includes `"patient"`, `"provider:${i}"`, `"patient:pain"`. Extended to include the patient UUID for patient-centric entries: `"patient:${patientId}"`, `"patient:${patientId}:pain"`. Provider entries stay flat as `"provider:${i}"` since the team is device-wide.

**`uiStore`** — gains `staffAuthed: boolean` (transient; cleared on page reload) + `staffAuthedAt: number` timestamp, used to enforce the 5-minute inactivity timeout. See §4.5.

### 4.3 OPFS audio cache partitioning

The existing `hashKey(phrase, fingerprint)` already partitions clips across patients because each patient's voice embedding produces a distinct fingerprint. What the current code lacks is a way to *enumerate* which files belong to which patient — needed for the Remove cascade to clean up without doing an O(patients × phrases) hash-recomputation.

The hash function `hashKey(phrase, fingerprint)` mixes both inputs into a single digest, so a patient's clips don't share a filename prefix — simple prefix-deletion won't work. Solution: an OPFS metadata file `audio-cache-v3/patient-index.json` that maps `patientId → { fingerprint: string, hashes: string[] }`. Maintained by:

- `addPatient`: entry is created once the voice sample is captured and fingerprint is known; `hashes` is initially empty.
- Every `putCachedAudio` call appends the generated hash to the owning patient's `hashes` array (writes are debounced to amortize disk cost).
- `removePatient`: reads the patient's `hashes` and unlinks each file, then deletes the index entry. O(phrases_for_that_patient) rather than O(total_cache_size).

### 4.4 Audio-cache runner — pause on switch

The switch action is non-destructive but must preserve the outgoing patient's in-progress regeneration so they can resume when switched back to, while freeing the TTS worker for the incoming patient.

`audioCacheRunner` already has `pauseAll()` that freezes the current controller and marks running speakers as "paused" in `audioCacheStore`. The switch flow uses it:

```ts
// src/stores/settingsStore.ts action
switchPatient(id: string) {
  audioCacheRunner.pauseAll();          // freeze outgoing patient's queue
  set((s) => ({
    cfg: s.cfg ? { ...s.cfg, activePatientId: id } : s.cfg,
  }));
  // bump lastActiveAt on the new active patient
  const patient = get().cfg?.patients.find(p => p.id === id);
  // ... in the same set call to avoid double-render
}
```

App.tsx's existing `embeddingKey` effect (which restarts `runPreGeneration` when patient identity changes) naturally picks up the new active patient — no additional plumbing needed. The re-run either resumes a paused plan (if the new patient had one in progress) or starts fresh.

### 4.5 Staff authentication model

**State.** `uiStore.staffAuthed: boolean` + `uiStore.staffAuthedAt: number`. Both cleared on:

- Page reload (transient by design).
- Explicit "End staff session" action.
- 5 minutes of staff-action inactivity (see timer below).

**Entry.** Any staff action (open Settings, open Switch sheet, tap Remove) consults `staffAuthed`. If false, the existing `PinGate` is shown first; on success, `staffAuthed = true`, `staffAuthedAt = Date.now()`, and the originating action proceeds.

**Activity tracking.** `staffAuthedAt` is reset by user-initiated interactions on any staff-gated surface: tapping/keyboard-activating a control inside the Settings sheet, the Switch sheet, or on the header's Switch/Settings/End-staff-session buttons. Passive events (mousemove, scroll, patient-surface interactions like tapping a phrase) do *not* reset the timer — only intentional staff-mode engagement does. This keeps the lock meaningful: staff who walk away leaving the iPad on the patient view (where passive activity from the patient may occur) still get locked out on schedule.

**Auto-lock timer.** A single `setTimeout` in an `App.tsx` effect that fires at `staffAuthedAt + 5 min`. When it fires, it first shows a **warning toast** (see below) with a 60-second countdown; if the 60s expires without user interaction, `staffAuthed = false` (silent lock). If the user interacts with the toast ("Extend" → bump `staffAuthedAt`; "End now" → immediate lock), the timer resets accordingly. This satisfies WCAG 2.2.6 (users must be warned of any inactivity timeout that could interrupt their flow).

**Warning toast.** Accessible affordance with:

- `role="alertdialog"`, `aria-live="assertive"`.
- 60-second visible + audible countdown (respects `prefers-reduced-motion` for the count animation).
- "Extend session" button (primary) — resets the timer for another 5 min.
- "End now" button (secondary, destructive-subtle) — immediate lock.
- Auto-lock without interaction after 60s.

**Explicit end.** A "End staff session" action lives in the header alongside the Switch and Settings buttons (visible only when `staffAuthed === true`). Tap → immediate lock; header swaps the action row back to the unauthenticated chrome (Switch and Settings buttons hidden until next PIN entry). Satisfies WCAG 3.2.5 (Change on Request).

### 4.6 First-run vs. subsequent-add flows

**First run** (device has zero patients, fresh install or after `resetAll()`):

- Existing `Setup` component runs automatically (since `cfg?.patients.length === 0 || cfg?.activePatientId === null`).
- Setup is adapted to handle both device-level bootstrap AND first-patient creation:
  - Step 0 — Patient (unchanged structure: name, bed, patientLang) + adds a caregiverLang picker per the localization spec.
  - Step 1 — Voice sample (unchanged).
  - Step 2 — Care team (re-scoped: this is now the device's care team, not the first patient's).
  - Step 3 — Confirm + PIN (unchanged).
- On finish, `cfg.patients = [newPatient]`, `cfg.activePatientId = newPatient.id`, and the top-level device fields are set.

**Subsequent Add** (via Switch sheet's "+ Add Patient" card): scoped to patient-specific fields only.

- Step 0 — Patient (name, bed, patientLang; no caregiverLang, no PIN).
- Step 1 — Voice sample.
- Step 2 — Confirm.
- On finish, appends the new Patient to `cfg.patients`, switches to it (pause-on-switch semantics apply to whoever was active before), closes the Add flow, and the new patient becomes the active view.

This is a mode on the Setup component: `mode: "first-run" | "add-patient"`. Steps 2–3 of Setup are conditionally skipped in add-patient mode.

### 4.7 Remove flow

Lives in Settings → new "Patients" section (between Care Team and Accessibility sections). Each patient is a card with:

- Name, bed, locale, voice-readiness indicator, `addedAt` relative time.
- A "Remove" button on the card with destructive tone.
- **Active patient's Remove is disabled** with an `aria-describedby` hint: *"Switch to another patient before removing this one."* Prevents the confusing side-effect of removing the active patient and ending up with nothing active (WCAG 3.3.4 — Error Prevention).

Tapping Remove opens `ConfirmDialog` (the primitive landed in localization PR 1) with destructive tone:

> **Remove [name]?**
>
> This will delete their voice sample, conversation history, and cached audio for their voice clone. Care-team voice clones are kept for other patients. This cannot be undone.
>
> [Cancel] [Remove]

On confirm, the store action `removePatient(patientId)` cascades:

1. Abort any in-flight audio regen targeting this patient (should be none — active patient's work is running; inactive patients' work is paused).
2. `settingsStore`: remove from `patients`. If the removed patient was somehow the active one (guard failure), set `activePatientId = null`.
3. `conversationStore`: `delete messagesByPatientId[patientId]`.
4. OPFS cache cleanup: `clearCacheForPatient(fingerprint)` per §4.3.
5. `audioCacheStore`: discard entries keyed `patient:{patientId}*`.
6. Metadata index (§4.3): delete the `patientId` entry.
7. `aria-live="polite"` announcement: *"[name] removed. {N} patients remaining."*

## 5. UX sections

### 5.1 Header chrome

Current header has: patient name / bed / theme toggle / Settings button. New additions (visible order, left-to-right within the staff-action cluster):

- **Switch Patient** button (always visible; tap → PIN gate if not authed → Switch sheet).
- **Settings** button (unchanged).
- **End staff session** button (visible only when `staffAuthed === true`; otherwise hidden).

Target size ≥64×64 each per project CLAUDE.md. All three get `aria-label` (translated to `caregiverLang` per the localization spec — these are provider chrome).

### 5.2 Switch Patient sheet

Uses the existing `BottomSheet` pattern — inherits focus trap, Escape-to-close, focus return, respect-reduced-motion.

Structure:

- Sheet title: *"Switch Patient"* (h2, `caregiverLang`).
- Prominent **"+ Add Patient"** card at top (tappable, 64px min height, destructive-safe green tone).
- `role="listbox"` containing one `role="option"` per patient, sorted by `lastActiveAt` descending:
  - Card content (top to bottom):
    - Name (24px Atkinson Hyperlegible, 7:1 contrast).
    - Row: bed · locale flag + label · voice-readiness chip (*Voice captured* / *No voice* / *Preparing…*).
    - Row: *"Last active [N] min ago"* (muted, must hit 7:1 at AAA).
  - Active patient: `aria-current="true"` + visually highlighted ring + visually-hidden "Currently active" span for SR users.
  - Keyboard: arrow keys move focus between options; Enter/Space selects.
- Selection behavior (tap or keyboard activation):
  - If the tapped card is already the active patient: no-op.
  - Otherwise:
    1. `audioCacheRunner.pauseAll()`
    2. `settingsStore.switchPatient(nextId)`
    3. `App.tsx`'s `embeddingKey` effect triggers `runPreGeneration` for the new active patient
    4. Sheet closes with focus returning to the Header's Switch button
    5. `aria-live="polite"` announcement: *"Switched to [name]. {N} new conversation messages."*

### 5.3 Add Patient flow

Reuses `Setup` in `mode="add-patient"`. Rendered inline in the Switch sheet (push-stack: Switch sheet → Add form), or as a follow-on sheet. Prefer push-stack to avoid a focus-loss transition.

A11y mirrors Setup's existing behaviors (form labels, validation, WCAG 3.3.4 review step).

### 5.4 Remove Patient flow

Settings panel → new Patients section beneath Care Team.

Each patient card:

- Same content shape as Switch sheet cards, plus a trailing Remove button.
- 64×64 min target size on Remove.
- Active patient's Remove: `disabled` + `aria-describedby` hint (see §4.7).

Confirm dialog copy in §4.7. Post-confirm announcement in §4.7.

### 5.5 Auto-lock warning toast

Triggered 60 seconds before `staffAuthedAt + 5 min` expires. Anchored top-center, inside the patient view (staff is presumed looking at patient chrome during the timeout window — toast visibility matters).

- `role="alertdialog"`, `aria-modal="false"` (doesn't steal focus immediately; staff may still be typing in Settings), `aria-live="assertive"`.
- Content: *"Staff session ends in {N}s. [Extend] [End now]"* with a live-updating countdown.
- Extend button: primary, full-width at small sizes, 44px+ target (WCAG 2.5.5).
- End now: secondary, muted tone.

After 60s without interaction, auto-lock silently. Focus returns to the patient view.

## 6. Accessibility (WCAG 2.2 AAA)

This section enumerates every AAA criterion that the new surfaces either satisfy or explicitly address.

| SC | Surface | How addressed |
|---|---|---|
| 1.4.6 Contrast (Enhanced), AAA | All new cards, dialogs, toast | 7:1 on text against card/dialog background in both light and dark. Muted timestamps promoted from `t.muted` to `t.sub` where needed. |
| 2.1.3 Keyboard (No Exception), AAA | Switch sheet listbox, Remove cards | Arrow-key navigation through listbox; Enter/Space activates; no pointer-only interactions. |
| 2.2.3 No Timing, AAA | Auto-lock timer | Doesn't strictly apply — security timeouts are a named carve-out. We explicitly satisfy 2.2.6 instead. |
| 2.2.6 Timeouts, AAA | Auto-lock warning toast | 60-second warning before lock with Extend + End-now actions. |
| 2.3.3 Animation from Interactions, AAA | Sheet slide, toast fade, countdown animation | All respect `prefers-reduced-motion` (sheet already does per commit `3fb1ae4`). |
| 2.4.10 Section Headings, AAA | Settings → Patients section, Switch sheet | Each section uses a proper `<h2>` with `id` referenced by the section container's `aria-labelledby`. |
| 2.5.5 Target Size (Enhanced), AAA | Switch cards, Remove buttons, End staff session button | ≥64×64 (beats AAA's 44×44). |
| 3.2.5 Change on Request, AAA | Auto-lock, auto-switch-on-remove-guard | Auto-lock paired with user-controlled End-staff-session and Extend action. Remove-active-patient blocked (staff must switch manually) instead of silent auto-switch. |
| 3.3.4 Error Prevention, AAA | Remove Patient | ConfirmDialog with full-sentence destructive description + reversibility statement ("This cannot be undone"). Active patient's Remove disabled. |
| 3.3.6 Error Prevention (All), AAA | Add Patient | Setup wizard already has a Step 3 review screen; retained in `add-patient` mode. |
| 4.1.3 Status Messages, AA (below AAA but critical) | All cascade actions | `aria-live="polite"` for Switch + Remove announcements. Toast uses `aria-live="assertive"` because the timeout is time-critical. |

Screen-reader announcement copy is prepared in `en.ts` under `ui.provider.multi_patient.*` (new namespace in this spec).

## 7. Sequencing with localization work

Landing order:

1. **Finish localization PR 1 merge** (currently at #86, approved). Adds `caregiverLang`, Chatterbox gating, `<ConfirmDialog>`, `<DualLocaleText>`, key-based primitives. All of these are used by multi-patient.
2. **Finish localization PR 2** (in-flight — string extraction). No data-shape dependency on multi-patient; stays sequential.
3. **Multi-patient PR A** — data model, stores, migration, `<ConfirmDialog>`-backed Remove flow, Switch sheet scaffolding. No user-visible UX on the patient view (migration produces a single-patient-equivalent experience until Add is used).
4. **Multi-patient PR B** — Add Patient flow (Setup's add-patient mode), staff-auth timeout + toast, a11y polish.
5. **Resume localization PR 3** — cache runner cleanup. Rewrites `cfg.patientLang` references to `activePatient.patientLang`; natural under the new shape.
6. **Localization PR 4, 5** — Settings UX + Thread gloss + docs.

This order lands the `<ConfirmDialog>` and `<DualLocaleText>` primitives (localization PR 1) before multi-patient needs them, and lets localization's string-extraction phase (PR 2) happen while its data shape hasn't been perturbed yet. Multi-patient's two PRs happen between localization PR 2 and PR 3, at the natural seam where localization shifts from extraction to runtime-value plumbing.

## 8. Testing

### 8.1 Unit tests

- `settingsStore.test.ts` — extend the migration tests to cover `v1 → v2`: a stored config with top-level `patientName`/`bed`/`patientLang`/`patientVoice`/`fallbackVoice` + `settingsStore.speakerData` migrates into a single `Patient` record, with `activePatientId` set to that patient's new UUID. `speakerData` is moved off the top level. All other fields (`pin`, `caregiverLang`, `providers`) preserved untouched.
- `settingsStore.test.ts` — `addPatient`, `switchPatient`, `removePatient` actions behave correctly: adds append, switch updates `activePatientId` + bumps `lastActiveAt`, remove errors if targeting the active patient.
- `conversationStore.test.ts` — `addMessage` routes to `messagesByPatientId[activePatientId]`. `clearForPatient(id)` deletes that slice only.
- `audioCacheRunner.test.ts` — `buildPlan` reads the active patient: changing `activePatientId` produces a plan targeting the new patient's `speakerData`.
- `patientIndex.test.ts` (new) — the patientId→fingerprint metadata index round-trips add/remove correctly. `clearCacheForPatient` deletes only the target's cached files.

### 8.2 Component / integration tests

- **Switch flow (integration):** mount App with two patients (A active, B not). Trigger Switch via the Switch sheet selecting B. Assert:
  - `activePatientId === B.id`.
  - A's progress entries in `audioCacheStore` become `paused`.
  - `audioCacheRunner.runPreGeneration` was invoked with B's speakerData.
  - Conversation selector returns B's messages.
- **Switch-back resume:** continue the above. Tap Switch → A. Assert A's progress entries transition from `paused` → `running`; B's become `paused`.
- **Remove cascade:** mount App with two patients (A active, B inactive). Navigate Settings → Patients → Remove B → Confirm. Assert:
  - `cfg.patients` has one entry (A).
  - `conversationStore.messagesByPatientId[B.id]` is absent.
  - OPFS cache dir has no entries whose hash matches B's fingerprint (via the index).
- **Auto-lock timer:** mock `Date.now`; authenticate staff; advance 4:00 — `staffAuthed` still true. Advance to 4:00 + 30s (30s into the warning window) — toast visible. Advance to 5:00 — `staffAuthed` false; toast dismissed.
- **A11y:** axe-core component tests for Switch sheet, Remove ConfirmDialog, Warning toast. Assert correct `role`, `aria-current`, `aria-live`, target sizes.
- **Active-patient Remove guard:** attempt to `removePatient(activePatientId)` via store action; assert it throws and state is unchanged.

### 8.3 Mutation audit

HIGH-priority scope per `.claude/skills/mutation-audit/skill.md`:

- `src/stores/settingsStore.ts` — extend existing audit to cover new migration (v1→v2) and the three new actions.
- `src/stores/conversationStore.ts` — new audit: partition logic is a new boundary.
- **New file** `src/stores/patientIndex.ts` (if the OPFS index is split into its own module) — placed under `src/stores/` so it's in the default mutate glob.

Out of scope per project policy: `audioCacheRunner.ts` (under `src/models/`). Compensating control: the switch and remove integration tests cover its branching.

## 9. Open questions and future work

- **End staff session placement.** Proposed in the header alongside Switch and Settings. If the chrome feels crowded at testing time, move to a Settings-only action or a header overflow menu. Not a blocker for landing.
- **Patient limit.** No hard cap defined. Reasonable upper bound for an ICU ward iPad is 8–10 simultaneous active records. A future enhancement could warn when exceeded or auto-cleanup records older than N days.
- **Migration rollback.** If the `v1→v2` migration fails mid-way (e.g. OPFS write errors during speaker-data move), the store will log and return the pre-migration shape. Recovery is manual (ask staff to re-run Setup); we don't support automatic degradation to v1 shape because the type system assumes v2.
- **Conversation archive / export.** Removed patients lose their conversation history. Future clinical-record export work could dump a patient's conversation to PDF before removal. Not in scope.
- **Patient identity in multi-patient + multi-language scenarios.** Each patient's `patientLang` is independent; the care team's voice caches naturally fan out to each patient's language as staff switch between them. That's acceptable per your earlier "acceptable as defined" sign-off on cache disk growth.
- **Handling of care-team changes.** If staff adds a provider mid-shift while Patient A is active, the new provider's audio cache is generated for A's `patientLang` immediately. Switching to Patient B later triggers a fresh generation for B's `patientLang`. No special handling needed — the existing `runPreGeneration` handles new providers the same as new patients.
- **Accessibility audit partner.** WCAG 2.2 AAA compliance for the Switch sheet, Warning toast, and Remove flow should be validated by an accessibility expert before clinical release. The implementation plan will include an axe-core CI check as a baseline gate; the expert review is a follow-up.
