import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
// @ts-expect-error — .mjs script, no .d.ts
import { regenerateManifest, formatManifest } from "../../scripts/regenerate-manifest.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_PATH = path.join(REPO_ROOT, "public", "models-manifest.json");

describe("models-manifest.json integrity", () => {
  it("matches the byte-sizes on disk (run `npm run manifest:regen` if this fails)", async () => {
    const regenerated = formatManifest(await regenerateManifest(REPO_ROOT));
    const committed = await readFile(MANIFEST_PATH, "utf8");
    expect(regenerated).toBe(committed);
  });
});
