# Routing Skeleton + Cloudflare Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing OwnVoice PWA from `/` to `/app/`, install a minimal homepage placeholder at `/`, narrow the service-worker scope to `/app/`, update the PWA manifest, and add Cloudflare Pages headers + redirects so the SW can register at the wider scope. After this lands, the app behaves identically (just at a new URL), `/` shows a stub homepage with a link to `/app/`, and Plans C and D have a working foundation.

**Architecture:** Two-entry Vite build — `index.html` (homepage entry, mounts a minimal placeholder) and `app/index.html` (app entry, mounts the existing `<App />`). Service-worker scope narrowed via the `Service-Worker-Allowed` response header (set by Cloudflare `_headers`) and a `scope` option on `navigator.serviceWorker.register`. COOP/COEP confined to `/app/*` via the same `_headers` file so the homepage stays unencumbered.

**Tech Stack:** Vite multi-entry input, Preact, TypeScript, Tailwind. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-27-homepage-design.md` §4

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Homepage entry. Loads `/src/main-homepage.tsx`. No PWA manifest link, no SW registration script. |
| `app/index.html` | Create | App entry. Copy of current `index.html`, with `<script src="/src/main-app.tsx">` and SW registration scoped to `/app/`. |
| `src/main.tsx` | Rename → `src/main-app.tsx` | App mount point. No code changes — only the filename. |
| `src/main-homepage.tsx` | Create | Homepage entry. Mounts `<PlaceholderApp />` to `#root`. |
| `src/homepage/PlaceholderApp.tsx` | Create | Minimal placeholder component: title, one paragraph, link to `/app/`. |
| `src/homepage/PlaceholderApp.test.tsx` | Create | Render test verifying the link points to `/app/`. |
| `vite.config.ts` | Modify | Add `build.rollupOptions.input` declaring both entries. |
| `vitest.config.ts` | Modify | Update coverage exclusion `src/main.tsx` → `src/main-app.tsx`; add `src/main-homepage.tsx`. |
| `public/sw.js` | Modify | Update `CACHE_NAME` (v6 → v7), `SHELL_ASSETS` (`/` → `/app/`), `isShellAsset` (root paths → `/app/` paths). |
| `public/manifest.json` | Modify | `start_url` and add `scope` → `/app/`. |
| `public/_headers` | Create | Cloudflare Pages header rules: `Service-Worker-Allowed` on `/sw.js`, COOP/COEP on `/app/*`. |
| `public/_redirects` | Create | Cloudflare Pages redirect: `/app` → `/app/` (301). |
| `CLAUDE.md` | Modify | Update file-layout section to reflect the rename and new structure. |

The homepage entry must NOT import anything from `src/components/`, `src/models/`, `src/stores/`, or `src/hooks/`. The whole point of two entries is to keep the homepage's bundle clean of ML and patient-data deps. The placeholder uses only Preact.

---

### Task 1: Add Vite multi-entry build configuration

**Files:**
- Create: `app/index.html`
- Modify: `vite.config.ts`

This task introduces both entries before changing any other file. After this task, `npm run build` produces `dist/index.html` (still pointing at the old `/src/main.tsx`) and `dist/app/index.html` (pointing at the same `/src/main.tsx`). Both URLs render the same app — that's transient; subsequent tasks fix it.

- [ ] **Step 1: Create `app/index.html` as a duplicate of the root `index.html`**

Create the file `app/index.html` with this exact content (note: this is a copy of the current `index.html` with the inline SW registration script keeping `/sw.js` but with `scope: "/app/"`):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#FAFAF8" />
    <!--
      Defense-in-depth for crossOriginIsolated. COOP cannot be set via meta
      (HTTP header only — dev server + sw.js handle that), but COEP can, and
      a missing COEP header is the more common failure mode on static hosts.
      This tag ensures the document is COEP-gated even if the serving layer
      forgets the header.
    -->
    <meta http-equiv="Cross-Origin-Embedder-Policy" content="credentialless" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%232563EB'/><text x='16' y='23' font-size='20' text-anchor='middle' fill='white'>V</text></svg>" />
    <title>OwnVoice</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Only register SW in production builds — in dev it caches stale worker bundles
      if ("serviceWorker" in navigator && !window.location.port) {
        navigator.serviceWorker.register("/sw.js", { scope: "/app/" });
      }
    </script>
  </body>
