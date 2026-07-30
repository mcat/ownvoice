---
name: ownvoice-logsink
description: Read browser-side logs from OwnVoice's `npm run dev` session via the file sink at `logs/dev.log`. This skill should be used whenever you need to see what the running app is doing in the browser — main-thread console output, worker logs (TTS, STT, denoiser), uncaught errors, and the heap-watermark crash tombstone surfacing. Triggers on requests to "tail the logs", "what's the browser doing", "check the console", "did the page log anything", "memdiag tombstone", "see worker output", "is GPU TTS ready", or any debugging task where a `tail -f` of browser activity beats opening DevTools.
---

# OwnVoice Log Sink

The dev server mirrors browser `console.*`, uncaught errors, and worker logs to `logs/dev.log` via a Vite middleware (`logSinkPlugin` in `vite.config.ts`). The sink is dev-only — tree-shaken in production, hostname-gated in plain workers. Tailing the file is the fastest way to see what the running app is doing without driving the browser yourself.

## When to use this skill

- The user reports a bug that surfaces only at runtime — tail the log and find the failure mode.
- You drove a browser session (claude-in-chrome, Safari skill, manual) and need the line-by-line state of what fired.
- You're investigating a memdiag tombstone or a heap-watermark snapshot — the boot log captures both.
- You added an instrumentation `console.log` and want to see if it fired.
- You're verifying a multi-worker boot — STT init, GPU TTS shader compile, WASM TTS warmup all land here.

**Don't use this skill** when:
- The user wants a recorded test run (use the Playwright/webapp-testing skill instead).
- You're debugging production — the sink doesn't run there.
- You need full DOM inspection — use claude-in-chrome.

## Quick start

```bash
# Start the dev server if not running. The sink truncates the log on every dev start.
# Use this pattern if you may need to inspect it from outside:
npm run dev > /tmp/ov-dev.log 2>&1 &

# Wait for the server to come up (port 3000). The dev server serves HTTPS
# whenever certs/dev-key.pem exists (mkcert, needed for the iPad Simulator),
# plain HTTP otherwise — so try both and pass -k for the local cert:
until curl -skf https://localhost:3000/app/ -o /dev/null \
   || curl -sf  http://localhost:3000/app/  -o /dev/null; do sleep 1; done

# Tail in another shell, or via Monitor in this one:
tail -f logs/dev.log
```

The file path is always `logs/dev.log` relative to the repo root.

## Format

Lines are **Loguru-formatted** — four pipe-separated columns, not bracket tags.
Loguru is one of IntelliJ's built-in log highlighters, so the file gets severity
colouring and a scrollbar heatmap with zero per-developer setup.

```
2026-07-30 13:03:50.017 | INFO     | vite          | session start
2026-05-19 17:33:30.935 | WARN     | main:1arfvm2t | [OwnVoice:WebGPU] requestAdapter returned null; degrading to WASM
```

```
<YYYY-MM-DD HH:mm:ss.SSS> | <LEVEL padded to 8> | <origin[:tabId]> | <message>
```

- **Timestamp** — local time, no timezone, so it lines up with `date` in the
  same terminal.
- **Levels** — `LOG`, `INFO`, `WARN`, `ERROR`, `DEBUG`, `DIR`, `UNCAUGHT`,
  `UNHANDLEDREJECTION`, uppercased and `padEnd(8)`. **The padding is why
  `grep "WARN "` needs its trailing space** — the column is `WARN` plus four
  spaces.
- **Origin** — `main` or `worker:<name>`, suffixed with a per-tab id
  (`main:1arfvm2t`). The session-start marker written by the Vite plugin uses
  `vite` with no tab id.
  - Vite-bundled workers (`ttsWorker.ts`, `sttWorker.ts`, `denoiserWorker.ts`)
    import `logSink` directly and POST themselves, so their origin column is
    `worker:tts-wasm:<tabId>` etc.
  - Plain JS workers in `public/` (`tts-gpu-worker.js`, `stt-gpu-worker.js`)
    relay through the main thread via `installDevLogRelay` in
    `public/__dev-log-relay.js`. **Their origin column therefore reads
    `main:<tabId>`, and the true source appears as a `[worker:tts-gpu]` prefix
    inside the message body.** Filter these on the body, not the origin column.
