#!/usr/bin/env node
/**
 * Upload assets to the ownvoice-static R2 bucket.
 *
 * Reads asset versions from src/models/assetVersions.ts (transpiled at
 * runtime via a small parse) and uploads:
 *   - public/ort/*.wasm  → ort/<ORT_VERSION>/<file>
 *   - public/models/**   → models/<MODELS_RELEASE>/<group>/<file>
 *
 * Idempotent: HEADs the target key first; uploads only if missing or
 * if the size differs. Use --force to re-upload everything.
 *
 * Usage:
 *   node scripts/upload-r2-assets.mjs            # incremental
 *   node scripts/upload-r2-assets.mjs --force    # re-upload everything
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 */
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const FORCE = process.argv.includes("--force");

const accountId = required("CLOUDFLARE_ACCOUNT_ID");
const accessKeyId = required("R2_ACCESS_KEY_ID");
const secretAccessKey = required("R2_SECRET_ACCESS_KEY");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
const Bucket = "ownvoice-static";

// Read asset versions from src/models/assetVersions.ts. We don't run a
// full TS compile — just regex out the two constants we need.
async function readVersions() {
  const src = await readFile(join(ROOT, "src/models/assetVersions.ts"), "utf-8");
  const ortMatch = src.match(/ORT_VERSION\s*=\s*"([^"]+)"/);
  const modelsMatch = src.match(/MODELS_RELEASE\s*=\s*"([^"]+)"/);
  if (!ortMatch || !modelsMatch) {
    throw new Error("Could not parse ORT_VERSION / MODELS_RELEASE from assetVersions.ts");
  }
  return { ortVersion: ortMatch[1], modelsRelease: modelsMatch[1] };
}

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

async function existsWithSize(key, sizeBytes) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return head.ContentLength === sizeBytes;
  } catch {
    return false;
  }
}

async function uploadOne(key, localPath) {
  const body = await readFile(localPath);
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body }));
  console.log(`  ✓ ${key} (${body.byteLength.toLocaleString()} B)`);
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
  const { ortVersion, modelsRelease } = await readVersions();
  console.log(`Uploading to bucket ${Bucket}`);
  console.log(`  ORT version:    ${ortVersion}`);
  console.log(`  Models release: ${modelsRelease}`);
  console.log("");

  // The local layout mirrors the remote R2 key layout (under public/ort/ and
  // public/models/, the version segment is part of the path: e.g.
  // public/ort/v1.24.3/foo.wasm uploads to ort/v1.24.3/foo.wasm). The version
  // constants are read above only to print a helpful banner; the actual key
  // is the relative-path mirror.

  // ORT WASM (recurse, .wasm only)
  const ortDir = join(ROOT, "public/ort");
  const ortFiles = (await walk(ortDir)).filter((p) => p.endsWith(".wasm"));
  console.log(`ORT WASM files (${ortFiles.length}):`);
  for (const local of ortFiles) {
    const rel = relative(ortDir, local);
    const size = (await stat(local)).size;
    const key = `ort/${rel}`;
    if (!FORCE && (await existsWithSize(key, size))) {
      console.log(`  · ${key} (cached)`);
      continue;
    }
    await uploadOne(key, local);
  }

  // Models
  const modelsDir = join(ROOT, "public/models");
  const modelFiles = await walk(modelsDir);
  console.log(`\nModel files (${modelFiles.length}):`);
  for (const local of modelFiles) {
    const rel = relative(modelsDir, local);
    const size = (await stat(local)).size;
    const key = `models/${rel}`;
    if (!FORCE && (await existsWithSize(key, size))) {
      console.log(`  · ${key} (cached)`);
      continue;
    }
    await uploadOne(key, local);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
