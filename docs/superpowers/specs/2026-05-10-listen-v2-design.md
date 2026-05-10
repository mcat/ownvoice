# Listen v2 — provider-speech capture in the conversation thread

## Problem

The original Listen feature shipped a clinician-facing dictation surface
(`ListenPanel.tsx`, 375 lines) that opened as a bottom-sheet overlay,
required four discrete actions per use (open panel → tap mic → edit
transcript → tap "Add as {provider}"), and carried five readiness states
with localized prose for each (`ready` / `not_ready` / `with_countdown` /
`almost` / `failed`). It was removed in PR #234 (issue #233) for two
stated reasons: too much UX friction at the bedside, and too much
engineering surface area for a feature that wasn't earning its keep in
real use.

The underlying need stayed: in an ICU room with a voiceless patient on
the AAC iPad, clinicians need a fast way to put what *they* said into
the conversation log so the patient — often in and out of clarity during
delirium recovery — can read back what was explained to them. Typing
into a textarea is slow with gloved hands or mid-procedure; tile-based
phrase selection doesn't cover the long tail of clinical statements
("we'll take you off the vent in about an hour" is not on any tile).

Listen v2 reintroduces on-device STT capture, but redesigned around the
two concrete pains: the dictation surface lives *inside* the thread
(not in an overlay), and the engineering surface around it is much
smaller than v1.

## Goals

1. One-tap activation from the existing thread surface; no overlay, no
   panel.
2. Support multi-sentence, multi-minute capture (rounds explanations,
   family meetings) — not just short utterances.
3. The transcript that lands in the thread is what the patient will
   read; split it into sentence-sized bubbles so it's skimmable, not a
   wall of text.
4. Engineering surface materially smaller than v1: no panel, no
   five-state readiness machine, no editable-textarea flow, no separate
   `THREAD_TRANSCRIBED` audit event.

Non-goals: live partial-transcript streaming during recording,
patient-initiated capture (deferred for privacy reasons), real-time
multi-chunk decoding, sentence-boundary inference better than what
Whisper's punctuation provides, clinician-facing phrase tiles (separate
project).

## Decisions log

Six answers from the brainstorming session, in order:

| Q | Decision |
|---|---|
| Capture surface | In-thread Listen pill, left-aligned at the bottom of the thread (same lane as provider bubbles). No overlay. |
| Start/stop mechanic | Click to start, click to stop. No press-and-hold. |
| Silence handling | 30-second silence safety net only. Banner appears in final 5s; resets on speech or tap. Not part of the normal flow. |
| Recording feedback | Pulsing dot + elapsed timer + audio-level bar. No live transcript text during recording. |
| Capture duration | Multi-sentence, multi-minute. Audio accumulates in memory; chunks into 30s slices on stop, transcribes sequentially, concatenates. |
| Draft editing | Per-sentence operations: tap a sentence to edit inline (contenteditable), tap its ✕ to discard that sentence. No giant-textarea edit mode. |
| Commit shape | On ✓ Add, the draft splits at sentence boundaries into multiple committed provider bubbles, one per sentence, each timestamped. |

These foreclose the alternatives explored during brainstorming
(bottom-sheet panel, press-and-hold, silence-finalization at 1.5s,
streaming partial decodes, single committed bubble per capture).

## User flow

Four states, all rendered in `Thread.tsx`. The Listen pill is anchored
to the bottom-left of the thread scroll container so it stays visible
when the thread scrolls.

1. **Idle.** White pill, provider-green outline, mic icon, label "Add
   what you said". Tap → starts capture.
2. **Recording.** Pill turns red, shows pulsing dot, tabular-numeric
   elapsed timer (`m:ss`), animated audio-level bar, label "Tap to
   stop". Tap → stops capture and begins transcription. The audio
   level meter uses per-chunk RMS at the 16 kHz raw stream, throttled
   to ~15 fps. The silence detector uses the same RMS; samples below
   `0.01` (linear scale on normalized [-1, 1] PCM) count as silence.
   If 25s of continuous silence pass, a banner appears above the pill:
   "No speech detected · auto-stopping in {countdown}s".
   The countdown ticks 5 → 0. Any incoming speech or tap on the pill
   resets the silence timer and dismisses the banner. At 0, capture
   ends as if the user had tapped stop.
