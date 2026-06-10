// Tests for the R2 prune script's keep-set computation.
//
// The failure mode these guard against: a transient `gh api` error while
// reading main's asset references used to be swallowed, so main contributed
// ZERO keep-prefixes and the daily cron would delete every production asset
// older than the 24h grace window. Prune must fail CLOSED: abort on any
// doubt about main, and never proceed with an empty keep-set.
import { describe, it, expect } from "vitest";
import {
  fetchBranchAssets,
  computeKeepPrefixes,
  assertKeepSetSane,
  parseVersions,
  parseManifest,
  isReferenced,
} from "./prune-r2.mjs";

const ASSET_VERSIONS_SRC = `
export const ORT_VERSION = "v1.25.1";
export const MODELS_RELEASE = "2026-05-24";
`;

const MANIFEST_JSON = JSON.stringify({
  models: {
    "chatterbox-multilingual": { baseUrl: "/models/2026-05-24/chatterbox-multilingual/" },
    "whisper-small.en": { baseUrl: "/models/2026-05-24/whisper-small.en/" },
  },
});

/** ghImpl that serves both reference files successfully. */
function happyGh(_api, path) {
  if (String(path).includes("assetVersions.ts")) return ASSET_VERSIONS_SRC;
  if (String(path).includes("models-manifest.json")) return MANIFEST_JSON;
  throw new Error(`unexpected gh path: ${path}`);
}

/** ghImpl that always fails, as on a GitHub rate limit / auth expiry. */
function failingGh() {
  throw new Error("HTTP 403: API rate limit exceeded");
}

describe("fetchBranchAssets", () => {
  it("returns keep-prefixes for a healthy ref", () => {
    const assets = fetchBranchAssets("main", { required: true, ghImpl: happyGh });
    const prefixes = computeKeepPrefixes(assets);
    expect(prefixes).toEqual(
      new Set([
        "ort/v1.25.1/",
        "models/2026-05-24/chatterbox-multilingual/",
        "models/2026-05-24/whisper-small.en/",
      ]),
    );
  });

  it("throws when a required ref's assetVersions fetch fails", () => {
    expect(() =>
      fetchBranchAssets("main", { required: true, ghImpl: failingGh }),
    ).toThrow(/main/);
  });

  it("throws when a required ref's manifest fetch fails after versions succeeded", () => {
    const ghImpl = (_api, path) => {
      if (String(path).includes("assetVersions.ts")) return ASSET_VERSIONS_SRC;
      throw new Error("HTTP 500");
    };
    expect(() => fetchBranchAssets("main", { required: true, ghImpl })).toThrow(/main/);
  });

  it("throws when a required ref's files fetch but yield no references", () => {
    // A format refactor of assetVersions.ts must not silently drop main's
    // ort/ prefix from the keep-set.
    const ghImpl = (_api, path) => {
      if (String(path).includes("assetVersions.ts")) return "// no versions here";
      return MANIFEST_JSON;
    };
    expect(() => fetchBranchAssets("main", { required: true, ghImpl })).toThrow(/main/);
  });

  it("tolerates fetch failures for non-required (PR) refs", () => {
    const assets = fetchBranchAssets("some-pr-branch", { ghImpl: failingGh });
    expect(assets).toEqual({ versions: null, manifestBaseUrls: [] });
    expect(computeKeepPrefixes(assets).size).toBe(0);
  });
});

describe("assertKeepSetSane", () => {
  it("throws on an empty keep-set", () => {
    expect(() => assertKeepSetSane(new Set())).toThrow(/empty/i);
  });

  it("accepts a non-empty keep-set", () => {
    expect(() => assertKeepSetSane(new Set(["models/2026-05-24/x/"]))).not.toThrow();
  });
});

describe("parsers", () => {
  it("parseVersions extracts ORT_VERSION and MODELS_RELEASE", () => {
    expect(parseVersions(ASSET_VERSIONS_SRC)).toEqual({
      ortVersion: "v1.25.1",
      modelsRelease: "2026-05-24",
    });
  });

  it("parseVersions returns null when either constant is missing", () => {
    expect(parseVersions('export const ORT_VERSION = "v1";')).toBeNull();
  });

  it("parseManifest returns [] on malformed JSON", () => {
    expect(parseManifest("not-json{")).toEqual([]);
  });

  it("isReferenced matches by prefix", () => {
    const keep = new Set(["models/2026-05-24/whisper-small.en/"]);
    expect(isReferenced("models/2026-05-24/whisper-small.en/encoder.onnx", keep)).toBe(true);
    expect(isReferenced("models/2026-05-01/whisper-small.en/encoder.onnx", keep)).toBe(false);
  });
});
