# Offline Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OwnVoice's model + asset storage robust for hospital deployment with spotty wifi and infrequent updates: resumable downloads to OPFS, boot-time integrity verification, clinician-facing "Prepare for offline" flow, and a split service-worker strategy that lets shell bugfixes ship independently from ~1.1 GB of immutable model weights.

**Architecture:** A hand-written `models-manifest.json` is the single source of truth for expected model files + byte sizes. A new `resumableDownload()` primitive streams bytes directly into OPFS with `_progress.json` as the resume marker, using `Range: bytes=N-` on retries and `cache: "no-store"` to bypass the service worker. `ModelManager` becomes OPFS-authoritative: it downloads, verifies ONNX magic + sizes, and exposes File handles. The service worker gains a `/models/*` interceptor that serves directly from OPFS (single copy of the bytes), plus a split fetch strategy — stale-while-revalidate for the app shell, cache-first-immutable for other static assets. A clinician-facing "Prepare for offline" Settings section runs the primer with progress + per-file status and surfaces `navigator.storage.estimate()` health.

**Tech Stack:** TypeScript, Preact, Vite, Vitest, OPFS (`FileSystemDirectoryHandle`), Cache API, service workers, `navigator.storage`, ESLint with `jsx-a11y`.

**Files touched:**
- Create: `public/models-manifest.json` — expected files, byte sizes, magic bytes per model
- Create: `src/models/modelsManifest.ts` — manifest type + loader + validators
- Create: `src/models/modelsManifest.test.ts`
- Create: `src/models/resumableDownload.ts` — streaming chunked download with Range resumption
- Create: `src/models/resumableDownload.test.ts`
- Create: `src/models/integrityCheck.ts` — ONNX magic + size validation against manifest
- Create: `src/models/integrityCheck.test.ts`
- Create: `src/models/offlinePrimer.ts` — orchestrates download + verify across all models, emits progress
- Create: `src/models/offlinePrimer.test.ts`
- Create: `src/hooks/useStorageHealth.ts` — navigator.storage.estimate() polling hook
- Create: `src/hooks/useStorageHealth.test.ts`
- Create: `src/stores/offlineStore.ts` — Zustand store for primer/verify state
- Create: `src/stores/offlineStore.test.ts`
- Create: `src/components/settings/sections/OfflineReadinessSection.tsx`
- Create: `src/components/settings/sections/OfflineReadinessSection.test.tsx`
- Modify: `src/models/modelManager.ts` — rewrite `downloadAndCache` on top of `resumableDownload`; add `verifyOPFSCache`
- Modify: `src/models/modelManager.test.ts` — update download tests; add verify tests
- Modify: `src/models/bootModels.ts` — run `verifyOPFSCache` at boot; defer worker creation until pass
- Modify: `src/models/bootModels.test.ts` — cover verify-gating
- Modify: `public/sw.js` — add OPFS proxy for `/models/*`; split SWR for shell, cache-first-immutable for everything else; bump `CACHE_NAME`
- Modify: `src/components/settings/SettingsPanel.tsx` — mount `OfflineReadinessSection`
- Modify: `src/stores/resetAll.ts` — also reset `offlineStore`
- Modify: `src/stores/resetAll.test.ts` — cover new reset
- Modify: `CLAUDE.md` — brief note on the OPFS-authoritative / SW-proxy model

**Assumptions locked in:**
- Models ship in `public/models/` as today. No CDN flip in this plan.
- Manifest is hand-written per model, not generated from a build step. A model update = one PR that bumps the manifest.
- OPFS is authoritative after primer runs; Cache API no longer stores model bytes (SW proxies them from OPFS).
- WebGPU path in `ttsEngine.ts` and `public/tts-gpu-worker.js` keeps its URL-based loading — the SW proxy change is transparent to it. No worker code changes in this plan.
- iPadOS 26 / Safari 26 support `FileSystemDirectoryHandle` inside service workers. Verify during Task 7 by running in-browser.
- Background sync is out of scope — tracked as a follow-up plan.
- No feature flag. Work lands behind a new branch, rollback = revert merge.

---

## Task 1: Ship the models manifest

**Why this is first:** Everything downstream (resumable downloads know their target size; integrity checks know expected magic bytes; the primer iterates this list) consumes the manifest. Lock its shape before writing anything that depends on it.

**Files:**
- Create: `public/models-manifest.json`
- Create: `src/models/modelsManifest.ts`
- Create: `src/models/modelsManifest.test.ts`

- [ ] **Step 1: Inspect current model file sizes**

Run to populate the manifest accurately:
```bash
find public/models -type f \( -name '*.onnx' -o -name '*.onnx_data' -o -name '*.json' \) -exec stat -f '%N %z' {} \;
```
Record the output — these bytes are the ground truth for the manifest.

- [ ] **Step 2: Write `public/models-manifest.json`**

```json
{
  "version": 1,
  "models": {
    "tts": {
      "baseUrl": "/models/chatterbox-turbo/",
      "files": [
        { "name": "embed_tokens_q4f16.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "embed_tokens_q4f16.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "embed_tokens_q4f16_webgpu.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "embed_tokens_q4f16_webgpu.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "language_model_q4f16.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "language_model_q4f16.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "language_model_q4f16_webgpu.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "language_model_q4f16_webgpu.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "conditional_decoder_q4f16.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "conditional_decoder_q4f16.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "conditional_decoder_q4f16_webgpu.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "conditional_decoder_q4f16_webgpu.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "speech_encoder_q4f16.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "tokenizer.json", "size": <from step 1>, "magic": "json" }
      ]
    },
    "llm": {
      "baseUrl": "/models/lfm2-1.2b-instruct/",
      "files": [
        { "name": "model_q4.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "model_q4.onnx_data", "size": <from step 1>, "magic": null },
        { "name": "tokenizer.json", "size": <from step 1>, "magic": "json" },
        { "name": "config.json", "size": <from step 1>, "magic": "json" },
        { "name": "chat_template.jinja", "size": <from step 1>, "magic": null }
      ]
    },
    "stt": {
      "baseUrl": "/models/whisper-small/",
      "files": [
        { "name": "encoder_model_q4.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "decoder_model_merged_q4.onnx", "size": <from step 1>, "magic": "onnx" },
        { "name": "tokenizer.json", "size": <from step 1>, "magic": "json" }
      ]
    }
  }
}
```

Replace every `<from step 1>` with the number from the `stat` output. Sizes must be exact.

- [ ] **Step 3: Write the failing test for manifest loader shape**

`src/models/modelsManifest.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadManifest, type ModelsManifest } from "./modelsManifest";

describe("loadManifest", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).endsWith("/models-manifest.json")) {
        return new Response(
          JSON.stringify({
            version: 1,
            models: {
              tts: {
                baseUrl: "/models/tts/",
                files: [{ name: "a.onnx", size: 100, magic: "onnx" }],
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  it("returns a typed manifest", async () => {
    const manifest: ModelsManifest = await loadManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.models.tts.files[0].name).toBe("a.onnx");
  });

  it("rejects unknown version", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ version: 99, models: {} }), { status: 200 }),
    ) as typeof fetch;
    await expect(loadManifest()).rejects.toThrow(/version/i);
  });
});
```

Run: `npm test -- modelsManifest.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the manifest loader**

`src/models/modelsManifest.ts`:
```ts
export type ModelId = "tts" | "llm" | "stt";

export interface ManifestFile {
  /** Filename relative to the model baseUrl. */
  name: string;
  /** Exact byte size. Integrity checks compare against this. */
  size: number;
  /** "onnx" for ONNX Runtime files, "json" for JSON, null for raw data blobs. */
  magic: "onnx" | "json" | null;
}

export interface ManifestModel {
  /** URL prefix under which all files live. */
  baseUrl: string;
  files: ManifestFile[];
}

export interface ModelsManifest {
  version: 1;
  models: Record<ModelId, ManifestModel>;
}

const MANIFEST_URL = "/models-manifest.json";

