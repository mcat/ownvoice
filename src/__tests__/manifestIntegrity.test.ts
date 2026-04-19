import { describe, it, expect } from "vitest";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
// @ts-expect-error — .mjs script, no .d.ts
import { regenerateManifest, formatManifest } from "../../scripts/regenerate-manifest.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST_PATH = path.join(REPO_ROOT, "public", "models-manifest.json");

/**
 * public/models/** is gitignored (see scripts/download-models.sh) so fresh
 * clones, git worktrees, and CI environments without the ~1.7 GB model bundle
 * won't have them on disk. Skip the drift check rather than fail — the test's
 * purpose is to catch "I added a file but didn't run manifest:regen," which is
 * only meaningful on a dev machine that has the models.
 */
async function modelsAvailable(): Promise<boolean> {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    const firstModel = Object.values(manifest.models)[0] as {
      baseUrl: string;
      files: { name: string }[];
    };
    const probe = path.join(
      REPO_ROOT,
      "public",
      (firstModel.baseUrl + firstModel.files[0].name).replace(/^\//, ""),
    );
    await stat(probe);
    return true;
  } catch {
    return false;
  }
}

describe("models-manifest.json integrity", () => {
  it("matches the byte-sizes on disk (run `npm run manifest:regen` if this fails)", async () => {
    if (!(await modelsAvailable())) {
      // Intentional skip — see comment above.
      return;
    }
    const regenerated = formatManifest(await regenerateManifest(REPO_ROOT));
    const committed = await readFile(MANIFEST_PATH, "utf8");
    expect(regenerated).toBe(committed);
  });
});