3. **Draft.** Capture stopped; the state enters `draft` immediately.
   Pill disappears. A draft bubble appears in its place (left-aligned,
   provider-green dashed border, light-green background) containing
   one row per transcribed sentence. Each row has:
   - Sentence text (contenteditable on tap)
   - A small ✕ that removes the row from the draft
   Sentences appear in chunk order as each chunk decodes (estimated
   ~5–10s per chunk on iPad GPU). A small spinner with text
   "Transcribing {done}/{total}…" sits at the bottom of the draft
   while later chunks are still decoding. Below the draft: ✓ Add as
   {provider} (provider-green, **disabled until all chunks complete**)
   and ✕ Discard (red text, always enabled).
4. **Committed.** ✓ Add posts one provider message per remaining draft
   sentence to the thread, all with the same timestamp (the capture's
   stop time) and a `via: "mic"` attribute. The draft and its actions
   disappear; the Listen pill returns to idle. ✕ Discard drops the
   draft and returns the pill to idle without posting.

## Architecture

### Component layout

```
Thread.tsx (flex column container)
├── MessageList               (flex: 1, scrolls vertically — existing)
└── ListenPill.tsx            (new, fixed height, sibling to message list)
    └── DraftBubble.tsx       (rendered above the pill when state === "draft" or "transcribing")
        ├── DraftSentence.tsx (per-sentence row with edit + delete)
        └── DraftActions.tsx  (✓ Add / ✕ Discard row)
```

The Listen pill is a sibling of the scrolling message list, not part of
it. This means the pill is always reachable at the bottom of the thread
view regardless of how far the message list has scrolled. When a draft
exists, it renders directly above the pill (in the same fixed-height
region), pushing the message list's scroll area smaller until the draft
is committed or discarded.

`ListenPill.tsx` is the orchestrator. It owns a `useListenSession()`
hook that exposes:

```
type ListenState =
  | { phase: "idle" }
  | { phase: "recording"; elapsedMs: number; level: number; silenceCountdownMs?: number }
  | { phase: "draft"; sentences: Sentence[]; transcribing: { done: number; total: number } | null }
```

`transcribing` is non-null while later chunks are still decoding, and
null when all chunks have completed. The user can edit and ✕-discard
sentences as soon as they appear; ✓ Add as is *disabled* while
`transcribing !== null` to prevent committing a partial transcript.
✕ Discard is always enabled — useful for a long capture the user
regrets mid-decode.

Sentence shape: `{ id: string; text: string; chunkIndex: number }`.
`id` is a stable monotonic value so React/Preact can re-key on edit
without losing focus on the contenteditable element.

### Worker plumbing

Both workers from the original Listen feature return, unchanged in
architecture but called via a leaner contract:

- `public/stt-gpu-worker.js` — WebGPU-primary, used when `"gpu" in
  navigator`.
- `src/models/sttWorker.ts` — WASM fallback. Custom STFT/mel pipeline
  (FFT-512, Slaney mel norm, log10 rescale) — keep as-is per the
  re-implementation hints in #233.

The worker protocol drops `partial` streaming messages. The new
contract is a single `transcribe` request with a chunked-audio payload
and a single `transcribed` response per chunk:

```
// main -> worker
{ type: "transcribe", chunkId: number, pcm16k: Float32Array, language: string }

// worker -> main
{ type: "transcribed", chunkId: number, text: string }
{ type: "error", chunkId?: number, message: string }
```

`language` is the active caregiver locale from `settingsStore`
(e.g. `"en"`, `"es"`, `"zh"`). The worker resolves the matching
`<|xx|>` Whisper language token at decode time; unsupported locales
fall back to `<|en|>`. Language is sent per-`transcribe` rather than at
init so the caregiver can change languages between captures without
restarting the worker.

Each chunk decode runs to completion before emitting `transcribed`. No
`requestId` keying needed; only one capture session is in-flight at a
time. No-speech detection (`<|nospeech|>` softmax threshold 0.6) still
applies per chunk; chunks that hit the threshold emit `{ text: "" }`,
which the main thread drops on the floor.

### Audio capture

Reuse `public/audio-capture-worklet.js` from the original (43 lines,
unchanged). The main-thread hook accumulates 128-frame chunks into a
single `Float32Array[]` until stop, then slices into ceiling
(`total_samples / (30 * 16000)`) non-overlapping 30-second chunks
(`pcm16k` at 16 kHz).