/** Fetch + validate the shipped manifest. Throws on any shape mismatch. */
export async function loadManifest(): Promise<ModelsManifest> {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`manifest fetch failed: HTTP ${response.status}`);
  }
  const raw = (await response.json()) as unknown;
  if (!raw || typeof raw !== "object") {
    throw new Error("manifest is not an object");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`unsupported manifest version: ${String(obj.version)}`);
  }
  if (!obj.models || typeof obj.models !== "object") {
    throw new Error("manifest.models missing");
  }
  return obj as unknown as ModelsManifest;
}

/** Total expected bytes across all files of a model. */
export function totalBytes(model: ManifestModel): number {
  return model.files.reduce((sum, f) => sum + f.size, 0);
}
```

- [ ] **Step 5: Run tests and confirm pass**

Run: `npm test -- modelsManifest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add public/models-manifest.json src/models/modelsManifest.ts src/models/modelsManifest.test.ts
git commit -m "Add models-manifest.json and typed loader"
```

---

## Task 2: Build the resumable download primitive

**Why this is second:** It's the heart of the reliability improvement and has no dependencies on `ModelManager` internals. Keeping it as a standalone function makes it trivially testable and reusable.

**Files:**
- Create: `src/models/resumableDownload.ts`
- Create: `src/models/resumableDownload.test.ts`

- [ ] **Step 1: Write failing test for fresh download**

`src/models/resumableDownload.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { resumableDownload } from "./resumableDownload";

type OPFSStore = Map<string, ArrayBuffer>;

function createOPFSMock(): { root: FileSystemDirectoryHandle; store: OPFSStore } {
  const store: OPFSStore = new Map();
  const makeFileHandle = (path: string, opts?: { create?: boolean }) => {
    if (!opts?.create && !store.has(path)) {
      throw new DOMException("Not found", "NotFoundError");
    }
    if (opts?.create && !store.has(path)) store.set(path, new ArrayBuffer(0));
    return {
      getFile: async () =>
        new File([store.get(path) ?? new ArrayBuffer(0)], path.split("/").pop() ?? ""),
      createWritable: async (writeOpts?: { keepExistingData?: boolean }) => {
        let buf = writeOpts?.keepExistingData
          ? new Uint8Array(store.get(path) ?? new ArrayBuffer(0))
          : new Uint8Array(0);
        let cursor = buf.byteLength;
        return {
          seek: async (offset: number) => {
            cursor = offset;
          },
          write: async (data: ArrayBuffer | Uint8Array) => {
            const chunk = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
            const needed = cursor + chunk.byteLength;
            if (needed > buf.byteLength) {
              const next = new Uint8Array(needed);
              next.set(buf, 0);
              buf = next;
            }
            buf.set(chunk, cursor);
            cursor += chunk.byteLength;
          },
          close: async () => {
            store.set(path, buf.buffer.slice(0, buf.byteLength));
          },
        };
      },
    } as unknown as FileSystemFileHandle;
  };
  const makeDirHandle = (prefix: string): FileSystemDirectoryHandle =>
    ({
      getFileHandle: async (name: string, opts?: { create?: boolean }) =>
        makeFileHandle(`${prefix}/${name}`, opts),
      getDirectoryHandle: async (name: string) => makeDirHandle(`${prefix}/${name}`),
      removeEntry: async (name: string) => {
        const target = `${prefix}/${name}`;
        for (const key of [...store.keys()]) {
          if (key === target || key.startsWith(`${target}/`)) store.delete(key);
        }
      },
    }) as unknown as FileSystemDirectoryHandle;
  return { root: makeDirHandle(""), store };
}

describe("resumableDownload", () => {
  let opfs: ReturnType<typeof createOPFSMock>;
  beforeEach(() => {
    opfs = createOPFSMock();
  });
  afterEach(() => vi.restoreAllMocks());

  it("downloads a fresh file and writes bytes to OPFS", async () => {
    const body = new Uint8Array([1, 2, 3, 4, 5]);
    globalThis.fetch = vi.fn(async () =>
      new Response(body, {
        status: 200,
        headers: { "content-length": String(body.byteLength) },
      }),
    ) as typeof fetch;

    const progress: number[] = [];
    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
      onProgress: (p) => progress.push(p.bytesWritten),
    });

    expect(opfs.store.get("/a.onnx")).toEqual(body.buffer);
    expect(progress.at(-1)).toBe(5);
  });

  it("resumes a partial download using Range: bytes=N-", async () => {
    // Seed OPFS with first 3 bytes + progress marker
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder().encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 })).buffer as ArrayBuffer,
    );

    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("range")).toBe("bytes=3-");
      return new Response(new Uint8Array([4, 5]), {
        status: 206,
        headers: { "content-length": "2", "content-range": "bytes 3-4/5" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await resumableDownload({
      url: "/models/tts/a.onnx",
      dir: opfs.root,
      filename: "a.onnx",
      expectedSize: 5,
    });

    expect(opfs.store.get("/a.onnx")).toEqual(new Uint8Array([1, 2, 3, 4, 5]).buffer);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws if server 200s without Range support on resume", async () => {
    opfs.store.set("/a.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/a.onnx._progress.json",
      new TextEncoder().encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 })).buffer as ArrayBuffer,
    );
    // Server ignores Range and sends the whole file with 200
    globalThis.fetch = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4, 5]), {
        status: 200,
        headers: { "content-length": "5" },
      }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
      }),
    ).rejects.toThrow(/range|206/i);
  });

  it("aborts mid-download and leaves progress marker for next run", async () => {
    const controller = new AbortController();
    // Stream that yields one chunk then never completes; we abort after first chunk.
    const body = new ReadableStream({
      async start(c) {
        c.enqueue(new Uint8Array([1, 2]));
        controller.abort();
      },
    });
    globalThis.fetch = vi.fn(async () =>
      new Response(body, { status: 200, headers: { "content-length": "5" } }),
    ) as typeof fetch;

    await expect(
      resumableDownload({
        url: "/models/tts/a.onnx",
        dir: opfs.root,
        filename: "a.onnx",
        expectedSize: 5,
        signal: controller.signal,
      }),
    ).rejects.toThrow(/abort/i);

    const progressJson = new TextDecoder().decode(opfs.store.get("/a.onnx._progress.json")!);
    expect(JSON.parse(progressJson).bytesWritten).toBe(2);
  });
});
```

Run: `npm test -- resumableDownload.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement `resumableDownload`**

