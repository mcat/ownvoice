# Voice clone status line — design

**Date:** 2026-05-09
**Driver:** Caregiver looking at Settings → Edit Patient sees only "✅ Voice captured" — no signal about whether the patient's voice clone is *actually live*, still loading, silently falling back, or has crashed. The truth is currently spread across three surfaces (`VoiceCapture`'s `CloneStatusBadge`, `VoiceCacheProgress`'s per-run rows, and what `speak()` selects at tap time), and after a page reload the audio-cache store is empty by design (`audioCacheStore.ts:8`), so most surfaces render `null`.

## Goal

A single status line under the green "Voice captured" row in `PatientInfoSection` that always answers: **"What will the patient be heard as right now?"** — with a Retry affordance when the clone is unavailable.

## Non-goals

- Live engine-truth indicator that subscribes to `speak()` outcomes per tap. Useful for telemetry, but oscillates per utterance and doesn't belong in steady-state readiness.
- Restructuring `VoiceCapture` itself — its mic/recording flow stays put.
- Provider voice rows in `CareTeamSection` — the same component will plug in there, but as a deliberate follow-up so the diff stays focused (see Follow-ups).

## Component: `<VoiceCloneStatus>`

**Location:** `src/components/settings/VoiceCloneStatus.tsx`. Replaces `VoiceCacheProgress.tsx` and the in-file `CloneStatusBadge` function inside `VoiceCapture.tsx`.

**Props:**
```ts
interface Props {
  speakerKey: SpeakerKey;             // patient:<id> | patient:<id>:pain | provider:<n>
  speakerLabel: string;               // "Patient" / "Pain descriptions" / provider name
  cloneStatus: VoiceCloneStatus;      // forwarded from VoiceCapture via callback
  speakerData: SpeakerData | null;
  fallbackVoiceLabel: string | null;  // human-readable Web Speech voice name
  cfg: AppSettings;
  phraseCorpus: "core" | "pain";      // which phrase list drives reconciliation
  onRetryExtraction?: () => void;     // hooked to VoiceCapture.retryEmbedding
}
```

**State machine.** Exactly one row renders at a time. Selection order is top-to-bottom; first match wins.