</html>
```

(The `<script>` tag still references `/src/main.tsx` — that's the current entry. Task 3 renames it to `main-app.tsx` and updates this file.)

- [ ] **Step 2: Update `vite.config.ts` with multi-entry input**

Modify `vite.config.ts`. Add the `resolve` import at the top:

```ts
import { resolve } from "node:path";
```

Add `build` configuration to the `defineConfig` call. The full updated file is:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    // COOP/COEP make `crossOriginIsolated` true, which is the prerequisite
    // for SharedArrayBuffer — and therefore for multi-threaded WASM in ORT.
    // The conditional decoder runs on single-threaded WASM by default and
    // is ~24× real-time; threading drops that to near-parity. `credentialless`
    // is the lighter COEP variant: it doesn't require CORP on every
    // subresource (we'd otherwise need to add it everywhere) but still
    // gates SharedArrayBuffer. Production parity is provided by sw.js
    // injecting the same headers on cached responses.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  worker: {
    format: "es",
  },
});
```

- [ ] **Step 3: Run the build to verify both entries produce HTML**

```bash
npm run build
```

Expected: succeeds with exit 0. Then verify:

```bash
ls dist/index.html dist/app/index.html
```

Expected: both files present.

If the build fails, inspect the error. The most common cause is `__dirname` not being defined — Vite supports it in CommonJS-style configs but not always in pure ESM. If you see "ReferenceError: __dirname is not defined", switch to:

```ts
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

at the top of `vite.config.ts`. Re-run.

- [ ] **Step 4: Commit**

```bash
git add app/index.html vite.config.ts
git commit -m "build: add Vite multi-entry input for /app split

Introduces app/index.html as a second build target alongside index.html.
Both entries currently mount the same app; subsequent tasks rename the
mount point and create a homepage placeholder."
```

---

### Task 2: Run all tests and the build to capture pre-rename baseline

**Files:**
- No edits.

Before renaming `src/main.tsx`, capture a clean baseline so any test failures from later tasks can be traced.

- [ ] **Step 1: Run vitest**

```bash
npm test
```

Expected: all tests pass. Record the test count (e.g., "203 passed"). If any tests fail, stop and investigate — Plan B should not introduce regressions, so a pre-existing failure must be acknowledged before proceeding.

- [ ] **Step 2: Confirm the build is green**

```bash
npm run build
```

Expected: succeeds, both `dist/index.html` and `dist/app/index.html` present.

No commit — this is a verification-only task.

---

### Task 3: Rename `src/main.tsx` → `src/main-app.tsx`

**Files:**
- Rename: `src/main.tsx` → `src/main-app.tsx` (no content change)
- Modify: `app/index.html` (script src)
- Modify: `vitest.config.ts` (coverage exclusion)

- [ ] **Step 1: Rename via git for history preservation**

```bash
git mv src/main.tsx src/main-app.tsx
```

- [ ] **Step 2: Update `app/index.html` script src**

Find:
```html
    <script type="module" src="/src/main.tsx"></script>
```

Replace with:
```html
    <script type="module" src="/src/main-app.tsx"></script>
```

(The root `index.html` still references `/src/main.tsx` at this point. That's broken in transit — Task 4 fixes it by changing the root `index.html` to reference `/src/main-homepage.tsx`. Don't run dev server yet.)

- [ ] **Step 3: Update `vitest.config.ts` coverage exclusion**

Find (line 29):
```ts
        "src/main.tsx",
```

Replace with:
```ts
        "src/main-app.tsx",
        "src/main-homepage.tsx",
```

(Even though `main-homepage.tsx` doesn't exist yet, adding it now means coverage excludes both entries from the start.)

- [ ] **Step 4: Verify build with the rename + script src update**

```bash
npm run build
```

Expected: succeeds. The root `index.html` references `/src/main.tsx` which no longer exists; Vite would normally fail. **However**, because Vite resolves entries via the `rollupOptions.input` map, the broken `<script src>` in `index.html` only fails the `main` chunk. If the build appears to succeed silently with a missing script, that's because Vite is permissive about nonexistent script paths in HTML.

Either way, the next task fixes the root `index.html` script src. If `npm run build` fails here with a clear "Could not resolve /src/main.tsx" error, that's expected — proceed to Task 4 to fix it.

- [ ] **Step 5: Commit**

```bash
git add src/main-app.tsx vitest.config.ts app/index.html
# git mv already staged the deletion of src/main.tsx
git commit -m "refactor(entries): rename src/main.tsx → src/main-app.tsx

