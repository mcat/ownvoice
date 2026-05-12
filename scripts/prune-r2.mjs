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

const DRY_RUN = process.argv.includes("--dry-run");
const NO_GRACE = process.argv.includes("--no-grace");
const GRACE_MS = NO_GRACE ? 0 : 24 * 60 * 60 * 1000;

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
const Bucket = "ownvoice-static";

// execFile (not exec) — argv array is passed to gh without spawning
// a shell, so any branch name with metacharacters can't inject.
function gh(...args) {
  return execFileSync("gh", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });
}

function parseVersions(src) {
  const ortMatch = src.match(/ORT_VERSION\s*=\s*"([^"]+)"/);
  const modelsMatch = src.match(/MODELS_RELEASE\s*=\s*"([^"]+)"/);
  if (!ortMatch || !modelsMatch) return null;
  return { ortVersion: ortMatch[1], modelsRelease: modelsMatch[1] };
}

function parseManifest(json) {
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

function fetchBranchAssets(ref) {
  // Read the two source files at the given ref. If either is missing
  // or unparseable, we treat the branch as having no asset references
  // (safe — won't keep anything spurious).
  let versions = null;
  try {
    const src = gh(
      "api",
      `repos/mcat/ownvoice/contents/src/models/assetVersions.ts?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    versions = parseVersions(src);
  } catch {
    // ignored — older branches may not have this file
  }
  let manifestBaseUrls = [];
  try {
    const src = gh(
      "api",
      `repos/mcat/ownvoice/contents/public/models-manifest.json?ref=${ref}`,
      "-H",
      "Accept: application/vnd.github.v3.raw",
    );
    manifestBaseUrls = parseManifest(src);
  } catch {
    // ignored
  }
  return { versions, manifestBaseUrls };
}

function computeKeepPrefixes({ versions, manifestBaseUrls }) {
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

function isReferenced(key, prefixSet) {
  for (const prefix of prefixSet) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
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
  console.log("Computing keep-set from main + open PRs...");
  const refs = ["main"];
  const prListRaw = gh("pr", "list", "--state", "open", "--json", "headRefName");
  const prList = JSON.parse(prListRaw);
  for (const pr of prList) refs.push(pr.headRefName);
  console.log(`  Refs to inspect: ${refs.length} (${refs.join(", ")})`);

  const allPrefixes = new Set();
  for (const ref of refs) {
    const assets = fetchBranchAssets(ref);
    for (const p of computeKeepPrefixes(assets)) allPrefixes.add(p);
  }
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