`src/models/resumableDownload.ts`:
```ts
export interface ResumableProgress {
  bytesWritten: number;
  expectedSize: number;
}

export interface ResumableDownloadOpts {
  url: string;
  dir: FileSystemDirectoryHandle;
  filename: string;
  /** Exact final size the file must reach (from manifest). */
  expectedSize: number;
  signal?: AbortSignal;
  onProgress?: (p: ResumableProgress) => void;
}

const PROGRESS_SUFFIX = "._progress.json";

async function readProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<ResumableProgress | null> {
  try {
    const handle = await dir.getFileHandle(filename + PROGRESS_SUFFIX);
    const file = await handle.getFile();
    if (file.size === 0) return null;
    const parsed = JSON.parse(await file.text()) as ResumableProgress;
    if (typeof parsed.bytesWritten !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
  progress: ResumableProgress,
): Promise<void> {
  const handle = await dir.getFileHandle(filename + PROGRESS_SUFFIX, { create: true });
  const writable = await handle.createWritable();
  await writable.write(new TextEncoder().encode(JSON.stringify(progress)).buffer as ArrayBuffer);
  await writable.close();
}

async function clearProgress(
  dir: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  try {
    await dir.removeEntry(filename + PROGRESS_SUFFIX);
  } catch {
    // Not present — fine.
  }
}

/**
 * Stream `url` into `dir/filename`. If a prior attempt left a partial file,
 * sends `Range: bytes=N-` and appends.
 *
 * Bypasses the service worker via `cache: "no-store"` — the SW never sees
 * these fetches, so partial 2xx responses can't poison the Cache API.
 */
export async function resumableDownload(opts: ResumableDownloadOpts): Promise<void> {
  const { url, dir, filename, expectedSize, signal, onProgress } = opts;

  const prior = await readProgress(dir, filename);
  const resumeFrom = prior && prior.expectedSize === expectedSize ? prior.bytesWritten : 0;

  const headers: HeadersInit = {};
  if (resumeFrom > 0) headers["Range"] = `bytes=${resumeFrom}-`;

  const response = await fetch(url, { cache: "no-store", headers, signal });
  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status} ${response.statusText}`);
  }
  if (resumeFrom > 0 && response.status !== 206) {
    throw new Error(
      `expected 206 Partial Content for resume, got ${response.status} (server ignored Range)`,
    );
  }

  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: resumeFrom > 0 });
  if (resumeFrom > 0) await writable.seek(resumeFrom);

  let bytesWritten = resumeFrom;
  const reader = response.body?.getReader();
  if (!reader) {
    await writable.close();
    throw new Error("response has no body");
  }

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      await writable.write(value);
      bytesWritten += value.byteLength;
      await writeProgress(dir, filename, { bytesWritten, expectedSize });
      onProgress?.({ bytesWritten, expectedSize });
    }
  } catch (err) {
    // Persist progress before rethrowing so the next attempt resumes.
    await writeProgress(dir, filename, { bytesWritten, expectedSize });
    await writable.close();
    throw err;
  }

  await writable.close();

  if (bytesWritten !== expectedSize) {
    throw new Error(
      `size mismatch after download: got ${bytesWritten}, expected ${expectedSize}`,
    );
  }

  await clearProgress(dir, filename);
}
```

- [ ] **Step 3: Run tests and confirm pass**

Run: `npm test -- resumableDownload.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add src/models/resumableDownload.ts src/models/resumableDownload.test.ts
git commit -m "Add resumable streaming download primitive for OPFS"
```

---

## Task 3: Build the integrity checker

**Why next:** Download correctness is binary (byte count matches or doesn't). Integrity is a second gate that catches silent corruption — disk errors, SW misbehavior, interrupted writes that still happened to land on a sentinel boundary. Composable with the primer.

**Files:**
- Create: `src/models/integrityCheck.ts`
- Create: `src/models/integrityCheck.test.ts`

- [ ] **Step 1: Write failing test**

`src/models/integrityCheck.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { verifyFile, verifyModel, type IntegrityReport } from "./integrityCheck";
import type { ManifestFile, ManifestModel } from "./modelsManifest";

function fakeDir(files: Record<string, Uint8Array>): FileSystemDirectoryHandle {
  return {
    getFileHandle: vi.fn(async (name: string) => {
      if (!(name in files)) throw new DOMException("Not found", "NotFoundError");
      return {
        getFile: async () => new File([files[name]], name),
      } as unknown as FileSystemFileHandle;
    }),
  } as unknown as FileSystemDirectoryHandle;
}

// ONNX magic bytes: 0x08 0x01 (protobuf field 1, varint 1). Whisper/Chatterbox
// start the onnx_model message with this. Good enough to detect truncation or
// an HTML error page cached as an .onnx file.
const ONNX_HEADER = new Uint8Array([0x08, 0x01]);

describe("verifyFile", () => {
  it("passes when size and magic match", async () => {
    const bytes = new Uint8Array(100);
    bytes.set(ONNX_HEADER, 0);
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(true);
  });

  it("fails when size mismatches", async () => {
    const bytes = new Uint8Array(50);
    bytes.set(ONNX_HEADER, 0);
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/size/i);
  });

  it("fails when onnx magic is wrong", async () => {
    const bytes = new Uint8Array(100); // all zeros — no 0x08 0x01
    const dir = fakeDir({ "model.onnx": bytes });
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic/i);
  });

  it("fails when json does not parse", async () => {
    const bytes = new TextEncoder().encode("not valid json");
    const dir = fakeDir({ "tokenizer.json": bytes });
    const spec: ManifestFile = {
      name: "tokenizer.json",
      size: bytes.byteLength,
      magic: "json",
    };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/json/i);
  });

  it("fails when file is missing", async () => {
    const dir = fakeDir({});
    const spec: ManifestFile = { name: "model.onnx", size: 100, magic: "onnx" };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/missing|not found/i);
  });

  it("skips magic check when magic is null (raw data blob)", async () => {
    const bytes = new Uint8Array(100); // arbitrary bytes
    const dir = fakeDir({ "weights.onnx_data": bytes });
    const spec: ManifestFile = { name: "weights.onnx_data", size: 100, magic: null };
    const result = await verifyFile(dir, spec);
    expect(result.ok).toBe(true);
  });
});

describe("verifyModel", () => {
  it("reports per-file and overall status", async () => {
    const good = new Uint8Array(10);
    good.set(ONNX_HEADER, 0);
    const dir = fakeDir({ "good.onnx": good, "bad.onnx": new Uint8Array(5) });
    const model: ManifestModel = {
      baseUrl: "/models/x/",
      files: [
        { name: "good.onnx", size: 10, magic: "onnx" },
        { name: "bad.onnx", size: 10, magic: "onnx" },
      ],
    };
    const report: IntegrityReport = await verifyModel(dir, model);
    expect(report.ok).toBe(false);
    expect(report.files.find((f) => f.name === "good.onnx")?.ok).toBe(true);
    expect(report.files.find((f) => f.name === "bad.onnx")?.ok).toBe(false);
  });
});
```

Run: `npm test -- integrityCheck.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement**

`src/models/integrityCheck.ts`:
```ts
import type { ManifestFile, ManifestModel } from "./modelsManifest";

export interface FileIntegrityResult {
  name: string;
  ok: boolean;
  reason?: string;
}

export interface IntegrityReport {
  ok: boolean;
  files: FileIntegrityResult[];
}

/**
 * ONNX files are protobuf-serialized starting with field 1 (ir_version,
 * varint). The first two bytes are always 0x08 0x01. Not a full parse —
 * just enough to detect "file is actually an HTML error page" or "file is
 * zero-padded garbage." Real validation happens when ONNX Runtime loads it.
 */
const ONNX_MAGIC = new Uint8Array([0x08, 0x01]);

export async function verifyFile(
  dir: FileSystemDirectoryHandle,
  spec: ManifestFile,
): Promise<FileIntegrityResult> {
  let file: File;
  try {
    const handle = await dir.getFileHandle(spec.name);
    file = await handle.getFile();
  } catch {
    return { name: spec.name, ok: false, reason: "file missing from OPFS" };
  }

  if (file.size !== spec.size) {
    return {
      name: spec.name,
      ok: false,
      reason: `size ${file.size} != expected ${spec.size}`,
    };
  }

  if (spec.magic === "onnx") {
    const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (head[0] !== ONNX_MAGIC[0] || head[1] !== ONNX_MAGIC[1]) {
      return { name: spec.name, ok: false, reason: "onnx magic mismatch" };
    }
  } else if (spec.magic === "json") {
    try {
      JSON.parse(await file.text());
    } catch {
      return { name: spec.name, ok: false, reason: "json parse failed" };
    }
  }

  return { name: spec.name, ok: true };
}

export async function verifyModel(
  dir: FileSystemDirectoryHandle,
  model: ManifestModel,
): Promise<IntegrityReport> {
  const files = await Promise.all(model.files.map((f) => verifyFile(dir, f)));
  return { ok: files.every((f) => f.ok), files };
}
```

- [ ] **Step 3: Run tests and confirm pass**