Renames the existing app entry in preparation for a second
src/main-homepage.tsx entry. No code changes — pure rename to
preserve git history. app/index.html updated to point at the new
filename; root index.html will be updated in the next task once
the homepage entry exists."
```

---

### Task 4: Create homepage placeholder + entry, update root `index.html`

**Files:**
- Create: `src/homepage/PlaceholderApp.tsx`
- Create: `src/homepage/PlaceholderApp.test.tsx`
- Create: `src/main-homepage.tsx`
- Modify: `index.html`

This task introduces the homepage placeholder. TDD: test first, then implementation.

- [ ] **Step 1: Write the failing test for `PlaceholderApp`**

Create `src/homepage/PlaceholderApp.test.tsx`:

```tsx
import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import { PlaceholderApp } from "./PlaceholderApp";

describe("PlaceholderApp", () => {
  it("renders the OwnVoice title", () => {
    render(<PlaceholderApp />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/OwnVoice/i);
  });

  it("links to the app at /app/", () => {
    render(<PlaceholderApp />);
    const link = screen.getByRole("link", { name: /open the app/i });
    expect(link).toHaveAttribute("href", "/app/");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
npx vitest run src/homepage/PlaceholderApp.test.tsx
```

Expected: FAIL with "Cannot find module './PlaceholderApp'" or similar. The component doesn't exist yet.

- [ ] **Step 3: Create the minimal `PlaceholderApp` component**

Create `src/homepage/PlaceholderApp.tsx`:

```tsx
export function PlaceholderApp() {
  return (
    <main
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        maxWidth: 640,
        margin: "10vh auto",
        padding: "0 24px",
        color: "#1c1917",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
        OwnVoice
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.55, marginTop: 16, color: "#44403c" }}>
        A browser-based AAC application for ICU patients who are temporarily unable to speak.
        On-device voice cloning, validated pain assessment, structured goals-of-care.
      </p>
      <p style={{ fontSize: 14, color: "#78716c", marginTop: 24 }}>
        Homepage coming soon.
      </p>
      <a
        href="/app/"
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 18px",
          background: "#0f172a",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Open the app →
      </a>
    </main>
  );
}
```

The component uses inline styles only — no Tailwind, no imports from `src/theme/`, no app dependencies. This keeps the homepage bundle minimal.

- [ ] **Step 4: Run the test and verify it passes**

```bash
npx vitest run src/homepage/PlaceholderApp.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/main-homepage.tsx`**

Create the file:

```tsx
import { render } from "preact";
import { PlaceholderApp } from "./homepage/PlaceholderApp";

render(<PlaceholderApp />, document.getElementById("root")!);
```

That's the entire entry. No theme subscriptions, no store wiring — those are app concerns.

- [ ] **Step 6: Update root `index.html`**

The root `index.html` becomes the homepage entry. It removes:
- The `<link rel="manifest">` (PWA install belongs to `/app/`)
- The inline SW registration script (also belongs to `/app/`)

And changes the script src to `/src/main-homepage.tsx`. Replace the entire file contents with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#FAFAF8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%232563EB'/><text x='16' y='23' font-size='20' text-anchor='middle' fill='white'>V</text></svg>" />
    <title>OwnVoice — In-patient AAC with personal voice</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main-homepage.tsx"></script>
  </body>
</html>
```

Note: COOP/COEP meta is removed too — the homepage doesn't need them and shouldn't set them. PWA `start_url` is updated in Task 6 to `/app/` so installing from any page lands in the app.

- [ ] **Step 7: Build and verify both entries**

```bash
npm run build
```

Expected: succeeds. Then:

```bash
ls dist/index.html dist/app/index.html dist/assets/main-homepage*.js dist/assets/main-app*.js
```

Expected: all four file patterns exist (the asset filenames are hashed; the glob may need adjustment based on Vite's actual hashing). At minimum confirm:

```bash
grep -l "PlaceholderApp\|OwnVoice — In-patient" dist/assets/*.js | head -3
```

Confirms the homepage chunk built. And:

```bash
grep -l "TabBar\|SettingsPanel" dist/assets/*.js | head -3
```

Confirms the app chunk built and includes app-specific code.

- [ ] **Step 8: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including the two new `PlaceholderApp` tests.

- [ ] **Step 9: Commit**

```bash
git add src/homepage/PlaceholderApp.tsx src/homepage/PlaceholderApp.test.tsx src/main-homepage.tsx index.html
git commit -m "feat(homepage): add minimal homepage placeholder at /

Introduces src/main-homepage.tsx as the homepage entry, mounting a
small PlaceholderApp component that links to /app/. The root
index.html is rewritten to reference this entry; the app continues
to live at /app/ via app/index.html. PWA manifest link and SW
registration moved to the app entry only — the homepage stays free
of PWA + COOP/COEP machinery."
```

---

### Task 5: Update service worker for `/app/` scope

**Files:**
- Modify: `public/sw.js`

Per `CLAUDE.md`: bump `CACHE_NAME` on every shipped SW change. Also: the SW's path-classification logic needs to know about `/app/` paths.

- [ ] **Step 1: Update `CACHE_NAME` and `SHELL_ASSETS`**

In `public/sw.js`, find:
```js
const CACHE_NAME = "ownvoice-v6";
const SHELL_ASSETS = ["/", "/index.html"];
```

Replace with:
```js
const CACHE_NAME = "ownvoice-v7";
const SHELL_ASSETS = ["/app/", "/app/index.html"];
```

- [ ] **Step 2: Update `isShellAsset` to match `/app/` paths**

Find:
```js
function isShellAsset(url) {
  if (url.pathname === "/" || url.pathname === "/index.html") return true;
  if (url.pathname.startsWith("/src/")) return true;
  if (url.pathname === "/models-manifest.json") return true;
  return false;
}
```

Replace with:
```js
function isShellAsset(url) {
  if (url.pathname === "/app/" || url.pathname === "/app/index.html") return true;
  // Dev-mode module fetches: Vite serves /src/* unmolested; the SW (only
  // active for pages under /app/) still sees these requests because controlled
  // pages route all fetches through their controller, regardless of target.
  if (url.pathname.startsWith("/src/")) return true;
  if (url.pathname === "/models-manifest.json") return true;
  return false;
}
```

- [ ] **Step 3: Update the strategy-map comment at the top of the file**

Find:
```js
// Strategy map:
//   /models/*       → OPFS proxy (authoritative after primer runs); falls
//                      through to network if missing (pre-primer boot)
//   /, /index.html, /src/*, /models-manifest.json
//                   → stale-while-revalidate (ship bugfixes without
//                      re-downloading model bytes)
//   everything else (ORT WASM, fonts, manifest.json, static images)
//                   → cache-first-immutable
```

Replace with:
```js
// Strategy map (SW is scoped to /app/; only fetches initiated by pages
// under /app/ pass through this worker):
//   /models/*       → OPFS proxy (authoritative after primer runs); falls
//                      through to network if missing (pre-primer boot)
//   /app/, /app/index.html, /src/*, /models-manifest.json
//                   → stale-while-revalidate (ship bugfixes without
//                      re-downloading model bytes)
//   everything else (ORT WASM, fonts, manifest.json, static images)
//                   → cache-first-immutable
```

- [ ] **Step 4: Verify the SW file parses as valid JavaScript**

```bash
node --check public/sw.js
```

Expected: exit 0 (no syntax errors).

- [ ] **Step 5: Commit**

```bash
git add public/sw.js
git commit -m "sw: scope service worker to /app/ + bump cache to v7

Shell assets, path-classification predicates, and strategy-map
comment all updated to reflect the move from / to /app/. The /sw.js
file itself stays at root — registration sets scope: '/app/' on the
client side, with a Service-Worker-Allowed: /app/ response header
provided by the deployment layer (see public/_headers in Task 7)."
```

---

### Task 6: Update PWA manifest `start_url` and `scope`

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update `start_url` and add `scope`**

Find:
```json
{
  "name": "OwnVoice",
  "short_name": "OwnVoice",
  "description": "In-patient AAC with personal voice",
  "start_url": "/",
  "display": "standalone",
```

Replace with:
```json
{
  "name": "OwnVoice",
  "short_name": "OwnVoice",
  "description": "In-patient AAC with personal voice",
  "start_url": "/app/",
  "scope": "/app/",
  "display": "standalone",
```

(`scope` is added; `start_url` changes from `/` to `/app/`. Both must use a trailing slash so iOS / Android home-screen behavior matches the SW scope exactly.)

- [ ] **Step 2: Verify the JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('public/manifest.json','utf-8'))"
```

Expected: exit 0 (no errors). If `node -e` complains, the JSON has a syntax error — re-edit.

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json
git commit -m "pwa(manifest): scope and start_url to /app/

Installing the PWA from the homepage now lands users in the app at
/app/, matching the service-worker scope. Without 'scope', the
browser would default to the directory of the manifest URL (root),
which would mismatch the SW and cause registration failures or
control-loss when the user navigates from /app/ to /."
```

---

### Task 7: Add Cloudflare Pages headers (`_headers`)

**Files:**
- Create: `public/_headers`

Cloudflare Pages reads a `_headers` file from the build output root and applies its rules to outgoing responses. The file is plain text, one rule block per path.

- [ ] **Step 1: Create `public/_headers`**

Write the file with this exact content:

```
/sw.js
  Service-Worker-Allowed: /app/

/app/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: credentialless
```

(Two-space indentation under each path is required by the `_headers` syntax. Tabs do not work.)

The first block grants `/sw.js` permission to register at scope `/app/` even though the SW file itself is at root — without this header, browsers reject the broader scope and the SW falls back to scope `/` (which would then incorrectly try to control the homepage).

The second block applies COOP and COEP only to the `/app/*` tree. The homepage stays unencumbered, free to embed third-party fonts/analytics later.

- [ ] **Step 2: Verify the file is in the build output**

```bash
npm run build
ls dist/_headers
```

Expected: `dist/_headers` exists. Cloudflare Pages reads from `dist/_headers` (or whatever the build output root is named). Confirm the file's contents are intact:

```bash
cat dist/_headers
```

Expected output: exactly the two-block file from Step 1.

- [ ] **Step 3: Commit**

```bash
git add public/_headers
git commit -m "deploy(cf): add _headers for SW scope + COOP/COEP on /app/*

Service-Worker-Allowed: /app/ on /sw.js lets the worker register
with the broader scope from a root-served file. COOP/COEP scoped to
/app/* keeps the homepage free of cross-origin-isolation overhead;
crossOriginIsolated for SharedArrayBuffer + multi-threaded WASM in
ORT applies only inside the app."
```

---

### Task 8: Add Cloudflare Pages redirect (`_redirects`)

**Files:**
- Create: `public/_redirects`

So that `/app` (no trailing slash) doesn't 404 — it should redirect to `/app/`.

- [ ] **Step 1: Create `public/_redirects`**

Write the file with this exact content:

```
/app    /app/    301
```

(Whitespace between columns can be any combination of spaces/tabs; the rule means: when a request for `/app` arrives, respond with a 301 redirect to `/app/`.)

- [ ] **Step 2: Verify the file is in the build output**

```bash
npm run build
cat dist/_redirects
```

Expected: the one-line file from Step 1.

- [ ] **Step 3: Commit**

```bash
git add public/_redirects
git commit -m "deploy(cf): redirect /app → /app/ to avoid 404

Cloudflare Pages serves /app/index.html at /app/ but does not
implicitly add the trailing slash on requests for /app. The 301
redirect ensures bookmarks, share-links, and typed URLs without
the slash still land in the app."
```

---

### Task 9: Update `CLAUDE.md` to reflect new file layout

**Files:**
- Modify: `CLAUDE.md`

The file-layout section in `CLAUDE.md` documents the project structure. Update the entries that reference renamed/added files.

- [ ] **Step 1: Update the file-layout list**

Find (in the "File layout" section near line 34):
```markdown
- `src/main.tsx` — Preact mount point; wires theme side effects
- `src/App.tsx` — Root component: setup gate, tab routing, overlay orchestration
```

Replace with:
```markdown
- `src/main-app.tsx` — Preact mount point for the app at `/app/`; wires theme side effects
- `src/main-homepage.tsx` — Preact mount point for the homepage at `/`; loads the placeholder/research surfaces (built as a separate Vite entry to keep ML deps out of the homepage bundle)
- `src/homepage/` — Homepage components (currently `PlaceholderApp.tsx`; expanded by Plan C)
- `src/App.tsx` — Root component for the app: setup gate, tab routing, overlay orchestration
```

- [ ] **Step 2: Add a brief note about the two-entry build**

Find the existing line about `index.html`:
```markdown
- `index.html` — PWA entry point with meta tags
```

Replace with:
```markdown
- `index.html` — Homepage entry (`/`); minimal head, no PWA registration
- `app/index.html` — App entry (`/app/`); PWA manifest link + service-worker registration with scope `/app/`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude.md): reflect two-entry build + /app routing

Updates the file-layout section so future agent sessions land on
the correct mental model: homepage is a separate Vite entry, the
app lives at /app/, and PWA + SW responsibilities belong only to
the app entry."
```

---

### Task 10: End-to-end verification

**Files:**
- No edits.

Final verification that everything works together. This task is verification-only.

- [ ] **Step 1: Build and inspect the output**

```bash
npm run build
ls dist/
ls dist/app/
ls dist/_headers dist/_redirects
```

Expected:
- `dist/index.html` (homepage)
- `dist/app/index.html` (app)
- `dist/sw.js`, `dist/manifest.json`, `dist/_headers`, `dist/_redirects`
- `dist/assets/*.js` (Vite-hashed chunks)
- `dist/models-manifest.json`

- [ ] **Step 2: Confirm homepage bundle does NOT include app code**

The homepage entry should not pull in heavy app dependencies (ONNX, model worker, OPFS code, etc). Check:

```bash
grep -l "onnxruntime\|getModelManager\|OPFS\|MyWishes" dist/assets/main-homepage*.js 2>/dev/null
```

Expected: no output (the file exists but doesn't contain those strings). If grep finds matches, the homepage entry has accidentally pulled in app code — investigate which import triggered it before proceeding.

Also check via file size (rough sanity):

```bash
ls -la dist/assets/main-homepage*.js
```

Expected: small file, likely <50 KB. If it's >200 KB, again investigate accidental imports.

- [ ] **Step 3: Run `npm run preview` and verify both routes serve**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 2

# Homepage at /
curl -sI http://localhost:4173/ | head -1
curl -s http://localhost:4173/ | grep -o '<title>[^<]*</title>'

# App at /app/
curl -sI http://localhost:4173/app/ | head -1
curl -s http://localhost:4173/app/ | grep -o '<title>[^<]*</title>'

# Service worker file
curl -sI http://localhost:4173/sw.js | head -1

kill $PREVIEW_PID 2>/dev/null
wait 2>/dev/null
```

Expected:
- `HTTP/1.1 200 OK` for both `/` and `/app/`
- Homepage title: `<title>OwnVoice — In-patient AAC with personal voice</title>`
- App title: `<title>OwnVoice</title>`
- `HTTP/1.1 200 OK` for `/sw.js`

If the preview server returns 404 for `/app/`, Vite may have produced `dist/app/index.html` but the static server doesn't auto-resolve `index.html` for directories. In that case test `/app/index.html` directly to confirm the file is at least there; the production Cloudflare Pages deployment auto-resolves directories.

Note: `npm run preview` does NOT honor `_headers` or `_redirects` — those are Cloudflare-specific. Their behavior must be tested in a Cloudflare Pages deploy preview, not locally.

- [ ] **Step 4: Run the full test suite one more time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run the manifest integrity check**

```bash
npm run manifest:check
```

Expected: exit 0. (This is mentioned in CLAUDE.md as part of CI hygiene; we haven't touched models, but it's cheap to confirm.)

- [ ] **Step 6: Smoke-check that the existing app actually loads in dev**

```bash
npm run dev &
DEV_PID=$!
sleep 5

# These checks confirm the dev server returns the right HTML for each route.
curl -s http://localhost:3000/ | grep -c "main-homepage.tsx"
curl -s http://localhost:3000/app/ | grep -c "main-app.tsx"

kill $DEV_PID 2>/dev/null
wait 2>/dev/null
```

Expected:
- First curl prints `1` (homepage HTML references the homepage entry)
- Second curl prints `1` (app HTML references the app entry)

- [ ] **Step 7: No commit — this task is verification only.**

If anything failed in Steps 1–6, return to the relevant earlier task and fix. Re-run all verification steps after each fix.

---

## Notes for the executing engineer

- **Don't push the branch until all tasks succeed.** A half-applied URL move is worse than no move; the SW behavior in particular can produce confusing errors if the cached file references stale paths.
- **The homepage placeholder is intentionally minimal.** Resist any urge to add nav, hero copy, or research-page links. Plan C delivers the actual homepage content — Plan B is just the routing skeleton. Adding content here grows scope and risks rework when Plan C lands.
- **Cloudflare-specific behavior is untestable locally.** The `_headers` and `_redirects` files don't take effect in `npm run preview`. Their first real test is the Cloudflare Pages deploy preview that gets created when the PR is opened. Verify the SW scope and COOP/COEP behavior on that preview before merging.
- **Cache invalidation for the SW.** Because there are no existing users, the SW cache change (v6 → v7) has no migration concern. If users existed, the activate handler would clean the v6 cache automatically, but anyone with a tab open at the moment of deploy would keep using v6 until they reload. We don't need to engineer around this.
