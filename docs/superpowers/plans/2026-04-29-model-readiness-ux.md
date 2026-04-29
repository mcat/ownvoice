# Model Readiness UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate silent failures in voice cloning and Listen by exposing
honest readiness state, fixing six underlying bugs in the cloning path,
and replacing technical jargon with verb-led plain-language copy.

**Architecture:** Introduce a `warm` signal in `ModelManager` that is true
only after a worker has loaded enough to actually run inference. TTS
worker eager-warms after `ready` so the encoder downloads in the
background. Listen mic gates on `isWarm("stt")`. Voice cloning is
non-blocking — the audio blob is persisted into the patient record
immediately and a store-side `voiceProcessor` runs extraction whenever
TTS warms, so wizard completion and processing are decoupled. A new
`PatientVoiceStatus` badge in the header tells the patient when their
clone isn't ready yet.

**Tech Stack:** TypeScript, Preact, Vitest, Zustand (with IDB
persistence), ONNX Runtime Web, Web Workers.

**Spec:** `docs/superpowers/specs/2026-04-29-model-readiness-ux-design.md`

---

## File Map

**New files:**
- `src/components/layout/PatientVoiceStatus.tsx` + `.test.tsx`
- `src/models/voiceProcessor.ts` + `.test.ts`

**Modified files:**
- `src/types.ts` — add `Patient.pendingVoiceBlob?: string`
- `src/models/types.ts` — add `warm` to `ModelStatus`, extend
  `WorkerRequest` (`warmup`, `embed.requestId`) and `WorkerResponse`
  (`warm`, `embed-progress`, `embedding.requestId`)
- `src/models/modelManager.ts` — add `warm` tracking, `isWarm`,
  `markWarm`
- `src/models/modelManager.test.ts`
- `src/models/ttsWorker.ts` — `warmup` handler, streaming encoder fetch
  with progress, `requestId` echo on embed responses
- `src/models/ttsWorker.test.ts`
- `src/models/sttWorker.ts` — `warmup` handler that runs a 100 ms silent
  transcribe, emits `warm`
- `src/models/sttWorker.test.ts`
- `src/models/bootModels.ts` — handle `warm`, post `warmup` after `ready`
- `src/models/bootModels.test.ts`
- `src/hooks/useModels.ts` — `isWarm`, `secondsLeft`, `humanCountdown`
- `src/hooks/useModels.test.ts`
- `src/components/shared/VoiceCapture.tsx` — idle watchdog, requestId
  plumbing, `isWarm` gate on retry, plain-language copy, pre-capture
  hint
- `src/components/shared/VoiceCapture.test.tsx`
- `src/components/provider/ListenPanel.tsx` — gate mic button on
  `isWarm("stt")`, countdown label, recovery button
- `src/components/provider/ListenPanel.test.tsx`
- `src/components/settings/Setup.tsx` — persist blob into patient
  record at capture time
- `src/components/settings/Setup.test.tsx`
- `src/stores/settingsStore.ts` — `pendingVoiceBlob` field on Patient,
  helper `setPatientPendingVoiceBlob` and `clearPatientPendingVoiceBlob`
- `src/stores/settingsStore.test.ts`
- `src/data/locales/en.ts` — new keys under `ui.readiness.*` and
  `ui.patient.header.voice_status.*`
- `src/components/layout/Header.tsx` (or wherever `PatientPill` is
  rendered) — render `PatientVoiceStatus` next to the pill
- `src/main-app.tsx` — start `voiceProcessor` after stores hydrate

---

## Test Commands

- All tests: `npm test`
- Single file: `npm test -- src/models/modelManager.test.ts`
- Single test: `npm test -- src/models/modelManager.test.ts -t "warm flips"`

Tests run once via `vitest run`. Watch mode: `npm run test:watch`.

---

## Task 1: Extend model types with `warm` and request-id protocol

**Files:**
- Modify: `src/models/types.ts`

- [ ] **Step 1: Add `warm` to ModelStatus and extend protocol**

In `src/models/types.ts`, replace the `ModelStatus`, `WorkerRequest`, and
`WorkerResponse` declarations:

```typescript
export type ModelStatus =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "warm"
  | "error";

export type WorkerRequest =
  | { type: "init"; modelUrl: string }
  | { type: "warmup" }
  | { type: "embed"; audio: Float32Array; sampleRate: number; requestId: number }
  | { type: "synthesize"; text: string; embedding: Float32Array }
  | {
      type: "complete";
      partial?: string;
      prompt?: string;
      context?: string;
      maxTokens: number;
      fewShot?: FewShotExample[];
      requestId?: number;
    }
  | { type: "transcribe"; audio: Float32Array; sampleRate: number };

export type WorkerResponse =
  | { type: "ready" }
  | { type: "warm" }
  | { type: "progress"; loaded: number; total: number }
  | {
      type: "embed-progress";
      stage: "loading-model";
      loaded?: number;
      total?: number;
    }
  | {
      type: "embedding";
      data: SpeakerData;
      requestId: number;
    }
  | { type: "audio"; data: Float32Array; sampleRate: number }
  | { type: "completions"; data: string[] }
  | { type: "transcript"; text: string }
  | { type: "error"; message: string; requestId?: number };
```

> Note: `SpeakerData` already exists below in this file — keep the
> existing definition. The `embedding` response previously typed
> `data` as `Float32Array`, but the worker actually emits `SpeakerData`
> (look at `ttsWorker.ts:438`). This task fixes the typing too.

- [ ] **Step 2: Type-check the codebase**

Run: `npm run build`
Expected: PASS (TS errors here will be addressed in following tasks as
each consumer is updated).

If errors are limited to "missing requestId on embed call sites" or
"warm not handled in switch statements", that is expected and tracked in
later tasks. Other errors must be fixed in this commit.

- [ ] **Step 3: Commit**

```bash
git add src/models/types.ts
git commit -m "types(models): add warm status, warmup request, requestId echo"
```

---

## Task 2: ModelManager `warm` tracking

**Files:**
- Modify: `src/models/modelManager.ts`
- Test: `src/models/modelManager.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/models/modelManager.test.ts`:

```typescript
describe("ModelManager — warm tracking", () => {
  it("isWarm is false until markWarm is called", () => {
    const mgr = getModelManager();
    expect(mgr.isWarm("tts")).toBe(false);
    mgr.setReady("tts");
    expect(mgr.isWarm("tts")).toBe(false);
    mgr.markWarm("tts");
    expect(mgr.isWarm("tts")).toBe(true);
  });

  it("markWarm flips status to 'warm'", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    const tts = mgr.getProgress().find((p) => p.model === "tts");
    expect(tts?.status).toBe("warm");
  });

  it("setError after markWarm clears warm state", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    mgr.setError("tts", "boom");
    expect(mgr.isWarm("tts")).toBe(false);
  });

  it("notifies progress listeners when marked warm", () => {
    const mgr = getModelManager();
    const seen: string[] = [];
    mgr.onProgress((p) => {
      const tts = p.find((m) => m.model === "tts");
      if (tts) seen.push(tts.status);
    });
    mgr.setReady("tts");
    mgr.markWarm("tts");
    expect(seen).toContain("warm");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/modelManager.test.ts -t "warm"`
Expected: FAIL — `mgr.isWarm is not a function`.

- [ ] **Step 3: Add isWarm and markWarm to ModelManager**

In `src/models/modelManager.ts`, after the `setReady` method (around
line 187), add:

```typescript
  /** True only when the worker can actually run inference for this model. */
  isWarm(id: ModelId): boolean {
    return this.models[id].status === "warm";
  }

  /** Mark a model as warm — the worker has confirmed it can run inference. */
  markWarm(id: ModelId): void {
    this.updateModel(id, { status: "warm" });
    console.log(`[OwnVoice] ${id} model warm`);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/modelManager.test.ts`
Expected: PASS for all warm tests; existing tests unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/models/modelManager.ts src/models/modelManager.test.ts
git commit -m "feat(modelManager): add isWarm and markWarm transitions"
```

---

## Task 3: TTS worker — streaming encoder fetch with progress

**Files:**
- Modify: `src/models/ttsWorker.ts`
- Test: `src/models/ttsWorker.test.ts`

This solves Bug 3 (no progress during encoder fetch).

- [ ] **Step 1: Write failing test**

Append to `src/models/ttsWorker.test.ts`:

```typescript
describe("ttsWorker — encoder fetch progress", () => {
  it("posts embed-progress events as encoder bytes arrive", async () => {
    const posted: unknown[] = [];
    vi.stubGlobal("self", {
      addEventListener: vi.fn(),
      postMessage: (m: unknown) => posted.push(m),
    });

    // 4 chunks of 1024 bytes
    const total = 4096;
    const chunks = [
      new Uint8Array(1024),
      new Uint8Array(1024),
      new Uint8Array(1024),
      new Uint8Array(1024),
    ];
    const reader = makeChunkReader(chunks);
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        headers: { get: () => String(total) },
        body: { getReader: () => reader },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(total)),
      }),
    );

    const mod = await import("./ttsWorker");
    await mod.__test__fetchModelWithProgress("https://example/encoder.onnx");

    const progress = posted.filter(
      (m: any) => m.type === "embed-progress" && m.stage === "loading-model",
    );
    expect(progress.length).toBeGreaterThanOrEqual(2);
    const last = progress[progress.length - 1] as any;
    expect(last.loaded).toBe(total);
    expect(last.total).toBe(total);
  });
});