Run: `npm test -- integrityCheck.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 4: Commit**

```bash
git add src/models/integrityCheck.ts src/models/integrityCheck.test.ts
git commit -m "Add per-file + per-model integrity verification"
```

---

## Task 4: Rewrite `ModelManager.downloadAndCache` on top of resumable + integrity

**Why next:** Replaces the current buffer-in-memory-then-write flow. Keeps the public API (`downloadAndCache(id, url, filename)`) so callers are unaffected, but now each call is resumable and writes stream-direct.

**Files:**
- Modify: `src/models/modelManager.ts:107-182` (the `downloadAndCache` method) and surrounding OPFS helpers
- Modify: `src/models/modelManager.test.ts` (download tests in the OPFS section)

- [ ] **Step 1: Write a failing test for the new streaming behavior**

Add to `src/models/modelManager.test.ts` at the end of the file:
```ts
// =============================================================================
// downloadAndCache — streaming + resumable
// =============================================================================
describe("ModelManager — downloadAndCache streams to OPFS", () => {
  it("writes chunks to OPFS before the response ends", async () => {
    const opfs = createOPFSMock();
    opfs.install();

    // Simulate a slow two-chunk response
    const body = new ReadableStream({
      async start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.enqueue(new Uint8Array([4, 5]));
        c.close();
      },
    });
    globalThis.fetch = vi.fn(async () =>
      new Response(body, {
        status: 200,
        headers: { "content-length": "5" },
      }),
    ) as typeof fetch;

    const mgr = getModelManager();
    const file = await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);
    expect(file.size).toBe(5);
    // Final bytes in OPFS match
    expect(new Uint8Array(opfs.store.get("/models/tts/model.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
  });

  it("resumes from a partial download", async () => {
    const opfs = createOPFSMock();
    // Seed 3 bytes + progress marker
    opfs.store.set("/models/tts/model.onnx", new Uint8Array([1, 2, 3]).buffer);
    opfs.store.set(
      "/models/tts/model.onnx._progress.json",
      new TextEncoder().encode(JSON.stringify({ bytesWritten: 3, expectedSize: 5 }))
        .buffer as ArrayBuffer,
    );
    opfs.install();

    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      const range = new Headers(init?.headers).get("range");
      expect(range).toBe("bytes=3-");
      return new Response(new Uint8Array([4, 5]), {
        status: 206,
        headers: { "content-length": "2", "content-range": "bytes 3-4/5" },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const mgr = getModelManager();
    await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);

    expect(new Uint8Array(opfs.store.get("/models/tts/model.onnx")!)).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    );
  });
});
```

Run: `npm test -- modelManager.test.ts -t "streams to OPFS"`
Expected: FAIL — the old API takes 3 args, not 4.

- [ ] **Step 2: Rewrite `downloadAndCache`**

In `src/models/modelManager.ts`, replace the `downloadAndCache` method (lines ~107-182) with:
```ts
/**
 * Download a model file and cache it in OPFS with resumable streaming.
 * If a partial file + progress marker exist, resumes with `Range: bytes=N-`.
 *
 * `expectedSize` comes from the manifest — callers pass it through so
 * mid-download truncation can be detected and re-resumed on the next attempt.
 */
async downloadAndCache(
  id: ModelId,
  url: string,
  filename: string,
  expectedSize: number,
): Promise<File> {
  this.updateModel(id, { status: "downloading", total: expectedSize });
  try {
    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle("models", { create: true });
    const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });

    // Fast path: already fully present (size matches)
    try {
      const existing = await modelDir.getFileHandle(filename);
      const file = await existing.getFile();
      if (file.size === expectedSize) {
        this.updateModel(id, { loaded: expectedSize });
        return file;
      }
    } catch {
      // Missing — proceed to download.
    }

    const { resumableDownload } = await import("./resumableDownload");
    await resumableDownload({
      url: url + filename,
      dir: modelDir,
      filename,
      expectedSize,
      onProgress: ({ bytesWritten }) => {
        this.updateModel(id, { loaded: bytesWritten });
      },
    });

    const handle = await modelDir.getFileHandle(filename);
    return handle.getFile();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    this.updateModel(id, { status: "error", error: message });
    throw err;
  }
}
```

Also update the import block at the top of `modelManager.ts`:
```ts
import type { ModelId, ModelStatus, LoadProgress } from "./types";
```
(no change — kept for reference; the `resumableDownload` is dynamically imported to keep the manager lean for callers that only use its in-memory APIs)

- [ ] **Step 3: Update existing downloadAndCache tests for the new signature**

In `src/models/modelManager.test.ts`, update the existing tests in the `describe("ModelManager — downloadAndCache", ...)` block (lines ~424-530 of the current file) to pass an `expectedSize` as the 4th arg. Each `mgr.downloadAndCache("tts", "/cdn/", "model.onnx")` call becomes `mgr.downloadAndCache("tts", "/cdn/", "model.onnx", <size>)` where `<size>` matches the mock response's `content-length`.

Specifically, each existing call like:
```ts
await mgr.downloadAndCache("tts", "/cdn/", "model.onnx");
```
becomes (example for a 5-byte body):
```ts
await mgr.downloadAndCache("tts", "/cdn/", "model.onnx", 5);
```

- [ ] **Step 4: Run the full `modelManager` test file**

Run: `npm test -- modelManager.test.ts`
Expected: PASS (all tests including the new streaming ones).

- [ ] **Step 5: Commit**

```bash
git add src/models/modelManager.ts src/models/modelManager.test.ts
git commit -m "Rewrite ModelManager.downloadAndCache with resumable streaming"
```

---

## Task 5: Add `ModelManager.verifyOPFSCache`

**Why next:** Closes the trust loop. Downloads might write byte-perfect files, but corruption later (disk, SW bug, parallel write) goes undetected until inference time. Verify-on-boot surfaces failures at setup.

**Files:**
- Modify: `src/models/modelManager.ts` — add `verifyOPFSCache` method
- Modify: `src/models/modelManager.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/models/modelManager.test.ts`:
```ts
// =============================================================================
// verifyOPFSCache
// =============================================================================
describe("ModelManager — verifyOPFSCache", () => {
  it("returns ok when all manifest files are present and pass integrity", async () => {
    const opfs = createOPFSMock();
    // ONNX magic + padding
    const good = new Uint8Array(10);
    good[0] = 0x08;
    good[1] = 0x01;
    opfs.store.set("/models/tts/good.onnx", good.buffer);
    opfs.install();

    const mgr = getModelManager();
    const report = await mgr.verifyOPFSCache("tts", {
      baseUrl: "/models/tts/",
      files: [{ name: "good.onnx", size: 10, magic: "onnx" }],
    });
    expect(report.ok).toBe(true);
  });

  it("returns not-ok with per-file reasons when a file is missing", async () => {
    const opfs = createOPFSMock();
    opfs.install();
    const mgr = getModelManager();
    const report = await mgr.verifyOPFSCache("tts", {
      baseUrl: "/models/tts/",
      files: [{ name: "missing.onnx", size: 10, magic: "onnx" }],
    });
    expect(report.ok).toBe(false);
    expect(report.files[0].reason).toMatch(/missing/i);
  });
});
```

Run: `npm test -- modelManager.test.ts -t "verifyOPFSCache"`
Expected: FAIL (method not defined).

- [ ] **Step 2: Implement**

Add to `src/models/modelManager.ts` inside the `ModelManager` class:
```ts
/**
 * Verify every file of a model against the manifest. Cheap (reads first
 * 2 bytes per ONNX file + full text for JSON), safe to run on every boot.
 */
async verifyOPFSCache(
  id: ModelId,
  model: ManifestModel,
): Promise<IntegrityReport> {
  const { verifyModel } = await import("./integrityCheck");
  try {
    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle("models", { create: true });
    const modelDir = await modelsDir.getDirectoryHandle(id, { create: true });
    return verifyModel(modelDir, model);
  } catch {
    return {
      ok: false,
      files: model.files.map((f) => ({
        name: f.name,
        ok: false,
        reason: "OPFS unavailable",
      })),
    };
  }
}
```

Also add these imports to the top of `modelManager.ts`:
```ts
import type { ManifestModel } from "./modelsManifest";
import type { IntegrityReport } from "./integrityCheck";
```

- [ ] **Step 3: Run tests**

Run: `npm test -- modelManager.test.ts -t "verifyOPFSCache"`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add src/models/modelManager.ts src/models/modelManager.test.ts
git commit -m "Add ModelManager.verifyOPFSCache for boot-time integrity"
```

---

## Task 6: Build the offline primer

**Why next:** Glue layer. Iterates the manifest, downloads any missing/short files, runs verification, reports progress events. This is the single entry point called from both boot (lazy/opportunistic) and the Settings "Prepare for offline" button (explicit).

