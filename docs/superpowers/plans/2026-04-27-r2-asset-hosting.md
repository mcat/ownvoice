# R2 Asset Hosting + Aggressive Prune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move ONNX Runtime WASM files (50 MB) and model weights (~2.5 GB) out of the Cloudflare Pages build output and into a Cloudflare R2 bucket, served back to the app via same-origin Pages Functions. After this lands, the Pages build no longer hits the 25 MiB per-file limit and the live deploy at `ownvoice.icu` works.

**Architecture:** Single R2 bucket `ownvoice-static` stores all large assets at versioned paths (`ort/v<npm-version>/...`, `models/<release-name>/...`). Cloudflare Pages Functions at `/ort/[[path]]` and `/models/[[path]]` proxy R2 reads to same-origin URLs, with long edge-cache TTLs so cache misses are rare. The existing service worker continues to OPFS-proxy these paths unchanged (because they remain same-origin from the browser's perspective). A GitHub Actions prune workflow runs on every push to main and daily, deleting any R2 object not referenced by any branch's current `models-manifest.json` (with a 24-hour grace window so an in-flight upload isn't immediately deleted).

**Why same-origin (Pages Function) instead of `static.ownvoice.icu` cross-origin:** The service worker currently intercepts `/models/*` and serves from OPFS. The SW's fetch handler explicitly returns early on cross-origin requests (`public/sw.js` line 113), so cross-origin URLs would bypass OPFS entirely — defeating offline mode. Same-origin paths preserve the existing SW + OPFS architecture without code changes. Pages Functions appear in the Workers free tier (100K req/day), but with `Cache-Control: public, max-age=31536000, immutable` set on the response, edge-cache hits dominate and Function invocations are minimal.

**Tech Stack:** Cloudflare R2 (S3-compatible storage), Cloudflare Pages Functions, GitHub Actions, `@aws-sdk/client-s3` (for R2's S3-compatible API), Node 22 (already used in CI), Vite, Preact, TypeScript.

**Spec:** Brainstormed in conversation 2026-04-27; key decisions:
- R2 bucket `ownvoice-static`, custom domain not required (same-origin via Pages Function)
- Logical version segments in paths (`ort/v1.17.0/...`, `models/chatterbox-multilingual-2026-04/...`)
- `models-manifest.json` `baseUrl` field already exists; rewrites to versioned path
- Aggressive prune: on every main merge + daily, deletes orphan objects with 24h grace

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `wrangler.toml` | Create | Pages config: declares R2 binding `ASSETS` for the project |
| `functions/ort/[[path]].ts` | Create | Pages Function: streams R2 object at `ort/<...>` for any `/ort/*` request |
| `functions/models/[[path]].ts` | Create | Pages Function: streams R2 object at `models/<...>` for any `/models/*` request |
| `scripts/upload-r2-assets.mjs` | Create | Idempotent uploader: reads `public/ort/*.wasm` and `public/models/**`, uploads to R2 at versioned paths, skips files that already exist with matching size |
| `scripts/prune-r2.mjs` | Create | Reads main + all open-PR manifests via `gh`, computes keep-set, deletes any R2 object not in the keep-set AND uploaded > 24h ago |
| `scripts/download-assets.sh` | Create | Successor to `download-models.sh`; also pulls ORT WASM from npm |
| `scripts/download-models.sh` | Delete | Superseded by `download-assets.sh` |
| `vite.config.ts` | Modify | Add Rollup `external` entries so ORT WASM imports are not bundled |
| `src/models/ttsWorker.ts` | Modify | `wasmPaths` → `"/ort/v<version>/"` (read from a constant) |
| `src/models/sttWorker.ts` | Modify | Same |
| `src/models/llmWorker.ts` | Modify | Same |
| `src/models/assetVersions.ts` | Create | Single source of truth: `ORT_VERSION = "v1.17.0"`, `MODELS_RELEASE = "chatterbox-multilingual-2026-04"` etc. Imported by workers and by upload/prune scripts |
| `public/models-manifest.json` | Modify | `baseUrl` per model group rewrites to versioned path; structure preserved |
| `public/_headers` | Modify | Add `/ort/*` and `/models/*` cache rules: `Cache-Control: public, max-age=31536000, immutable` |
| `package.json` | Modify | New scripts: `assets:upload`, `assets:prune`, `assets:download`; postbuild step that strips dist large files |
| `scripts/strip-dist-large.mjs` | Create | Postbuild: removes any file in `dist/` over 24 MiB to preserve the Pages 25 MiB safety margin |
| `.github/workflows/prune-r2.yml` | Create | GitHub Actions: runs `assets:prune` on `push:main` and on a daily schedule |
| `.gitignore` | Modify | Add `public/ort/*.wasm` (large binaries don't belong in git) |
| `CLAUDE.md` | Modify | Document the asset-hosting layout |

---

## Asset versioning convention

| Asset class | Path template | Example |
|---|---|---|
| ORT WASM | `ort/v<npm-version>/<filename>` | `ort/v1.17.0/ort-wasm-simd-threaded.jsep.wasm` |
| Model files | `models/<release-name>/<group>/<filename>` | `models/chatterbox-multilingual-2026-04/tts/speech_encoder.onnx` |

Version segments are human-readable, source-controlled (defined in `src/models/assetVersions.ts`), and change explicitly when bytes change. There is no automatic content-hash. The upload script is idempotent — it uploads only files whose `(size, path)` doesn't already exist in R2.

---

## Required Cloudflare API tokens / secrets

The plan needs three secrets to function in CI:

| Secret | Where it lives | Used by |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | GitHub repo secret + local `.env` (gitignored) | upload + prune scripts |
| `R2_ACCESS_KEY_ID` | GitHub repo secret + local `.env` (gitignored) | upload + prune scripts |
| `R2_SECRET_ACCESS_KEY` | GitHub repo secret + local `.env` (gitignored) | upload + prune scripts |

These are R2-specific S3-compatible credentials, generated in the Cloudflare dashboard (R2 → API tokens → Create API token → Object Read & Write). The Pages Function does NOT need credentials — it uses the R2 binding (`env.ASSETS`) and Cloudflare provides access automatically.

The plan assumes the human creating the bucket also creates the API token. Task 1 includes a checklist for the human; Tasks 2+ assume the secrets are present.

---

### Task 1: Create R2 bucket + API token (manual prerequisites)

**Files:**
- No edits.

This task is human-driven. It produces the credentials and resources that subsequent tasks consume.

- [ ] **Step 1: Create R2 bucket via Cloudflare API**

The implementer runs the following from a shell with Cloudflare API access (e.g., via the `mcp__plugin_cloudflare_cloudflare-api__execute` MCP tool, or directly via a curl/wrangler call):

```js
// Equivalent to: wrangler r2 bucket create ownvoice-static
async () => {
  const res = await cloudflare.request({
    method: "POST",
    path: `/accounts/${accountId}/r2/buckets`,
    body: { name: "ownvoice-static", locationHint: "wnam" },
  });
  return { ok: res.success, status: res.status, errors: res.errors };
}
```

Expected: `ok: true, status: 200`. The bucket appears in the Cloudflare dashboard at R2 → ownvoice-static.

If `locationHint: "wnam"` (Western North America) doesn't fit your data residency needs, choose another from the [R2 location hints documentation](https://developers.cloudflare.com/r2/buckets/data-location/).

- [ ] **Step 2: Bind the R2 bucket to the Pages project**

Either via the dashboard (Workers & Pages → ownvoice → Settings → Functions → R2 bucket bindings → Add) or via API:

```js
async () => {
  const res = await cloudflare.request({
    method: "PATCH",
    path: `/accounts/${accountId}/pages/projects/ownvoice`,
    body: {
      deployment_configs: {
        production: {
          r2_buckets: { ASSETS: { name: "ownvoice-static" } },
        },
        preview: {
          r2_buckets: { ASSETS: { name: "ownvoice-static" } },
        },
      },
    },
  });
  return { ok: res.success, errors: res.errors };
}
```

Binding name `ASSETS` (uppercase) is what the Pages Function references via `env.ASSETS`. Both `production` and `preview` environments get the binding.

- [ ] **Step 3: Generate R2 API token**

Dashboard-only step (no API equivalent for token creation that returns the secret in plaintext):

1. Cloudflare dashboard → R2 → Manage R2 API Tokens → Create API Token.
2. Permissions: Object Read & Write.
3. Specify bucket: `ownvoice-static`.
4. TTL: forever (or whatever policy you prefer; for CI long-lived is appropriate).
5. Copy the **Access Key ID** and **Secret Access Key** that appear on the success screen. They are shown ONCE — capture them or you'll need to regenerate.

- [ ] **Step 4: Add three secrets to GitHub repo**

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "6214385d7051de2a77e77d1999bead35"
gh secret set R2_ACCESS_KEY_ID --body "<from Step 3>"
gh secret set R2_SECRET_ACCESS_KEY --body "<from Step 3>"
```

- [ ] **Step 5: Add the same three to local `.env` (for upload/prune scripts run locally)**

Edit `.env` (gitignored) with:

```
CLOUDFLARE_ACCOUNT_ID=6214385d7051de2a77e77d1999bead35
R2_ACCESS_KEY_ID=<from Step 3>
R2_SECRET_ACCESS_KEY=<from Step 3>
```

`.env` is already gitignored (line 27 of `.gitignore`).

No commit at this task. Subsequent tasks consume the bucket + secrets.

---

### Task 2: Create asset-version constants

**Files:**
- Create: `src/models/assetVersions.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Single source of truth for the version segment used in R2 paths.
 *
 * Bumping these constants drives:
 *   1. The path that worker `ort.env.wasm.wasmPaths` resolves to (/ort/<ORT_VERSION>/)
 *   2. The path that `public/models-manifest.json` baseUrls reference
 *   3. The path the upload script uploads to in R2
 *   4. The keep-set the prune script computes
 *
 * Version names are arbitrary but should be human-readable (a developer
 * skimming an R2 path should know roughly what the bytes are).
 */

/** Bumped when we ship a new onnxruntime-web version. Matches package.json. */
export const ORT_VERSION = "v1.17.0";

/** Bumped when we change which model bytes ship. */
export const MODELS_RELEASE = "chatterbox-multilingual-2026-04";

/** Asset path prefixes — used by upload script and Pages Functions. */
export const ORT_ASSET_PREFIX = `ort/${ORT_VERSION}`;
export const MODELS_ASSET_PREFIX = `models/${MODELS_RELEASE}`;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/models/assetVersions.ts
git commit -m "feat(assets): add asset-version constants

Single source of truth for the version segment in R2 asset paths.
ORT_VERSION matches the npm version of onnxruntime-web; MODELS_RELEASE
is a human-readable label that bumps when model bytes change. Used
by worker wasmPaths config, the upload script, and the prune script."
```

---

### Task 3: Add `wrangler.toml` for Pages binding declaration

**Files:**
- Create: `wrangler.toml`

The binding was added via API in Task 1 step 2. `wrangler.toml` documents it in source so future contributors know what's expected.

- [ ] **Step 1: Create the file**

```toml
# Cloudflare Pages configuration for the OwnVoice project.
#
# This file declares the R2 binding used by Pages Functions to serve
# /ort/* and /models/* from the ownvoice-static bucket. The actual
# binding is configured in the Cloudflare dashboard (or via the API
# call in plan 2026-04-27-r2-asset-hosting Task 1 Step 2). This file
# is the source-controlled record of what's expected.
#
# Pages does not auto-read this file the way Workers does — it's
# documentation. Wrangler will use it for `wrangler pages dev` if you
# choose to test Functions locally.

name = "ownvoice"
compatibility_date = "2026-04-27"
pages_build_output_dir = "dist"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "ownvoice-static"
preview_bucket_name = "ownvoice-static"
```

- [ ] **Step 2: Commit**

```bash
git add wrangler.toml
git commit -m "build(cf): declare R2 ASSETS binding in wrangler.toml

Source-controlled record of the binding configured in the Cloudflare
dashboard. Pages reads this file for 'wrangler pages dev' local
testing; production binding is in the project settings."
```

---

### Task 4: Write the Pages Function for `/ort/*`

**Files:**
- Create: `functions/ort/[[path]].ts`

Pages Functions are file-routed: `functions/ort/[[path]].ts` matches any path under `/ort/`. The `[[path]]` parameter captures everything after `/ort/`.

- [ ] **Step 1: Create the file**

```ts
/**
 * Pages Function: serves any `/ort/*` request from the R2 bucket
 * `ownvoice-static` at key `ort/<...>`. The function reads the object
 * via the `ASSETS` binding and streams the response with a long
 * immutable Cache-Control so Cloudflare's edge caches it across
 * requests.
 *
 * Asset paths are versioned (see `src/models/assetVersions.ts`), so
 * the URL never changes for the same bytes — `immutable` is safe.
 *
 * Range requests are not currently supported by the binding's `get()`
 * method; ORT loads the WASM as a single GET, so this is fine. If
 * future code uses Range, switch to `env.ASSETS.get(key, { range })`.
 */

interface Env {
  ASSETS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `ort/${subpath}`;
  const object = await env.ASSETS.get(key);
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // 1 year + immutable: paths are versioned, so the bytes never change
  // for a given URL.
  headers.set("cache-control", "public, max-age=31536000, immutable");
  // CORP cross-origin so a different scheme/origin in dev tools or
  // a hypothetical iframe can still load the asset.
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
```

- [ ] **Step 2: Install Cloudflare Pages Functions types**

```bash
npm install --save-dev @cloudflare/workers-types
```

Then add to `tsconfig.json` `compilerOptions.types`:

```json
"types": ["@cloudflare/workers-types"]
```

(If `tsconfig.json` doesn't have a `types` field, add it. If it has other entries, append `"@cloudflare/workers-types"`.)

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add functions/ort/[[path]].ts package.json package-lock.json tsconfig.json
git commit -m "feat(cf): add /ort/* Pages Function backed by R2

Streams any /ort/* request from the ownvoice-static bucket. Long
immutable Cache-Control means edge caches the response, so Function
invocations are rare (one per region per cold cache)."
```

---

### Task 5: Write the Pages Function for `/models/*`

**Files:**
- Create: `functions/models/[[path]].ts`

Identical pattern to `/ort/*`. Separate file so each route's responsibility is colocated.

- [ ] **Step 1: Create the file**

```ts
/**
 * Pages Function: serves any `/models/*` request from the R2 bucket
 * `ownvoice-static` at key `models/<...>`. Same caching strategy as
 * `/ort/*`. See ../ort/[[path]].ts for the rationale.
 */

interface Env {
  ASSETS: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const subpath = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (typeof subpath !== "string" || subpath.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = `models/${subpath}`;
  const object = await env.ASSETS.get(key);
  if (!object) {
    return new Response(`R2 object not found: ${key}`, { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("cross-origin-resource-policy", "cross-origin");
  return new Response(object.body, { headers });
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add functions/models/[[path]].ts
git commit -m "feat(cf): add /models/* Pages Function backed by R2

Same pattern as /ort/* — streams from R2 with immutable cache.
Replaces the static-asset path that previously exceeded the 25 MiB
Pages limit."
```

---

### Task 6: Write the upload script

**Files:**
- Create: `scripts/upload-r2-assets.mjs`

The upload script reads local files in `public/ort/*.wasm` and `public/models/**`, computes target R2 keys using the asset version constants, and uploads via the S3-compatible API. Idempotent: skips files whose size already matches what's in R2.

- [ ] **Step 1: Install S3 SDK**

```bash
npm install --save-dev @aws-sdk/client-s3
```

- [ ] **Step 2: Create the script**

```js
#!/usr/bin/env node
/**
 * Upload assets to the ownvoice-static R2 bucket.
 *
 * Reads asset versions from src/models/assetVersions.ts (transpiled at
 * runtime via a small parse) and uploads:
 *   - public/ort/*.wasm  → ort/<ORT_VERSION>/<file>
 *   - public/models/**   → models/<MODELS_RELEASE>/<group>/<file>
 *
 * Idempotent: HEADs the target key first; uploads only if missing or
 * if the size differs. Use --force to re-upload everything.
 *
 * Usage:
 *   node scripts/upload-r2-assets.mjs            # incremental
 *   node scripts/upload-r2-assets.mjs --force    # re-upload everything
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 */
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const FORCE = process.argv.includes("--force");

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
const Bucket = "ownvoice-static";

// Read asset versions from src/models/assetVersions.ts. We don't run a
// full TS compile — just regex out the two constants we need.
async function readVersions() {
  const src = await readFile(join(ROOT, "src/models/assetVersions.ts"), "utf-8");
  const ortMatch = src.match(/ORT_VERSION\s*=\s*"([^"]+)"/);
  const modelsMatch = src.match(/MODELS_RELEASE\s*=\s*"([^"]+)"/);
  if (!ortMatch || !modelsMatch) {
    throw new Error("Could not parse ORT_VERSION / MODELS_RELEASE from assetVersions.ts");
  }
  return { ortVersion: ortMatch[1], modelsRelease: modelsMatch[1] };
}

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function existsWithSize(key, sizeBytes) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return head.ContentLength === sizeBytes;
  } catch {
    return false;
  }
}

async function uploadOne(key, localPath) {
  const body = await readFile(localPath);
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body }));
  console.log(`  ✓ ${key} (${body.byteLength.toLocaleString()} B)`);
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const { ortVersion, modelsRelease } = await readVersions();
  console.log(`Uploading to bucket ${Bucket}`);
  console.log(`  ORT version:    ${ortVersion}`);
  console.log(`  Models release: ${modelsRelease}`);
  console.log("");

  // ORT WASM
  const ortDir = join(ROOT, "public/ort");
  const ortFiles = (await readdir(ortDir)).filter((f) => f.endsWith(".wasm"));
  console.log(`ORT WASM files (${ortFiles.length}):`);
  for (const f of ortFiles) {
    const local = join(ortDir, f);
    const size = (await stat(local)).size;
    const key = `ort/${ortVersion}/${f}`;
    if (!FORCE && (await existsWithSize(key, size))) {
      console.log(`  · ${key} (cached)`);
      continue;
    }
    await uploadOne(key, local);
  }

  // Models
  const modelsDir = join(ROOT, "public/models");
  const modelFiles = await walk(modelsDir);
  console.log(`\nModel files (${modelFiles.length}):`);
  for (const local of modelFiles) {
    const rel = relative(modelsDir, local);
    const size = (await stat(local)).size;
    const key = `models/${modelsRelease}/${rel}`;
    if (!FORCE && (await existsWithSize(key, size))) {
      console.log(`  · ${key} (cached)`);
      continue;
    }
    await uploadOne(key, local);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add script to `package.json`**

In `package.json`, add to `scripts`:

```json
"assets:upload": "node scripts/upload-r2-assets.mjs"
```

- [ ] **Step 4: Smoke-test the script (incremental, fast)**

Source `.env` and run:

```bash
set -a && source .env && set +a && npm run assets:upload
```

Expected: lists the files; uploads the ones not yet in R2. First run uploads ~2.55 GB; subsequent runs skip everything as `(cached)`.

If you don't have the model files locally yet, run `./scripts/download-models.sh` first (or skip — Task 14 replaces that script, but for the first upload, the legacy script populates `public/models/`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/upload-r2-assets.mjs
git commit -m "build(assets): add R2 upload script

Idempotent uploader that pushes public/ort/*.wasm and public/models/**
to ownvoice-static R2 bucket at versioned paths. Reads version
constants from src/models/assetVersions.ts. Skips files already in
R2 with matching size unless --force."
```

---

### Task 7: Run the initial R2 upload

**Files:**
- No edits.

This is the moment the bucket fills up. After this task, R2 contains all the bytes the production deploy needs.

- [ ] **Step 1: Confirm `public/models/` is fully populated locally**

```bash
du -sh public/models/
ls public/models/
```

Expected: ~2.5 GB across the three model groups (chatterbox-multilingual, lfm2-1.2b-instruct, whisper-small). If empty, run `./scripts/download-models.sh` first.

- [ ] **Step 2: Confirm `public/ort/` has the WASM files**

```bash
ls -la public/ort/*.wasm
```

Expected: `ort-wasm-simd-threaded.asyncify.wasm` (27 MB) and `ort-wasm-simd-threaded.jsep.wasm` (24 MB).

- [ ] **Step 3: Run the upload**

```bash
set -a && source .env && set +a && npm run assets:upload
```

Expected output: every ORT file uploaded once, every model file uploaded once. Total wall time depends on uplink speed (rough estimate: 2.55 GB at 50 Mbps ≈ 7 minutes).

- [ ] **Step 4: Verify via Cloudflare API that objects exist**

```js
async () => {
  const res = await cloudflare.request({
    method: "GET",
    path: `/accounts/${accountId}/r2/buckets/ownvoice-static/objects?per_page=20`,
  });
  return {
    ok: res.success,
    sample_count: res.result?.length,
    samples: (res.result || []).slice(0, 10).map((o) => o.key),
  };
}
```

Expected: 20+ keys with prefixes `ort/v1.17.0/` and `models/chatterbox-multilingual-2026-04/`.

No commit. The upload is operational state, not source code.

---

### Task 8: Update worker wasmPaths to use `/ort/<version>/`

**Files:**
- Modify: `src/models/ttsWorker.ts`
- Modify: `src/models/sttWorker.ts`
- Modify: `src/models/llmWorker.ts`

- [ ] **Step 1: Update `src/models/ttsWorker.ts`**

Find:

```ts
  ort.env.wasm.wasmPaths = "/node_modules/onnxruntime-web/dist/";
```

Replace with:

```ts
  // ORT loads WASM at runtime from this URL prefix. In production,
  // /ort/* is served by a Pages Function backed by R2 (see
  // functions/ort/[[path]].ts). In dev, Vite serves the same path
  // from public/ort/ via the public-dir mechanism.
  ort.env.wasm.wasmPaths = `/ort/${ORT_VERSION}/`;
```

And add an import at the top of the file (after existing imports):

```ts
import { ORT_VERSION } from "./assetVersions";
```

- [ ] **Step 2: Apply the same change to `src/models/sttWorker.ts`**

Same find/replace + same import.

- [ ] **Step 3: Apply the same change to `src/models/llmWorker.ts`**

Same find/replace + same import.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/models/ttsWorker.ts src/models/sttWorker.ts src/models/llmWorker.ts
git commit -m "feat(models): point ORT wasmPaths at /ort/<version>/

Workers now load ONNX Runtime WASM from /ort/v1.17.0/ instead of
/node_modules/onnxruntime-web/dist/. The new path is served by a
Pages Function backed by R2 in production. Version comes from
assetVersions.ts, so a future ORT bump updates one constant."
```

---

### Task 9: Update `models-manifest.json` baseUrls to versioned paths

**Files:**
- Modify: `public/models-manifest.json`

The manifest already has `baseUrl` per model group. Today they're un-versioned (e.g., `/models/chatterbox-multilingual/`). Change them to include the release name.

- [ ] **Step 1: Inspect current state**

```bash
grep -n "baseUrl" public/models-manifest.json
```

You'll see entries like:

```json
"baseUrl": "/models/chatterbox-multilingual/",
```

- [ ] **Step 2: Replace each baseUrl with the versioned path**

For each entry, prepend the `MODELS_RELEASE` (`chatterbox-multilingual-2026-04`) into the path. The new format is `/models/<MODELS_RELEASE>/<group>/`.

If there are three groups (`chatterbox-multilingual`, `lfm2-1.2b-instruct`, `whisper-small`), edit them to:

```json
"baseUrl": "/models/chatterbox-multilingual-2026-04/chatterbox-multilingual/",
"baseUrl": "/models/chatterbox-multilingual-2026-04/lfm2-1.2b-instruct/",
"baseUrl": "/models/chatterbox-multilingual-2026-04/whisper-small/",
```

(The release name is the outer version segment; the group name remains as the inner path component because R2 stores files under `models/<release>/<group>/<file>` to match the local layout.)

- [ ] **Step 3: Run manifest verification**

```bash
npm run manifest:check
```

Expected: `models-manifest.json is up to date.` (Sizes haven't changed; only `baseUrl` strings did. The `manifestIntegrity` test verifies sizes match disk, not URLs.)

- [ ] **Step 4: Run the test suite**

```bash
npm test 2>&1 | tail -3
```

Expected: all tests pass. Worker tests don't load real WASM/models, so no regressions.

- [ ] **Step 5: Commit**

```bash
git add public/models-manifest.json
git commit -m "feat(models): version the model manifest baseUrls

Each baseUrl now contains the MODELS_RELEASE segment so the URL is
stable for a given release. Bumping MODELS_RELEASE in
assetVersions.ts requires updating the baseUrls here in the same
commit. Pages Function at /models/[[path]] reads from R2 at the
matching key."
```

---

### Task 10: Configure Vite to not bundle ORT WASM

**Files:**
- Modify: `vite.config.ts`
- Create: `scripts/strip-dist-large.mjs` (postbuild safety net)
- Modify: `package.json` (postbuild hook)

The current build emits `dist/assets/ort-wasm-*.wasm` (24 MB and 27 MB) because Vite bundles them from worker imports. We need them out of `dist/`. Two strategies:

a. Tell Rollup to externalize the .wasm imports.
b. Strip them post-build with a small script.

Both are necessary belt-and-braces: if (a) misses a file, (b) catches it.

- [ ] **Step 1: Add Rollup external pattern to `vite.config.ts`**

In `vite.config.ts`, add to the `defineConfig` call's `build.rollupOptions` section:

```ts
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
      // Don't bundle the ORT WASM into dist/assets/. ORT loads them
      // at runtime from `wasmPaths` (= /ort/<version>/), so the
      // bundled copies are dead bytes that violate Pages' 25 MiB cap.
      external: [
        /onnxruntime-web\/.*\.wasm$/,
      ],
    },
  },
```

- [ ] **Step 2: Create the postbuild stripper**

Create `scripts/strip-dist-large.mjs`:

```js
#!/usr/bin/env node
/**
 * Post-build safety net: removes any file in `dist/` larger than
 * 24 MiB so Cloudflare Pages' 25 MiB per-file limit is never hit
 * even if Rollup misses an external pattern. The stripped files
 * are loaded at runtime from R2 via Pages Functions.
 *
 * Files removed are logged. If anything is removed, the build is
 * not "broken" — it's the expected state.
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "..", "dist");
const MAX_BYTES = 24 * 1024 * 1024; // 24 MiB threshold (1 MiB margin under 25)

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile()) yield full;
  }
}

let removed = 0;
let totalBytes = 0;
for await (const file of walk(DIST)) {
  const s = await stat(file);
  if (s.size > MAX_BYTES) {
    await unlink(file);
    console.log(`  removed ${file.replace(DIST + "/", "")} (${s.size.toLocaleString()} B)`);
    removed++;
    totalBytes += s.size;
  }
}

if (removed === 0) {
  console.log("strip-dist-large: nothing over 24 MiB.");
} else {
  console.log(`strip-dist-large: removed ${removed} file(s), ${totalBytes.toLocaleString()} B total.`);
}
```

- [ ] **Step 3: Wire postbuild in `package.json`**

In `package.json`, change the `build` script to chain the stripper:

```json
"build": "tsc --noEmit && vite build && node scripts/strip-dist-large.mjs"
```

- [ ] **Step 4: Run the build and verify no large files in dist**

```bash
npm run build 2>&1 | tail -20
find dist -size +20M
```

Expected:
- The build output line lists the chunks; the `ort-wasm-*.wasm` lines should be absent (or smaller than before).
- `find dist -size +20M` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts scripts/strip-dist-large.mjs package.json
git commit -m "build: keep ORT WASM out of dist/

Two-layer defense: (1) Rollup externalizes onnxruntime-web/*.wasm so
imports don't bundle, (2) postbuild stripper removes anything over
24 MiB from dist/ as a safety net. The stripped bytes are served
at runtime by /ort/* Pages Function from R2."
```

---

### Task 11: Update `public/_headers` for asset cache rules

**Files:**
- Modify: `public/_headers`

Pages Function responses already set `Cache-Control` per request. But for any static asset that Pages serves directly (not through a Function), we want predictable caching too. The Function's headers take precedence; this is a fallback.

- [ ] **Step 1: Add the cache rules**

Append to `public/_headers`:

```

/ort/*
  Cache-Control: public, max-age=31536000, immutable

/models/*
  Cache-Control: public, max-age=31536000, immutable
```

(Two-space indent, blank line between blocks. The existing `/sw.js` and `/app/*` blocks at the top stay.)

- [ ] **Step 2: Verify the file**

```bash
cat -et public/_headers
```

Expected: existing blocks intact, new blocks at the bottom with two-space indents (`$` end-of-line markers).

- [ ] **Step 3: Build and verify the file is in dist**

```bash
npm run build
cat dist/_headers
```

Expected: the file is present in dist with all blocks.

- [ ] **Step 4: Commit**

```bash
git add public/_headers
git commit -m "build(cf): add immutable cache rules for /ort/* and /models/*

Belt-and-braces: Pages Functions already set Cache-Control per
response, but if a future change serves these paths via Pages'
direct asset path, _headers ensures the same caching applies."
```

---

### Task 12: Write the prune script

**Files:**
- Create: `scripts/prune-r2.mjs`

The script computes the keep-set from main + all open-PR branches and deletes anything else, with a 24-hour grace window for in-flight uploads. Uses `execFileSync` (no shell — safer than `execSync` against shell-metachar injection from branch names).

- [ ] **Step 1: Create the script**

```js
#!/usr/bin/env node
/**
 * Prune unreferenced objects from the ownvoice-static R2 bucket.
 *
 * Keep-set = union of asset paths referenced by:
 *   - main's models-manifest.json + assetVersions.ts
 *   - every open PR's branch HEAD
 *
 * Anything else gets deleted, EXCEPT objects uploaded within the
 * last 24 hours (grace window for in-flight CI uploads).
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   GH_TOKEN or GITHUB_TOKEN (for `gh` to read PR list and branch contents)
 *
 * Usage:
 *   node scripts/prune-r2.mjs              # prune
 *   node scripts/prune-r2.mjs --dry-run    # report what would be deleted
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { execFileSync } from "node:child_process";

const DRY_RUN = process.argv.includes("--dry-run");
const GRACE_MS = 24 * 60 * 60 * 1000;

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
const Bucket = "ownvoice-static";

// execFile (not exec) — argv array is passed to gh without spawning
// a shell, so any branch name with metacharacters can't inject.
function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });
}

function parseVersions(src) {
  const ortMatch = src.match(/ORT_VERSION\s*=\s*"([^"]+)"/);
  const modelsMatch = src.match(/MODELS_RELEASE\s*=\s*"([^"]+)"/);
  if (!ortMatch || !modelsMatch) return null;
  return { ortVersion: ortMatch[1], modelsRelease: modelsMatch[1] };
}

function parseManifest(json) {
  try {
    const data = JSON.parse(json);
    const baseUrls = [];
    for (const group of Object.values(data.models || {})) {
      if (typeof group?.baseUrl === "string") baseUrls.push(group.baseUrl);
    }
    return baseUrls;
  } catch {
    return [];
  }
}

function fetchBranchAssets(ref) {
  // Read the two source files at the given ref. If either is missing
  // or unparseable, we treat the branch as having no asset references
  // (safe — won't keep anything spurious).
  let versions = null;
  try {
    const src = gh(
      "api",
      `repos/mcat/ownvoice/contents/src/models/assetVersions.ts?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    versions = parseVersions(src);
  } catch {
    // ignored — older branches may not have this file
  }
  let manifestBaseUrls = [];
  try {
    const src = gh(
      "api",
      `repos/mcat/ownvoice/contents/public/models-manifest.json?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    manifestBaseUrls = parseManifest(src);
  } catch {
    // ignored
  }
  return { versions, manifestBaseUrls };
}

function computeKeepPrefixes({ versions, manifestBaseUrls }) {
  const prefixes = new Set();
  if (versions) {
    prefixes.add(`ort/${versions.ortVersion}/`);
  }
  for (const baseUrl of manifestBaseUrls) {
    // baseUrl looks like /models/<release>/<group>/  →  models/<release>/<group>/
    const stripped = baseUrl.replace(/^\//, "");
    prefixes.add(stripped);
  }
  return prefixes;
}

function isReferenced(key, prefixSet) {
  for (const prefix of prefixSet) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  console.log("Computing keep-set from main + open PRs...");
  const refs = ["main"];
  const prListRaw = gh("pr", "list", "--state", "open", "--json", "headRefName");
  const prList = JSON.parse(prListRaw);
  for (const pr of prList) refs.push(pr.headRefName);
  console.log(`  Refs to inspect: ${refs.length} (${refs.join(", ")})`);

  const allPrefixes = new Set();
  for (const ref of refs) {
    const assets = fetchBranchAssets(ref);
    for (const p of computeKeepPrefixes(assets)) allPrefixes.add(p);
  }
  console.log(`  Reference prefixes:`);
  for (const p of allPrefixes) console.log(`    ${p}`);

  console.log("\nListing R2 bucket...");
  const listed = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
    listed.push(...(res.Contents || []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`  ${listed.length} objects in bucket`);

  const now = Date.now();
  const orphans = listed.filter((obj) => {
    const referenced = isReferenced(obj.Key, allPrefixes);
    const recentlyUploaded =
      obj.LastModified && now - new Date(obj.LastModified).getTime() < GRACE_MS;
    return !referenced && !recentlyUploaded;
  });

  if (orphans.length === 0) {
    console.log("\nNo orphans to prune.");
    return;
  }

  console.log(`\n${DRY_RUN ? "[dry-run] would delete" : "Deleting"} ${orphans.length} orphans:`);
  for (const obj of orphans) {
    console.log(`  - ${obj.Key} (${obj.Size?.toLocaleString()} B, uploaded ${obj.LastModified?.toISOString()})`);
    if (!DRY_RUN) await s3.send(new DeleteObjectCommand({ Bucket, Key: obj.Key }));
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm scripts**

In `package.json`:

```json
"assets:prune": "node scripts/prune-r2.mjs",
"assets:prune:dry": "node scripts/prune-r2.mjs --dry-run"
```

- [ ] **Step 3: Smoke-test as dry-run**

```bash
set -a && source .env && set +a && npm run assets:prune:dry
```

Expected: lists current refs (main + your open branches), lists bucket contents, reports 0 orphans (since you just uploaded everything in Task 7 and the manifest references all of it).

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/prune-r2.mjs
git commit -m "build(assets): add R2 prune script

Reads main + all open PRs' assetVersions.ts and models-manifest.json
via gh (no shell — execFile against an argv array), computes the
union of referenced asset prefixes, deletes anything in R2 that's
neither referenced nor uploaded in the last 24h. Use --dry-run to
preview."
```

---

### Task 13: Add GitHub Actions workflow for prune

**Files:**
- Create: `.github/workflows/prune-r2.yml`

The workflow runs on every push to `main` and once daily.

- [ ] **Step 1: Create the workflow file**

```yaml
name: Prune R2

on:
  push:
    branches: [main]
  schedule:
    # 04:17 UTC daily — odd minute to avoid the top-of-hour load
    - cron: "17 4 * * *"
  workflow_dispatch: # allow manual runs from the Actions tab

jobs:
  prune:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - name: Prune unreferenced R2 objects
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          GH_TOKEN: ${{ github.token }}
        run: npm run assets:prune
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/prune-r2.yml
git commit -m "ci(r2): prune workflow on push:main + daily

Runs assets:prune on every merge to main and once a day. Daily
schedule catches edge cases where reachability changed without a
merge (e.g., a closed-without-merge PR's branch went away)."
```

---

### Task 14: Replace download-models.sh with download-assets.sh

**Files:**
- Create: `scripts/download-assets.sh`
- Delete: `scripts/download-models.sh`
- Modify: `package.json`
- Modify: `.gitignore`

The new script downloads both ORT WASM (from npm via unpkg) and model files (from HuggingFace, same as before). For new contributors, this is the entry point to populate `public/ort/` + `public/models/` for local dev.

- [ ] **Step 1: Read the current download-models.sh to copy the model-download logic**

```bash
cat scripts/download-models.sh
```

(For brevity, this plan does not reproduce the entire model-download logic. The new script keeps the model-download section verbatim and adds the ORT-download section.)

- [ ] **Step 2: Create `scripts/download-assets.sh`**

Start by copying `scripts/download-models.sh` to `scripts/download-assets.sh`, then prepend an ORT-download section at the top (after the `set -e`):

```bash
# ── ONNX Runtime WASM (~50 MB) ──
ORT_VERSION="1.17.0"
ORT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/ort"
mkdir -p "$ORT_DIR"

echo "==> ONNX Runtime WASM (v${ORT_VERSION})"
for f in ort-wasm-simd-threaded.jsep.wasm ort-wasm-simd-threaded.asyncify.wasm; do
  if [ -f "$ORT_DIR/$f" ]; then
    echo "  $f (cached)"
  else
    echo "  $f"
    curl -sL -o "$ORT_DIR/$f" "https://unpkg.com/onnxruntime-web@${ORT_VERSION}/dist/$f"
  fi
done
echo ""
```

Make the script executable:

```bash
chmod +x scripts/download-assets.sh
```

- [ ] **Step 3: Delete the old script**

```bash
git rm scripts/download-models.sh
```

- [ ] **Step 4: Update package.json reference (if any)**

```bash
grep -n "download-models" package.json
```

If there's a reference (e.g., a `prepare` or `postinstall` hook), rename it to `download-assets`. Otherwise no change needed.

Add an explicit npm script for visibility:

```json
"assets:download": "./scripts/download-assets.sh"
```

- [ ] **Step 5: Update `.gitignore` to ignore `public/ort/*.wasm`**

The `.wasm` files are large binaries that shouldn't be in git. Append to `.gitignore`:

```
# Large ORT WASM binaries — too big for git (~50 MB).
# Download with: npm run assets:download
public/ort/*.wasm
```

(The existing rule for `public/models/` is already there.)

- [ ] **Step 6: Remove the existing `public/ort/*.wasm` from git tracking**

```bash
git rm --cached public/ort/*.wasm
```

The files stay on disk (so local dev keeps working); git stops tracking them. Future commits won't include them.

- [ ] **Step 7: Verify `scripts/download-assets.sh` works in a clean checkout simulation**

In a fresh shell:

```bash
mv public/ort public/ort.bak
./scripts/download-assets.sh
ls -la public/ort/
diff -r public/ort public/ort.bak  # should be identical
rm -rf public/ort.bak
```

Expected: the new script reproduces the same set of files.

- [ ] **Step 8: Commit**

```bash
git add scripts/download-assets.sh package.json .gitignore
git commit -m "build(assets): consolidate asset downloader

scripts/download-assets.sh replaces download-models.sh, additionally
fetching ORT WASM from unpkg. ORT WASM is now gitignored — too
large to live in git history. Existing tracked copies removed via
git rm --cached."
```

---

### Task 15: Update CLAUDE.md to document the asset-hosting setup

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a section after the existing "Offline storage" section**

Find the "Offline storage" section. After its closing paragraph, add:

```markdown
### Asset hosting (R2 + Pages Functions)

Large assets (ORT WASM, model weights) are hosted in the Cloudflare R2 bucket `ownvoice-static`. Pages Functions at `functions/ort/[[path]].ts` and `functions/models/[[path]].ts` proxy R2 reads to same-origin URLs (`/ort/*`, `/models/*`) so the existing service worker continues to OPFS-proxy them without changes.

- **Asset versioning** lives in `src/models/assetVersions.ts`. `ORT_VERSION` (npm version of onnxruntime-web) and `MODELS_RELEASE` (human-readable label) drive the path segments in R2. Bumping them is the trigger for a new upload.
- **Upload**: `npm run assets:upload` syncs `public/ort/*.wasm` and `public/models/**` to R2 at versioned paths. Idempotent.
- **Prune**: `npm run assets:prune` (and `--dry-run` variant) removes any R2 object not referenced by main or any open PR's branch, with a 24-hour grace for in-flight uploads. Runs automatically on every push to main and daily via GitHub Actions.
- **Local dev**: `npm run assets:download` (formerly `download-models.sh`) populates `public/ort/` and `public/models/` from npm/HuggingFace. Both directories are gitignored — they're build inputs, not source.
- **Build output**: `dist/` does NOT contain WASM or model files. The postbuild stripper (`scripts/strip-dist-large.mjs`) removes anything over 24 MiB as a safety net against the Cloudflare Pages 25 MiB per-file limit.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): document the R2 asset-hosting setup

Future agent sessions need to know: assets live in R2, paths are
versioned, the SW continues to work because Pages Functions proxy
R2 to same-origin paths."
```

---

### Task 16: End-to-end deploy preview verification

**Files:**
- No edits.

- [ ] **Step 1: Build locally and verify dist size**

```bash
npm run build
du -sh dist/
find dist -size +20M
```

Expected:
- `dist/` total under 5 MB (just JS/CSS/HTML and small assets)
- `find dist -size +20M` returns nothing

- [ ] **Step 2: Run the test suite**

```bash
npm test 2>&1 | tail -3
```

Expected: 1287 passing (no regressions from Plan C's count).

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/r2-asset-hosting
```

Cloudflare Pages picks up the push and starts a preview build at `https://<commit>.ownvoice.pages.dev`.

- [ ] **Step 4: Watch the Pages build**

Either via the Cloudflare dashboard or via API:

```js
async () => {
  const res = await cloudflare.request({
    method: "GET",
    path: `/accounts/${accountId}/pages/projects/ownvoice/deployments?per_page=3`,
  });
  return (res.result || []).map((d) => ({
    branch: d.deployment_trigger?.metadata?.branch,
    commit: d.deployment_trigger?.metadata?.commit_hash?.slice(0, 7),
    stage: d.latest_stage?.name,
    status: d.latest_stage?.status,
    url: d.url,
  }));
}
```

Expected: the preview build for `feat/r2-asset-hosting` reaches `deploy: success` (no longer fails at `validate-assets` with the 25 MiB error).

- [ ] **Step 5: Hit the preview URL and verify routes**

```bash
DEPLOY_URL="https://<commit>.ownvoice.pages.dev"
curl -sI "$DEPLOY_URL/" | head -1
curl -sI "$DEPLOY_URL/app/" | head -1
curl -sI "$DEPLOY_URL/research" | head -1
curl -sI "$DEPLOY_URL/bibliography" | head -1
curl -sI "$DEPLOY_URL/sw.js" | head -1
echo "--- /ort/ headers ---"
curl -sI "$DEPLOY_URL/ort/v1.17.0/ort-wasm-simd-threaded.jsep.wasm" | head -10
echo "--- /models/ headers ---"
curl -sI "$DEPLOY_URL/models/chatterbox-multilingual-2026-04/chatterbox-multilingual/speech_encoder.onnx" | head -10
```

Expected:
- All routes return 200.
- `/ort/...` and `/models/...` return 200 with `cache-control: public, max-age=31536000, immutable` and `cross-origin-resource-policy: cross-origin`.
- `/sw.js` returns 200 with `service-worker-allowed: /app/`.

- [ ] **Step 6: Open `/app/` in a browser and verify the patient app loads**

In a real browser (Safari 26 or Chrome current):

1. Navigate to `<DEPLOY_URL>/app/`.
2. Check DevTools Network tab: the WASM file request goes to `/ort/v1.17.0/...` and returns 200.
3. Run setup flow with a test patient — confirm voice-clone works end-to-end. (This validates the model files load from R2 too.)

If anything fails, investigate before pushing further.

- [ ] **Step 7: Open PR**

```bash
gh pr create --title "feat(deploy): R2 asset hosting + aggressive prune (unblocks Pages deploy)" --body "$(cat <<'EOF'
## Summary

**Plan E** from the homepage spec. Moves ONNX Runtime WASM (50 MB) and model weights (~2.5 GB) out of the Pages build output into R2, served back as same-origin URLs via Pages Functions. After this lands, the Cloudflare Pages deploy at \`ownvoice.icu\` works (was previously blocked on the 25 MiB per-file limit).

## What changes

- **R2 bucket** \`ownvoice-static\` stores all large assets at versioned paths (\`ort/v1.17.0/...\`, \`models/chatterbox-multilingual-2026-04/...\`)
- **Pages Functions** \`functions/ort/[[path]].ts\` and \`functions/models/[[path]].ts\` proxy R2 to same-origin URLs with immutable cache
- **Service worker** unchanged — \`/ort/*\` and \`/models/*\` remain same-origin so OPFS-proxy logic continues working without code change
- **Build** no longer contains WASM/models in \`dist/\` (postbuild stripper removes anything over 24 MiB as belt-and-braces)
- **Asset versioning** centralized in \`src/models/assetVersions.ts\`; bumping a version drives the path segment everywhere
- **Aggressive prune** via \`.github/workflows/prune-r2.yml\`: runs on every push to main + daily; deletes orphans not referenced by any branch (24h grace)

## Test plan

- [x] Build succeeds; \`dist/\` has no files over 24 MiB
- [x] All 1287 tests pass
- [x] Cloudflare Pages preview build no longer hits 25 MiB error
- [x] \`/ort/v1.17.0/...\` and \`/models/.../...\` return 200 with immutable cache headers
- [x] Patient app loads at \`/app/\` and runs voice-clone end-to-end (browser verification)
- [x] \`assets:prune --dry-run\` reports 0 orphans on a fresh bucket

## Spec / plan

- Plan: \`docs/superpowers/plans/2026-04-27-r2-asset-hosting.md\`

## Once merged

The production deploy at \`ownvoice.icu\` should serve the live site for the first time. DNS already points at \`ownvoice.pages.dev\`; this PR is what lets the deploy succeed.
EOF
)"
```

- [ ] **Step 8: Capture and report the PR URL.**

---

## Notes for the executing engineer

- **Task 1 is human-driven.** The implementer agent should NOT try to run the API calls without confirming the human has access to the Cloudflare account. The dashboard step (Step 3, generating the API token) cannot be automated — Cloudflare reveals the secret only at creation time.
- **Tasks 7 (initial upload) and 8+ (code changes) are sequenced.** Don't update worker `wasmPaths` to point at `/ort/v1.17.0/` until Task 7 has populated R2 with those bytes — otherwise the dev server would 404 on workers' boot.
- **The 24h prune grace window matters.** If you ever bump `MODELS_RELEASE` and merge it without uploading the new bytes first, the next prune sees the new path referenced but no objects at that prefix yet, and the deploy 404s on the missing bytes. The fix is: always run `npm run assets:upload` BEFORE merging a version bump, so the bytes land before the manifest references them.
- **Cost projections.** R2 free tier: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month, **zero egress fees**. Current usage: ~2.55 GB storage, dozens of writes per upload run, reads dominated by edge cache (most user requests don't hit the function or R2 directly). Expected operational bill: $0/month for v1 traffic.
- **If Cloudflare Pages Functions free tier (100K req/day) becomes a concern**, the next move is to switch the routes to a custom Worker route configured for caching at the edge (Worker has the same binding API; just hosted differently). The change is small and reversible.
