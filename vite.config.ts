import { defineConfig, type Plugin } from "vite";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs, existsSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Serve `/ort/*` requests directly from `public/ort/` in dev — bypassing
 * Vite's import-analysis transform.
 *
 * Why this exists: bundled workers (e.g. `src/models/llmWorker.ts`) import
 * `onnxruntime-web/webgpu`, whose runtime then dynamically imports
 * `/ort/v<X>/ort-wasm-simd-threaded.asyncify.mjs` (the ORT WASM glue).
 * Vite's dev middleware appends `?import` to those URLs and routes them
 * through its source-transform pipeline, which refuses public-folder
 * files with: "this file is in /public and will be copied as-is during
 * build … should not be imported from source code."
 *
 * The TTS/STT GPU workers don't trip this because they're plain JS files
 * in `/public/` (Vite serves them verbatim, so the worker context's
 * dynamic imports also bypass source-transform). The LLM worker is
 * Vite-bundled, so it can't.
 *
 * Production is unaffected — Pages serves `/ort/*` from R2 via a Pages
 * Function (`functions/ort/[[path]].ts`), no Vite involvement.
 */
function serveOrtFromPublic(): Plugin {
  return {
    name: "ownvoice-serve-ort-from-public",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/ort/")) return next();
        const path = req.url.split("?")[0];
        const filePath = resolve(__dirname, "public", path.replace(/^\//, ""));
        try {
          const data = await fs.readFile(filePath);
          const ext = extname(path);
          const mime =
            ext === ".mjs" || ext === ".js"
              ? "application/javascript"
              : ext === ".wasm"
                ? "application/wasm"
                : "application/octet-stream";
          res.setHeader("Content-Type", mime);
          // Mirror production headers from public/_headers `/ort/*` block.
          // CORP keeps the script un-embeddable cross-origin; COEP is
          // *required* on /ort/*.mjs because ORT's simd-threaded build
          // spawns sub-workers that re-import the .mjs glue from a worker
          // context, and sub-worker entry-point scripts loaded into a
          // crossOriginIsolated page strictly require COEP on their
          // response. Without it Chrome blocks them with
          // "(blocked:COEP-framed resource needs COEP header)" — the
          // same failure documented in PRs #125 and #134.
          //
          // Calling res.setHeader here overrides Vite's global
          // server.headers (which would otherwise set COEP page-wide),
          // so we must restate it explicitly per-response.
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
          res.end(data);
        } catch {
          // File not found: fall through (likely a missing
          // `npm run assets:download`) — Vite's default 404 path
          // surfaces a clearer error than a silent 0-byte response.
          next();
        }
      });
    },
  };
}

/**
 * Mirror browser-side `console.*` and uncaught errors to `logs/dev.log`.
 *
 * Why this exists: Claude Code can read files but can't see the browser's
 * DevTools console, and IntelliJ's JS debugger is invisible to it too. A
 * file sink turns every dev session's logs into something tail-able from
 * the terminal — including logs from bundled workers and from an iPad on
 * the LAN (run `npm run dev -- --host` for the latter). Pairs with
 * `src/dev/logSink.ts`, which patches `console` on the browser side.
 *
 * The file is truncated on each server start so a tail reflects the
 * current session. Empty body / disk errors are swallowed — log capture
 * must never break the dev server.
 */
function logSinkPlugin(): Plugin {
  const logDir = resolve(__dirname, "logs");
  const logFile = resolve(logDir, "dev.log");
  return {
    name: "ownvoice-log-sink",
    apply: "serve",
    configureServer(server) {
      try {
        if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
        writeFileSync(logFile, `=== session start: ${new Date().toISOString()} ===\n`);
        server.config.logger.info(`  ➜  browser logs: ${logFile}`);
      } catch (err) {
        server.config.logger.warn(`[log-sink] init failed: ${(err as Error).message}`);
      }

      server.middlewares.use("/__log", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.setEncoding("utf8");
        req.on("data", (chunk: string) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body) as {
              level: string;
              message: string;
              ts: number;
              origin: string;
              tabId?: string;
            };
            const iso = new Date(payload.ts).toISOString();
            // Per-context tab-id tag sits between origin and message so that
            // greps for `[main]` or `[worker:<name>]` keep working. Missing
            // tabId stays absent (workers older than the field still
            // append; they just look unattributed).
            const tabTag = payload.tabId ? `[t:${payload.tabId}] ` : "";
            const line = `${iso} [${payload.level.toUpperCase()}] [${payload.origin}] ${tabTag}${payload.message}\n`;
            try {
              appendFileSync(logFile, line);
            } catch {
              // EACCES / ENOSPC etc — don't take down Vite. Caller still
              // gets a 204 so the browser doesn't retry endlessly.
            }
            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end();
          }
        });
        req.on("error", () => {
          res.statusCode = 400;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), tailwindcss(), serveOrtFromPublic(), logSinkPlugin()],
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
