import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { ORT_VERSION } from "./assetVersions";

/**
 * Plain-JS files in public/ can't import from TypeScript source, so they
 * hardcode the ORT version segment used in import paths and wasmPaths.
 * When `ORT_VERSION` is bumped, these files have to be updated by hand —
 * PR #161 missed them and the resulting "Worker error: unknown" only
 * surfaced as runtime console noise (the WASM fallbacks masked the
 * failure). This test pins the invariant: every `/ort/v…/` reference in
 * public/ must match the current `ORT_VERSION`.
 */
describe("ORT version sync between TS source and public/ JS", () => {
  const FILES = [
    "public/tts-gpu-worker.js",
    "public/stt-gpu-worker.js",
    "public/_routes.json",
  ];
  const ORT_PATH_RE = /\/ort\/(v\d+\.\d+\.\d+)\//g;

  for (const path of FILES) {
    test(`${path} references the current ORT_VERSION`, () => {
      const contents = readFileSync(path, "utf8");
      const found = new Set<string>();
      for (const m of contents.matchAll(ORT_PATH_RE)) {
        found.add(m[1]);
      }
      // _routes.json may legitimately contain no `/ort/v…/` reference (it
      // matches against the glob `/ort/v*/*.mjs`), so an empty set is fine.
      // What we want to fail on: any reference to a non-current version.
      for (const v of found) {
        expect(v, `${path} references stale ORT version ${v}`).toBe(ORT_VERSION);
      }
    });
  }
});
