# Minimal repro: Safari `new Worker()` reload race

Two files, ~30 lines total. Reproduces the bug we hit in OwnVoice across
all reload-type navigations on Safari (desktop macOS + iPadOS).

## To deploy

Safari with HTTPS-Only enabled (the macOS Sequoia / iPadOS 26 default)
refuses `http://localhost`. Use HTTPS for the repro:

```bash
# Option A (recommended): CF Pages preview — gets you a real HTTPS URL
npx wrangler@latest pages deploy docs/webkit-bug --project-name webkit-repro

# Option B: serve locally with HTTPS via mkcert
brew install mkcert
mkcert -install
cd docs/webkit-bug && mkcert localhost && \
  python3 -c "import http.server, ssl; \
  s=http.server.HTTPServer(('localhost',8443), http.server.SimpleHTTPRequestHandler); \
  ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); \
  ctx.load_cert_chain('localhost.pem','localhost-key.pem'); \
  s.socket=ctx.wrap_socket(s.socket, server_side=True); s.serve_forever()"
# Open https://localhost:8443/ in Safari

# Option C: disable HTTPS-Only just for this test
# Safari → Settings → Advanced → uncheck "Use HTTPS by default"
# (Then http://localhost:8080/ works with `python3 -m http.server 8080`)
```

## To reproduce

1. Open the served `index.html` in **Safari** (desktop macOS or iPadOS).
2. First load: the page shows `worker.onmessage → "ready"`. Fine.
3. Press **Cmd+R** (or click the address-bar refresh button).
4. Second-and-later load: the page shows `worker.onerror → message=""`
   AND the Web Inspector console shows
   `Cannot load http://…/worker.js due to access control checks.`

The console line is logged by WebKit's resource loader directly — not
catchable from main thread (no `console.error` interception works).

## What's confirmed (so the bug report can rule these out)

- `location.reload()` via the JS button on the page does **not** reproduce —
  only browser-initiated reload (Cmd+R or address-bar button) does.
- Bug fires regardless of timing — a `setTimeout` deferring the spawn 3-8
  seconds doesn't help; a real `pointerdown` user gesture at t+60s doesn't
  help.
- The same URL succeeds when loaded via `fetch()` on the main thread during
  the same window where `new Worker()` fails. Only worker-initiated script
  loads hit the failure.
- COEP `require-corp` is not required to reproduce.
- No Service Worker is needed (the standalone repro has none).
- No HTTPS is needed (reproduces on `http://localhost:*`).

## Files

- `index.html` — repro page with on-screen result + environment dump
- `worker.js` — single-line worker: `postMessage("ready")`
- `REPORT.md` — drafted text for bugs.webkit.org

The repro is **not** part of the OwnVoice production build; it lives under
`docs/` as a reference attachment for the WebKit bug report.
