// Shared dev-mode console relay for the plain JS workers under public/.
// These workers bypass Vite's transform pipeline so they cannot
// `import "../src/dev/logSink"`; instead each one imports THIS file
// behind a hostname gate and calls installDevLogRelay(origin) once.
// The relay patches console.{log,info,warn,error,debug} to also
// postMessage() every line to the main thread, where ttsEngine.ts /
// bootModels.ts' worker.onmessage handlers re-emit through the
// (already logSink-patched) main-thread console, landing the line in
// logs/dev.log with the right `[worker:*]` origin tag. See issue #306.
//
// Pure ES module so it can be `import()`ed from `{ type: "module" }`
// workers — `importScripts` is unavailable in module workers.
//
// **Production never loads this file.** Each plain-JS worker gates the
// dynamic import on `self.location.hostname === "localhost" || "127.0.0.1"`,
// so the request is never issued off-localhost. The runtime gate inside
// `installDevLogRelay` (kept for defense-in-depth) used to be the only
// gate, but a static-import-then-gate-inside-function pattern still
// brings the file into the worker's module graph — and production
// serves /__dev-log-relay.js without COEP headers, so under `require-corp`
// WebKit refuses the worker entirely. The outer gate at each import
// site fixes that.

// Mirrors src/dev/logSink.ts MAX_ARG_CHARS — duplicated here because
// plain JS workers can't import from src/. A stray Tensor.data dump or
// long Error stack would otherwise inflate the postMessage payload and
// blow past the main-thread keepalive fetch's 64 KiB body cap.
const MAX_ARG_CHARS = 2000;

function truncate(s) {
  if (s.length <= MAX_ARG_CHARS) return s;
  return s.slice(0, MAX_ARG_CHARS) + `…[+${s.length - MAX_ARG_CHARS} chars]`;
}

function stringifyArg(a) {
  if (typeof a === "string") return truncate(a);
  if (a instanceof Error) return truncate(a.stack || `${a.name}: ${a.message}`);
  try {
    return truncate(JSON.stringify(a) ?? String(a));
  } catch {
    return truncate(String(a));
  }
}

/** Patch console.* on the worker scope to postMessage each call back to
 *  the main thread. No-op when the worker is running on a non-localhost
 *  host (i.e. production). Idempotent — repeated calls install once. */
let installed = false;
export function installDevLogRelay(origin) {
  if (installed) return;
  const host = self.location?.hostname ?? "";
  if (host !== "localhost" && host !== "127.0.0.1") return;
  installed = true;
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    const orig = console[level].bind(console);
    console[level] = function (...args) {
      orig(...args);
      try {
        self.postMessage({
          type: "__log",
          level,
          message: args.map(stringifyArg).join(" "),
          origin,
        });
      } catch {
        // Relay failure must not throw — the patched console is on every
        // log path including error reporting.
      }
    };
  }
}
