#!/usr/bin/env node
/**
 * Post-build safety net: removes any file in `dist/` larger than
 * 20 MiB so Cloudflare Pages' 25 MiB per-file limit is never hit
 * even if Rollup misses an external pattern. The stripped files
 * are loaded at runtime from R2 via Pages Functions.
 *
 * Files removed are logged. If anything is removed, the build is
 * not "broken" -- it's the expected state.
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST = join(__dirname, "..", "dist");
const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB threshold (5 MiB margin under 25)

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
  console.log("strip-dist-large: nothing over 20 MiB.");
} else {
  console.log(`strip-dist-large: removed ${removed} file(s), ${totalBytes.toLocaleString()} B total.`);
}
