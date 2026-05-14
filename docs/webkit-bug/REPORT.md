# WebKit bug report draft

File at <https://bugs.webkit.org/enter_bug.cgi?product=WebKit>.
Component: probably "Page Loading" or "WebCore Misc.". Suggest CCing
the WebKit Workers maintainers via the existing
[Worker meta-bug](https://bugs.webkit.org/buglist.cgi?component=Page%20Loading&product=WebKit).

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
