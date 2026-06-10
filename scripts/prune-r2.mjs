#!/usr/bin/env node
/**
 * Prune unreferenced objects from the ownvoice-static R2 bucket.
 *
 * Keep-set = union of asset paths referenced by:
 *   - main's models-manifest.json + assetVersions.ts
 *   - every open PR's branch HEAD
 *
 * Anything else gets deleted, EXCEPT objects uploaded within the
 * last 24 hours (grace window for in-flight CI uploads).
 *
 * Fail-closed rules (a wrongly-deleted production model breaks every
 * new device's "Prepare for offline" until someone re-uploads):
 *   - If main's references can't be read OR parse to nothing, ABORT.
 *     A transient gh/API error must never shrink the keep-set.
 *   - If the final keep-set is empty, ABORT — that state would delete
 *     every grace-expired object in the bucket.
 *   - PR branches stay best-effort: old branches may predate the
 *     manifest split, and their assets are covered by the grace window
 *     while CI is actively uploading them.
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   GH_TOKEN or GITHUB_TOKEN (for `gh` to read PR list and branch contents)
 *
 * Usage:
 *   node scripts/prune-r2.mjs              # prune
 *   node scripts/prune-r2.mjs --dry-run    # report what would be deleted
 *   node scripts/prune-r2.mjs --no-grace   # bypass the 24h grace window
 *                                          # (use when manually cleaning
 *                                          # up known-stale uploads)
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DRY_RUN = process.argv.includes("--dry-run");
const NO_GRACE = process.argv.includes("--no-grace");
const GRACE_MS = NO_GRACE ? 0 : 24 * 60 * 60 * 1000;
const Bucket = "ownvoice-static";

// execFile (not exec) — argv array is passed to gh without spawning
// a shell, so any branch name with metacharacters can't inject.
function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });
}

export function parseVersions(src) {
  const ortMatch = src.match(/ORT_VERSION\s*=\s*"([^"]+)"/);
  const modelsMatch = src.match(/MODELS_RELEASE\s*=\s*"([^"]+)"/);
  if (!ortMatch || !modelsMatch) return null;
  return { ortVersion: ortMatch[1], modelsRelease: modelsMatch[1] };
}

export function parseManifest(json) {
  try {
    const data = JSON.parse(json);
    const baseUrls = [];
    for (const group of Object.values(data.models || {})) {
      if (typeof group?.baseUrl === "string") baseUrls.push(group.baseUrl);
    }
    return baseUrls;
  } catch {
    return [];
  }
}

/**
 * Read the two asset-reference files at the given ref.
 *
 * `required: true` (main): any fetch OR parse failure throws — aborting
 * the prune is always cheaper than deleting referenced production assets.
 * `required: false` (PR branches): failures yield an empty contribution;
 * older branches may legitimately lack these files.
 *
 * `ghImpl` is injectable for tests.
 */
export function fetchBranchAssets(ref, { required = false, ghImpl = gh } = {}) {
  let versions = null;
  try {
    const src = ghImpl(
      "api",
      `repos/mcat/ownvoice/contents/src/models/assetVersions.ts?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    versions = parseVersions(src);
  } catch (err) {
    if (required) {
      throw new Error(
        `Failed to read assetVersions.ts at required ref "${ref}" — aborting prune ` +
          `rather than risk deleting its referenced assets: ${err?.message ?? err}`,
      );
    }
    // ignored — older branches may not have this file
  }
  if (required && !versions) {
    throw new Error(
      `assetVersions.ts at required ref "${ref}" yielded no ORT_VERSION/MODELS_RELEASE — ` +
        `aborting prune. If the file format changed, update parseVersions() in this script.`,
    );
  }

  let manifestBaseUrls = [];
  try {
    const src = ghImpl(
      "api",
      `repos/mcat/ownvoice/contents/public/models-manifest.json?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    manifestBaseUrls = parseManifest(src);
  } catch (err) {
    if (required) {
      throw new Error(
        `Failed to read models-manifest.json at required ref "${ref}" — aborting prune ` +
          `rather than risk deleting its referenced assets: ${err?.message ?? err}`,
      );
    }
    // ignored
  }
  if (required && manifestBaseUrls.length === 0) {
    throw new Error(
      `models-manifest.json at required ref "${ref}" yielded no baseUrls — aborting prune. ` +
        `If the manifest format changed, update parseManifest() in this script.`,
    );
  }

  return { versions, manifestBaseUrls };
}

export function computeKeepPrefixes({ versions, manifestBaseUrls }) {
  const prefixes = new Set();
  if (versions) {
    prefixes.add(`ort/${versions.ortVersion}/`);
  }
  for (const baseUrl of manifestBaseUrls) {
    // baseUrl looks like /models/<release>/<group>/  →  models/<release>/<group>/
    const stripped = baseUrl.replace(/^\//, "");
    prefixes.add(stripped);
  }
  return prefixes;
}

export function isReferenced(key, prefixSet) {
  for (const prefix of prefixSet) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Final fail-closed gate: an empty keep-set means every grace-expired
 * object in the bucket would be deleted. That is never a valid outcome
 * of a healthy run — refuse to proceed.
 */
export function assertKeepSetSane(prefixes) {
  if (prefixes.size === 0) {
    throw new Error(
      "Keep-set is empty — refusing to prune. An empty keep-set would delete every " +
        "grace-expired object in the bucket; it only occurs when reference fetching failed.",
    );
  }
}

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const accountId = required("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = required("R2_ACCESS_KEY_ID");
  const secretAccessKey = required("R2_SECRET_ACCESS_KEY");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  console.log("Computing keep-set from main + open PRs...");
  const prListRaw = gh("pr", "list", "--state", "open", "--json", "headRefName");
  const prRefs = JSON.parse(prListRaw).map((pr) => pr.headRefName);
  console.log(`  Refs to inspect: ${prRefs.length + 1} (main, ${prRefs.join(", ")})`);

  const allPrefixes = new Set();
  // main is required: any failure here aborts the run (fail closed).
  for (const p of computeKeepPrefixes(fetchBranchAssets("main", { required: true }))) {
    allPrefixes.add(p);
  }
  for (const ref of prRefs) {
    const assets = fetchBranchAssets(ref);
    for (const p of computeKeepPrefixes(assets)) allPrefixes.add(p);
  }
  assertKeepSetSane(allPrefixes);
  console.log(`  Reference prefixes:`);
  for (const p of allPrefixes) console.log(`    ${p}`);

  console.log("\nListing R2 bucket...");
  const listed = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
    listed.push(...(res.Contents || []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`  ${listed.length} objects in bucket`);

  const now = Date.now();
  const orphans = listed.filter((obj) => {
    const referenced = isReferenced(obj.Key, allPrefixes);
    const recentlyUploaded =
      obj.LastModified && now - new Date(obj.LastModified).getTime() < GRACE_MS;
    return !referenced && !recentlyUploaded;
  });

  if (orphans.length === 0) {
    console.log("\nNo orphans to prune.");
    return;
  }

  console.log(`\n${DRY_RUN ? "[dry-run] would delete" : "Deleting"} ${orphans.length} orphans:`);
  for (const obj of orphans) {
    console.log(`  - ${obj.Key} (${obj.Size?.toLocaleString()} B, uploaded ${obj.LastModified?.toISOString()})`);
    if (!DRY_RUN) await s3.send(new DeleteObjectCommand({ Bucket, Key: obj.Key }));
  }
  console.log("\nDone.");
}

// Only run when invoked directly (node scripts/prune-r2.mjs), not when
// imported by tests.
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