**Files:**
- Create: `src/models/offlinePrimer.ts`
- Create: `src/models/offlinePrimer.test.ts`

- [ ] **Step 1: Write failing test**

`src/models/offlinePrimer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { primeOffline, type PrimerEvent } from "./offlinePrimer";
import type { ModelsManifest } from "./modelsManifest";

const mockMgr = {
  downloadAndCache: vi.fn(),
  verifyOPFSCache: vi.fn(),
};

vi.mock("./modelManager", () => ({
  getModelManager: () => mockMgr,
}));

const manifest: ModelsManifest = {
  version: 1,
  models: {
    tts: {
      baseUrl: "/models/tts/",
      files: [
        { name: "a.onnx", size: 10, magic: "onnx" },
        { name: "b.onnx_data", size: 100, magic: null },
      ],
    },
    llm: {
      baseUrl: "/models/llm/",
      files: [{ name: "c.onnx", size: 5, magic: "onnx" }],
    },
    stt: { baseUrl: "/models/stt/", files: [] },
  },
};

describe("primeOffline", () => {
  beforeEach(() => {
    mockMgr.downloadAndCache.mockReset();
    mockMgr.verifyOPFSCache.mockReset();
    mockMgr.downloadAndCache.mockResolvedValue(new File([], "ok"));
    mockMgr.verifyOPFSCache.mockResolvedValue({ ok: true, files: [] });
  });

  it("downloads every manifest file and yields progress events", async () => {
    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    // 3 downloads: a.onnx, b.onnx_data, c.onnx
    expect(mockMgr.downloadAndCache).toHaveBeenCalledTimes(3);
    expect(events.some((e) => e.type === "download-start" && e.file === "a.onnx")).toBe(true);
    expect(events.some((e) => e.type === "model-verified" && e.model === "tts")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "complete", allOk: true });
  });

  it("emits download-failed without aborting the whole primer", async () => {
    mockMgr.downloadAndCache.mockImplementation(async (id, _url, filename) => {
      if (filename === "a.onnx") throw new Error("network dropped");
      return new File([], "ok");
    });
    // The failing model fails overall verification
    mockMgr.verifyOPFSCache.mockImplementation(async (id) => ({
      ok: id !== "tts",
      files: [],
    }));

    const events: PrimerEvent[] = [];
    for await (const ev of primeOffline(manifest)) events.push(ev);

    expect(events.some((e) => e.type === "download-failed" && e.file === "a.onnx")).toBe(true);
    // Other models still processed
    expect(mockMgr.downloadAndCache).toHaveBeenCalledWith("llm", "/models/llm/", "c.onnx", 5);
    // Overall allOk is false
    expect(events.at(-1)).toEqual({ type: "complete", allOk: false });
  });

  it("respects AbortSignal mid-primer", async () => {
    const controller = new AbortController();
    mockMgr.downloadAndCache.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });

    const events: PrimerEvent[] = [];
    try {
      for await (const ev of primeOffline(manifest, controller.signal)) events.push(ev);
    } catch (err) {
      expect((err as Error).name).toBe("AbortError");
    }
    // Should not have processed all three models
    expect(mockMgr.downloadAndCache.mock.calls.length).toBeLessThan(3);
  });
});
```

Run: `npm test -- offlinePrimer.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 2: Implement**

`src/models/offlinePrimer.ts`:
```ts
import { getModelManager } from "./modelManager";
import type { ModelId, ModelsManifest } from "./modelsManifest";

export type PrimerEvent =
  | { type: "model-start"; model: ModelId }
  | { type: "download-start"; model: ModelId; file: string; size: number }
  | { type: "download-progress"; model: ModelId; file: string; loaded: number; total: number }
  | { type: "download-failed"; model: ModelId; file: string; error: string }
  | { type: "model-verified"; model: ModelId; ok: boolean }
  | { type: "complete"; allOk: boolean };

/**
 * Walks every file in the manifest, downloads any missing or short files,
 * and verifies integrity per model.
 *
 * Individual download failures don't stop the primer — they're emitted as
 * `download-failed` events and the corresponding model's verification will
 * report the missing file. This matches the clinical UX: surface everything
 * that's broken in one pass so the clinician can decide whether to retry
 * or proceed anyway.
 */
export async function* primeOffline(
  manifest: ModelsManifest,
  signal?: AbortSignal,
): AsyncGenerator<PrimerEvent> {
  const mgr = getModelManager();
  const modelIds = Object.keys(manifest.models) as ModelId[];
  let allOk = true;

  for (const id of modelIds) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const model = manifest.models[id];
    if (!model || model.files.length === 0) continue;

    yield { type: "model-start", model: id };

    for (const spec of model.files) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      yield { type: "download-start", model: id, file: spec.name, size: spec.size };
      try {
        await mgr.downloadAndCache(id, model.baseUrl, spec.name, spec.size);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        yield { type: "download-failed", model: id, file: spec.name, error: message };
        if ((err as Error).name === "AbortError") throw err;
      }
    }

    const report = await mgr.verifyOPFSCache(id, model);
    if (!report.ok) allOk = false;
    yield { type: "model-verified", model: id, ok: report.ok };
  }

  yield { type: "complete", allOk };
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- offlinePrimer.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/models/offlinePrimer.ts src/models/offlinePrimer.test.ts
git commit -m "Add offlinePrimer: walks manifest, downloads, verifies"
```

---

## Task 7: Teach the service worker to serve `/models/*` from OPFS

**Why next:** Once OPFS is the authoritative store, we don't want two copies of 1.1 GB. The SW proxy makes worker URL fetches transparently hit OPFS. Doing this before wiring primer into boot keeps the transition atomic — either the SW has the OPFS proxy and models come from OPFS, or it doesn't and models come from network (old behavior).

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Rewrite `public/sw.js` with the split strategy**

Replace the entire contents of `public/sw.js` with:
```js
// OwnVoice Service Worker
//
// Strategy map:
//   /models/*       → OPFS proxy (authoritative, primed by offlinePrimer)
//                      falls through to network if missing (rare; pre-primer boot)
//   /, /index.html, /src/*, /models-manifest.json
//                   → stale-while-revalidate (ship bugfixes without re-downloads)
//   everything else (ORT WASM, fonts, manifest.json, static images)
//                   → cache-first-immutable
//
// Cache name bumps on every shipped SW change. Old caches are cleaned on activate.

const CACHE_NAME = "ownvoice-v3";
const SHELL_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Walk OPFS for a pathname like `/models/tts/a.onnx`. Returns the File or null. */
async function opfsLookup(pathname) {
  try {
    const root = await navigator.storage.getDirectory();
    const parts = pathname.split("/").filter(Boolean); // ["models","tts","a.onnx"]
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const handle = await dir.getFileHandle(parts[parts.length - 1]);
    return await handle.getFile();
  } catch {
    return null;
  }
}

function isShellAsset(url) {
  if (url.pathname === "/" || url.pathname === "/index.html") return true;
  if (url.pathname.startsWith("/src/")) return true;
  if (url.pathname === "/models-manifest.json") return true;
  return false;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response("offline", { status: 503 });
}

async function cacheFirstImmutable(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass: resumableDownload sets cache: "no-store" which surfaces here as a
  // "no-store" cache mode — let it hit the network directly without us caching.
  if (event.request.cache === "no-store") return;

  if (url.pathname.startsWith("/models/")) {
    event.respondWith(
      (async () => {
        const file = await opfsLookup(url.pathname);
        if (file) {
          return new Response(file, {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": String(file.size),
              "cache-control": "no-store",
            },
          });
        }
        // Not primed yet — fall through to network. SW does NOT cache this.
        return fetch(event.request);
      })(),
    );
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(cacheFirstImmutable(event.request));
});
```

- [ ] **Step 2: Manually verify the SW loads and OPFS proxy works**

Run: `npm run build && npm run preview`

In a browser with the preview running:
1. Open DevTools → Application → Service Workers. Confirm `ownvoice-v3` is active.
2. Open the Network tab. Load `/models/chatterbox-turbo/tokenizer.json`. Since OPFS is empty, the response should show `from ServiceWorker` and fall through to the origin (200 with the actual file body).
3. In DevTools console, manually write a test file:
   ```js
   const root = await navigator.storage.getDirectory();
   const models = await root.getDirectoryHandle("models", { create: true });
   const sub = await models.getDirectoryHandle("test", { create: true });
   const f = await sub.getFileHandle("hello.txt", { create: true });
   const w = await f.createWritable();
   await w.write(new TextEncoder().encode("from-opfs"));
   await w.close();
   ```
4. Fetch `/models/test/hello.txt` — response body should be `from-opfs`.

Record any iPadOS-specific issues. If `navigator.storage.getDirectory()` is unavailable inside the SW, document the limitation and see Risk notes below.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "Split SW strategy: OPFS proxy for /models, SWR for shell, cache-first-immutable else"
```

