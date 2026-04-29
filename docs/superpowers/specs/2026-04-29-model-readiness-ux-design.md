# Model Readiness UX

## Problem

Users can tap features that depend on on-device models (Listen, Record voice,
Upload voice file) before those models are downloaded and warmed. The current
behavior is a mix of:

- Silent failure with a generic error string ("Speech-to-text model is not
  loaded yet" — `src/hooks/useMicrophone.ts:178`).
- Long invisible waits when the TTS speech-encoder lazy-loads its 591 MB
  external-data file inside the worker (`src/components/shared/VoiceCapture.tsx:170`).
- Silent fallback to Web Speech for patient phrase taps when the cloned voice
  is not yet ready (`src/speak.ts:537`) — the patient hears a generic voice
  with no indication their own voice is still being prepared.

Patients and caregivers cannot tell whether the app is hung, broken, or
working as intended. Recovery actions, when offered, are buried in console
errors.

## Goals

1. Eliminate the "tap-then-error" path on Listen.
2. Allow voice cloning input (Record / Upload) at any time; defer processing
   until the model is ready, with visible status and no silent failure.
3. Always show progress toward a ready state in plain language anyone in a
   hospital room can read in a glance.
4. Pair every failure message with a single, obvious recovery action.
5. Tell the patient when their voice is being substituted, without taking
   space from the phrase grid.
6. Meet WCAG 2.2 AAA where applicable (contrast 7:1, target 44px, status
   announced to assistive tech).

Non-goals: redesigning the offline primer, changing model selection, or
moving any storage layer.

## Underlying bugs to fix as part of this work

A code review of the existing cloning path uncovered six bugs that
together produce the "voice cloning gets stuck or fails" symptom
described against the previous UX. The redesign cannot succeed without
fixing them — they aren't separate work.

1. **Premature `ready`.** `bootModels.ts:72` calls `mgr.setReady("tts")`
   the moment the worker reports init complete, but `ttsWorker.ts:325`
   only loads the small tokenizer at init. Speech encoder, embed_tokens,
   language_model, and conditional_decoder all lazy-load on demand.
   Result: `mgr.isReady("tts")` lies. The cloning gate (`VoiceCapture.tsx:180`)
   is effectively a no-op because it checks the wrong signal.
2. **Hard 5-minute timeout vs real first-load time.** The 591 MB speech
   encoder over a typical hospital wifi (~1.5 MB/s) is ~6.5 minutes. The
   timeout in `VoiceCapture.tsx:189-192` fires before the download
   finishes; the user sees a "timed out" error even though the resume on
   the next attempt usually works.
3. **No progress during the long wait.** The worker emits
   `embed-progress: loading-model` once at the start and is silent for
   the entire encoder fetch (`ttsWorker.ts:382`). The UI sits on
   "Creating clone from sample…" with no countdown.
4. **Retry useEffect fires immediately and re-enters the stuck path.**
   The retry waits for `tts.status === "ready"` (`VoiceCapture.tsx:267-298`).
   Because of bug 1, status is already `ready` when the retry installs
   — the synchronous initial-state check runs `retryEmbedding` right
   away, which calls `extractEmbedding` again, which sits in the same
   long wait. User sees "stuck."
5. **Wizard finish drops the embedding.** `Setup.tsx:116-148` reads
   local `speakerData` at `finish()` time. If the user advances past
   the Voice step before extraction completes, `addPatient` is called
   with `speakerData: null`. The late-arriving embedding updates a
   stale closure on an unmounted component and is lost. The patient
   persists with no voice clone forever.
6. **Embed-handler race.** `extractEmbedding` adds a per-call message
   listener that resolves on any `embedding` message. Two overlapping
   embed calls have handlers that can resolve with the wrong call's
   data.

### Fixes (folded into the design below)

- **Bug 1**: introduce `warm` semantic. The worker emits
  `{type: "warm"}` after the speech encoder is loaded and a one-shot
  warmup inference completes; `bootModels` calls `mgr.markWarm("tts")`
  on receipt. `mgr.setReady("tts")` keeps its current meaning
  (tokenizer loaded). UI gates on `isWarm`. We trigger warmup eagerly
  by sending a `warmup` message right after `ready` so the encoder
  downloads in the background even if the user never opens cloning.
- **Bug 2**: replace the 5-minute hard timeout with an idle-watchdog —
  only fail if no progress message arrives for 60 seconds. While bytes
  are flowing, keep waiting indefinitely.
- **Bug 3**: encoder load uses a `fetch` + streaming reader so the
  worker can post `embed-progress: { loaded, total }` events as bytes
  arrive. UI converts those into the countdown copy from the time-
  estimation rules above.
- **Bug 4**: retry useEffect waits for `isWarm("tts")`, not
  `isReady("tts")`. Since `warm` flips at most once and only after the
  encoder is genuinely usable, the retry fires meaningfully.
- **Bug 5**: store the captured audio blob in IndexedDB (via the
  patient record) at capture time, not at wizard-finish. The patient
  record keeps `pendingVoiceBlob` until `speakerData` is populated.
  A background processor in the model layer watches for any patient
  with `pendingVoiceBlob` and runs extraction when TTS warms. Patients
  who finished setup before extraction completed get their voice clone
  retroactively, no manual action needed.
- **Bug 6**: tag each embed call with a `requestId`; the worker echoes
  it back in the response. `extractEmbedding`'s handler resolves only
  on matching `requestId`. Concurrent embed calls don't cross-talk.

## Two flows, two readiness rules

Voice cloning and Listen handle readiness differently because their
relationship to time is different:

- **Voice cloning is non-blocking.** Recording and file upload are real-time
  human acts. Forcing the user to wait before they can speak into the mic
  loses the moment — the clinician may have a narrow window when the patient
  is awake and willing to record. We accept input always, save the audio
  durably, and process when the model is warm. The user sees the deferred
  processing status; on success the voice clone activates with no further
  action required.
- **Listen (STT) is gated.** There is no captured artefact to defer to —
  Whisper transcribes a live audio stream. Allowing the user to tap "listen"
  before STT is warm produces audio that has nowhere to go. Better to gate
  the mic button with plain-language progress until ready.

## Approach

### Two readiness signals, one ready state

`ModelManager.isReady(id)` currently means "registered and idle/loaded" —
not "warm and able to run inference." For TTS specifically, the speech
encoder lazy-loads on the first `embed` call.

Introduce a `warm` flag per model in `ModelManager`:

- `idle` / `downloading` / `loading` — not callable.
- `ready` — registered, weights present.
- `warm` — first inference roundtrip has succeeded (or warmup ping has
  returned for STT).

Listen mic gates on `isWarm("stt")`. Voice cloning Record and Upload do
NOT gate on warm — they capture audio always and queue processing. The
TTS worker emits a `warm` message after the first successful `embed`
(or after an explicit `warmup` message we send right after `ready`). STT
worker does the same after a 100ms silence transcription.

This is the only change to the model layer. UI components consume it via
`useModels().isWarm(id)`.

### Verb-led, action-framed copy

All status copy uses an active verb framed around the user's task — never
the engineer's task.

**Listen mic button (gated):**

| State | Button label |
|---|---|
| Not ready | "Getting ready to listen — {n}s" |
| Almost ready (>=85%) | "Almost ready…" |
| Ready | "Tap to listen" |
| Failed | "Couldn't get ready" (with "Try again" button) |

**Voice cloning Record / Upload (non-blocking):**

| State | Buttons | Status copy near buttons |
|---|---|---|
| Voice not warm, no audio captured | Enabled: "Record voice", "Upload file" | "Voice will start as soon as it's ready" |
| Audio captured, voice warming | (post-capture screen) | "Saving your voice — about {n}s left" |
| Audio captured, almost ready | (post-capture screen) | "Almost ready…" |
| Audio captured, processed | (post-capture screen) | "Voice ready" |
| Processing failed | (post-capture screen) | "Couldn't prepare your voice" (with "Try again" button) |

**Patient header status:**

| State | Copy |
|---|---|
| Voice not yet processed | "Using a temporary voice while yours gets ready — {n}s" |
| Almost ready | "Almost ready — using a temporary voice" |
| Ready | (hidden) |
| Failed | "Couldn't prepare your voice" (with "Try again" button next to it) |

Never used in user-facing copy: model, encoder, weights, AI, STT, TTS,
worker, GPU, ONNX, WASM, ML, download, MB.

### Time estimation

`useModels()` already streams `{ loaded, total }` per model. Compute a
rolling-average rate over the last 4 progress events; if rate > 0,
`secondsLeft = (total - loaded) / rate`. Display:

- `secondsLeft <= 5` → "Almost ready…"
- `5 < secondsLeft <= 90` → "{n}s"
- `90 < secondsLeft <= 600` → "{m} min"
- `secondsLeft > 600` or unknown → "One moment…"

Once `loaded / total >= 0.85`, force "Almost ready…" regardless of
estimate — avoids the well-known stall at the tail of the bar.

### Failure copy is paired with a recovery button

Every failure surface must offer one tappable recovery action. No
dismiss-only error toasts. The recovery action either retries the
underlying operation or, when retry is futile, opens Settings → "Prepare
for offline".

| Failure | Message | Action |
|---|---|---|
| Network unavailable | "Can't reach the network. Connect to wifi and try again." | "Try again" |
| Network slow / timeout | "This is taking longer than expected." | "Try again" (the operation continues in the background; tapping cancels and restarts it) |
| Out of storage | "Tablet is out of space. Ask staff to free space." | "Open settings" |
| Worker crashed | "Something went wrong getting ready." | "Try again" |
| Mic denied | "Microphone access is off. Turn it on in Settings." | "Open settings" |

Friendly mapping lives where it already does — `friendlyVoiceError` in
`src/components/shared/VoiceCapture.tsx:133` — extended with a recovery
verb per branch and exported for use by the Listen panel.

### Patient-facing temporary-voice indicator (header)

When a patient is configured with a cloned voice but the clone is not yet
ready (`hasVoice && !embedding-ready`), show a small status badge inside
the header next to `PatientPill`. The phrase grid is untouched.

States the badge can show — see copy table above.

The badge itself is not tappable. Status text must be self-explanatory; if
a reviewer feels they need a tooltip or "What's this?" sheet, the copy
needs another pass instead. The recovery button on the failure state is a
separate, sibling element — only the button is tappable, the badge is not.

Copy is in `patient.patientLang` (not caregiverLang) because the patient
reads it. Recovery button "Try again" re-extracts the embedding from the
saved blob (same code path as the existing `retryEmbedding` in
`VoiceCapture.tsx`).

Visual: a horizontal pill placed inline-end of the patient name pill,
with a vertical separator. On narrow widths the pill wraps to a second
header line rather than truncate.

### Component changes

- `src/models/modelManager.ts` — add `warm` to `ModelEntry`, `isWarm(id)`
  helper, `markWarm(id)`, and a `pendingVoiceQueue` keyed by patient id
  to drive Bug 5's retroactive extraction. Existing consumers continue
  to use `isReady` for tokenizer-loaded checks.
- `src/models/ttsWorker.ts` —
    - Add a `warmup` message handler that loads the speech encoder
      eagerly and runs a tiny silent inference. Emit `{type: "warm"}`
      on success.
    - Stream the speech-encoder fetch via `fetch` + `ReadableStream`
      reader so progress events `{type: "embed-progress", loaded, total}`
      can be posted while bytes arrive (Bug 3).
    - Echo a `requestId` from `embed` calls in `embedding` and `error`
      responses (Bug 6).
- `src/models/sttWorker.ts` — emit `{type: "warm"}` after a 100 ms
  silent transcription warmup runs.
- `src/models/bootModels.ts` — on `ready` from TTS, immediately post a
  `warmup` message so the encoder downloads in the background. On
  `warm` message, call `mgr.markWarm("tts")`.
- `src/hooks/useModels.ts` — expose `isWarm`, `secondsLeft(id)`,
  `humanCountdown(id)` (the formatted "12s" / "Almost ready…" string).
  Read warm-progress events as `{ loaded, total }` for the encoder
  separately from the model-manager's own download progress.
- `src/components/provider/ListenPanel.tsx` — gate mic button on
  `useModels().isWarm("stt")`. Replace button label with countdown when
  not warm. Single recovery button on failure.
- `src/components/shared/VoiceCapture.tsx` —
    - Record and Upload buttons remain enabled regardless of warm
      state. Pre-capture hint visible only when `!isWarm("tts")`.
    - Replace the 5-minute hard timeout in `extractEmbedding` with a
      60-second idle watchdog reset on every `embed-progress` event
      (Bug 2).
    - Per-call `requestId` plumbed through to the worker; resolver only
      handles matching response (Bug 6).
    - Retry useEffect watches `isWarm("tts")` instead of
      `isReady("tts")` (Bug 4).
    - Failure-state copy uses the failure-table mapping with paired
      recovery buttons.
- `src/components/settings/Setup.tsx` — at capture time, persist the
  raw audio blob into the patient record's `pendingVoiceBlob` field
  (or, in `add-patient` mode, into a draft record) so it survives
  wizard completion. Setup no longer needs to wait on extraction.
- `src/stores/settingsStore.ts` — add `pendingVoiceBlob` to the patient
  schema. A `voiceProcessor` subscribes to TTS warm + the queue of
  patients with pending blobs and runs extraction; on success, writes
  `speakerData` and clears `pendingVoiceBlob` (Bug 5).
- `src/components/layout/PatientPill.tsx` (or sibling) — add
  `PatientVoiceStatus` component rendered next to the pill. Subscribes
  to the active patient's clone state and `isWarm("tts")`. Non-tappable
  status + sibling recovery button on failure.
- `src/data/locales/en.ts` and other locales — add new phrase keys
  under `ui.readiness.*` and `ui.patient.header.voice_status.*`.

### Auto-resume rules

Auto-start applies only when there's already-captured input waiting.

- **Voice cloning, audio captured, processing waiting on warm**: when warm
  flips, automatically run `extractEmbedding` on the saved blob. (This is
  what the existing retry effect already does — codifying it as the rule.)
- **Voice cloning, file uploaded, processing waiting on warm**: same as
  above. Treats uploaded files identically to recordings.
- **Listen mic, user tapped before warm**: not applicable — mic button is
  gated. No queued action exists. User must tap when ready.
- **Patient header badge**: status only. No queued action. Badge hides on
  warm + ready transition.

### A11y AAA requirements

| Requirement | Implementation |
|---|---|
| Contrast (text) 7:1 | All status text uses tokens already verified at AAA in the existing palette; new pill uses `text` token on a `cardBg` token. |
| Contrast (non-text) 3:1 | Pill border + countdown bar use existing AA-checked colors (`#B45309` on `#FFFBEB` etc.). |
| Touch target 44px+ | Disabled mic/record/upload buttons keep current min-height (44px). Recovery buttons same. Status badge is a status, not a button — exempt. |
| Status announced | Status pill uses `role="status"` `aria-live="polite"` so countdown updates announce on transitions, not every second. |
| Countdown rate-limit | `aria-live` updates throttled to once per 5 seconds, plus on state change (downloading → almost ready → ready / failed). Avoids screen-reader spam. |
| Recovery button reachable | Failure pills place the recovery button as the next focusable element after the message. |
| No motion-only signaling | Progress is also expressed in text; spinners are decorative `aria-hidden`. |
| Reduced motion | The existing `prefers-reduced-motion` media query already gates the spinner animation in `VoiceCapture`. Carry the same pattern to the new pill. |
| Focus order | When a feature button transitions disabled→enabled while focused, focus stays on the same element. |

### Plain-language audit checklist

A standing checklist (added to project docs, not part of runtime):

- [ ] Does the string use a verb the user is doing? (Getting / Setting up / Tap / Try)
- [ ] Could a 12-year-old read it?
- [ ] Is there a recovery action paired with every failure?
- [ ] Are the words "model", "AI", "encoder", "STT", "TTS", "loading
      weights" absent?
- [ ] Is contrast verified at 7:1 in both light and dark themes?

## Out of scope

- Eager download on flow entry (option C from brainstorming) — keep the
  primer as the only download trigger for now.
- Header-level "X of 4 ready" diagnostic chip (option D) — separate spec.
- Localization of new strings beyond English at first cut. Other locales
  added incrementally; missing keys fall back to English (existing
  `phraseRegistry` behavior).

## Resolved decisions

1. Auto-start only when there is already-captured input waiting (recorded
   or uploaded blob). For Listen, the mic button is gated, so there is no
   queued action — the user must tap when ready.
2. Patient temporary-voice badge is not tappable. Status copy must be
   self-explanatory. If a reviewer feels it needs an explainer sheet, the
   copy gets another pass instead.
3. Pre-capture hint "Voice will start as soon as it's ready" is shown
   under Record/Upload when `!isWarm("tts")`.
4. Patient header on failure wraps to a second header line — patient
   names are typically first-name-only or bed-number, so overflow is
   uncommon and wrap reads more naturally than an icon-popup pattern.
5. `pendingVoiceBlob` is kept after extraction failure so the clinician
   can retry without re-recording. The full reset flow in Settings is
   the wipe affordance — no per-feature "wipe pending audio" button.
6. Eager warmup runs right after `ready` regardless of network. The
   primary deployment is in-patient on hospital wifi where the
   bandwidth cost is acceptable, and the latency savings on first
   cloning attempt are large.

## Open questions

(none currently — bug findings folded into the design)

## Validation

- Vitest covers `useModels.humanCountdown` boundaries (5s, 90s, 600s,
  unknown rate, post-85% override).
- Vitest covers `ModelManager.warm` transitions and `pendingVoiceQueue`.
- Worker-protocol tests:
    - TTS worker emits `warm` after `warmup` message succeeds (Bug 1).
    - Encoder load posts `embed-progress { loaded, total }` events as
      bytes arrive (Bug 3).
    - Embed responses include the original `requestId` (Bug 6).
- `extractEmbedding` tests:
    - Idle watchdog resets on each progress event; only fails after 60 s
      of silence (Bug 2).
    - Two concurrent calls receive their own responses, not each
      other's (Bug 6).
- Component tests assert:
    - `ListenPanel`: mic button disabled with countdown label when STT
      is not warm; enabled with normal label when warm; recovery button
      present on failure.
    - `VoiceCapture`: Record and Upload buttons enabled regardless of
      warm state; "Voice will start as soon as it's ready" hint visible
      only when not warm; post-capture status transitions through
      "saving → almost ready → ready"; auto-resume runs when warm flips
      with a captured blob present (Bug 4).
    - `PatientVoiceStatus`: badge non-tappable; recovery button is the
      only focusable element on failure; `aria-live` polite + throttled.
- Settings-store tests:
    - Patient with `pendingVoiceBlob` survives reload, gets processed
      when TTS warms, blob cleared on success (Bug 5).
    - Wizard finish before extraction completes still yields a patient
      with the eventual `speakerData` populated retroactively (Bug 5).
- Manual: airplane-mode failure paths in Listen and Record.
  Mid-download cancel + resume. Patient-pill badge in light + dark +
  RTL. Captured-then-abandoned flow (close panel during deferred
  processing, reopen, confirm state survives). Cold-start cloning on a
  throttled connection (verify the 6-minute encoder load no longer
  produces a "timed out" failure).