function makeChunkReader(chunks: Uint8Array[]) {
  let i = 0;
  return {
    read: async () => {
      if (i >= chunks.length) return { done: true, value: undefined };
      return { done: false, value: chunks[i++] };
    },
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/ttsWorker.test.ts -t "encoder fetch progress"`
Expected: FAIL — `__test__fetchModelWithProgress` does not exist.

- [ ] **Step 3: Add fetchModelWithProgress and route the encoder load through it**

In `src/models/ttsWorker.ts`, near the existing `fetchFile` (around
line 105), add a sibling helper specific to embed-time loads:

```typescript
/** Fetch a model file as ArrayBuffer, posting embed-progress events.
 *  Used during encoder load (embed call) so the UI can show a real
 *  countdown instead of a generic spinner. */
async function fetchEncoderWithProgress(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  // Initial event so UI can switch to the loading state.
  _postMessage({ type: "embed-progress", stage: "loading-model", loaded: 0, total });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    _postMessage({ type: "embed-progress", stage: "loading-model", loaded, total });
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined.buffer as ArrayBuffer;
}

// Re-export under a stable test name so tests can drive it directly.
export const __test__fetchModelWithProgress = fetchEncoderWithProgress;
```

In `createSession` (around line 169), make the encoder load route
through the new helper. The simplest signature change: add an optional
`progressTag` parameter and only emit progress when it's set.

Replace the `createSession` signature and body:

```typescript
async function createSession(
  onnxUrl: string,
  wasmOnly = false,
  hasExternalData = false,
  progressTag: "none" | "encoder" = "none",
): Promise<ort.InferenceSession> {
  console.log(`${LOG} Loading ${onnxUrl}...`);

  const eps: ort.InferenceSession.ExecutionProviderConfig[] = [];
  if (!wasmOnly && getEP() === "webgpu") eps.push("webgpu");
  eps.push("wasm");

  const opts: ort.InferenceSession.SessionOptions = {
    executionProviders: eps,
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,
  };

  if (eps[0] === "webgpu") {
    if (hasExternalData) {
      const dataUrl = onnxUrl + "_data";
      const dataFileName = onnxUrl.split("/").pop() + "_data";
      opts.externalData = [{ path: dataFileName!, data: dataUrl }];
    }
    return ort.InferenceSession.create(onnxUrl, opts);
  }

  const fetchModel =
    progressTag === "encoder" ? fetchEncoderWithProgress : (u: string) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch ${u}: ${r.status}`);
        return r.arrayBuffer();
      });

  const modelData = await fetchModel(onnxUrl);

  if (hasExternalData) {
    const dataUrl = onnxUrl + "_data";
    const dataFileName = onnxUrl.split("/").pop() + "_data";
    console.log(`${LOG} Fetching external data: ${dataUrl}...`);
    const extData = await fetchModel(dataUrl);
    opts.externalData = [
      { path: dataFileName!, data: new Uint8Array(extData) },
    ];
  }

  return ort.InferenceSession.create(modelData, opts);
}
```

In `handleEmbed` (around line 384), change the encoder createSession call to:

```typescript
  const speechEncoderSession = await createSession(
    baseUrl + CHATTERBOX_FILES.speechEncoder.onnx,
    true,
    true,
    "encoder",
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/ttsWorker.test.ts`
Expected: PASS — new test green; previously-existing tests unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/models/ttsWorker.ts src/models/ttsWorker.test.ts
git commit -m "fix(stt): stream encoder fetch with embed-progress (Bug 3)"
```

---

## Task 4: TTS worker — `warmup` handler + `warm` response

**Files:**
- Modify: `src/models/ttsWorker.ts`
- Test: `src/models/ttsWorker.test.ts`

Solves Bug 1 (premature `ready`).

- [ ] **Step 1: Write failing test**

Append to `src/models/ttsWorker.test.ts`:

```typescript
describe("ttsWorker — warmup", () => {
  it("emits {type:'warm'} after warmup completes", async () => {
    const posted: any[] = [];
    const handlers: Record<string, (e: MessageEvent) => void> = {};
    vi.stubGlobal("self", {
      addEventListener: (type: string, h: any) => {
        handlers[type] = h;
      },
      postMessage: (m: unknown) => posted.push(m),
    });
    // Mock the speech encoder load — return a fake session whose run()
    // resolves with the four expected outputs.
    vi.doMock("onnxruntime-web", () => ({
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          run: vi.fn().mockResolvedValue({
            audio_features: { data: new Float32Array(8), dims: [1, 8], type: "float32" },
            audio_tokens: { data: new BigInt64Array(4), dims: [1, 4], type: "int64" },
            speaker_embeddings: { data: new Float32Array(192), dims: [1, 192], type: "float32" },
            speaker_features: { data: new Float32Array(80), dims: [1, 1, 80], type: "float32" },
          }),
          release: vi.fn(),
        }),
      },
      Tensor: vi.fn(),
    }));

    await import("./ttsWorker");
    handlers.message?.(new MessageEvent("message", {
      data: { type: "init", modelUrl: "/models/tts/" },
    }) as any);
    // Allow init to resolve
    await new Promise((r) => setTimeout(r, 0));
    handlers.message?.(new MessageEvent("message", {
      data: { type: "warmup" },
    }) as any);
    await new Promise((r) => setTimeout(r, 0));

    expect(posted.find((m) => m.type === "warm")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/ttsWorker.test.ts -t "warmup"`
Expected: FAIL — worker does not handle `warmup` messages.

- [ ] **Step 3: Add the warmup handler**

In `src/models/ttsWorker.ts`, find the message dispatcher (the
`self.addEventListener("message", ...)` near the bottom of the file).
Add a `warmup` branch that runs a one-shot encoder load with a 0.5 s
silent buffer, then emits `{ type: "warm" }`. Place this near
`handleEmbed`:

```typescript
/** Pre-load the speech encoder and confirm it can run inference.
 *  Run on a short silent buffer so the OPFS cache is hot when the user
 *  actually records. Emits {type:"warm"} on success and {type:"error"}
 *  on failure (without a requestId, since this is unsolicited). */
async function handleWarmup(): Promise<void> {
  console.log(`${LOG} Warmup: loading speech encoder...`);
  try {
    const session = await createSession(
      baseUrl + CHATTERBOX_FILES.speechEncoder.onnx,
      true,
      true,
      "encoder",
    );
    // Tiny silent buffer — just enough to confirm the graph runs.
    const silent = new Float32Array(SAMPLE_RATE / 2); // 0.5 s
    const tensor = new ort.Tensor("float32", silent, [1, silent.length]);
    await session.run({ audio_values: tensor });
    session.release();
    _postMessage({ type: "warm" });
    console.log(`${LOG} Warmup complete.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} Warmup failed: ${msg}`);
    _postMessage({ type: "error", message: msg });
  }
}
```

In the message handler:

```typescript
self.addEventListener("message", async (e: MessageEvent) => {
  const msg = e.data as WorkerRequest;
  if (msg.type === "init") return handleInit(msg.modelUrl);
  if (msg.type === "warmup") return handleWarmup();
  if (msg.type === "embed") return handleEmbed(msg.audio, msg.sampleRate, msg.requestId);
  if (msg.type === "synthesize") return handleSynthesize(msg.text, msg.embedding);
  // ...existing branches...
});
```

(Adjust to existing dispatcher structure.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/ttsWorker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/ttsWorker.ts src/models/ttsWorker.test.ts
git commit -m "feat(tts-worker): handle warmup message, emit warm (Bug 1)"
```

---

## Task 5: TTS worker — `requestId` on embed responses

**Files:**
- Modify: `src/models/ttsWorker.ts`
- Test: `src/models/ttsWorker.test.ts`

Solves Bug 6 (handler race on concurrent embeds).

- [ ] **Step 1: Write failing test**

Append to `src/models/ttsWorker.test.ts`:

```typescript
describe("ttsWorker — embed requestId echo", () => {
  it("includes requestId on embedding response", async () => {
    const posted: any[] = [];
    const handlers: Record<string, (e: MessageEvent) => void> = {};
    vi.stubGlobal("self", {
      addEventListener: (type: string, h: any) => {
        handlers[type] = h;
      },
      postMessage: (m: unknown) => posted.push(m),
    });
    // (Same ORT mock as Task 4 — extract to a helper if you prefer.)
    vi.doMock("onnxruntime-web", () => ({
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          run: vi.fn().mockResolvedValue({
            audio_features: { data: new Float32Array(8), dims: [1, 8], type: "float32" },
            audio_tokens: { data: new BigInt64Array(4), dims: [1, 4], type: "int64" },
            speaker_embeddings: { data: new Float32Array(192), dims: [1, 192], type: "float32" },
            speaker_features: { data: new Float32Array(80), dims: [1, 1, 80], type: "float32" },
          }),
          release: vi.fn(),
        }),
      },
      Tensor: vi.fn(),
    }));
    await import("./ttsWorker");
    handlers.message?.(new MessageEvent("message", {
      data: { type: "init", modelUrl: "/models/tts/" },
    }) as any);
    await new Promise((r) => setTimeout(r, 0));
    handlers.message?.(new MessageEvent("message", {
      data: { type: "embed", audio: new Float32Array(24000), sampleRate: 24000, requestId: 42 },
    }) as any);
    await new Promise((r) => setTimeout(r, 0));

    const embedding = posted.find((m) => m.type === "embedding");
    expect(embedding?.requestId).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/ttsWorker.test.ts -t "requestId"`
Expected: FAIL — embed response has no requestId.

- [ ] **Step 3: Plumb requestId through handleEmbed**

Change the `handleEmbed` signature (around line 367):

```typescript
async function handleEmbed(
  audio: Float32Array,
  _sampleRate: number,
  requestId: number,
): Promise<void> {
  // ... existing body ...
  _postMessage({ type: "embedding", data: speakerData, requestId });
}
```

In the message dispatcher, pass `msg.requestId` (already added in Task 4).

In the catch block of `handleEmbed`, also include the requestId on
errors:

```typescript
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    _postMessage({ type: "error", message: msg, requestId });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/ttsWorker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/ttsWorker.ts src/models/ttsWorker.test.ts
git commit -m "feat(tts-worker): echo requestId on embed responses (Bug 6)"
```

---

## Task 6: STT worker — warmup

**Files:**
- Modify: `src/models/sttWorker.ts`
- Test: `src/models/sttWorker.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/models/sttWorker.test.ts`:

```typescript
describe("sttWorker — warmup", () => {
  it("emits {type:'warm'} after warmup", async () => {
    const posted: any[] = [];
    const handlers: Record<string, (e: MessageEvent) => void> = {};
    vi.stubGlobal("self", {
      addEventListener: (type: string, h: any) => {
        handlers[type] = h;
      },
      postMessage: (m: unknown) => posted.push(m),
    });
    // ORT mock — Whisper-style outputs are fine to no-op.
    vi.doMock("onnxruntime-web", () => ({
      InferenceSession: {
        create: vi.fn().mockResolvedValue({
          run: vi.fn().mockResolvedValue({}),
          release: vi.fn(),
        }),
      },
      Tensor: vi.fn(),
    }));
    await import("./sttWorker");
    handlers.message?.(new MessageEvent("message", {
      data: { type: "init", modelUrl: "/models/stt/" },
    }) as any);
    await new Promise((r) => setTimeout(r, 0));
    handlers.message?.(new MessageEvent("message", {
      data: { type: "warmup" },
    }) as any);
    await new Promise((r) => setTimeout(r, 0));

    expect(posted.find((m) => m.type === "warm")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/sttWorker.test.ts -t "warmup"`
Expected: FAIL.

- [ ] **Step 3: Add warmup handler in sttWorker**

In `src/models/sttWorker.ts`, near the existing message dispatcher,
add:

```typescript
/** Run a 100 ms silent transcription so the encoder graph is warm.
 *  Emits {type:"warm"} on success. */
async function handleWarmup(): Promise<void> {
  try {
    // Sample rate inferred from the worker's existing constant — keep
    // identical to the value used by transcribe() so the silence buffer
    // is the right length.
    const silent = new Float32Array(1600); // 100 ms at 16 kHz
    await transcribeInternal(silent, 16000, "en");
    _postMessage({ type: "warm" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    _postMessage({ type: "error", message: msg });
  }
}
```

> If the worker doesn't already factor out a `transcribeInternal`,
> extract a private function from the existing `transcribe` handler so
> the warmup can call the inference path without invoking the message
> machinery.

Wire `handleWarmup` into the dispatcher.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/sttWorker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/sttWorker.ts src/models/sttWorker.test.ts
git commit -m "feat(stt-worker): handle warmup, emit warm"
```

---

## Task 7: bootModels — eager warmup, handle warm

**Files:**
- Modify: `src/models/bootModels.ts`
- Test: `src/models/bootModels.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/models/bootModels.test.ts`:

```typescript
describe("bootModels — eager warmup", () => {
  it("posts a warmup message to TTS after receiving ready", async () => {
    const posted: any[] = [];
    const fakeWorker = {
      onmessage: null as any,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: (m: any) => posted.push(m),
      terminate: vi.fn(),
    };
    vi.stubGlobal("Worker", vi.fn(() => fakeWorker));

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();

    fakeWorker.onmessage({ data: { type: "ready" } });
    expect(posted.find((m) => m.type === "warmup")).toBeTruthy();
  });

  it("calls markWarm on TTS warm message", async () => {
    const posted: any[] = [];
    const fakeWorker = {
      onmessage: null as any,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      postMessage: (m: any) => posted.push(m),
      terminate: vi.fn(),
    };
    vi.stubGlobal("Worker", vi.fn(() => fakeWorker));

    const { bootTTSWasm } = await import("./bootModels");
    await bootTTSWasm();
    fakeWorker.onmessage({ data: { type: "ready" } });
    fakeWorker.onmessage({ data: { type: "warm" } });

    const mgr = (await import("./modelManager")).getModelManager();
    expect(mgr.isWarm("tts")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/bootModels.test.ts -t "eager warmup"`
Expected: FAIL.

- [ ] **Step 3: Update bootTTSWasm**

In `src/models/bootModels.ts`, replace the `ttsWorker.onmessage` body:

```typescript
    let ttsInitDone = false;
    ttsWorker.onmessage = (e) => {
      if (e.data.type === "ready") {
        ttsInitDone = true;
        mgr.setReady("tts");
        // Eager warmup: download + run a one-shot encoder inference so
        // the user's first cloning attempt isn't gated on a 591 MB fetch.
        ttsWorker.postMessage({ type: "warmup" });
      } else if (e.data.type === "warm") {
        mgr.markWarm("tts");
      } else if (e.data.type === "progress" && e.data.total === -1) {
        console.log(
          `[OwnVoice:TTS] Synthesis EP: ${e.data.loaded ? "WebGPU" : "WASM"}`,
        );
      } else if (e.data.type === "error") {
        if (!ttsInitDone) {
          mgr.setError("tts", e.data.message);
        } else {
          console.error(`[OwnVoice:TTS] synthesis error: ${e.data.message}`);
        }
      }
    };
```

Apply the same `warm`-handling and `warmup` post in `bootSTT` (the
function that creates the STT worker — search for `setReady("stt")`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/bootModels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/bootModels.ts src/models/bootModels.test.ts
git commit -m "feat(boot): eager warmup after ready, mark warm on signal"
```

---

## Task 8: useModels — `isWarm`, rolling rate, humanCountdown

**Files:**
- Modify: `src/hooks/useModels.ts`
- Test: `src/hooks/useModels.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/hooks/useModels.test.ts`:

```typescript
import { renderHook, act } from "@testing-library/preact";
import { useModels } from "./useModels";
import { getModelManager } from "../models/modelManager";

describe("useModels — humanCountdown", () => {
  it("returns 'One moment…' when total is 0", () => {
    const { result } = renderHook(() => useModels());
    expect(result.current.humanCountdown("tts")).toBe("One moment…");
  });

  it("formats 60s as '60s'", () => {
    const mgr = getModelManager();
    // Simulate progress over time with two events 1s apart, 1MB total
    act(() => {
      mgr["updateModel"]("tts", { status: "downloading", loaded: 0, total: 60_000_000 });
    });
    act(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1_700_000_000_000));
      mgr["updateModel"]("tts", { loaded: 1_000_000 });
      vi.setSystemTime(new Date(1_700_000_001_000));
      mgr["updateModel"]("tts", { loaded: 2_000_000 });
    });
    const { result } = renderHook(() => useModels());
    expect(result.current.humanCountdown("tts")).toBe("60s");
  });

  it("returns 'Almost ready…' once 85% is reached", () => {
    const mgr = getModelManager();
    act(() => {
      mgr["updateModel"]("tts", { status: "downloading", loaded: 9_000_000, total: 10_000_000 });
    });
    const { result } = renderHook(() => useModels());
    expect(result.current.humanCountdown("tts")).toBe("Almost ready…");
  });

  it("isWarm reflects manager warm state", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    const { result } = renderHook(() => useModels());
    expect(result.current.isWarm("tts")).toBe(true);
  });
});
```

> Note: directly poking `mgr["updateModel"]` is fine in tests because
> we're verifying observable hook output — the test just needs to
> create representative state. Keep the `as any` cast minimal.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useModels.test.ts`
Expected: FAIL — `humanCountdown` and `isWarm` don't exist on the
hook return value.

- [ ] **Step 3: Extend useModels**

Replace the body of `src/hooks/useModels.ts`:

```typescript
import { useState, useEffect, useRef } from "preact/hooks";
import { getModelManager } from "../models/modelManager";
import type { LoadProgress, ModelId } from "../models/types";

interface RateSample {
  t: number;
  loaded: number;
}

const ALMOST_READY_THRESHOLD = 0.85;
const RATE_SAMPLE_LIMIT = 4;

/** Hook exposing model loading state and progress to UI components */
export function useModels() {
  const [progress, setProgress] = useState<LoadProgress[]>([]);
  const [initialized, setInitialized] = useState(false);
  const samplesRef = useRef<Map<ModelId, RateSample[]>>(new Map());

  useEffect(() => {
    const mgr = getModelManager();
    mgr.init().then(() => setInitialized(true));

    const unsub = mgr.onProgress((p) => {
      const now = Date.now();
      for (const m of p) {
        const arr = samplesRef.current.get(m.model) ?? [];
        const last = arr[arr.length - 1];
        if (!last || last.loaded !== m.loaded) {
          arr.push({ t: now, loaded: m.loaded });
          while (arr.length > RATE_SAMPLE_LIMIT) arr.shift();
          samplesRef.current.set(m.model, arr);
        }
      }
      setProgress(p);
    });
    return unsub;
  }, []);

  const isReady = (id: ModelId): boolean =>
    progress.find((p) => p.model === id)?.status === "ready" ||
    progress.find((p) => p.model === id)?.status === "warm";

  const isWarm = (id: ModelId): boolean =>
    progress.find((p) => p.model === id)?.status === "warm";

  const isLoading = (id: ModelId): boolean => {
    const status = progress.find((p) => p.model === id)?.status;
    return status === "downloading" || status === "loading";
  };

  const getError = (id: ModelId): string | undefined =>
    progress.find((p) => p.model === id)?.error;

  /** Estimated seconds remaining for `id`. Undefined when unknown. */
  const secondsLeft = (id: ModelId): number | undefined => {
    const p = progress.find((m) => m.model === id);
    if (!p || p.total === 0 || p.loaded >= p.total) return undefined;
    const samples = samplesRef.current.get(id) ?? [];
    if (samples.length < 2) return undefined;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return undefined;
    const rate = (last.loaded - first.loaded) / dt;
    if (rate <= 0) return undefined;
    return (p.total - p.loaded) / rate;
  };

  /** "12s" / "Almost ready…" / "1 min" / "One moment…" */
  const humanCountdown = (id: ModelId): string => {
    const p = progress.find((m) => m.model === id);
    if (!p) return "One moment…";
    if (p.total > 0 && p.loaded / p.total >= ALMOST_READY_THRESHOLD) {
      return "Almost ready…";
    }
    const s = secondsLeft(id);
    if (s === undefined) return "One moment…";
    if (s <= 5) return "Almost ready…";
    if (s <= 90) return `${Math.round(s)}s`;
    if (s <= 600) return `${Math.round(s / 60)} min`;
    return "One moment…";
  };

  const totalProgress = (): { loaded: number; total: number } =>
    progress.reduce(
      (acc, p) => ({
        loaded: acc.loaded + p.loaded,
        total: acc.total + p.total,
      }),
      { loaded: 0, total: 0 },
    );

  return {
    initialized,
    progress,
    isReady,
    isWarm,
    isLoading,
    getError,
    secondsLeft,
    humanCountdown,
    totalProgress,
  };
}
```

> Note: `isReady` now also returns true when status is `warm`. This
> is intentional — anything warm is by definition ready. Other
> consumers continue to work.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/useModels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModels.ts src/hooks/useModels.test.ts
git commit -m "feat(useModels): isWarm, secondsLeft, humanCountdown"
```

---

## Task 9: VoiceCapture — replace 5-min timeout with idle watchdog

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Test: `src/components/shared/VoiceCapture.test.tsx`

Solves Bug 2.

- [ ] **Step 1: Write failing test**

Append to `src/components/shared/VoiceCapture.test.tsx`:

```typescript
describe("VoiceCapture — extractEmbedding idle watchdog", () => {
  it("does not timeout while progress events keep arriving", async () => {
    vi.useFakeTimers();
    const handlers = makeFakeWorkerHandlers();
    mockTTSWorker(handlers);

    const promise = (
      await import("./VoiceCapture")
    ).__test__extractEmbedding(new Float32Array(24000), undefined);

    // Pulse a progress event every 30s for 10 minutes — never idle 60s.
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(30_000);
      handlers.message({
        data: { type: "embed-progress", stage: "loading-model", loaded: i + 1, total: 20 },
      });
    }

    handlers.message({
      data: { type: "embedding", data: fakeSpeakerData, requestId: 1 },
    });
    await expect(promise).resolves.toBeTruthy();
  });

  it("times out after 60s of silence", async () => {
    vi.useFakeTimers();
    const handlers = makeFakeWorkerHandlers();
    mockTTSWorker(handlers);

    const promise = (
      await import("./VoiceCapture")
    ).__test__extractEmbedding(new Float32Array(24000), undefined);

    handlers.message({
      data: { type: "embed-progress", stage: "loading-model", loaded: 1, total: 100 },
    });
    vi.advanceTimersByTime(61_000);

    await expect(promise).rejects.toThrow(/taking longer/);
  });
});

// Helpers — implement once at the top of the test file or in a sibling
// test-utils module. Keep them dumb.
function makeFakeWorkerHandlers() {
  let listener: any = null;
  return {
    set message(fn: any) { listener = fn; },
    get message() { return listener; },
  };
}
function mockTTSWorker(handlers: any) {
  // Stub getModelManager().getWorker("tts") to return a worker whose
  // addEventListener captures the listener and whose postMessage is a
  // no-op. Adjust to existing mocks in this file.
  /* see existing mock pattern at src/components/shared/VoiceCapture.test.tsx */
}
const fakeSpeakerData = {
  condEmb: [], condEmbShape: [],
  promptToken: [], promptTokenShape: [],
  speakerEmbeddings: [], speakerEmbeddingsShape: [],
  speakerFeatures: [], speakerFeaturesShape: [],
};
```

> The existing test file already mocks `getModelManager`. Reuse the
> same mock — the helpers above are sketches.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx -t "idle watchdog"`
Expected: FAIL — function doesn't exist or 5-minute timeout still in
place.

- [ ] **Step 3: Replace the timeout in extractEmbedding**

In `src/components/shared/VoiceCapture.tsx`, replace `extractEmbedding`
(around line 173):

```typescript
const IDLE_TIMEOUT_MS = 60_000;
let nextRequestId = 1;

async function extractEmbedding(
  audio: Float32Array,
  onLoadingModel?: () => void,
): Promise<unknown | null> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");

  if (!worker || !mgr.isReady("tts")) {
    return null;
  }

  const requestId = nextRequestId++;

  return new Promise<unknown>((resolve, reject) => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    function resetIdle() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        worker.removeEventListener("message", handler);
        reject(new Error("This is taking longer than expected. Try again."));
      }, IDLE_TIMEOUT_MS);
    }

    const handler = (e: MessageEvent) => {
      const msg = e.data;
      // Only respond to messages tagged with our requestId, except for
      // unsolicited progress events (no requestId on the protocol).
      if (msg.type === "embed-progress" && msg.stage === "loading-model") {
        onLoadingModel?.();
        resetIdle();
        return;
      }
      if (msg.type === "embedding" && msg.requestId === requestId) {
        if (idleTimer) clearTimeout(idleTimer);
        worker.removeEventListener("message", handler);
        resolve(msg.data);
      } else if (msg.type === "error" && msg.requestId === requestId) {
        if (idleTimer) clearTimeout(idleTimer);
        worker.removeEventListener("message", handler);
        reject(new Error(msg.message || "Voice processing failed"));
      }
    };
    worker.addEventListener("message", handler);
    resetIdle();
    worker.postMessage({
      type: "embed",
      audio,
      sampleRate: 24000,
      requestId,
    });
  });
}

// Test hook — keep at module scope so vitest can call it directly.
export const __test__extractEmbedding = extractEmbedding;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/VoiceCapture.tsx src/components/shared/VoiceCapture.test.tsx
git commit -m "fix(voice): idle watchdog instead of hard 5-min timeout (Bug 2, 6)"
```

---

## Task 10: VoiceCapture — retry useEffect waits on `isWarm`

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Test: `src/components/shared/VoiceCapture.test.tsx`

Solves Bug 4.

- [ ] **Step 1: Write failing test**

Append to `src/components/shared/VoiceCapture.test.tsx`:

```typescript
describe("VoiceCapture — retry waits for warm", () => {
  it("does not retry while status is ready but not warm", async () => {
    const mgr = getModelManager();
    mgr.setReady("tts"); // ready but not warm
    const onCapture = vi.fn();
    render(
      <VoiceCapture
        label="t"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={() => {}}
        audioBlob={new Blob([new Uint8Array(1024)])}
      />,
    );
    await sleep(10);
    expect(onCapture).not.toHaveBeenCalled();
  });

  it("retries when warm flips on", async () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    const onCapture = vi.fn();
    render(
      <VoiceCapture
        label="t"
        hasVoice={true}
        onCapture={onCapture}
        onRemove={() => {}}
        audioBlob={new Blob([new Uint8Array(1024)])}
      />,
    );
    act(() => {
      mgr.markWarm("tts");
    });
    await sleep(50);
    expect(onCapture).toHaveBeenCalled();
  });
});

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx -t "retry waits for warm"`
Expected: FAIL — current code retries on `status === "ready"`.

- [ ] **Step 3: Change the retry useEffect to listen on warm**

In `src/components/shared/VoiceCapture.tsx`, around line 267, replace
the body of the retry useEffect:

```typescript
  useEffect(() => {
    if (cloneStatus !== "model-loading" || !hasVoice) return;

    const mgr = getModelManager();
    let handled = false;

    function handleStatus(status: string | undefined, err: string | undefined) {
      if (handled) return;
      if (status === "warm") {
        handled = true;
        retryEmbedding();
      } else if (status === "error") {
        handled = true;
        setCloneStatus("failed");
        setError(err || "Voice model failed to load. The app will use a standard voice.");
      }
    }

    const unsub = mgr.onProgress((progress) => {
      const tts = progress.find((p) => p.model === "tts");
      handleStatus(tts?.status, tts?.error);
    });

    const initial = mgr.getProgress().find((p) => p.model === "tts");
    handleStatus(initial?.status, initial?.error);

    return unsub;
  }, [cloneStatus, hasVoice]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/VoiceCapture.tsx src/components/shared/VoiceCapture.test.tsx
git commit -m "fix(voice): retry waits for warm, not ready (Bug 4)"
```

---

## Task 11: Patient.pendingVoiceBlob field + base64 helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `src/stores/settingsStore.ts`
- Test: `src/stores/settingsStore.test.ts`

Solves Bug 5 (storage half).

- [ ] **Step 1: Add the field to the Patient type**

In `src/types.ts`, after the `speakerData` line in `Patient`:

```typescript
  /** Base64-encoded WebM audio blob captured during enrollment.
   *  Persists until extraction succeeds. Cleared by `clearPatientPendingVoiceBlob`
   *  or by Settings → Reset all data. */
  pendingVoiceBlob?: string | null;
```

- [ ] **Step 2: Write failing test**

Append to `src/stores/settingsStore.test.ts`:

```typescript
describe("settingsStore — pendingVoiceBlob", () => {
  it("setPatientPendingVoiceBlob stores base64 on the patient", () => {
    const store = useSettingsStore.getState();
    const patient = store.addPatient({
      name: "Alex",
      bed: "12",
      patientLang: "en",
      hasVoice: false,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, "ZmFrZQ=="); // base64("fake")
    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.pendingVoiceBlob).toBe("ZmFrZQ==");
  });

  it("clearPatientPendingVoiceBlob removes it", () => {
    const store = useSettingsStore.getState();
    const patient = store.addPatient({
      name: "Alex",
      bed: "12",
      patientLang: "en",
      hasVoice: false,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, "ZmFrZQ==");
    store.clearPatientPendingVoiceBlob(patient.id);
    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.pendingVoiceBlob).toBeFalsy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/stores/settingsStore.test.ts -t "pendingVoiceBlob"`
Expected: FAIL.

- [ ] **Step 4: Add the actions**

In `src/stores/settingsStore.ts`, find the actions block (the methods
returned from the persist `set` callback). Add:

```typescript
  setPatientPendingVoiceBlob: (patientId: string, base64: string) =>
    set((s) => {
      if (!s.cfg) return s;
      const patients = s.cfg.patients.map((p) =>
        p.id === patientId ? { ...p, pendingVoiceBlob: base64 } : p,
      );
      return { cfg: { ...s.cfg, patients } };
    }),

  clearPatientPendingVoiceBlob: (patientId: string) =>
    set((s) => {
      if (!s.cfg) return s;
      const patients = s.cfg.patients.map((p) =>
        p.id === patientId ? { ...p, pendingVoiceBlob: null } : p,
      );
      return { cfg: { ...s.cfg, patients } };
    }),
```

Add the matching method declarations to the store interface above.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/stores/settingsStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/stores/settingsStore.ts src/stores/settingsStore.test.ts
git commit -m "feat(store): pendingVoiceBlob on Patient + setters"
```

---

## Task 12: voiceProcessor — background blob processor

**Files:**
- Create: `src/models/voiceProcessor.ts`
- Create: `src/models/voiceProcessor.test.ts`

Solves Bug 5 (processor half).

- [ ] **Step 1: Write failing test**

Create `src/models/voiceProcessor.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { startVoiceProcessor } from "./voiceProcessor";
import { useSettingsStore } from "../stores/settingsStore";
import { getModelManager } from "./modelManager";

describe("voiceProcessor", () => {
  beforeEach(() => {
    useSettingsStore.setState({ cfg: null, speakerData: null }, true);
  });

  it("processes a patient with pendingVoiceBlob when TTS is warm", async () => {
    const store = useSettingsStore.getState();
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn().mockResolvedValue({ kind: "ok", data: { foo: 1 } });
    const stop = startVoiceProcessor({ extract: extractor });

    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    await new Promise((r) => setTimeout(r, 10));

    expect(extractor).toHaveBeenCalled();
    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.speakerData).toEqual({ foo: 1 });
    expect(updated?.pendingVoiceBlob).toBeFalsy();
    stop();
  });

  it("does not run while TTS is not warm", async () => {
    const store = useSettingsStore.getState();
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn();
    const stop = startVoiceProcessor({ extract: extractor });
    await new Promise((r) => setTimeout(r, 10));
    expect(extractor).not.toHaveBeenCalled();
    stop();
  });

  it("keeps pendingVoiceBlob on extraction failure", async () => {
    const store = useSettingsStore.getState();
    const patient = store.addPatient({
      name: "A",
      bed: "1",
      patientLang: "en",
      hasVoice: true,
      speakerData: null,
    });
    store.setPatientPendingVoiceBlob(patient.id, btoa("fake-audio"));

    const extractor = vi.fn().mockResolvedValue({ kind: "fail", reason: "noisy" });
    const stop = startVoiceProcessor({ extract: extractor });
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    await new Promise((r) => setTimeout(r, 10));

    const updated = useSettingsStore
      .getState()
      .cfg!.patients.find((p) => p.id === patient.id);
    expect(updated?.pendingVoiceBlob).toBeTruthy();
    expect(updated?.speakerData).toBeFalsy();
    stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/models/voiceProcessor.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement voiceProcessor**

Create `src/models/voiceProcessor.ts`:

```typescript
import { useSettingsStore } from "../stores/settingsStore";
import { getModelManager } from "./modelManager";
import { decodeAudioFromBase64 } from "./audioDecode";

type ExtractResult =
  | { kind: "ok"; data: unknown }
  | { kind: "fail"; reason: string };

interface ProcessorOptions {
  /** Inject a custom extractor for testing. Defaults to the production
   *  extractEmbedding pipeline. */
  extract?: (audio: Float32Array) => Promise<ExtractResult>;
}

/** Start the background processor. Returns a stop function.
 *  Subscribes to ModelManager warm events and the settings store, runs
 *  extraction on any patient with `pendingVoiceBlob` once TTS is warm.
 *  Idempotent — multiple calls are no-ops. */
export function startVoiceProcessor(opts: ProcessorOptions = {}): () => void {
  const extract = opts.extract ?? defaultExtract;
  const inFlight = new Set<string>();

  async function tick() {
    const mgr = getModelManager();
    if (!mgr.isWarm("tts")) return;
    const cfg = useSettingsStore.getState().cfg;
    if (!cfg) return;

    for (const p of cfg.patients) {
      if (!p.pendingVoiceBlob || inFlight.has(p.id)) continue;
      if (p.speakerData) continue; // already processed elsewhere

      inFlight.add(p.id);
      try {
        const audio = await decodeAudioFromBase64(p.pendingVoiceBlob);
        const result = await extract(audio);
        const store = useSettingsStore.getState();
        if (result.kind === "ok") {
          // Update the patient by id.
          useSettingsStore.setState((s) => {
            if (!s.cfg) return s;
            const patients = s.cfg.patients.map((pp) =>
              pp.id === p.id
                ? { ...pp, speakerData: result.data, pendingVoiceBlob: null }
                : pp,
            );
            return { ...s, cfg: { ...s.cfg, patients } };
          });
        } else {
          console.warn(
            `[OwnVoice:VoiceProcessor] Extraction failed for ${p.id}: ${result.reason}`,
          );
        }
      } catch (err) {
        console.error("[OwnVoice:VoiceProcessor] tick error", err);
      } finally {
        inFlight.delete(p.id);
      }
    }
  }

  const unsubModel = getModelManager().onProgress(() => {
    void tick();
  });
  const unsubStore = useSettingsStore.subscribe(() => {
    void tick();
  });

  void tick();

  return () => {
    unsubModel();
    unsubStore();
  };
}

/** Default production extractor — wraps the TTS worker's embed call. */
async function defaultExtract(audio: Float32Array): Promise<ExtractResult> {
  // Imported lazily to break a potential circular import.
  const { runEmbedOnWorker } = await import("./voiceProcessorImpl");
  try {
    const data = await runEmbedOnWorker(audio);
    return { kind: "ok", data };
  } catch (err) {
    return {
      kind: "fail",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
```

Create the small audio-decode helper at `src/models/audioDecode.ts`:

```typescript
/** Decode a base64 audio blob into a 24 kHz mono Float32Array.
 *  Same target sample rate as VoiceCapture's existing decodeAudio. */
export async function decodeAudioFromBase64(
  base64: string,
): Promise<Float32Array> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ctx = new AudioContext({ sampleRate: 24000 });
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  const channelData = audioBuffer.getChannelData(0);
  ctx.close();
  return new Float32Array(channelData);
}
```

Create `src/models/voiceProcessorImpl.ts`:

```typescript
import { getModelManager } from "./modelManager";

let nextRequestId = 1;
const IDLE_TIMEOUT_MS = 60_000;

/** Run an embed call against the TTS worker. Mirrors VoiceCapture's
 *  extractEmbedding but lives in the model layer so the store-side
 *  processor can use it without depending on the UI. */
export function runEmbedOnWorker(audio: Float32Array): Promise<unknown> {
  const mgr = getModelManager();
  const worker = mgr.getWorker("tts");
  if (!worker || !mgr.isWarm("tts")) {
    return Promise.reject(new Error("TTS worker not warm"));
  }
  const requestId = nextRequestId++;

  return new Promise((resolve, reject) => {
    let idle: ReturnType<typeof setTimeout> | null = null;
    function resetIdle() {
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => {
        worker.removeEventListener("message", handler);
        reject(new Error("Voice processing is taking longer than expected."));
      }, IDLE_TIMEOUT_MS);
    }
    const handler = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "embed-progress") return resetIdle();
      if (m.type === "embedding" && m.requestId === requestId) {
        if (idle) clearTimeout(idle);
        worker.removeEventListener("message", handler);
        resolve(m.data);
      } else if (m.type === "error" && m.requestId === requestId) {
        if (idle) clearTimeout(idle);
        worker.removeEventListener("message", handler);
        reject(new Error(m.message));
      }
    };
    worker.addEventListener("message", handler);
    resetIdle();
    worker.postMessage({
      type: "embed",
      audio,
      sampleRate: 24000,
      requestId,
    });
  });
}
```

> The duplication between `runEmbedOnWorker` and VoiceCapture's
> `extractEmbedding` is intentional in this task — they have different
> dependency surfaces (one imports from UI, one from store). Task 14
> revisits them.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/models/voiceProcessor.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the processor into app boot**

In `src/main-app.tsx`, after the settings store hydrates (look for the
existing `_hasHydrated` gate), call `startVoiceProcessor()`:

```typescript
import { startVoiceProcessor } from "./models/voiceProcessor";

// inside the component or top-level effect that runs after hydration:
startVoiceProcessor();
```

- [ ] **Step 6: Commit**

```bash
git add src/models/voiceProcessor.ts src/models/voiceProcessorImpl.ts src/models/audioDecode.ts src/models/voiceProcessor.test.ts src/main-app.tsx
git commit -m "feat(voice): background processor for pendingVoiceBlob (Bug 5)"
```

---

## Task 13: VoiceCapture — persist blob to patient record at capture

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Modify: `src/components/settings/Setup.tsx`
- Test: `src/components/settings/Setup.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `src/components/settings/Setup.test.tsx`:

```typescript
describe("Setup — voice capture persistence", () => {
  it("stores pendingVoiceBlob on the patient before extraction completes", async () => {
    // Arrange: TTS not warm.
    const mgr = getModelManager();
    mgr.setReady("tts"); // ready but not warm

    render(<Setup mode="first-run" onFirstRunDone={vi.fn()} />);

    // Walk to Voice step, simulate a record completion.
    // (Use existing test-id selectors to drive the wizard.)
    await advanceToVoiceStep();
    await fireRecordingComplete(new Blob([new Uint8Array(1024)], { type: "audio/webm" }));

    // Walk past Voice step without waiting for warm.
    await clickContinue();
    await clickContinue();
    await clickStart(); // Setup.finish()

    // Assert: the patient was added with a pendingVoiceBlob.
    const patient = useSettingsStore.getState().cfg!.patients[0];
    expect(patient.pendingVoiceBlob).toBeTruthy();
    expect(patient.speakerData).toBeFalsy();
  });
});
```

> The exact selectors / helpers depend on the existing Setup test
> harness. Reuse what's there. If a helper doesn't exist, add it
> alongside this test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/settings/Setup.test.tsx -t "voice capture persistence"`
Expected: FAIL — patient has no pendingVoiceBlob.

- [ ] **Step 3: Make VoiceCapture surface the raw blob alongside embedding**

`onCapture` already receives `(blob, embedding)`. The blob is enough —
no signature change needed. We need Setup to base64-encode the blob
and stash it.

In `src/components/settings/Setup.tsx`, update the `StepVoice`'s
`onCapture` callback (around line 557):

```typescript
        onCapture={async (blob, embedding) => {
          setPatientVoice(true);
          if (embedding) setSpeakerData(embedding);
          // Stash the raw blob as base64 so wizard finish doesn't lose
          // it if extraction is still in flight.
          const base64 = await blobToBase64(blob);
          setPendingBlob(base64);
        }}
```

Add a helper at the bottom of the file:

```typescript
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // strip "data:audio/webm;base64,"
      const base64 = dataUrl.split(",", 2)[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
```

Add `pendingBlob` state at the top of `Setup`:

```typescript
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);
```

In the `finish` function (line 116), include it on the new patient:

```typescript
  function finish() {
    if (isAddPatient) {
      audioCacheRunner.pauseAll();
      const patient = useSettingsStore.getState().addPatient({
        name,
        bed,
        patientLang: lang,
        hasVoice: patientVoice,
        speakerData: speakerData ?? null,
        fallbackVoice,
        pendingVoiceBlob: pendingBlob,
      });
      onAddPatientDone?.(patient);
    } else {
      const now = Date.now();
      const patient: Patient = {
        id: crypto.randomUUID(),
        name,
        bed,
        patientLang: lang,
        hasVoice: patientVoice,
        speakerData: speakerData ?? null,
        fallbackVoice,
        pendingVoiceBlob: pendingBlob,
        addedAt: now,
        lastActiveAt: now,
      };
      onFirstRunDone?.({
        caregiverLang: "en",
        pin,
        providers,
        patients: [patient],
        activePatientId: patient.id,
      });
    }
  }
```

> Update the `addPatient` argument type in `settingsStore.ts` to accept
> the optional `pendingVoiceBlob` field.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/settings/Setup.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/Setup.tsx src/components/settings/Setup.test.tsx src/stores/settingsStore.ts
git commit -m "feat(setup): persist captured blob into patient record (Bug 5)"
```

---

## Task 14: Locale strings

**Files:**
- Modify: `src/data/locales/en.ts`

- [ ] **Step 1: Add the new keys**

In `src/data/locales/en.ts`, append to the phrase table:

```typescript
  // Model readiness — verb-led, plain language. Never use "model",
  // "encoder", "AI", "STT", "TTS", "weights", "download".
  "ui.readiness.listen.not_ready": "Getting ready to listen",
  "ui.readiness.listen.with_countdown": "Getting ready to listen — {countdown}",
  "ui.readiness.listen.almost": "Almost ready…",
  "ui.readiness.listen.ready": "Tap to listen",
  "ui.readiness.listen.failed_message": "Couldn't get ready",
  "ui.readiness.listen.failed_action": "Try again",

  "ui.readiness.voice_capture.precapture_hint": "Voice will start as soon as it's ready",
  "ui.readiness.voice_capture.saving": "Saving your voice — about {countdown} left",
  "ui.readiness.voice_capture.saving_almost": "Almost ready…",
  "ui.readiness.voice_capture.ready": "Voice ready",
  "ui.readiness.voice_capture.failed_message": "Couldn't prepare your voice",
  "ui.readiness.voice_capture.failed_action": "Try again",

  "ui.patient.header.voice_status.not_ready":
    "Using a temporary voice while yours gets ready — {countdown}",
  "ui.patient.header.voice_status.almost":
    "Almost ready — using a temporary voice",
  "ui.patient.header.voice_status.failed_message":
    "Couldn't prepare your voice",
  "ui.patient.header.voice_status.failed_action": "Try again",
```

> If the file uses a typed `PhraseKey` union, the new keys are picked
> up automatically. Do not break other locales — for any locale file
> that imports the `en` map for fallback, the new keys fall through.

- [ ] **Step 2: Run type-check**

Run: `npm run build`
Expected: PASS, or only errors related to consumers we haven't updated yet (those are addressed in following tasks).

- [ ] **Step 3: Commit**

```bash
git add src/data/locales/en.ts
git commit -m "i18n: plain-language readiness strings"
```

---

## Task 15: ListenPanel — gate mic button on `isWarm("stt")`

**Files:**
- Modify: `src/components/provider/ListenPanel.tsx`
- Test: `src/components/provider/ListenPanel.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `src/components/provider/ListenPanel.test.tsx`:

```typescript
describe("ListenPanel — STT readiness gating", () => {
  it("disables the mic button while STT is not warm", () => {
    const mgr = getModelManager();
    // not warm
    render(<ListenPanel {...baseProps} />);
    const btn = screen.getByRole("button", {
      name: /Getting ready to listen/i,
    });
    expect(btn).toBeDisabled();
  });

  it("enables the mic button when STT is warm", () => {
    const mgr = getModelManager();
    mgr.setReady("stt");
    mgr.markWarm("stt");
    render(<ListenPanel {...baseProps} />);
    expect(
      screen.getByRole("button", { name: /Tap to listen/i }),
    ).not.toBeDisabled();
  });

  it("shows a Try again button on failure", () => {
    const mgr = getModelManager();
    mgr.setError("stt", "boom");
    render(<ListenPanel {...baseProps} />);
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/provider/ListenPanel.test.tsx -t "STT readiness gating"`
Expected: FAIL.

- [ ] **Step 3: Add the gate**

In `src/components/provider/ListenPanel.tsx`, add at the top:

```typescript
import { useModels } from "../../hooks/useModels";
```

Inside the component, after the existing destructuring of `useMicrophone`:

```typescript
  const { isWarm, getError, humanCountdown } = useModels();
  const sttWarm = isWarm("stt");
  const sttError = getError("stt");
  const countdown = humanCountdown("stt");

  const micLabel = sttError
    ? resolvePhrase("ui.readiness.listen.failed_message", caregiverLang)
    : !sttWarm
      ? resolvePhrase(
          "ui.readiness.listen.with_countdown",
          caregiverLang,
        ).replace("{countdown}", countdown)
      : resolvePhrase("ui.readiness.listen.ready", caregiverLang);

  const micDisabled = !sttWarm || !!sttError;
```

Update the mic button to use `micDisabled` and `micLabel`:

```typescript
          <Btn
            onClick={() => {
              if (micDisabled) return;
              if (listening) {
                stopCapture();
              } else {
                setEditedTranscript(null);
                startCapture();
              }
            }}
            disabled={micDisabled}
            style={micBtnStyle}
            aria-label={micLabel}
          >
            🎙
          </Btn>
```

If `sttError` is truthy, render a recovery button below the mic:

```typescript
          {sttError && (
            <Btn
              onClick={() => {
                // Re-trigger boot — easiest path is to send the worker
                // another warmup. If it failed at init time, the
                // recovery path is opening Settings → Prepare for offline.
                const worker = getModelManager().getWorker("stt");
                worker?.postMessage({ type: "warmup" });
              }}
              style={{
                marginTop: 8,
                padding: "10px 16px",
                borderRadius: 12,
                background: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                minHeight: 44,
              }}
            >
              {resolvePhrase("ui.readiness.listen.failed_action", caregiverLang)}
            </Btn>
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/provider/ListenPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/provider/ListenPanel.tsx src/components/provider/ListenPanel.test.tsx
git commit -m "feat(listen): gate mic button on STT warm state"
```

---

## Task 16: VoiceCapture — pre-capture hint + plain-language status copy

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Test: `src/components/shared/VoiceCapture.test.tsx`

- [ ] **Step 1: Write failing test**

Append to `src/components/shared/VoiceCapture.test.tsx`:

```typescript
describe("VoiceCapture — pre-capture readiness hint", () => {
  it("shows the hint when TTS is not warm", () => {
    const mgr = getModelManager();
    mgr.setReady("tts"); // not warm
    render(<VoiceCapture label="t" hasVoice={false} onCapture={() => {}} onRemove={() => {}} />);
    expect(
      screen.getByText(/Voice will start as soon as it's ready/i),
    ).toBeInTheDocument();
  });

  it("hides the hint when TTS is warm", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    render(<VoiceCapture label="t" hasVoice={false} onCapture={() => {}} onRemove={() => {}} />);
    expect(
      screen.queryByText(/Voice will start as soon as it's ready/i),
    ).toBeNull();
  });
});

describe("VoiceCapture — plain-language status copy", () => {
  it("shows 'Saving your voice — about ...' during deferred processing", () => {
    const mgr = getModelManager();
    mgr.setReady("tts"); // not warm
    render(
      <VoiceCapture
        label="t"
        hasVoice={true}
        onCapture={() => {}}
        onRemove={() => {}}
        audioBlob={new Blob([new Uint8Array(1024)])}
      />,
    );
    expect(
      screen.getByText(/Saving your voice/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx -t "pre-capture readiness hint"`
Expected: FAIL.

- [ ] **Step 3: Add the hint and the copy mapping**

In `src/components/shared/VoiceCapture.tsx`:

Import the hook at the top:

```typescript
import { useModels } from "../../hooks/useModels";
```

In the default render (around line 1289 — the upload/record buttons
return), conditionally render the hint:

```typescript
  const { isWarm, humanCountdown } = useModels();
  const ttsWarm = isWarm("tts");
  const countdown = humanCountdown("tts");

  // ... default render ...
  return (
    <div>
      {fileInput}
      <div style={{ display: "flex", gap: btnFloor.gap }}>
        {/* existing record/upload buttons unchanged */}
      </div>
      {!ttsWarm && (
        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: 8,
            fontSize: 13,
            color: c.sub,
          }}
        >
          {resolvePhrase("ui.readiness.voice_capture.precapture_hint", caregiverLang)}
        </p>
      )}
      {error && <ErrorRow compact={compact} message={error} />}
    </div>
  );
```

Replace the `CloneStatusBadge`'s "model-loading" branch with the
plain-language copy:

```typescript
    if (cloneStatus === "model-loading") {
      const text = ttsWarm
        ? resolvePhrase("ui.readiness.voice_capture.saving_almost", caregiverLang)
        : resolvePhrase(
            "ui.readiness.voice_capture.saving",
            caregiverLang,
          ).replace("{countdown}", countdown);
      return (
        <span
          role="status"
          aria-live="polite"
          style={{ ...base, color: "#92400E", background: "#FEF3C7" }}
        >
          <span aria-hidden="true">{"⏳"}</span> {text}
        </span>
      );
    }
```

In the failure branch, the existing badge + retry button already
match the design — just swap the message phrase:

```typescript
    if (cloneStatus === "failed") {
      return (
        <span style={{ ...base, color: "#991B1B", background: "#FEE2E2" }}>
          <span aria-hidden="true">{"⚠️"}</span>{" "}
          {resolvePhrase("ui.readiness.voice_capture.failed_message", caregiverLang)}
        </span>
      );
    }
```

The retry button label uses `ui.readiness.voice_capture.failed_action`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/shared/VoiceCapture.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/VoiceCapture.tsx src/components/shared/VoiceCapture.test.tsx
git commit -m "feat(voice): pre-capture hint + plain-language status copy"
```

---

## Task 17: PatientVoiceStatus component

**Files:**
- Create: `src/components/layout/PatientVoiceStatus.tsx`
- Create: `src/components/layout/PatientVoiceStatus.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/layout/PatientVoiceStatus.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import { PatientVoiceStatus } from "./PatientVoiceStatus";
import { getModelManager } from "../../models/modelManager";

const patient = {
  id: "p1",
  name: "Alex",
  bed: "12",
  patientLang: "en",
  hasVoice: true,
  speakerData: null,
  pendingVoiceBlob: "ZmFrZQ==",
  addedAt: Date.now(),
  lastActiveAt: Date.now(),
};

describe("PatientVoiceStatus", () => {
  beforeEach(() => {
    getModelManager()["models"].tts.status = "downloading";
    getModelManager()["models"].tts.loaded = 0;
    getModelManager()["models"].tts.total = 100;
  });

  it("renders 'Using a temporary voice' when not warm", () => {
    render(<PatientVoiceStatus patient={patient as any} />);
    expect(screen.getByText(/Using a temporary voice/i)).toBeInTheDocument();
  });

  it("hides when warm and speakerData is set", () => {
    const mgr = getModelManager();
    mgr.setReady("tts");
    mgr.markWarm("tts");
    const ready = { ...patient, speakerData: { foo: 1 }, pendingVoiceBlob: null };
    const { container } = render(<PatientVoiceStatus patient={ready as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a Try again button on failure", () => {
    const mgr = getModelManager();
    mgr.setError("tts", "boom");
    render(<PatientVoiceStatus patient={patient as any} />);
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeInTheDocument();
  });

  it("status pill is not a button", () => {
    render(<PatientVoiceStatus patient={patient as any} />);
    const pill = screen.getByRole("status");
    expect(pill.tagName).not.toBe("BUTTON");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/layout/PatientVoiceStatus.test.tsx`
Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Create the component**

Create `src/components/layout/PatientVoiceStatus.tsx`:

```typescript
import type { JSX } from "preact";
import type { Patient } from "../../types";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useModels } from "../../hooks/useModels";
import { getModelManager } from "../../models/modelManager";

interface Props {
  patient: Patient;
}

export function PatientVoiceStatus({ patient }: Props): JSX.Element | null {
  const { isWarm, getError, humanCountdown } = useModels();

  // Only show when the patient has opted in to a voice clone but the
  // clone hasn't been computed yet.
  const needsClone = patient.hasVoice && !patient.speakerData;
  if (!needsClone) return null;

  const ttsWarm = isWarm("tts");
  const ttsError = getError("tts");
  const lang = patient.patientLang;

  if (ttsError) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginInlineStart: 12,
        }}
      >
        <span
          role="status"
          aria-live="polite"
          style={pillStyle("error")}
        >
          {resolvePhrase(
            "ui.patient.header.voice_status.failed_message",
            lang,
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            getModelManager().getWorker("tts")?.postMessage({ type: "warmup" });
          }}
          style={recoveryButtonStyle()}
        >
          {resolvePhrase(
            "ui.patient.header.voice_status.failed_action",
            lang,
          )}
        </button>
      </div>
    );
  }

  const countdown = humanCountdown("tts");
  const message = ttsWarm
    ? resolvePhrase("ui.patient.header.voice_status.almost", lang)
    : resolvePhrase(
        "ui.patient.header.voice_status.not_ready",
        lang,
      ).replace("{countdown}", countdown);

  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        ...pillStyle("info"),
        marginInlineStart: 12,
      }}
    >
      {message}
    </span>
  );
}

function pillStyle(variant: "info" | "error"): JSX.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: 999,
    color: variant === "error" ? "#991B1B" : "#1F2937",
    background: variant === "error" ? "#FEE2E2" : "#F3F4F6",
    minHeight: 32,
    maxWidth: 320,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function recoveryButtonStyle(): JSX.CSSProperties {
  return {
    minHeight: 44,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #DC2626",
    background: "#FFFFFF",
    color: "#991B1B",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/layout/PatientVoiceStatus.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/PatientVoiceStatus.tsx src/components/layout/PatientVoiceStatus.test.tsx
git commit -m "feat(layout): PatientVoiceStatus header badge"
```

---

## Task 18: Wire PatientVoiceStatus into the header

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Test: `src/components/layout/Header.test.tsx`

- [ ] **Step 1: Locate the patient pill render site**

Find the place where `PatientPill` is rendered inside the Header
component. Render `PatientVoiceStatus` as its sibling so they share
flow:

```typescript
import { PatientVoiceStatus } from "./PatientVoiceStatus";

// inside the JSX where PatientPill is rendered:
<>
  <PatientPill {...pillProps} />
  {activePatient && <PatientVoiceStatus patient={activePatient} />}
</>
```

Wrap the pair in a flex container that wraps to a second row when the
viewport is too narrow:

```typescript
<div
  style={{
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  }}
>
  <PatientPill {...pillProps} />
  {activePatient && <PatientVoiceStatus patient={activePatient} />}
</div>
```

- [ ] **Step 2: Add a header test for the wiring**

Append to `src/components/layout/Header.test.tsx`:

```typescript
it("renders PatientVoiceStatus next to PatientPill when patient needs clone", () => {
  const mgr = getModelManager();
  mgr.setReady("tts"); // not warm
  // Configure the test settings so cfg.patients[0] has hasVoice: true and speakerData: null
  // (use existing setup helpers in this file).
  render(<Header {...baseProps} />);
  expect(
    screen.getByText(/Using a temporary voice/i),
  ).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/components/layout/Header.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/Header.test.tsx
git commit -m "feat(layout): render PatientVoiceStatus alongside PatientPill"
```

---

## Task 19: Run the full suite + manual smoke tests

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS for all suites.

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Manual smoke tests**

Start dev server: `npm run dev`

Verify each:
1. **Cold-start cloning on a throttled connection.** DevTools → Network
   → Slow 3G. Open Settings → Setup → Voice. Buttons remain enabled.
   Pre-capture hint visible. Record 15 s → countdown shows on the
   status badge → eventually flips to "Voice ready". No "timed out"
   error.
2. **Wizard finish before warm.** Throttled connection. Walk the
   wizard quickly past Voice. Confirm patient is created. After warm
   completes, the Patient header badge disappears and tapping a
   phrase uses the patient's cloned voice.
3. **Listen mic gating.** Open Listen panel before STT warm. Mic
   button is disabled with "Getting ready to listen — Xs". After
   warm, button enables and reads "Tap to listen".
4. **Failure recovery.** DevTools → offline mode mid-warmup. Mic shows
   "Couldn't get ready" with a "Try again" button. Tapping it re-tries.
5. **Patient header badge in dark mode + RTL.** Switch theme; switch
   patient language to Arabic. Badge wraps, doesn't truncate.
6. **Reset.** Settings → Reset all → confirm pendingVoiceBlob,
   speakerData, OPFS all cleared.

Document any failures and fix in a follow-up commit.

- [ ] **Step 4: Final commit if needed**

If any code changes were necessary during smoke tests, commit them
with a descriptive message tied to the failure.

---

## Self-Review Notes

- Spec coverage: every fix in the "Underlying bugs" section maps to a
  task: Bug 1 → Tasks 1+4+7, Bug 2 → Task 9, Bug 3 → Task 3, Bug 4 →
  Task 10, Bug 5 → Tasks 11+12+13, Bug 6 → Tasks 5+9. Verb-led copy
  table → Task 14. Listen gate → Task 15. VoiceCapture pre-capture +
  copy → Task 16. PatientVoiceStatus → Tasks 17+18. AAA a11y is
  enforced inside individual component tasks (`role="status"`,
  `aria-live="polite"`, 44 px buttons, contrast token reuse).
- Type names checked across tasks: `markWarm`, `isWarm`, `humanCountdown`,
  `secondsLeft`, `pendingVoiceBlob`, `setPatientPendingVoiceBlob`,
  `clearPatientPendingVoiceBlob`, `startVoiceProcessor`,
  `runEmbedOnWorker`, `decodeAudioFromBase64`. All consistent across
  the tasks that introduce/use them.
- The duplication between `runEmbedOnWorker` (Task 12) and
  `extractEmbedding` (Task 9) is acknowledged and intentional — the UI
  copy and the store-side copy have different dependency surfaces.
  Future refactor only if both grow further.