- **Multi-line messages** are flattened — stack-trace newlines become ` ⏎ `
  so every record stays on one line.

Because the first three pipes are positional, a pipe inside message text
(`a || b`) is harmless; field-aware filters should split on `' | '`.

## Reading strategies

### Find the most recent boot

```bash
# Each `npm run dev` truncates the file; the first line is a session header.
head -1 logs/dev.log
```

### Filter by origin

The origin is the **third** pipe-separated column, so anchor on `| worker:`
rather than a bare bracket tag.

```bash
# Vite-bundled workers only (tts-wasm, stt-wasm, denoiser):
grep '| worker:' logs/dev.log

# Plain JS workers relay through the main thread — their origin column says
# `main`, so match the body prefix instead:
grep '\[worker:tts-gpu\]' logs/dev.log
grep '\[worker:stt-gpu\]' logs/dev.log

# Genuine main-thread lines: origin is main, and no relayed-worker body tag.
grep '| main:' logs/dev.log | grep -v '\[worker:'

# Field-aware filter on the origin column:
awk -F' \\| ' '$3 ~ /^worker:/' logs/dev.log
```

### Filter by app prefix

OwnVoice consistently tags its lines with `[OwnVoice:<subsystem>:<context>]`. Examples:

```bash
# Memory diagnostic only:
grep 'OwnVoice:MemDiag' logs/dev.log

# Speech engine outcomes:
grep 'OwnVoice:TTS' logs/dev.log

# Bench-mode timings (when `?bench=true`):
grep 'OwnVoice:Bench' logs/dev.log
```

### Hunt for failures

```bash
# Uncaught errors and rejections — these never reach app code, so the
# sink is the only signal. Trailing space matters: the level column is
# padded to width 8.
grep -E 'ERROR |UNCAUGHT|UNHANDLEDREJECTION' logs/dev.log

# Field-aware equivalent, immune to the same words appearing in message text:
awk -F' \\| ' '$2 ~ /ERROR|UNCAUGHT|UNHANDLEDREJECTION/' logs/dev.log

# Everything at WARN or worse:
grep -E 'WARN |ERROR |UNCAUGHT|UNHANDLEDREJECTION' logs/dev.log

# WebGPU shader compile timing:
grep -E 'shader|Loaded|All models loaded' logs/dev.log
```

### Watch a specific transition live

```bash
# Wait until GPU TTS becomes ready, then exit. Useful in a Monitor or
# background Bash before driving a synth test.
until grep -q 'WebGPU TTS engine ready' logs/dev.log 2>/dev/null; do sleep 2; done
```

```bash
# Watch every memdiag stage label as it lands:
tail -f logs/dev.log | grep --line-buffered 'OwnVoice:MemDiag\|stage'
```

## Tips and tricks

### The log truncates on every `npm run dev` restart

The sink wipes the file at session start and writes a header line. If you need to preserve a previous session's content, copy it before restarting:

```bash
cp logs/dev.log logs/dev.log.prev
```

### Telling a relayed worker line from a genuine main-thread line

Plain JS workers relay through the main-thread console, so the origin column
says `main:<tabId>` for both. The true source is the first bracket tag in the
message body:

```
… | LOG      | main:1arfvm2t | [worker:tts-gpu] [OwnVoice:TTS:GPU] shader compile 412ms   ← the GPU worker
… | LOG      | main:1arfvm2t | [OwnVoice:TTS:GPU] engine ready                            ← ttsEngine.ts, main thread
```

A body starting `[worker:` came from a plain worker. Without it, the line came
from main-thread code (`ttsEngine.ts`) that happens to use the same
`[OwnVoice:TTS:GPU]` prefix.

### Bundled-worker lines have a single origin tag

`ttsWorker.ts`, `sttWorker.ts`, and `denoiserWorker.ts` are Vite-bundled — they import `logSink` directly and POST to `/__log` themselves. Their origin column carries the worker name outright: `worker:tts-wasm:<tabId>`, `worker:stt-wasm:<tabId>`, or `worker:denoiser:<tabId>`. No relay, no body tag.

### Pair the sink with the memdiag tombstone

When investigating a crash:

1. Reproduce with `?memdiag=true` so stage labels and heap-watermark snapshots get recorded.
2. After the crash, the NEXT boot reads the tombstone and logs it. Look in `logs/dev.log` for:
   ```
   [OwnVoice:MemDiag] Previous session ended ungracefully at stage "synth:gpu:3" (...)
   [OwnVoice:MemDiag] Heap watermark at crash:
   [DIR] {"opfsUsage":..., "workers":{"tts":"warm",...}, "gpuTtsReady":true, ...}
   ```
3. Cross-reference with `logs/dev.log.prev` if you copied the crashed session's log — the worker output from before the crash is in there.

### Hot-reload preserves the patches

Vite HMR replaces module code but the patched `console.*` survives because the binding is on the global `console` object, not on the module. Same applies to the worker-side patches inside `__dev-log-relay.js` — once installed, they stay installed for the worker's lifetime.

### Volume during pre-gen

A 700-phrase pre-gen run can emit hundreds of `[worker:tts-gpu]` lines (per-phrase decoder input dumps, token counts). The file can grow to several MB during a long session. For analysis, filter first:

```bash
# Count synth completions:
grep -c 'Generated.*speech tokens' logs/dev.log

# Distribution of decoder input lengths during pre-gen:
grep 'Decoder input:' logs/dev.log | awk '{print $NF}' | sort | uniq -c
```

### Verify the relay is alive

```bash
# A healthy boot has these lines within the first ~10s:
grep -E 'OwnVoice:MemDiag.*active|worker:stt-gpu.*Initializing|worker:tts-gpu.*Initializing' logs/dev.log
```

If you see `[OwnVoice:MemDiag] Memory crash tombstone active.` but no `[worker:*]` lines after 30s, the workers aren't running (no WebGPU? wrong URL?) — check the URL was `/app/?memdiag=true` and not `/`.

### iPad / cross-host development

```bash
# LAN form:
npm run dev -- --host

# Point iPad Safari at http://<laptop-ip>:3000/app/
# Worker hostname gate still triggers because the LAN address satisfies
# neither "localhost" nor "127.0.0.1" → plain-worker lines won't relay.
# Main-thread + bundled-worker lines still flow because their gate is
# `import.meta.env.DEV`, which is true on `--host`.
```

**Known gap on iPad:** the plain-worker relay's hostname check uses `localhost`/`127.0.0.1`, not `import.meta.env.DEV`. On `--host` the iPad's network requests don't trigger the patch. If you need iPad-side GPU worker logs, broaden the gate in `public/__dev-log-relay.js` to also accept LAN addresses (e.g. `host.startsWith("192.168.")`).

### Suppressing the patch in one-off cases

The patches are gated on:
- Main + bundled workers: `import.meta.env.DEV && !import.meta.env.TEST`.
- Plain workers: `self.location.hostname === "localhost" || "127.0.0.1"`.

There is no runtime kill switch. If you need to disable: set `NODE_ENV=production` for the `npm run dev` invocation (Vite won't like this and you'll fight it). Or temporarily comment out the install side-effect.

### Common gotchas

- **No logs at all in `logs/dev.log`** → the patches require `import.meta.env.DEV`. If you ran `npm run preview` or `npm run build && npm run preview`, that's a production build — sink is tree-shaken. Use `npm run dev`.
- **Some console.log shows in DevTools but not in dev.log** → check the source. If it's from `public/tts-gpu-worker.js` but on a non-localhost host, the relay didn't fire. If it's from `webViewBridge` or an unbundled vendor script, the sink doesn't cover it.
- **Lines arrive out of order in dev.log** → the sink uses `keepalive: true` fetches with no sequence number. Under burst load, the order at the server can differ from the order of `console.*` calls by milliseconds. Use the ISO timestamp for ordering.
- **`logs/` directory missing** → it's created by the Vite middleware on first POST. If the dev server is running but no log line has fired yet, the directory doesn't exist. Wait for at least one console call.

## Cross-references

- `src/dev/logSink.ts` — main-thread + bundled-worker patch, `relayWorkerLog` helper for plain workers.
- `public/__dev-log-relay.js` — shared install function for plain workers.
- `vite.config.ts` (search for `logSinkPlugin`) — server-side middleware that appends to the file.
- `src/diagnostics/crashTombstone.ts` — memdiag stage labels + heap watermarks (paired diagnostic).
- PR #305 introduced the sink; PR #307 added plain-worker capture.
- Known limitation issue #306 (closed) — worker-error capture is a separate follow-up.
