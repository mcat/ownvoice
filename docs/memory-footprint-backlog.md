# Memory Footprint Backlog

Living catalogue of pending and proposed memory-pressure improvements for the
in-patient AAC PWA. The motivating constraint is iPad Pro M5 Safari's renderer
ceiling: the app holds ~1.5 GB of concurrent on-device model weights during
boot (GPU TTS sessions ~913 MB, STT sessions ~300 MB, speech encoder ~291 MB
during enrollment) which has periodically crashed the renderer process.

## How to use this document

1. **Pick items based on evidence, not speculation.** PR #272 shipped the
   memory-crash tombstone (`?memdiag=true`) which writes a lifecycle-stage label
   to `localStorage` on each boundary. After an iPad crash, the surviving label
   tells us which boundary tripped the ceiling. Map the stage to a tier item in
   the [decision tree](#decision-tree-tombstone-to-fix) at the bottom of this
   document.
2. **Respect the discipline.** Per [[feedback_diagnostic_discipline]] in
   auto-memory: shipping speculative fixes for iPad memory bugs compounds into
   expensive iteration loops. The 2026-05-12 COEP debug session ran seven PRs
   in sequence because each predicate hadn't been falsified before deploy.
   Before opening a PR for any item below, write down the hypothesis as a
   falsifiable claim and the test that would falsify it. If you can't write the
   test, you don't have a hypothesis — you have a guess.
3. **Tier ordering reflects risk, not impact.** Tier 2 items are
   safe-by-construction (lifecycle work, no behavior change in the common
   path). Tier 3 items are structural changes that could regress audio quality
   or correctness. Tier 4 items adapt at runtime. Tier 5 is blocked on external
   dependencies. The impact column is the *upper bound* — actual savings
   require the named mechanism to be the active peak.

## Status

| | Item | PR | Shipped |
|---|---|---|---|
| 1.1 | Skip Cangjie5 on non-zh sessions | #273 | ✅ |
| 1.2 | Discard tokenizer JSON | — | Audited out (engine GCs the function-local already) |
| 1.3 | Free ORT tensor handles in `handleEmbed` | — | Audited out (local scope handles it) |
| 1.4 | Trim large `console.log` payloads | — | Audited out (already bounded) |
| 1.5 | Bound `useThreadView` at 500 entries | #273 | ✅ |
| — | Memory-crash tombstone (diagnostic) | #272 | ✅ |
| — | Skip WASM TTS warmup when all patients enrolled | #272 | ✅ |

Everything below this line is open.

---

## Tier 2 — Lifecycle and safe wins

Items in this tier change *when* or *whether* work runs, not the work itself.
Behavior is preserved on the common path; trade-offs (if any) are small
latency hits in specific flows.

### 2.1 — Release GPU TTS conditional_decoder after pre-gen completes

**Mechanism.** The conditional_decoder weights are 540 MB — the largest single
GPU TTS session. After pre-gen finishes for the active patient, live taps hit
the audio cache; the decoder is only needed for cache misses (sentence builder,
novel phrases). Send a `release-decoder` message that frees the session, and
re-init on next live-synth need. To avoid the `webgpuRegisterBuffer` race that
the existing source-level test guards against (`ttsGpuWorker.source.test.ts`
~L115), prefer **terminate-and-respawn the whole worker** rather than
mid-life session release.

- **Impact:** ~540 MB (largest single line item)
- **Risk:** Med-High — race-prone mid-life release per existing test comments; worker respawn safer but pre-gen pause window grows
- **Effort:** M
- **Falsifier evidence:** tombstone shows `synth:gpu:N` or post-pre-gen crashes; or `?bench=true` shows steady-state heap rising after pre-gen completes

### 2.2 — Lazy-spawn WASM TTS worker until first enrollment

**Mechanism.** `bootTTSWasm()` runs eagerly from `App.tsx` even when GPU TTS is
healthy. Its only steady-state contribution is the enrollment path
(`handleEmbed`). Spawn it on demand when `VoiceCapture` is about to fire an
embed; reuse for subsequent enrollments in the same session.

- **Impact:** ~tens of MB (ORT WASM runtime baseline + tokenizer load)
- **Risk:** Low-Med — first enrollment ~1s slower due to worker spawn
- **Effort:** M
- **Falsifier evidence:** tombstone shows `boot:tts-wasm-init` or `boot:tts-wasm-ready` is the last live stage on a non-enrolling session

### 2.3 — Sequence STT → GPU TTS boot

**Mechanism.** `App.tsx` currently fires `bootSTT()` and `initGPU()` in
parallel. Both download/init concurrently, doubling the boot-window peak.
Sequence: wait for STT ready, then kick GPU TTS. Listen pill stays fast (STT
finishes ~30s either way); first-cached-phrase delays by GPU TTS time.

- **Impact:** Peak window only — no steady-state savings
- **Risk:** Low; only affects the cold-boot peak shape
- **Effort:** S
- **Falsifier evidence:** tombstone shows a `boot:*-ready` stage; comparing peak memory before/after sequencing on the same device

### 2.4 — Auto-respawn GPU TTS after `handlePostInitCrash`

**Mechanism.** The GPU worker's `onerror` post-init currently rejects every
in-flight synth and leaves the worker dead. Add a bounded retry: respawn the
worker and call `initGPU` again. Caps retries to avoid infinite loops if the
crash is deterministic.

- **Impact:** Resilience, not footprint reduction — but turns a renderer-OK
  worker crash into a user-invisible recovery
- **Risk:** Low — same code path as initial init
- **Effort:** S
- **Falsifier evidence:** worker-level OOM (not page-level OOM) observed in production. PR #272's diagnostic helps distinguish these.

### 2.5 — Defer `verifyAllOnBoot` + `drivePrimer` until workers settle

**Mechanism.** Both run in parallel with worker boot in `App.tsx` useEffect.
Verification is cheap; the primer can pile substantial network + write work
on top of an already-saturated boot window if the device hasn't primed yet.
Sequence after STT+TTS ready.

- **Impact:** Peak window only
- **Risk:** Low — trade-off: "Prepare for offline" status delays by worker boot duration
- **Effort:** S
- **Falsifier evidence:** tombstone shows `boot:stt-init` or `boot:tts-gpu-init` is the active stage during peak

### 2.6 — Clear `pendingVoiceBlob` after enrollment succeeds

> Surfaced during Tier 1 audit (was N5 in the ideation)

**Mechanism.** `Patient.pendingVoiceBlob` (per `src/types.ts`) is a base64
WebM audio blob captured during enrollment. CLAUDE.md describes it as
*"Persists until extraction succeeds. Cleared by clearPatientPendingVoiceBlob
or by Settings → Reset all data."* Audit the enrollment success path to
confirm `clearPatientPendingVoiceBlob` runs, and clear unconditionally after
`speakerData` is populated. Each stale blob persists across boots (it's in
`settingsStore` → IDB) and reloads into the JS heap on every session start.

- **Impact:** ~MB × stale-blob count. Multi-patient device with stale blobs is a real heap hit on every boot.
- **Risk:** Low — defensive cleanup of dead state
- **Effort:** S
- **Falsifier evidence:** inspect `settingsStore.cfg.patients[*].pendingVoiceBlob` on a returning device that has completed enrollment; non-null = bug

### 2.7 — Bound `audioCacheStore.runs[*].failedPhrases`

> Surfaced during Tier 1 audit (was N2 in the ideation)

**Mechanism.** Each speaker entry in the audio-cache run store carries a
`failedPhrases` array for retry tracking. After a successful retry pass, the
array should be empty. Audit whether the cleanup runs; add an explicit reset
on `finish()` if not. Same shape as PR #273's thread-view cap pattern: live
state that grows during a session.

- **Impact:** <1 MB likely, but unbounded in theory
- **Risk:** Low
- **Effort:** S
- **Falsifier evidence:** read `useAudioCacheStore.getState().runs` on a device that's run pre-gen + retries; non-empty `failedPhrases` after a successful run = bug

### 2.8 — Audit other live subscribers / stores for unbounded growth

> Surfaced during Tier 1 audit (was N3 in the ideation)

**Mechanism.** PR #273's thread-view cap was found by reading
`useThreadView`. Other places that might have the same shape (live append
without cap):

- `engineOutcomes` ring buffer (claimed bounded at 20 — verify)
- `useOfflineStore.verified` (bounded by `ModelId` enum — small, likely fine)
- Audit recovery `onAbandoned` callback list
- Any `subscribe(...)` usage that pushes to React state without a slice

This is an investigation task; concrete fixes would be folded back as
sub-items. No-op if everything turns out to be bounded.

- **Impact:** Variable
- **Risk:** Low (investigation only)
- **Effort:** S

---

## Tier 3 — Structural changes

Items in this tier change the shape of data or the inference path. Higher
blast radius; require model-quality / persistence-migration validation.

### 3.1 — Hold speaker data as `Float32Array` in memory; JSON-serialize only on IDB write

**Mechanism.** `Patient.speakerData` (`condEmb`, `speakerEmbeddings`,
`speakerFeatures`) is stored as `number[]` because `src/stores/idbStorage.ts`
is a string-based `StateStorage` and Zustand goes through `JSON.stringify`
(see [[project_speaker_data_number_array]] in auto-memory). Two paths:

(a) Switch persistence to a structured-clone IDB scheme; hold `Float32Array`
natively in both memory and IDB. Migration needed for existing installs.

(b) Hold `Float32Array` in memory; convert to `number[]` only at the
serialize boundary. Cheaper migration but mixed-representation code.

This change unlocks [3.6](#36--wasm-speech_encoder-transferable-load-path) and
the per-synth transferable optimization (formerly N1 in the ideation): if
speakerData is already `Float32Array`, the per-synth `postMessage` can
transfer the `ArrayBuffer` (zero-copy) instead of structured-cloning a
`number[]` (full copy + GC churn) on every pre-gen synth. For 700-phrase
pre-gen, this eliminates 700× ~MB copies and the associated GC pressure.

- **Impact:** ~5-10 MB × patient count steady-state + per-synth allocation
  churn during pre-gen (cumulative MB/sec)
- **Risk:** Med — touches persistence; migration needed
- **Effort:** M
- **Falsifier evidence:** tombstone shows `embed:array-from` or peak heap during pre-gen runs

### 3.2 — Compact pre-gen audio via Opus encoding

**Mechanism.** Pre-gen output is currently Int16 PCM at 24 kHz (~96 KB/sec)
in OPFS. Opus would compress ~10× at near-imperceptible quality loss for
speech. Hot cache footprint and OPFS quota both shrink. Per-tap path needs an
Opus decoder.

- **Impact:** Disk + hot-cache only (~MB savings, not GB) — Float32 decode peak per tap
- **Risk:** High — per-tap decoder cost on the user's critical latency path; might violate the "feels instant" tap budget
- **Effort:** L
- **Falsifier evidence:** measure tap latency on iPad with Opus decode in path; if < 50 ms p95, OK

### 3.3 — Tear down + respawn GPU TTS worker every N pre-gen phrases

**Mechanism.** Cumulative drift in WebGPU device state or ORT WASM heap may
accumulate over a 700-phrase pain-matrix pre-gen run. Periodic restart every
M phrases keeps fresh allocations.

- **Impact:** If H6 (cumulative drift) is the real peak, significant
- **Risk:** Med — worker-init cost (~10-30s) per restart; pre-gen pause window
- **Effort:** M
- **Falsifier evidence:** tombstone consistently shows `pregen:patient:N/M` deep in a run (e.g., N > 400 for a 702-phrase pass)

### 3.4 — Streaming inference for conditional_decoder

**Mechanism.** Currently the full decoder Conv stack runs over all speech
tokens in one shot, producing a single large waveform output tensor. Chunk
the input + concatenate outputs to reduce the transient buffer peak.

- **Impact:** Transient peak only — doesn't touch fixed weights
- **Risk:** High — model surgery; output continuity at chunk boundaries
- **Effort:** L

### 3.5 — Quantize conditional_decoder to fp16 or int8

**Mechanism.** Full precision today (540 MB). fp16 weights → ~270 MB; int8 →
~135 MB. Quality cost unknown for this specific export; the existing
`language_model_q4` swap (PR #19) is precedent for in-tree quantization.

- **Impact:** **~270-405 MB** (largest single potential reduction)
- **Risk:** High — audio quality regression possible; needs A/B + listening tests
- **Effort:** L
- **Falsifier evidence:** A/B audio comparison on a representative phrase set with a clinical reviewer

### 3.6 — WASM speech_encoder transferable load path

> Surfaced during Tier 1 audit (was N6 in the ideation)

**Mechanism.** `createSession` fetches the 291 MB encoder as `ArrayBuffer`
then passes it to ORT (`ort.InferenceSession.create(modelData, opts)`). If
ORT retains a reference (or copies) rather than taking ownership, both
buffers exist momentarily — 2× ~291 MB. Verify ORT's load semantics; if it
copies, either transfer ownership explicitly or stream the load to avoid the
intermediate buffer.

- **Impact:** Up to ~291 MB transient during encoder load (a stage label
  PR #272 emits as `embed:encoder-load`)
- **Risk:** Med — depends on ORT internals; needs verification
- **Effort:** M
- **Falsifier evidence:** tombstone shows `embed:encoder-load` is the last
  live stage; or heap inspection of ORT's load semantics

---

## Tier 4 — Memory-pressure responsiveness

Items in this tier adapt to runtime conditions or fail more gracefully under
pressure. No static reduction; smaller blast radius for users on
well-provisioned devices.

### 4.1 — `navigator.deviceMemory`-gated eager pre-gen

**Mechanism.** Skip the pain matrix (702 phrases, GPU-only) on
`navigator.deviceMemory < 8`. iPad reports 8 (capped), so this is
defense-in-depth for hypothetical lower-tier devices.

- **Impact:** None for current iPad target; future-proofing
- **Risk:** Low
- **Effort:** S

### 4.2 — Backoff pre-gen on `visibilitychange: hidden`

**Mechanism.** If the user tabs away or backgrounds the PWA during pre-gen,
pause the runner until visible again. Doesn't reduce footprint but reduces
background contention (which on iPad can interfere with foreground apps and
trigger memory pressure events).

- **Impact:** None directly; behavior smoothing
- **Risk:** Low — `audioCacheRunner` already has `pauseAll` / `resumeAll`
- **Effort:** S

### 4.3 — Detect Safari and force WASM-only conditional_decoder

**Mechanism.** The decoder runs on WebGPU with WASM fallback. On Safari/iPad
the WebGPU path may hold GPU buffers that contribute to renderer pressure.
Force `wasmOnly=true` on Safari to free GPU VRAM at the cost of CPU time.
Original 2026-04 comment in `tts-gpu-worker.js` notes the historical
WASM-only stance; modern ORT may have closed the artifact gap.

- **Impact:** ~200-400 MB GPU VRAM freed; CPU synth slower
- **Risk:** High — perf regression on the synth path
- **Effort:** M
- **Falsifier evidence:** measure RTF on Safari with WASM-only decoder; tombstone shows GPU-side crashes

### 4.4 — Inspect WebGPU adapter limits at init

> Surfaced during Tier 1 audit (was N4 in the ideation)

**Mechanism.** The conditional_decoder weight buffer (540 MB) is right at the
iPad WebGPU `maxBufferSize` ceiling. If a future iPadOS tightens the limit,
the decoder load fails silently and the engine degrades to WASM. Probe
`adapter.limits.maxBufferSize` at init: if below the model's requirement,
refuse the load deterministically and degrade to Web Speech with a clear
diagnostic instead of silent WASM fall-through.

- **Impact:** Diagnostic/resilience, not static reduction
- **Risk:** Low
- **Effort:** S

---

## Tier 5 — Blocked on external dependencies / future research

Items here aren't actionable today; they need an external change (browser
API, model release, or research result). Re-check periodically.

### 5.1 — `measureUserAgentSpecificMemory()` in Safari

**Status as of 2026-05-15.** Not shipped in Safari 26. See
[[project_safari_memory_apis]] in auto-memory for the full constraint. When
shipped, it replaces the localStorage tombstone (PR #272) with real
quantitative heap measurement. Watch WebKit bug tracker.

### 5.2 — Smaller Chatterbox variant (Mini / distilled)

**Status as of 2026-05-15.** Per [[project_chatterbox_shared_encoder]]:
*Chatterbox Turbo and Multilingual share an encoder architecture; no smaller
cousin escape hatch.* A model swap is a Phase-4-scale full-stack change. Track
upstream Resemble AI releases; re-evaluate when a smaller multilingual variant
with comparable cloning fidelity ships.

### 5.3 — Whisper tiny / distil-whisper

**Status as of 2026-05-15.** Whisper tiny (~75 MB encoder+decoder vs. ~300 MB
for small) saves 225 MB at the cost of transcription accuracy. distil-whisper
is the closer-quality option (~140 MB) but ONNX export coverage is uneven.
Worth a feature-flag A/B if STT accuracy requirements ever allow.

### 5.4 — `SharedArrayBuffer` for cross-worker speakerData

**Status as of 2026-05-15.** Requires `crossOriginIsolated` (we already have
COOP+COEP per [[project_ipad_safari_coep_requirements]]). Would enable
zero-copy access to `Float32Array`-backed speakerData across the main thread
and TTS workers, stacking on top of Tier 3.1 + transferable-postMessage. SAB
semantics introduce concurrency hazards; needs careful design. Defer until
3.1 lands and pre-gen postMessage churn is the measured bottleneck.

---

## Decision tree (tombstone-to-fix)

Once the iPad reports a `DIAG_PREVIOUS_CRASH` audit event, map the recorded
stage to the most likely tier item. This is the chart to consult before
opening a follow-up PR.

| Tombstone stage | Most likely cause | First fix to try |
|---|---|---|
| `boot:tts-gpu-init` / `:ready` | Concurrent boot peak; shader compile + model byte load | 2.3 (sequence STT→TTS) + 2.5 (defer primer) |
| `boot:tts-wasm-init` / `:ready` / `:warm` | WASM TTS warmup overlap (this PR #272 already mitigates when patients enrolled) | 2.2 (lazy-spawn) |
| `embed:start` / `:encoder-load` | Speech encoder overlap on top of GPU TTS sessions | 3.6 (transferable load) + 2.2 (lazy-spawn) |
| `embed:infer` | Encoder run consumes peak during enrollment | 3.6 + potentially 4.4 |
| `embed:array-from` | `number[]` boxing peak vs. Float32Array source | 3.1 (Float32Array in memory) |
| `synth:gpu:N` (never reaching `:done`) | KV-cache balloon on a long phrase | 2.1 (release decoder) + 3.4 (streaming decoder) |
| `pregen:patient:N/M` deep in a run (N > 400) | Cumulative drift over many phrases | 3.3 (periodic worker recycle) |
| `boot:` early or no `DIAG_PREVIOUS_CRASH` event despite reload | Renderer-level OOM on cold load | 3.5 (quantize decoder) — biggest static reduction |
| Multiple different stages on repeated crashes | Race or threshold-effect, not deterministic | Stop. Re-check [[feedback_diagnostic_discipline]] before iterating. Get more data. |

If the tombstone-to-fix mapping isn't obvious for an observed stage, **don't
guess**. Surface the stage in a fresh advisor call with the surrounding
context before opening a PR.