---

## Task 8: Offline store (Zustand) for primer + verify state

**Why next:** The Settings UI needs to observe primer progress and persisted last-verified state. Colocating in a new store keeps this separate from settings (which is persisted and heavier).

**Files:**
- Create: `src/stores/offlineStore.ts`
- Create: `src/stores/offlineStore.test.ts`

- [ ] **Step 1: Write failing test**

`src/stores/offlineStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useOfflineStore } from "./offlineStore";

describe("offlineStore", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
  });

  it("tracks primer running state", () => {
    useOfflineStore.getState().setPrimerRunning(true);
    expect(useOfflineStore.getState().primerRunning).toBe(true);
    useOfflineStore.getState().setPrimerRunning(false);
    expect(useOfflineStore.getState().primerRunning).toBe(false);
  });

  it("stores per-file progress keyed by `${model}/${file}`", () => {
    useOfflineStore.getState().reportProgress("tts", "a.onnx", 50, 100);
    expect(useOfflineStore.getState().progress["tts/a.onnx"]).toEqual({
      loaded: 50,
      total: 100,
    });
  });

  it("records model verification status", () => {
    useOfflineStore.getState().setModelVerified("tts", true);
    useOfflineStore.getState().setModelVerified("llm", false);
    expect(useOfflineStore.getState().verified).toEqual({
      tts: true,
      llm: false,
    });
  });

  it("reset clears everything", () => {
    useOfflineStore.getState().setPrimerRunning(true);
    useOfflineStore.getState().reportProgress("tts", "a.onnx", 1, 2);
    useOfflineStore.getState().setModelVerified("tts", true);
    useOfflineStore.getState().reset();
    const s = useOfflineStore.getState();
    expect(s.primerRunning).toBe(false);
    expect(s.progress).toEqual({});
    expect(s.verified).toEqual({});
  });
});
```

Run: `npm test -- offlineStore.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

`src/stores/offlineStore.ts`:
```ts
import { create } from "zustand";
import type { ModelId } from "../models/modelsManifest";

interface FileProgress {
  loaded: number;
  total: number;
}

interface OfflineState {
  /** True while a primer run is active. */
  primerRunning: boolean;
  /** Progress keyed `${model}/${file}`. */
  progress: Record<string, FileProgress>;
  /** Per-model verification results from the last primer pass. */
  verified: Partial<Record<ModelId, boolean>>;
  /** Last primer-complete timestamp (ms since epoch) or null. */
  lastVerifiedAt: number | null;

  setPrimerRunning(v: boolean): void;
  reportProgress(model: ModelId, file: string, loaded: number, total: number): void;
  setModelVerified(model: ModelId, ok: boolean): void;
  markPrimerComplete(): void;
  reset(): void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  primerRunning: false,
  progress: {},
  verified: {},
  lastVerifiedAt: null,

  setPrimerRunning: (v) => set({ primerRunning: v }),
  reportProgress: (model, file, loaded, total) =>
    set((s) => ({
      progress: { ...s.progress, [`${model}/${file}`]: { loaded, total } },
    })),
  setModelVerified: (model, ok) =>
    set((s) => ({ verified: { ...s.verified, [model]: ok } })),
  markPrimerComplete: () => set({ lastVerifiedAt: Date.now() }),
  reset: () =>
    set({
      primerRunning: false,
      progress: {},
      verified: {},
      lastVerifiedAt: null,
    }),
}));
```

- [ ] **Step 3: Run tests**

Run: `npm test -- offlineStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add src/stores/offlineStore.ts src/stores/offlineStore.test.ts
git commit -m "Add offlineStore (Zustand) for primer + verify state"
```

---

## Task 9: `useStorageHealth` hook

**Why next:** The Settings section needs a live reading of `navigator.storage.estimate()`. Wrapping it in a hook keeps the component simple and lets us poll at a sane rate without leaking intervals.

**Files:**
- Create: `src/hooks/useStorageHealth.ts`
- Create: `src/hooks/useStorageHealth.test.ts`

- [ ] **Step 1: Write failing test**

`src/hooks/useStorageHealth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/preact";
import { useStorageHealth } from "./useStorageHealth";

describe("useStorageHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the current estimate on first paint", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 100, quota: 1000 })),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => {
      expect(result.current.usage).toBe(100);
      expect(result.current.quota).toBe(1000);
      expect(result.current.percentUsed).toBeCloseTo(10);
    });
  });

  it("flags warning at >= 85% usage", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {
        estimate: vi.fn(async () => ({ usage: 900, quota: 1000 })),
      },
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useStorageHealth());
    await waitFor(() => {
      expect(result.current.warning).toBe(true);
    });
  });

  it("returns null fields when navigator.storage.estimate is unavailable", async () => {
    Object.defineProperty(navigator, "storage", {
      value: {},
      configurable: true,
      writable: true,
    });
    const { result } = renderHook(() => useStorageHealth());
    expect(result.current.usage).toBeNull();
    expect(result.current.quota).toBeNull();
  });
});
```

Run: `npm test -- useStorageHealth.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement**

`src/hooks/useStorageHealth.ts`:
```ts
import { useEffect, useState } from "preact/hooks";

export interface StorageHealth {
  usage: number | null;
  quota: number | null;
  percentUsed: number | null;
  /** True when usage/quota >= 0.85 — clinician should be warned. */
  warning: boolean;
}

const POLL_MS = 60_000;
const WARN_THRESHOLD = 0.85;

export function useStorageHealth(): StorageHealth {
  const [health, setHealth] = useState<StorageHealth>({
    usage: null,
    quota: null,
    percentUsed: null,
    warning: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!navigator.storage?.estimate) return;
      const est = await navigator.storage.estimate();
      if (cancelled) return;
      const usage = est.usage ?? 0;
      const quota = est.quota ?? 0;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
      setHealth({
        usage,
        quota,
        percentUsed,
        warning: quota > 0 && usage / quota >= WARN_THRESHOLD,
      });
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return health;
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- useStorageHealth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStorageHealth.ts src/hooks/useStorageHealth.test.ts
git commit -m "Add useStorageHealth hook"
```

---

## Task 10: `OfflineReadinessSection` component

**Why next:** The clinician-facing surface. Uses every primitive built so far: manifest loader, primer generator, offline store, storage health hook.

**Files:**
- Create: `src/components/settings/sections/OfflineReadinessSection.tsx`
- Create: `src/components/settings/sections/OfflineReadinessSection.test.tsx`

- [ ] **Step 1: Write failing test**