| # | Condition | Render | Retry? |
|---|---|---|---|
| 1 | `cloneStatus === "extracting"` | ⏳ "Extracting voice clone…" | — |
| 2 | `cloneStatus === "model-loading"` | ⏳ "Loading TTS model — {countdown}" | — |
| 3 | `cloneStatus === "failed"` | ⚠️ "Clone unavailable — using backup{ · {fallbackName}}" | Retry → `onRetryExtraction()` |
| 4 | `run?.status === "failed"` | ⚠️ "Some phrases failed ({n}) — using backup" | Retry → `audioCacheRunner.retryFailed(cfg, key)` + Discard |
| 5 | `run?.status === "running"` or `"paused"` | ⏳/⏸ "Preparing {cur}/{total}…" + progress bar | Pause/Resume + Discard (existing behavior, migrated) |
| 6 | `run?.status === "queued"` | ⏳ "Queued for {speakerLabel} — {total} phrases" | — |
| 7 | `run?.status === "done"` | ✅ "Voice clone ready · all {total} phrases · quality: {label}" | — |
| 8 | `!run` and reconciler resolved `cached === phrases.length` | ✅ "Voice clone ready · {total} phrases · quality: {label}" | — |
| 9 | `!run` and reconciler resolved `0 < cached < phrases.length` | ⏸ "Voice clone partly prepared — {cached}/{total}" | Resume → `audioCacheRunner.resumeAll(cfg)` + Discard |
| 10 | otherwise | hidden (mic/idle UI in `VoiceCapture` leads — and if a runner kick is missing, that's a runner bug, not a UI fallback) | — |

Rows 4–6, 9 carry the Pause / Resume / Discard / Retry controls that today live inside `VoiceCacheProgress`. The destructive-confirm step for Discard moves with them; visual treatment unchanged.

## Reconciliation strategy

**Why needed.** `audioCacheStore.runs` is intentionally in-memory (drift hazard with OPFS). On reload, the store is empty even though OPFS may hold all pre-generated audio. Without reconciliation, rows 8–9 never render and the caregiver thinks setup hasn't happened.

**When.** Once on mount, per `<VoiceCloneStatus>` instance, gated by:
- `!run` (already tracked → skip)
- `speakerData != null` (no embedding → no fingerprint → can't reconcile)

**How.**
```ts
useEffect(() => {
  if (run) return;
  if (!speakerData) return;
  let cancelled = false;
  (async () => {
    const phrases = phraseCorpus === "pain"
      ? getPainPhrasesForLocale(cfg.patientLang)
      : getAllSpeakablePhrases(cfg);
    if (phrases.length === 0) return;
    const cached = await countCached(phrases, speakerData);
    if (cancelled) return;
    const fp = embeddingFingerprint(speakerData);
    const locale = cfg.patientLang;
    if (cached === phrases.length) {
      // All cached → seed as queued, immediately finish → status "done".
      store.queue(speakerKey, phrases.length, locale, fp);
      store.finish(speakerKey);
    } else if (cached > 0) {
      // Partial → seed as queued, set progress, then mark paused so the
      // existing Resume affordance is offered. Runner remains authoritative
      // once the user taps Resume.
      store.queue(speakerKey, phrases.length, locale, fp);
      store.progress(speakerKey, "", cached);
      store.pauseAllRuns();
    }
    // cached === 0 → leave run empty; row 10 may render to kick the runner.
  })();
  return () => { cancelled = true; };
}, [run, speakerData, speakerKey, phraseCorpus]);
```

This is the *only* reconciliation point. One `countCached` per mount, no per-render cost (its dependency list excludes `cfg.patientLang` because the speaker fingerprint already changes with locale).

## Quality label rendering

`speakerData.quality` already carries a numeric score plus tier. The status line consumes the existing `qualityLabel(quality)` helper used today by the saved-state badge — we reuse, not rebuild, so calibration changes (per `voice-quality-recalibration` skill) propagate automatically.

If `speakerData.quality` is undefined (legacy speaker), omit the `· quality:` suffix; the row reads "Voice clone ready · all 12 phrases ready" with no quality fragment.

## Retry semantics

- **Row 3 (extraction failed):** Retry calls `onRetryExtraction()`, which `PatientInfoSection` wires to `VoiceCapture`'s existing `retryEmbedding` flow. `VoiceCapture` exposes it through a callback prop (preferred over a ref so we don't break Preact's render tree).
- **Row 4 (pre-gen failed):** Retry calls `audioCacheRunner.retryFailed(cfg, speakerKey)`. Existing call site is preserved — we're moving the JSX, not changing the action.
- **Row 9 (partial after reload):** Resume calls `audioCacheRunner.resumeAll(cfg)`. Same affordance as today's paused row.

## File-level changes

| File | Action |
|---|---|
| `src/components/settings/VoiceCloneStatus.tsx` | **new** — component + reconciler |
| `src/components/settings/VoiceCloneStatus.test.tsx` | **new** — Vitest |
| `src/components/settings/VoiceCacheProgress.tsx` | **delete** — content migrates into VoiceCloneStatus |
| `src/components/settings/VoiceCacheProgress.test.tsx` | **delete** — tests rewrite into VoiceCloneStatus.test |
| `src/components/shared/VoiceCapture.tsx` | remove `CloneStatusBadge` and its render. Add `onCloneStatusChange?: (s: VoiceCloneStatus) => void` and `onRetryEmbeddingRequest?: () => void` props. Keep green "Voice captured" row, audio playback, Remove. |
| `src/components/settings/sections/PatientInfoSection.tsx` | replace the two `<VoiceCacheProgress>` rows with two `<VoiceCloneStatus>` rows (core + pain). Lift `cloneStatus` into local state via the new callback. |
| `src/components/settings/sections/CareTeamSection.tsx` | **untouched** in this PR — see Follow-ups |
| `src/data/locales/en.ts` | new keys for the unified states; keep old `voice_cache.*` keys for now (CareTeam still uses the old `VoiceCacheProgress`-shaped wording until the follow-up) |
| `src/stores/audioCacheStore.ts` | **untouched** — schema unchanged |

## Localization

New phrase keys under `ui.provider.settings.voice_clone_status.*`:
- `extracting`
- `model_loading`           (interpolates `{countdown}`)
- `extraction_failed`       (interpolates `{fallback}` — empty when none)
- `pregen_failed`           (interpolates `{count}`, `{plural}`)
- `running`                 (interpolates `{current}`, `{total}`)
- `paused_partial`          (interpolates `{cached}`, `{total}`)
- `queued`                  (interpolates `{label}`, `{total}`, `{plural}`)
- `done_full`               (interpolates `{total}`, `{quality?}`)
- `done_no_quality`         (interpolates `{total}`)

Plus button labels: `retry`, `resume`, `pause`, `discard`. (Reuse existing `voice_cache.*` button keys where possible to avoid drift.)

`en.ts` is the only locale touched in this PR; existing per-locale tables get the new keys via the standard "translate new locale keys" pass that lands in a follow-up commit (precedent: PR #211).

## Tests

`VoiceCloneStatus.test.tsx`:
- One test per row in the state-machine table — assert correct text and that *exactly one* row renders.
- Reconciliation:
  - all cached → `store.queue` + `store.finish` fired with correct args.
  - partial → `queue` + `progress` + `pauseAllRuns` fired.
  - none cached → no store mutation.
  - speakerData null → `countCached` not called.
- Retry interactions:
  - Row 3 click → `onRetryExtraction` called once.
  - Row 4 click → `audioCacheRunner.retryFailed` called with `(cfg, speakerKey)`.
  - Row 9 Resume click → `audioCacheRunner.resumeAll(cfg)`.
- Discard confirm step renders + cancel/confirm both work (migrated from existing tests).

`VoiceCapture.test.tsx`:
- New `onCloneStatusChange` prop is invoked with the right enum values across the existing extracting/model-loading/ready/failed transitions.
- The old `CloneStatusBadge` assertions are deleted; nothing else regresses.

`PatientInfoSection.test.tsx`:
- After mount with a speaker that has full OPFS cache, the "Voice clone ready · all N phrases" row appears (mock `countCached` → `phrases.length`).
- With a partial cache, the "Voice clone partly prepared" row appears.

## Manual verification (browser)

Per repo convention (`feedback_test_in_browser` memory): run `npm run dev`, capture a voice on a fresh patient, confirm:
1. While extraction runs → row 1.
2. After embedding extracted but pre-gen runs → row 5 with progress bar.
3. After pre-gen completes → row 7.
4. **Reload page** → row 8 (the steady-state "all N phrases ready") — this is the bug we're fixing.
5. Manually corrupt OPFS audio cache (devtools), reload → row 9.
6. Force model-load failure (block `/models/2026-04-29/chatterbox-multilingual/*`) → row 2 then row 3 with Retry.

## Risks & mitigations

- **Reconciler races with the runner.** The runner mutates the same store. Mitigation: reconciler is gated by `!run`, so once the runner has started anything, reconciler short-circuits.
- **`countCached` cost.** Documented as one OPFS directory scan; safe (~5 ms range). We call it once per mount; tests confirm no re-fire on cosmetic re-renders.
- **Quality label drift.** Reusing `qualityLabel(quality)` keeps us aligned with the calibration regime; no copy of the threshold logic.

## Follow-ups (explicitly tracked)

After this PR ships:
1. **Provider voice rows in `CareTeamSection`.** Replace its current `<VoiceCacheProgress>` usages with `<VoiceCloneStatus phraseCorpus="core">`. Same component, no schema changes. Keep separate so the diff is reviewable. *Tracking: file an issue immediately on merge — title "feat(settings): use VoiceCloneStatus in CareTeamSection".*
2. **Engine-truth telemetry.** Subscribe to `speak()` outcomes to surface "last tap used: GPU clone / Web Speech / tone" — useful for diagnostics but separate from the caregiver-facing line designed here.
3. **Translate new `voice_clone_status.*` keys** in `de.ts` / `es.ts` / `zh.ts`. Follows the locale-pass cadence used by PR #211.
