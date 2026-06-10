#!/usr/bin/env node
/**
 * Regenerate public/models-manifest.json by stat'ing each entry's file size.
 *
 * The committed manifest is the source of truth for WHICH files are required
 * (name + magic). This script only refreshes `size` — if you add a new file,
 * add its entry to the manifest first (size: 0 is fine) then run regen.
 *
 * Usage:
 *   node scripts/regenerate-manifest.mjs          # rewrite manifest in place
 *   node scripts/regenerate-manifest.mjs --check  # verify, exit 1 on drift
 */

import { readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(REPO_ROOT, "public", "models-manifest.json");

/**
 * Reads the committed manifest, re-stats each file, returns a new manifest
 * object with refreshed sizes. Throws if any file referenced by the manifest
 * is missing on disk — that's the signal that someone renamed/removed a file
 * without updating the manifest.
 */
export async function regenerateManifest(repoRoot = REPO_ROOT) {
  const manifestPath = path.join(repoRoot, "public", "models-manifest.json");
  const publicDir = path.join(repoRoot, "public");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);

  for (const [modelId, model] of Object.entries(manifest.models)) {
    for (const file of model.files) {
      // baseUrl is app-relative ("/models/foo/"), strip the leading slash to
      // build a filesystem path under public/.
      const relativePath = (model.baseUrl + file.name).replace(/^\//, "");
      const fullPath = path.join(publicDir, relativePath);
      let fileStat;
      try {
        fileStat = await stat(fullPath);
      } catch (err) {
        throw new Error(
          `manifest entry ${modelId}/${file.name} is missing on disk at ${fullPath}: ${err.message}`,
        );
      }
      file.size = fileStat.size;
    }
  }
  return manifest;
}

/**
 * Serialize a manifest with the same formatting the committed file uses
 * (2-space indent + trailing newline) so diffs compare cleanly.
 */
export function formatManifest(manifest) {
  return JSON.stringify(manifest, null, 2) + "\n";
}

async function main() {
  const checkMode = process.argv.includes("--check");
  const regenerated = await regenerateManifest();
  const formatted = formatManifest(regenerated);

  if (checkMode) {
    const current = await readFile(MANIFEST_PATH, "utf8");
    if (current !== formatted) {
      console.error(
        "models-manifest.json is out of sync with public/models/**.\n" +
          "Run: npm run manifest:regen",
      );
      process.exit(1);
    }
    console.log("models-manifest.json is up to date.");
    return;
  }

  await writeFile(MANIFEST_PATH, formatted);
  console.log(
    `Rewrote ${path.relative(REPO_ROOT, MANIFEST_PATH)} for ${Object.keys(regenerated.models).length} models.`,
  );
}

// Only run main() when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
