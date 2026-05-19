/// <reference types="vite/client" />
// Mirrors console output and uncaught errors to the Vite dev-server log
// endpoint (`/__log`). The middleware appends each line to `logs/dev.log`,
// giving Claude Code (and the user) a tail-able file of browser-side logs
// from every dev session — including those from workers and the iPad.
//
// Dev-only: the install side effect is gated on `import.meta.env.DEV` and
// suppressed under vitest (`import.meta.env.TEST`). Production builds get
// nothing — the bundler tree-shakes the install block.
//
// Failures are silent: if the dev server isn't running, isn't reachable
// (iPad on a different network), or returns an error, the fetch is
// swallowed. The sink MUST NOT log on its own failure path or it would
// recurse through the patched `console.error`.

export const MAX_ARG_CHARS = 2000;
const ENDPOINT = "/__log";

type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug" | "dir";
type SinkLevel = ConsoleLevel | "uncaught" | "unhandledrejection";

type LogPayload = {
  level: SinkLevel;
  message: string;
  ts: number;
  origin: string;
  /** Per-context id generated once at module load. Disambiguates lines
   *  from concurrent tabs / workers writing to the same `logs/dev.log`.
   *  Without this, multi-tab dev sessions produce interleaved logs that
   *  look like single-tab bugs (e.g. a "second worker spawning 3s after
   *  the first" that's actually two tabs each booting normally). */
  tabId: string;
};

/** Short random id, module-local. Each browser context (main thread,
 *  bundled worker) gets a unique value because each loads this module
 *  fresh. Plain-JS-worker logs route through main's patched console via
 *  relayWorkerLog, so they pick up main's tabId automatically. */
const TAB_ID = Math.random().toString(36).slice(2, 10);

export function truncate(s: string): string {
  if (s.length <= MAX_ARG_CHARS) return s;
  const dropped = s.length - MAX_ARG_CHARS;
  return s.slice(0, MAX_ARG_CHARS) + `…[+${dropped} chars]`;
}

export function safeStringify(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return truncate(v);
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v);
  }
  if (v instanceof Error) {
    return truncate(v.stack ?? `${v.name}: ${v.message}`);
  }
  try {
    const json = JSON.stringify(v);
    return truncate(json ?? String(v));
  } catch {
    return truncate(String(v));
  }
}

export function formatArgs(args: unknown[]): string {
  return args.map(safeStringify).join(" ");
}

/**
 * Re-emit a relay message from a plain JS worker through the main-thread
 * console so the line lands in logs/dev.log via the already-patched
 * console.* methods. Called from each main-thread `worker.onmessage`
 * branch that matches `{ type: "__log", ... }`. See issue #306 for the
 * relay design.
 *
 * Levels not in the standard set fall back to `console.log`. The origin
 * tag is prefixed to the message so the dev.log line shows
 * `[worker:tts-gpu] ...` distinct from `[main] ...`.
 */
type RelayLevel = "log" | "info" | "warn" | "error" | "debug";
type RelayLog = { level?: string; message?: string; origin?: string };
const RELAY_LEVELS: ReadonlySet<RelayLevel> = new Set<RelayLevel>([
  "log",
  "info",
  "warn",
  "error",
  "debug",
]);
function isRelayLevel(v: string | undefined): v is RelayLevel {
  return v !== undefined && RELAY_LEVELS.has(v as RelayLevel);
}
export function relayWorkerLog(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const m = data as RelayLog;
  const level: RelayLevel = isRelayLevel(m.level) ? m.level : "log";
  const tag = m.origin ? `[${m.origin}]` : "[worker]";
  const text = typeof m.message === "string" ? m.message : "";
  console[level](tag, text);
}

function detectOrigin(): string {
  if (typeof window !== "undefined") return "main";
  try {
    const n = (self as unknown as { name?: string }).name;
    return n ? `worker:${n}` : "worker";
  } catch {
    return "worker";
  }
}

function send(payload: LogPayload): void {
  try {
    // keepalive lets the browser flush the request even if the page is
    // unloading — useful for capturing the final lines before a crash.
    // The body cap is 64 KiB, well above our per-arg truncation budget.
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Sink failures must never throw — they would propagate up through
    // the patched console method into user code.
  }
}

function patchConsole(): void {
  const levels: ConsoleLevel[] = ["log", "info", "warn", "error", "debug", "dir"];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      send({
        level,
        message: formatArgs(args),
        ts: Date.now(),
        origin: detectOrigin(),
        tabId: TAB_ID,
      });
    };
  }
}

function installGlobalErrorHandlers(): void {
  const target: EventTarget | undefined =
    typeof window !== "undefined"
      ? window
      : typeof self !== "undefined"
        ? (self as unknown as EventTarget)
        : undefined;
  if (!target) return;
  target.addEventListener("error", (ev: Event) => {
    const e = ev as ErrorEvent;
    const loc = e.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : "";
    // For cross-origin-tainted scripts WebKit sanitizes message/filename to
    // "Script error." / "" — but `event.error` is sometimes still populated
    // with the raw Error (and its stack). Append it when present so the
    // line in dev.log is actionable instead of a black hole.
    const err = (e as unknown as { error?: unknown }).error;
    const errDetail = err instanceof Error
      ? ` :: ${err.name}: ${err.message}${err.stack ? "\n" + err.stack : ""}`
      : err !== undefined && err !== null
        ? ` :: ${safeStringify(err)}`
        : "";
    send({
      level: "uncaught",
      message: `${e.message}${loc}${errDetail}`,
      ts: Date.now(),
      origin: detectOrigin(),
      tabId: TAB_ID,
    });
  });
  target.addEventListener("unhandledrejection", (ev: Event) => {
    const e = ev as PromiseRejectionEvent;
    send({
      level: "unhandledrejection",
      message: safeStringify(e.reason),
      ts: Date.now(),
      origin: detectOrigin(),
      tabId: TAB_ID,
    });
  });
}

// Install only in dev, and not under vitest — patching console during
// tests would fire a fetch per assertion log, polluting test output and
// potentially racing with jsdom teardown.
if (import.meta.env.DEV && !import.meta.env.TEST) {
  patchConsole();
  installGlobalErrorHandlers();
}