Memory budget: 16 kHz × 4 bytes/sample × 60s = 3.84 MB per minute. A
10-minute capture is ~38 MB — within iPad memory headroom but worth a
soft cap of 15 minutes (`MAX_CAPTURE_MS = 15 * 60_000`) that ends the
session with a user-visible toast.

### Chunking, sentence segmentation, dispatch

After stop:

1. Slice audio into 30s chunks. Final chunk may be < 30s (pad to 30s
   with zeros; Whisper handles trailing silence).
2. Dispatch chunks to the worker in `chunkIndex` order. Receive
   `transcribed` per chunk.
3. For each completed chunk text, run sentence segmentation
   (`src/utils/sentenceSegment.ts`, new):
   - Regex split on `[.!?。！？]+(\s+|$)` for Latin + CJK punctuation.
   - For Arabic, also match `؟`.
   - Trim, drop empties.
   - If no boundaries found in the chunk text, treat the whole chunk
     text as one sentence.
4. Append the resulting sentences to the draft's `sentences` array,
   preserving chunk order.

Cross-chunk sentence boundaries (a sentence split across the 30s
boundary) will produce two fragments; v1 leaves them as two short
adjacent sentences in the draft. The clinician can edit one and ✕ the
other if needed. A future v1.1 may overlap chunks by 5s and dedupe; out
of scope here.

### Editing model

`DraftSentence.tsx` renders each sentence as a contenteditable `<div>`.
Tap toggles the row into edit mode (focused contenteditable, slightly
brighter background). Tap outside or press Enter commits the edit to
the in-memory sentence state. Tap ✕ removes the sentence from the
array. There is no diff tracking, no undo within edit mode; the local
edit is the new source of truth.

Accessibility: each draft row gets `role="textbox"`, `aria-label`
"Edit sentence {n} of {total}", and the ✕ gets `aria-label` "Discard
sentence {n}". Touch targets: row is full-width 64px tall minimum; ✕
is 44×44px (smaller than the 64px patient-facing standard — see
`DESIGN_GUIDELINES.md` — but acceptable since this is a clinician
surface, not a patient surface).

### Commit / split-on-add

✓ Add iterates the remaining draft sentences and posts each as a
`PROVIDER_MESSAGE` via `conversationStore.addMessage()`, with:
- `text: sentence.text`
- `actor: "provider"`
- `providerName: uiStore.activeProvider`
- `time: captureStopTime` (same for all sentences from one capture)
- `via: "mic"`

A single `THREAD_COMPOSE` audit event is logged per sentence — same
event type as typed messages, with a new `VIA` attribute set to `mic`
or `typed`. This preserves the per-message audit trail without
expanding the event taxonomy.

### State machine boundaries

The Listen state lives in `ListenPill`'s local component state, not in
`uiStore`. Reasons:
- Only one place renders Listen UI, so there are no other consumers of
  the state.
- Recording state should not persist across unmounts (closing the
  conversation tab while recording must end the capture).
- The active provider, which Listen reads, already lives in `uiStore`.

Force-cleanup on unmount: the hook returns a cleanup function that
releases the `MediaStream` and terminates the worker `transcribe`
in-flight, if any. No "pending flush" bookkeeping from v1 is needed —
because there's no auto-submit on stop, an in-progress transcription
that loses its component lifecycle has nothing to commit to.

## Boot wiring

Restore `bootSTT()` and `bootSTTWasm()` in `src/models/bootModels.ts`,
mirroring the v1 architecture (GPU-first with WASM fallback on init
failure). Restore the `"stt"` entry in `models-manifest.json` for the
Whisper small q4 files. Restore the `MODEL_URLS.stt` and `"stt"`
member of `ModelId` union.

`bootBackgroundModels()` becomes the parallel boot path for STT (LLM
was removed in #234 and is not coming back; STT no longer needs to
parallelize with it, but the function name stays for future flexibility).

The `_headers` block for `/stt-gpu-worker.js` returns
(`Cross-Origin-Embedder-Policy: credentialless`,
`Cross-Origin-Resource-Policy: same-origin`).

`scripts/download-assets.sh` restores its Whisper section.

## What's smaller than v1

Concrete deletions or absences vs. the original Listen feature, all
deliberate:

- No `ListenPanel.tsx` (~375 lines) — replaced by `ListenPill.tsx`,
  `DraftBubble.tsx`, `DraftSentence.tsx`, `DraftActions.tsx` totalling
  an estimated ~250 lines.
- No five-state readiness state machine in the UI. Listen pill renders
  disabled if `mgr.status("stt") !== "warm"`; that's the only readiness
  signal.
- No "Try again" recovery prose. On worker error, the draft surfaces a
  one-line message with a single "Try again" button that re-dispatches
  the failed chunks. No five priority-chained aria-labels.
- No editable transcript textarea — replaced by per-sentence
  contenteditable rows.
- No provider chip-row selector inside the Listen surface; the active
  provider is read from `uiStore`.
- No `THREAD_TRANSCRIBED` audit event; `THREAD_COMPOSE` gains a `VIA`
  attribute.
- No PWA `?overlay=listen` deep-link; Listen has no overlay state to
  link to.
- No `listen` entry in `OverlayName`, no `listenOpen` field, no overlay
  reset in `closeAllOverlays`.
- Locale strings: roughly half of v1's, since the readiness countdown
  prose and editable-transcript copy are both gone. Estimated namespace:
  `ui.thread.listen.{idle_label, recording_label, stop_label,
   silence_warning, transcribing_label, draft_label, sentence_edit_aria,
   sentence_discard_aria, add_as, discard, error_message, try_again}`.
- The worker protocol drops `partial`/`requestId` keying.

The custom WASM Whisper preprocessor (Slaney mel norm, log10 rescale,
FFT-512) stays as-is. The dual GPU+WASM worker pattern stays. These
were called out in #233's re-implementation hints as load-bearing.

## Files

New:
- `src/components/conversation/ListenPill.tsx` + test
- `src/components/conversation/DraftBubble.tsx` + test
- `src/components/conversation/DraftSentence.tsx` + test
- `src/components/conversation/DraftActions.tsx` + test
- `src/hooks/useListenSession.ts` + test
- `src/hooks/useMicrophone.ts` + test (restored from #233 archive,
  but trimmed: no pending-flush bookkeeping)
- `src/utils/sentenceSegment.ts` + test
- `src/models/sttWorker.ts` + test (restored from #233 archive)
- `public/stt-gpu-worker.js` (restored from #233 archive)
- `public/audio-capture-worklet.js` (restored from #233 archive,
  unchanged)

Modified:
- `src/components/conversation/Thread.tsx` — mount `ListenPill` at
  bottom-left
- `src/stores/conversationStore.ts` — accept `via?: "mic" | "typed"`
  on `addMessage()`
- `src/audit/events.ts` — `THREAD_COMPOSE` event gains a `VIA`
  attribute (string)
- `src/models/bootModels.ts` — restore `bootSTT()` / `bootSTTWasm()`,
  re-add `stt` to background boot
- `src/models/modelsManifest.ts` — restore `"stt"` in `ModelId`
- `src/models/types.ts` — restore `MODEL_URLS.stt`
- `public/models-manifest.json` — restore `models.stt` block
- `public/_headers` — restore `/stt-gpu-worker.js` block
- `scripts/download-assets.sh` — restore Whisper section
- All 24 locale files — add `ui.thread.listen.*` namespace (smaller
  than v1's namespace, see above)
- `src/audit/workflows/modelPriming.test.ts` — restore STT fixtures

## Out of scope / future

- Patient/family-initiated capture (deferred — consent issues in
  clinical setting).
- Streaming partial decodes during a chunk (each chunk decodes
  atomically in v1).
- Cross-chunk sentence boundary repair (5s overlap with dedup).
- Clinician-side phrase tiles for the 80% of bedside utterances.
- "Recording > 5 min" soft warning.
- Per-sentence audio scrubbing or playback in the draft.

## Open questions for implementation

1. Sentence segmentation for languages without sentence-ending
   punctuation in Whisper output (e.g., Thai if we ever add it). Out of
   scope for v1; revisit if/when the locale list expands.
2. Should the draft persist across a thread re-mount (e.g., tab switch
   before commit)? v1 says no — keep state local. Revisit if user
   testing shows frustration with lost drafts.
3. Should errors on individual chunks discard the whole draft or just
   that chunk? v1 says: keep successfully-transcribed sentences, show a
   "{n} sentences couldn't be transcribed — try again or commit what
   you have" line above the actions.
