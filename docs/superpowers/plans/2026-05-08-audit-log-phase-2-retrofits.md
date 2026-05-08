# Audit Log Phase 2 Retrofits Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** Wrap the three durable-execution candidate flows from Phase 2 (`voice_enrollment`, `audio_cache_pregen`, `model_priming`) in `ov.workflow(...)` so a tab kill mid-flight is journaled and recoverable on next boot.

**Architecture:** The Phase 2 runtime (`ov.workflow`, `StepCtx.step`, `registerWorkflow`, `sweepAbandonedWorkflows`) is in main. This PR threads the three flows through it without changing observable behaviour for users. Each retrofit is a focused refactor that:

1. Identifies natural step boundaries in the existing flow (each step idempotent at its underlying layer).
2. Extracts a `runner(ctx, args)` function that uses `ctx.step("name", fn)` for each step.
3. Wraps the entry point in `ov.workflow("flow_name", (ctx) => runner(ctx, args), { patientIdHash, recoveryMode })`.
4. Registers the runner in `src/audit/init.ts` so `resumeWorkflow(id)` can find it after a boot recovery sweep.

**Tech Stack:** Existing TS + Preact + Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-07-audit-log-design.md` — Phase 2 retrofits section.

**File layout (new):**

| File | Responsibility |
|---|---|
| `src/audit/workflows/voiceEnrollment.ts` | `enrollVoice(ctx, args)` runner — 3 steps |
| `src/audit/workflows/audioCachePregen.ts` | `pregenAudio(ctx, args)` runner — 3 steps per (phrase, voice) tuple |
| `src/audit/workflows/modelPriming.ts` | `primeModels(ctx)` runner wrapping the existing `primeOffline` generator |

**File layout (modified):**

| File | What |
|---|---|
| `src/models/voiceProcessor.ts` | Wrap `extract → setState` in `ov.workflow("voice_enrollment", ...)` |
| `src/models/audioCache.ts` | Per-iteration call to `ov.workflow("audio_cache_pregen", ...)` inside `generateAllPhrases` |
| `src/models/drivePrimer.ts` | Wrap the `primeOffline` driver in `ov.workflow("model_priming", ...)` |
| `src/audit/init.ts` | Register the three runners after `initLogger(db)` and before `sweepAbandonedWorkflows()` |
| `public/sw.js` | Bump `CACHE_NAME` |

---

## Task 1: voice_enrollment runner

**Files:**
- Create: `src/audit/workflows/voiceEnrollment.ts`
- Create: `src/audit/workflows/voiceEnrollment.test.ts`

`voiceProcessor.ts` today does: `decodeAudioFromBase64(base64)` → `runEmbedOnWorker(audio)` → `setState({ speakerData })`. Three natural step boundaries.

### Step 1: Test (write first)

```ts
// src/audit/workflows/voiceEnrollment.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { enrollVoice } from "./voiceEnrollment";
import { initAudit } from "../init";
import { _resetForTests } from "../logger";
import { resetSessionForTests } from "../session";
import { AUDIT_DB_NAME } from "../db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("enrollVoice runner", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("invokes decode → extract → persist in order", async () => {
    const calls: string[] = [];
    const args = {
      base64: "dummy-base64",
      patientId: "p1",
      decode: async () => { calls.push("decode"); return new Float32Array([0.1, 0.2]); },
      extract: async (audio: Float32Array) => {
        calls.push("extract");
        expect(audio.length).toBe(2);
        return { speakerData: "fake-data" };
      },
      persist: async (patientId: string, data: unknown) => {
        calls.push("persist");
        expect(patientId).toBe("p1");
        expect(data).toEqual({ speakerData: "fake-data" });
      },
    };

    // enrollVoice expects to be called inside ov.workflow; provide a fake ctx.
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await enrollVoice(ctx, args);
    expect(calls).toEqual(["decode", "extract", "persist"]);
  });

  it("rethrows on extract failure (workflow.failed propagation)", async () => {
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await expect(enrollVoice(ctx, {
      base64: "x",
      patientId: "p1",
      decode: async () => new Float32Array([0.1]),
      extract: async () => { throw new Error("encoder timeout"); },
      persist: async () => {},
    })).rejects.toThrow("encoder timeout");
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/workflows/voiceEnrollment.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/workflows/voiceEnrollment.ts
import type { StepCtx } from "../workflow";

/** Functions are passed in so production wires real ones and tests
 *  inject mocks. The runner stays pure. */
export interface EnrollVoiceArgs {
  base64: string;
  patientId: string;
  decode: (base64: string) => Promise<Float32Array>;
  extract: (audio: Float32Array) => Promise<unknown>;
  persist: (patientId: string, data: unknown) => Promise<void>;
}

/** Three steps; each idempotent: decode is pure, extract is pure given
 *  the same audio bytes (modulo FP non-determinism in the encoder, which
 *  is fine for replay because we only re-execute on user-initiated
 *  recovery), persist is a settings-store update keyed on patientId. */
export async function enrollVoice(ctx: StepCtx, args: EnrollVoiceArgs): Promise<void> {
  const audio = await ctx.step("decode_audio", () => args.decode(args.base64));
  const data = await ctx.step("extract_embedding", () => args.extract(audio));
  await ctx.step("persist_speaker_data", () => args.persist(args.patientId, data));
}
```

### Step 4: Verify pass

`npx vitest run src/audit/workflows/voiceEnrollment.test.ts` → 2 passed.

### Step 5: Commit

```bash
git add src/audit/workflows/voiceEnrollment.ts src/audit/workflows/voiceEnrollment.test.ts
git commit -m "feat(audit): voice_enrollment runner — 3 idempotent steps"
```

---

## Task 2: Wire voiceProcessor through ov.workflow

**Files:**
- Modify: `src/models/voiceProcessor.ts`

Read the current `voiceProcessor.ts`. Replace the inline extraction in `tick()` with a call to `ov.workflow("voice_enrollment", ...)` that runs `enrollVoice(ctx, args)`. The runner's `decode` / `extract` / `persist` arguments wire up to the existing `decodeAudioFromBase64`, `runEmbedOnWorker`, and `useSettingsStore.setState` calls.

### Step 1: Read voiceProcessor.ts to understand current shape

```bash
cat src/models/voiceProcessor.ts
```

### Step 2: Replace `extract → setState` block with workflow

Replace the body of the `try { ... }` in `tick()` (around the call to `extract(p.pendingVoiceBlob)` and the subsequent `setState`) with:

```ts
import { ov } from "../audit/workflow";
import { patientIdHash } from "../audit/hash";
import { enrollVoice } from "../audit/workflows/voiceEnrollment";
import { decodeAudioFromBase64 } from "./audioDecode";

// Inside tick(), replacing the extract/setState body:
const hash = await patientIdHash(p.id);
await ov.workflow(
  "voice_enrollment",
  (ctx) => enrollVoice(ctx, {
    base64: p.pendingVoiceBlob!,
    patientId: p.id,
    decode: decodeAudioFromBase64,
    extract: async (audio) => {
      const { runEmbedOnWorker } = await import("./voiceProcessorImpl");
      return runEmbedOnWorker(audio);
    },
    persist: async (patientId, data) => {
      useSettingsStore.setState((s) => {
        if (!s.cfg) return s;
        const patients = s.cfg.patients.map((pp) =>
          pp.id === patientId
            ? { ...pp, speakerData: data, pendingVoiceBlob: null }
            : pp,
        );
        return { ...s, cfg: { ...s.cfg, patients } };
      });
    },
  }),
  { patientIdHash: hash, recoveryMode: "prompt" },
);
```

The `recoveryMode: "prompt"` matches the spec — voice enrollment touches the user, so abandoned ones surface a UI banner rather than silently re-running.

### Step 3: Remove now-redundant `extract` injection or keep for testability

The existing `ProcessorOptions.extract` injection is still useful for tests that want to skip the workflow. Keep it; if `opts.extract` is provided, bypass the workflow wrap and call extract directly (the existing path).

### Step 4: Run tests

```bash
npm test
```

Existing voiceProcessor tests should still pass. If a test mocks the inner extract path, it continues working via the `opts.extract` bypass.

### Step 5: Commit

```bash
git add src/models/voiceProcessor.ts
git commit -m "feat(audit): wrap voice enrollment in durable workflow"
```

---

## Task 3: audio_cache_pregen runner

**Files:**
- Create: `src/audit/workflows/audioCachePregen.ts`
- Create: `src/audit/workflows/audioCachePregen.test.ts`

Per the spec: ONE workflow instance per (phrase, voice) tuple. Three steps: `synthesize`, `post_process`, `persist`. Each instance is small enough to fit in `step_history` comfortably.

### Step 1: Test (write first)

```ts
// src/audit/workflows/audioCachePregen.test.ts
import { describe, it, expect } from "vitest";
import { pregenAudio } from "./audioCachePregen";

describe("pregenAudio runner", () => {
  it("invokes synthesize → post_process → persist in order", async () => {
    const calls: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await pregenAudio(ctx, {
      phrase: "Yes",
      voiceFingerprint: "fp-1",
      synthesize: async () => { calls.push("synthesize"); return new Float32Array([0.1]); },
      postProcess: async (audio) => { calls.push("post_process"); return audio; },
      persist: async (phrase, audio) => {
        calls.push("persist");
        expect(phrase).toBe("Yes");
        expect(audio.length).toBe(1);
      },
    });
    expect(calls).toEqual(["synthesize", "post_process", "persist"]);
  });

  it("propagates synthesis errors", async () => {
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(_name: string, fn: () => Promise<T>) => fn(),
    };
    await expect(pregenAudio(ctx, {
      phrase: "x",
      voiceFingerprint: "fp",
      synthesize: async () => { throw new Error("worker dead"); },
      postProcess: async (a) => a,
      persist: async () => {},
    })).rejects.toThrow("worker dead");
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/workflows/audioCachePregen.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/workflows/audioCachePregen.ts
import type { StepCtx } from "../workflow";

export interface PregenArgs {
  phrase: string;
  voiceFingerprint: string;
  synthesize: () => Promise<Float32Array>;
  postProcess: (audio: Float32Array) => Promise<Float32Array>;
  persist: (phrase: string, audio: Float32Array) => Promise<void>;
}

export async function pregenAudio(ctx: StepCtx, args: PregenArgs): Promise<void> {
  const raw = await ctx.step("synthesize", () => args.synthesize());
  const processed = await ctx.step("post_process", () => args.postProcess(raw));
  await ctx.step("persist", () => args.persist(args.phrase, processed));
}
```

Note: `Float32Array` is not natively JSON-serialisable, so `step.result` for the synth/post_process steps will fail to memoise via superjson if we try to replay across a tab kill. For Phase 2 v1 we accept that audio_cache_pregen replay re-runs from the start (the underlying cache write is idempotent — a phrase already in OPFS is skipped by `hasCachedAudio`). Document inline.

### Step 4: Verify pass

`npx vitest run src/audit/workflows/audioCachePregen.test.ts` → 2 passed.

### Step 5: Commit

```bash
git add src/audit/workflows/audioCachePregen.ts src/audit/workflows/audioCachePregen.test.ts
git commit -m "feat(audit): audio_cache_pregen runner — per-phrase workflow"
```

---

## Task 4: Wire generateAllPhrases through ov.workflow per phrase

**Files:**
- Modify: `src/models/audioCache.ts`

The existing `generateAllPhrases` async generator iterates phrases. For each phrase, replace the `synthesizeWithRetries → postProcessAudio → putCachedAudio` block with a single `ov.workflow("audio_cache_pregen", ...)` call that wires those operations into `pregenAudio`'s arguments.

### Step 1: Read the current per-phrase block

In `src/models/audioCache.ts`, around line 360 in `generateAllPhrases`. Currently:

```ts
const audio = await synthesizeWithRetries(worker, phrase, speakerData, signal, gpuOnly, opts?.languageId ?? "en");
const processed = postProcessAudio(audio, SAMPLE_RATE);
await putCachedAudio(phrase, speakerData, processed, patientId);
```

### Step 2: Replace with ov.workflow

```ts
import { ov } from "../audit/workflow";
import { pregenAudio } from "../audit/workflows/audioCachePregen";

// Inside the for-loop, replace the synth+process+persist block with:
const fp = embeddingFingerprint(speakerData);
await ov.workflow(
  "audio_cache_pregen",
  (ctx) => pregenAudio(ctx, {
    phrase,
    voiceFingerprint: fp,
    synthesize: () => synthesizeWithRetries(worker, phrase, speakerData, signal, gpuOnly, opts?.languageId ?? "en"),
    postProcess: async (audio) => postProcessAudio(audio, SAMPLE_RATE),
    persist: async (p, audio) => putCachedAudio(p, speakerData, audio, patientId),
  }),
  { recoveryMode: "auto" },
);
```

### Step 3: Run tests

```bash
npm test
```

Tests in `audioCache.test.ts` and `audioCacheRunner.test.ts` should still pass — they mock the inner functions, and the workflow wrap is transparent to them.

### Step 4: Commit

```bash
git add src/models/audioCache.ts
git commit -m "feat(audit): wrap audio cache pre-gen in per-phrase durable workflow"
```

---

## Task 5: model_priming runner

**Files:**
- Create: `src/audit/workflows/modelPriming.ts`
- Create: `src/audit/workflows/modelPriming.test.ts`

### Step 1: Test (write first)

```ts
// src/audit/workflows/modelPriming.test.ts
import { describe, it, expect } from "vitest";
import { primeModels } from "./modelPriming";

describe("primeModels runner", () => {
  it("steps through primer events", async () => {
    const events = [
      { kind: "download", file: "tts/encoder.onnx" } as const,
      { kind: "verified", file: "tts/encoder.onnx" } as const,
      { kind: "download", file: "stt/decoder.onnx" } as const,
      { kind: "verified", file: "stt/decoder.onnx" } as const,
    ];
    const stepNames: string[] = [];
    const ctx = {
      workflowId: "wf-test",
      step: async <T>(name: string, fn: () => Promise<T>) => {
        stepNames.push(name);
        return fn();
      },
    };
    await primeModels(ctx, {
      runPrimer: async function* () { for (const e of events) yield e; },
    });
    expect(stepNames).toEqual([
      "download_tts/encoder.onnx",
      "verify_tts/encoder.onnx",
      "download_stt/decoder.onnx",
      "verify_stt/decoder.onnx",
    ]);
  });
});
```

### Step 2: Verify failure

`npx vitest run src/audit/workflows/modelPriming.test.ts` → FAIL.

### Step 3: Implement

```ts
// src/audit/workflows/modelPriming.ts
import type { StepCtx } from "../workflow";

export interface PrimerEvent {
  kind: "download" | "verified" | "skipped" | "failed";
  file: string;
}

export interface PrimeModelsArgs {
  /** Yields events as the primer drives the existing primeOffline
   *  generator. Each yield becomes a journaled step boundary. */
  runPrimer: () => AsyncIterable<PrimerEvent>;
}

/** Translates primer yields to ctx.step calls so each download/verify
 *  pair is a journaled step. Generator state isn't replay-safe, so on
 *  resume the runner re-enters from the start; primeOffline already
 *  skips files already in OPFS via integrity-check, so the loop only
 *  re-does failed/missing files. */
export async function primeModels(ctx: StepCtx, args: PrimeModelsArgs): Promise<void> {
  for await (const ev of args.runPrimer()) {
    if (ev.kind === "download") {
      await ctx.step(`download_${ev.file}`, async () => { /* event already happened */ });
    } else if (ev.kind === "verified") {
      await ctx.step(`verify_${ev.file}`, async () => { /* event already happened */ });
    }
    // skipped / failed are not steps — they're observability events the
    // primer's own audit.log calls already emit.
  }
}
```

The runner's `step` bodies are no-ops because the primer events represent work already done. The step boundary is purely for journaling — replay sees `step.complete` for every previously-finished file and skips it.

### Step 4: Verify pass

`npx vitest run src/audit/workflows/modelPriming.test.ts` → 1 passed.

### Step 5: Commit

```bash
git add src/audit/workflows/modelPriming.ts src/audit/workflows/modelPriming.test.ts
git commit -m "feat(audit): model_priming runner — generator-event-to-step shim"
```

---

## Task 6: Wire drivePrimer through ov.workflow

**Files:**
- Modify: `src/models/drivePrimer.ts`

### Step 1: Read drivePrimer.ts

```bash
cat src/models/drivePrimer.ts
```

### Step 2: Wrap the loop in ov.workflow

Replace the body of `drivePrimer()` so the iteration happens inside `ov.workflow`:

```ts
import { ov } from "../audit/workflow";
import { primeModels } from "../audit/workflows/modelPriming";
import { primeOffline } from "./offlinePrimer";
import { loadManifest } from "./modelsManifest";

// Inside drivePrimer(), replace the `for await (const ev of primeOffline(manifest, ...))` loop:
const manifest = await loadManifest();
await ov.workflow(
  "model_priming",
  (ctx) => primeModels(ctx, {
    runPrimer: () => primeOffline(manifest, opts),
  }),
  { recoveryMode: "auto" },
);
```

If drivePrimer also collects results / errors, refactor so the workflow runner returns them and the outer wrapper reports.

### Step 3: Run tests

```bash
npm test
```

Existing `drivePrimer.test.ts` mocks `primeOffline` — it should still pass with the workflow wrap, which is transparent to inner mocks.

### Step 4: Commit

```bash
git add src/models/drivePrimer.ts
git commit -m "feat(audit): wrap model priming in durable workflow"
```

---

## Task 7: Register all three runners at boot

**Files:**
- Modify: `src/audit/init.ts`

### Step 1: Add registration

After `initLogger(db)` and before the recovery sweep, register the three runners. Note: per the spec, these registrations are no-op stubs at recovery time (the runner's `args` aren't available without re-deriving them from app state). For v1 we accept that recovery is a best-effort re-invocation that the underlying flows will quickly converge from. The PR description should call this out so reviewers understand replay's limits.

```ts
import { registerWorkflow } from "./registry";
import type { StepCtx } from "./workflow";

// Inside initAudit, after initLogger(db):
registerWorkflow("voice_enrollment", async (_ctx: StepCtx) => {
  // Recovery: voice enrollment requires the user-supplied audio blob,
  // which isn't available at sweep time. The recovery banner from
  // Phase 2 already prompts the user; clicking Resume here would
  // currently re-invoke an empty workflow. v1 accepts that recovery
  // for voice_enrollment effectively means "the user re-enrolls" —
  // pendingVoiceBlob in settings drives the next attempt naturally.
  console.warn("[audit] voice_enrollment recovery is a no-op — user must re-enroll");
});

registerWorkflow("audio_cache_pregen", async (_ctx: StepCtx) => {
  // Recovery: pre-gen iteration is driven by audioCacheRunner; the next
  // pre-gen pass naturally picks up missing phrases via hasCachedAudio,
  // so this stub just resolves and the runner re-fires per-phrase
  // workflows on its next tick.
});

registerWorkflow("model_priming", async (_ctx: StepCtx) => {
  // Recovery: drivePrimer re-runs at boot via bootModels; this stub
  // acknowledges the abandoned workflow so the recovery sweep clears
  // it without re-invoking work that's already converging through
  // the normal boot path.
});
```

### Step 2: Run tests

```bash
npm test
```

Init tests should still pass; they don't check registry state directly.

### Step 3: Commit

```bash
git add src/audit/init.ts
git commit -m "feat(audit): register voice_enrollment / audio_cache_pregen / model_priming runners"
```

---

## Task 8: SW CACHE_NAME bump + final verification

**Files:**
- Modify: `public/sw.js`

### Step 1: Bump CACHE_NAME

`ownvoice-v10` → `ownvoice-v11`.

### Step 2: Build + test

```bash
npm run build
npm test
```

Expected: clean build, 0 test failures.

### Step 3: Manual smoke test (document in PR description)

- Voice enrollment: enroll a fake patient → verify `workflows` IDB store gets a row → verify `events` store gets `workflow.start` + 3 `step.complete` + `workflow.complete` rows → kill tab mid-extract → reload → verify recovery prompt appears (Phase 2 banner).
- Audio cache pre-gen: clear audio cache → trigger pre-gen → verify per-phrase `workflows` rows appear and clean up on completion.
- Model priming: clear OPFS models → reload → verify priming workflow rows appear, complete, and clear.

### Step 4: Commit

```bash
git add public/sw.js
git commit -m "chore(sw): bump CACHE_NAME for audit-log Phase 2 retrofits"
```

---

## Self-Review

After completing all tasks:

- ✅ voice_enrollment runner + retrofit (Tasks 1-2)
- ✅ audio_cache_pregen runner + retrofit (Tasks 3-4)
- ✅ model_priming runner + retrofit (Tasks 5-6)
- ✅ Boot-time runner registration (Task 7)
- ✅ SW bump (Task 8)
- ✅ All tests green
- ✅ Build clean

PR description should call out:
1. Recovery semantics are best-effort for v1 (per-runner notes inline).
2. Manual smoke test on iPad surrogate covering all three flows.
3. The audio_cache_pregen step `result` memoisation limitation (Float32Array not JSON-serialisable; replay re-runs from start) — acceptable because the underlying cache write is idempotent.

Phase 2 retrofits are complete when:
- All three flows are wrapped in `ov.workflow`.
- The workflows IDB store gets populated and cleaned up correctly during normal operation.
- Tab kill mid-flow leaves a recoverable journal entry.
- No regression in existing TTS / pre-gen / priming functionality.
