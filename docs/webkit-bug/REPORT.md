# WebKit bug report draft

File at <https://bugs.webkit.org/enter_bug.cgi?product=WebKit>.
Component: probably "Page Loading" or "WebCore Misc.". Suggest CCing
the WebKit Workers maintainers via the existing
[Worker meta-bug](https://bugs.webkit.org/buglist.cgi?component=Page%20Loading&product=WebKit).

## Prior art — not a duplicate, but related

Before filing, three existing bugs were reviewed:

- **[#245346](https://bugs.webkit.org/show_bug.cgi?id=245346)** — RESOLVED
  FIXED (Oct 2022). Same error string (`Cannot load … due to access
  control checks`). Root cause was 304 Not Modified responses dropping
  the CORP header on cache hit. Chris Dumez's fix landed in `main`
  Oct 7, 2022. We're observing the same error string four years later
  in Safari 26.x with COEP completely off — **likely a regression OR
  an adjacent code path producing the same error**. Recommend
  cross-linking when filing.
- **[#261734](https://bugs.webkit.org/show_bug.cgi?id=261734)** — open
  since 2023-09-26. "CORP headers mishandled inside Worker". Same
  error string but **requires COEP enabled**; bug fires on static
  module imports inside the worker. Our repro has COEP off and fails
  on the outer `new Worker(httpUrl)` call itself, before any internal
  imports run. Distinct mechanism.
- **[#258443](https://bugs.webkit.org/show_bug.cgi?id=258443)** — open
  since 2023-06-23. "Blob can't be read from opaque origined Workers".
  Same error string but specifically about workers spawned from `blob:`
  or `data:` URLs. Our repro uses plain `new Worker("worker.js")`
  with an `http(s):` URL.

**Workaround hypothesis not yet tested:** [Predrag Gruevski's
write-up](https://predr.ag/blog/debugging-safari-if-at-first-you-succeed/)
of #245346 shows that `Cache-Control: no-store` on the worker script
response sidesteps the original 304-revalidation path. We have NOT
yet tested whether this clears our 2026 occurrence — the OwnVoice
production setup serves `/assets/*Worker-*.js` via Cloudflare Pages
which overrides `Cache-Control` headers at serve time
([CF Pages issue](https://github.com/cloudflare/wrangler-legacy/issues/3253),
tracked in our repo as `_headers` comment in PR #131). Worth retrying
this workaround via a Cloudflare Pages Function instead of `_headers`,
or against a different host that respects the header. Marked as "open
follow-up" in our internal notes.

---

## Title

`new Worker(httpUrl)` fails with "Cannot load … due to access control checks" on reload-type navigations, regardless of timing or user gesture

## Summary

After the user reloads a Safari document (Cmd+R, address-bar refresh
button, or `Cmd+Option+R` hard reload), subsequent `new Worker(httpUrl)`
calls during the lifetime of the reloaded document fail with the
console message `Cannot load <URL> due to access control checks.` The
same URLs return 200 OK with `application/javascript` when fetched via
`fetch()` on the main thread during the same window. The failure is
non-deterministic across reloads but reproducible enough to break
applications that rely on `new Worker()` during boot.

## Reproduction

Minimal repro attached (single HTML file + single-line worker). Source:
<https://github.com/mcat/ownvoice/tree/main/docs/webkit-bug>

1. Serve the two files over HTTPS (CF Pages, GitHub Pages, mkcert+python,
   etc. — Safari's HTTPS-Only blocks `http://localhost`).
2. Open the served `index.html` in Safari. First load works:
   `worker.onmessage → "ready"`.
3. Press **Cmd+R** or click the address-bar refresh button.
4. On the second-and-later load, `worker.onerror` fires AND the Web
   Inspector console shows `Cannot load <URL> due to access control
   checks.`

`location.reload()` initiated from JavaScript does **not** reproduce —
only browser-initiated reload triggers the failure.

## Expected behavior

`new Worker(httpUrl)` on a reloaded document loads the worker script
the same way it does on a cold-load document, since the URL serves
correctly (verified by concurrent `fetch()` of the same URL).

## Actual behavior

Worker construction fails with a generic "access control checks"
console message from WebKit's resource loader (not catchable from main
thread; logged directly to the developer console alongside CSP/CORS
errors). `worker.onerror` fires with an empty `message` field. The
worker is then unusable.

## Tested environment

- Safari 26.x on macOS 15.x (desktop) — reproduces
- Safari 26.x on iPadOS 26.x — reproduces
- No SharedArrayBuffer / cross-origin isolation required
- No Service Worker required
- No COEP / COOP headers required

## Falsification matrix (what's been ruled out as the cause)

| Hypothesis | Test | Result |
|---|---|---|
| COEP / cross-origin isolation enforcement | Served with no COEP / COOP at all; verified `crossOriginIsolated: false` | Errors still fire |
| Network process race during page teardown — fixed by delay | `setTimeout` defer of 3000ms / 5000ms / 8000ms before `new Worker()` | Errors still fire when the spawn eventually happens |
| Network process race — cleared by retry | Retry budget 300+600+900=1800ms | All retries fail with same error |
| Worker-pool state cleared by user gesture | Real `System Events` mouse click at t+60s after reload, before any worker spawn (verified pre-spawn: no worker resources in `performance.getEntriesByType("resource")`) | Errors still fire on first spawn after gesture |
| Document-level network race | `fetch(workerUrl)` from main thread during same window | 23/23 returns 200 OK with `application/javascript` |
| Worker-construction-specific failure | `new Worker(URL.createObjectURL(new Blob([scriptText])))` instead of `new Worker(httpUrl)` | Blob path eliminates the script-load failure (no "access control checks" line), but the worker's own internal URL resolutions then fail because relative/absolute paths can't resolve from a `blob:` base ("URL is not valid", "did not match expected pattern") |
| BFCache state | `pagehide` listener confirmed firing with `event.persisted === false` | Not BFCache |
| Service worker interference | Repro has no SW; bug still fires | Not SW |
| Stale cached worker URLs | New origin, no cache, hard reload — bug still fires on subsequent reload | Not cache |
| Same root cause as #245346 (304/CORP on cache hit) | #245346 was RESOLVED FIXED Oct 2022; we observe the same console string four years later with COEP off | Likely a regression or adjacent path |
| `Cache-Control: no-store` on worker script (predr.ag workaround for #245346) | NOT YET TESTED on our infra — blocked by CF Pages overriding `Cache-Control` on static assets; needs a Pages Function or different host | UNKNOWN — worth testing |

The failure surface that survives all these tests is: **WebKit's
worker-script resource-load pathway on reloaded documents.** That's the
only mechanism that explains why `fetch()` works while `new Worker()`
doesn't, and why no timing/gesture/state-clear intervention from app
code helps.

## Impact

Any production application that spawns workers during page boot will
emit user-visible console errors after every reload. For applications
where the worker carries critical functionality (we use them for ONNX
Runtime inference — speech recognition + text-to-speech), the failure
also breaks features until either (a) the user navigates to a different
URL and back, or (b) the GPU worker happens to recover from its
internal error and the cached models pick up.

## Workaround we've shipped

None viable. We tried six categorically distinct approaches; each is
empirically falsified. See the falsification matrix above. We're
shipping with the console errors and this bug report as the explanation.

## Files

`index.html` (49 lines) and `worker.js` (1 line) attached.