`src/components/settings/sections/OfflineReadinessSection.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { OfflineReadinessSection } from "./OfflineReadinessSection";
import { useOfflineStore } from "../../../stores/offlineStore";

vi.mock("../../../models/modelsManifest", () => ({
  loadManifest: vi.fn(async () => ({
    version: 1,
    models: {
      tts: { baseUrl: "/models/tts/", files: [{ name: "a.onnx", size: 10, magic: "onnx" }] },
      llm: { baseUrl: "/models/llm/", files: [] },
      stt: { baseUrl: "/models/stt/", files: [] },
    },
  })),
}));

vi.mock("../../../models/offlinePrimer", () => ({
  primeOffline: vi.fn(async function* () {
    yield { type: "model-start", model: "tts" } as const;
    yield { type: "download-start", model: "tts", file: "a.onnx", size: 10 } as const;
    yield { type: "model-verified", model: "tts", ok: true } as const;
    yield { type: "complete", allOk: true } as const;
  }),
}));

const tokens = {
  bg: "#fff",
  text: "#000",
  muted: "#666",
  accent: "#2563eb",
  danger: "#b00020",
  sectionBg: "#f5f5f5",
  border: "#ddd",
} as const;

describe("OfflineReadinessSection", () => {
  beforeEach(() => {
    useOfflineStore.getState().reset();
    Object.defineProperty(navigator, "storage", {
      value: { estimate: vi.fn(async () => ({ usage: 500, quota: 10_000 })) },
      configurable: true,
      writable: true,
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("shows a 'Prepare for offline' button with accessible label", () => {
    render(<OfflineReadinessSection t={tokens} />);
    expect(screen.getByRole("button", { name: /prepare for offline/i })).toBeTruthy();
  });

  it("runs the primer when the button is clicked and updates store", async () => {
    render(<OfflineReadinessSection t={tokens} />);
    fireEvent.click(screen.getByRole("button", { name: /prepare for offline/i }));

    await waitFor(() => {
      expect(useOfflineStore.getState().verified.tts).toBe(true);
    });
    await waitFor(() => {
      expect(useOfflineStore.getState().primerRunning).toBe(false);
    });
  });

  it("surfaces storage health info", async () => {
    render(<OfflineReadinessSection t={tokens} />);
    await waitFor(() => {
      // 500 / 10000 = 5% — should render something like "5%" or "500" in the DOM
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/5%|0\.49 KB|used/i);
    });
  });
});
```

Run: `npm test -- OfflineReadinessSection.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implement**

`src/components/settings/sections/OfflineReadinessSection.tsx`:
```tsx
import { useState } from "preact/hooks";
import type { ThemeTokens } from "../../../theme/tokens";
import { loadManifest } from "../../../models/modelsManifest";
import { primeOffline } from "../../../models/offlinePrimer";
import { useOfflineStore } from "../../../stores/offlineStore";
import { useStorageHealth } from "../../../hooks/useStorageHealth";

interface Props {
  t: ThemeTokens;
}

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function OfflineReadinessSection({ t }: Props) {
  const primerRunning = useOfflineStore((s) => s.primerRunning);
  const progress = useOfflineStore((s) => s.progress);
  const verified = useOfflineStore((s) => s.verified);
  const lastVerifiedAt = useOfflineStore((s) => s.lastVerifiedAt);
  const setPrimerRunning = useOfflineStore((s) => s.setPrimerRunning);
  const reportProgress = useOfflineStore((s) => s.reportProgress);
  const setModelVerified = useOfflineStore((s) => s.setModelVerified);
  const markPrimerComplete = useOfflineStore((s) => s.markPrimerComplete);

  const [error, setError] = useState<string | null>(null);
  const health = useStorageHealth();

  async function runPrimer() {
    setError(null);
    setPrimerRunning(true);
    try {
      const manifest = await loadManifest();
      for await (const ev of primeOffline(manifest)) {
        if (ev.type === "download-progress") {
          reportProgress(ev.model, ev.file, ev.loaded, ev.total);
        } else if (ev.type === "model-verified") {
          setModelVerified(ev.model, ev.ok);
        } else if (ev.type === "complete") {
          markPrimerComplete();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPrimerRunning(false);
    }
  }

  return (
    <section
      style={{
        padding: 16,
        background: t.sectionBg,
        borderRadius: 8,
        marginTop: 16,
        fontFamily:
          "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
      }}
      aria-labelledby="offline-readiness-heading"
    >
      <h3
        id="offline-readiness-heading"
        style={{ margin: "0 0 12px 0", fontSize: 18, color: t.text }}
      >
        Offline readiness
      </h3>

      <p style={{ margin: "0 0 12px 0", color: t.muted, fontSize: 14 }}>
        Download and verify all voice files so the device works without Wi-Fi.
      </p>

      <button
        type="button"
        onClick={runPrimer}
        disabled={primerRunning}
        style={{
          minHeight: 64,
          minWidth: 240,
          padding: "12px 24px",
          background: primerRunning ? t.muted : t.accent,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          cursor: primerRunning ? "wait" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {primerRunning ? "Preparing…" : "Prepare for offline"}
      </button>

      {Object.keys(verified).length > 0 && (
        <ul style={{ marginTop: 16, paddingLeft: 0, listStyle: "none", fontSize: 14 }}>
          {Object.entries(verified).map(([model, ok]) => (
            <li key={model} style={{ color: ok ? t.text : t.danger, padding: "4px 0" }}>
              {model}: {ok ? "verified" : "needs retry"}
            </li>
          ))}
        </ul>
      )}

      {Object.keys(progress).length > 0 && primerRunning && (
        <div style={{ marginTop: 12, fontSize: 12, color: t.muted }}>
          {Object.entries(progress).map(([key, p]) => (
            <div key={key}>
              {key}: {formatBytes(p.loaded)} / {formatBytes(p.total)}
            </div>
          ))}
        </div>
      )}

      {lastVerifiedAt && (
        <p style={{ marginTop: 12, fontSize: 12, color: t.muted }}>
          Last verified: {new Date(lastVerifiedAt).toLocaleString()}
        </p>
      )}

      {error && (
        <p role="alert" style={{ marginTop: 12, color: t.danger, fontSize: 14 }}>
          {error}
        </p>
      )}

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${t.border}`,
          fontSize: 12,
          color: health.warning ? t.danger : t.muted,
        }}
      >
        Storage: {formatBytes(health.usage)} of {formatBytes(health.quota)} used
        {health.percentUsed != null && ` (${health.percentUsed.toFixed(0)}%)`}
        {health.warning && " — running low, consider resetting audio cache"}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- OfflineReadinessSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/sections/OfflineReadinessSection.tsx src/components/settings/sections/OfflineReadinessSection.test.tsx
git commit -m "Add OfflineReadinessSection for Prepare-for-offline UX"
```

---

## Task 11: Mount the section in Settings

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Add the import + render**

In `src/components/settings/SettingsPanel.tsx`, add the import alongside the other section imports near the top:
```tsx
import { OfflineReadinessSection } from "./sections/OfflineReadinessSection";
```

Inside the `<BottomSheet.Body>` block, after the existing sections (`PatientInfoSection`, `CareTeamSection`, `AboutSection`, `ResetSection`) — place the new section just before `ResetSection`:
```tsx
<OfflineReadinessSection t={t} />
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`

Open Settings. Confirm:
1. "Offline readiness" section renders with the button.
2. Tapping the button triggers downloads (watch Network panel).
3. Verified indicators appear as models complete.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: PASS (no regressions).

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsPanel.tsx
git commit -m "Mount OfflineReadinessSection in SettingsPanel"
```

---

## Task 12: Hook primer verify-only path into boot

**Why next:** The primer runs on clinician action (Task 10/11). We also want a lightweight boot-time verification so partially-primed devices surface their state without forcing a download. This is the safety net.

**Files:**
- Modify: `src/models/bootModels.ts` — add pre-worker verify pass
- Modify: `src/models/bootModels.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/models/bootModels.test.ts` (or create a new describe block at the end of the file):
```ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockMgr = {
  init: vi.fn(async () => {}),
  verifyOPFSCache: vi.fn(),
  setWorker: vi.fn(),
  setReady: vi.fn(),
  setError: vi.fn(),
  getWorker: vi.fn(),
  isReady: vi.fn(() => false),
};

vi.mock("./modelManager", () => ({
  getModelManager: () => mockMgr,
}));

vi.mock("./modelsManifest", () => ({
  loadManifest: vi.fn(async () => ({
    version: 1,
    models: {
      tts: { baseUrl: "/models/tts/", files: [{ name: "a.onnx", size: 10, magic: "onnx" }] },
      llm: { baseUrl: "/models/llm/", files: [] },
      stt: { baseUrl: "/models/stt/", files: [] },
    },
  })),
}));

import { verifyAllOnBoot } from "./bootModels";
import { useOfflineStore } from "../stores/offlineStore";

describe("verifyAllOnBoot", () => {
  beforeEach(() => {
    mockMgr.verifyOPFSCache.mockReset();
    useOfflineStore.getState().reset();
  });

  it("populates offlineStore.verified with per-model results", async () => {
    mockMgr.verifyOPFSCache.mockImplementation(async (id: string) => ({
      ok: id !== "llm",
      files: [],
    }));
    await verifyAllOnBoot();
    expect(useOfflineStore.getState().verified).toEqual({
      tts: true,
      llm: false,
      stt: true,
    });
  });
});
```

Run: `npm test -- bootModels.test.ts -t "verifyAllOnBoot"`
Expected: FAIL (function not exported).

- [ ] **Step 2: Implement `verifyAllOnBoot` in `bootModels.ts`**

Add to `src/models/bootModels.ts` below the existing `bootModels` function:
```ts
import { loadManifest, type ModelId } from "./modelsManifest";
import { useOfflineStore } from "../stores/offlineStore";

/**
 * Boot-time integrity pass over OPFS. Cheap (reads first 2 bytes per ONNX
 * file), runs in parallel, populates offlineStore.verified so Settings can
 * indicate which models need the "Prepare for offline" primer rerun.
 *
 * Does not block worker boot — runs fire-and-forget alongside bootModels().
 */
export async function verifyAllOnBoot(): Promise<void> {
  const mgr = getModelManager();
  const manifest = await loadManifest();
  const setModelVerified = useOfflineStore.getState().setModelVerified;
  const ids = Object.keys(manifest.models) as ModelId[];
  await Promise.all(
    ids.map(async (id) => {
      const report = await mgr.verifyOPFSCache(id, manifest.models[id]);
      setModelVerified(id, report.ok);
    }),
  );
}
```

Also update `src/main.tsx` or wherever `bootModels()` is called to kick off the verify pass. Locate the call site:

```bash
grep -rn "bootModels()" src/
```

At that call site (typically `src/App.tsx` or `src/main.tsx`), add:
```ts
import { bootModels, verifyAllOnBoot } from "./models/bootModels";
// existing: bootModels();
verifyAllOnBoot().catch((err) => console.warn("[OwnVoice] boot verify failed:", err));
```

- [ ] **Step 3: Run tests**

Run: `npm test -- bootModels.test.ts`
Expected: PASS (all existing + new test).

- [ ] **Step 4: Commit**

```bash
git add src/models/bootModels.ts src/models/bootModels.test.ts src/App.tsx
git commit -m "Run integrity verify alongside bootModels on boot"
```

---

## Task 13: Extend `resetAll` to clear offline state

**Why next:** A full reset must return the device to a known-empty state. Missing this means a reset device still advertises verified models.

**Files:**
- Modify: `src/stores/resetAll.ts`
- Modify: `src/stores/resetAll.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/stores/resetAll.test.ts`:
```ts
it("clears offlineStore", async () => {
  useOfflineStore.getState().setModelVerified("tts", true);
  useOfflineStore.getState().markPrimerComplete();
  await resetAll();
  expect(useOfflineStore.getState().verified).toEqual({});
  expect(useOfflineStore.getState().lastVerifiedAt).toBeNull();
});
```

And ensure the `import` block imports `useOfflineStore`:
```ts
import { useOfflineStore } from "./offlineStore";
```

Run: `npm test -- resetAll.test.ts -t "clears offlineStore"`
Expected: FAIL.

- [ ] **Step 2: Update `resetAll.ts`**

Edit `src/stores/resetAll.ts` to add the import and the reset call:
```ts
import { useOfflineStore } from "./offlineStore";
```

And inside `resetAll`, after the existing store resets (section 2 "In-memory Zustand stores"), add:
```ts
useOfflineStore.getState().reset();
```

- [ ] **Step 3: Run tests**

Run: `npm test -- resetAll.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/stores/resetAll.ts src/stores/resetAll.test.ts
git commit -m "resetAll also clears offlineStore"
```

---

## Task 14: Update CLAUDE.md with the new architecture note

**Why last:** Documentation reflects committed reality, not WIP.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add architecture note**

In `CLAUDE.md`, under the "Architecture" section, add a new subsection just before "Inline styling is intentional (for now)":
```markdown
### Offline storage

OPFS is the authoritative store for model weights after the primer runs. The service worker intercepts `/models/*` fetches and serves directly from OPFS (single copy of the bytes). `public/models-manifest.json` is the source of truth for expected files + byte sizes; `src/models/resumableDownload.ts` streams downloads with `Range:` resumption; `src/models/integrityCheck.ts` validates ONNX magic + size on boot.

- **`loadManifest()` → `ModelsManifest`** — fetched once on boot (cache: no-store)
- **`primeOffline(manifest)`** — async generator yielding `PrimerEvent`s; invoked from Settings "Prepare for offline"
- **`verifyAllOnBoot()`** — cheap parallel integrity pass run at app start
- **SW strategy split** — stale-while-revalidate for `/`, `/index.html`, `/src/*`, `/models-manifest.json`; OPFS proxy for `/models/*`; cache-first-immutable for everything else. Bump `CACHE_NAME` in `public/sw.js` on every SW change.

Clinicians use the "Prepare for offline" button in Settings before shifts to guarantee offline readiness. `navigator.storage.persist()` is called once by `ModelManager.init` to protect the whole origin from eviction.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Document offline storage architecture in CLAUDE.md"
```

---

## Known risks

1. **SW + OPFS on iPadOS 26.** The `navigator.storage.getDirectory()` API inside a service worker is new and Safari-specific. If Task 7 Step 2 manual verification shows it's not supported in the field, the fallback is: SW caches `/models/*` in Cache API (old behavior) and only the main-thread primer writes to OPFS. Workers would continue to read from Cache API. This means a 2× memory footprint but keeps the resumable download reliability win. Document this regression in CLAUDE.md if needed.

2. **Manifest drift.** The hand-written `models-manifest.json` must be kept in sync with actual file sizes on every model version bump. Wrong sizes cause integrity checks to fail silently and trigger spurious re-downloads. Consider a pre-commit hook that `stat`s `public/models/**` and regenerates the manifest — out of scope for this plan.

3. **WebGPU loading path.** `ttsEngine.ts` (main thread) and `public/tts-gpu-worker.js` call `ort.InferenceSession.create(url, opts)` directly. Those URL fetches will go through the SW and hit the OPFS proxy once models are primed. If ONNX Runtime's WebGPU EP has issues streaming from a `Response` constructed from an OPFS `File`, this plan will need a follow-up to use blob URLs or direct buffer loading.

4. **Cache API → OPFS migration on upgrade.** Devices already in the field with `ownvoice-v2` have models in the Cache API, not OPFS. The `activate` handler in the new SW deletes old caches, so on first load after upgrade the SW proxy will find nothing in OPFS and fall through to network. Clinicians will need to re-run "Prepare for offline" once. Surface this in release notes.

5. **Background sync not included.** Downloads only resume when the app is open. A clinician who walks past a Wi-Fi access point with the app closed gets no benefit. Track as a follow-up plan.

---

## Self-review results

- **Spec coverage:** The six improvements from our discussion are covered:
  - Resumable downloads — Tasks 1, 2, 4
  - Boot-time integrity verification — Tasks 3, 5, 12
  - "Prepare for offline" UX — Tasks 6, 8, 9, 10, 11
  - Split SW strategy — Task 7
  - Quota awareness — Task 9 (health hook) + Task 10 (surfaced in Settings)
  - Background sync — explicitly deferred (Known risk 5)

- **Placeholder scan:** Manifest sizes in Task 1 require `<from step 1>` substitution — this is intentional, the first step is the lookup. No code-level TODOs in any task.

- **Type consistency:** `ModelId` is imported from `./modelsManifest` everywhere except legacy `types.ts`. `ManifestFile`/`ManifestModel`/`ModelsManifest` names stay consistent. `PrimerEvent` discriminated union used identically in primer + section. `IntegrityReport`/`FileIntegrityResult` consistent between integrityCheck and ModelManager. Verified.
