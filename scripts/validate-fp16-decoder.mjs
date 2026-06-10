#!/usr/bin/env node
/**
 * Smoke-test the fp16 conditional_decoder produces runnable, audio-shaped
 * output. Confirms the conversion didn't break the graph; does NOT and
 * cannot decide whether the fp16 audio is *as good as* fp32 — that's the
 * clinical A/B listening review (issue #287).
 *
 * Why sample-by-sample SNR is the wrong metric for this graph: the
 * conditional_decoder includes `RandomNormalLike` ops in the vocoder
 * synthesis path. fp32 and fp16 conversions can dispatch those ops with
 * different RNG state (different shapes after Cast insertions, different
 * tensor-data offsets). Even when both produce perfectly-good audio,
 * their per-sample waveforms can diverge — a single-sample phase shift
 * gives catastrophic sample-wise SNR while sounding identical. Phase-
 * invariant metrics (Mel-spectrogram L2, PESQ, MOS) are the meaningful
 * ones, and the cheapest practical version is the clinical ear.
 *
 * What this script DOES check:
 *   - fp16 model loads under ORT (graph is well-typed, ORT-acceptable)
 *   - inference completes without throwing
 *   - output is non-NaN, non-Inf, has audio-typical magnitude range
 *   - output isn't constant (i.e. the synthesis path actually fired)
 *
 * If those four pass, the conversion is mechanically sound. The clinical
 * review then decides whether the audio is shippable.
 *
 * Usage:
 *   node scripts/validate-fp16-decoder.mjs \\
 *     --fp32-ref <dir> \\
 *     --fp16-candidate <dir> \\
 *     [--speaker <speaker.json>] [--tokens <tokens.json>]
 */
import * as ort from "onnxruntime-node";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (flag) => {
    const i = a.indexOf(flag);
    return i === -1 ? null : a[i + 1];
  };
  return {
    fp32: get("--fp32-ref"),
    fp16: get("--fp16-candidate"),
    speakerFile: get("--speaker"),
    tokensFile: get("--tokens"),
  };
}

async function loadDecoder(dir) {
  const onnx = await readFile(join(dir, "conditional_decoder.onnx"));
  const data = await readFile(join(dir, "conditional_decoder.onnx_data"));
  return ort.InferenceSession.create(onnx, {
    executionProviders: ["cpu"],
    externalData: [{ path: "conditional_decoder.onnx_data", data }],
  });
}

function synthSpeakerInputs() {
  const embDim = 192;
  const featRows = 64;
  const featCols = 80;
  const numTokens = 250 + 60 + 3;
  const speakerEmbeddings = new Float32Array(embDim);
  const speakerFeatures = new Float32Array(featRows * featCols);
  for (let i = 0; i < embDim; i++) speakerEmbeddings[i] = (i % 13) * 0.07 - 0.4;
  for (let i = 0; i < featRows * featCols; i++) speakerFeatures[i] = ((i * 17) % 31 - 15) * 0.05;
  const speechTokens = new BigInt64Array(numTokens);
  for (let i = 0; i < 250; i++) speechTokens[i] = BigInt((i * 7) % 1024);
  for (let i = 250; i < 250 + 60; i++) speechTokens[i] = BigInt(((i - 250) * 11) % 4096);
  speechTokens[numTokens - 3] = 4299n;
  speechTokens[numTokens - 2] = 4299n;
  speechTokens[numTokens - 1] = 4299n;
  return {
    speakerEmbeddings: { data: speakerEmbeddings, dims: [1, embDim] },
    speakerFeatures: { data: speakerFeatures, dims: [1, featRows, featCols] },
    speechTokens: { data: speechTokens, dims: [1, numTokens] },
  };
}

async function loadSpeaker(speakerFile) {
  const raw = JSON.parse(await readFile(speakerFile, "utf8"));
  const emb = Float32Array.from(raw.speakerEmbeddings);
  const feat = Float32Array.from(raw.speakerFeatures);
  return {
    speakerEmbeddings: { data: emb, dims: raw.speakerEmbeddingsShape ?? [1, emb.length] },
    speakerFeatures: { data: feat, dims: raw.speakerFeaturesShape ?? [1, 1, feat.length] },
  };
}

async function loadTokens(tokensFile) {
  const raw = JSON.parse(await readFile(tokensFile, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.tokens;
  const data = BigInt64Array.from(arr.map((n) => BigInt(n)));
  return { data, dims: [1, data.length] };
}

function audioStats(arr) {
  let nan = 0, inf = 0, min = Infinity, max = -Infinity, absSum = 0, sqSum = 0;
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (Number.isNaN(v)) { nan++; continue; }
    if (!Number.isFinite(v)) { inf++; continue; }
    if (v < min) min = v;
    if (v > max) max = v;
    absSum += Math.abs(v);
    sqSum += v * v;
  }
  const valid = n - nan - inf;
  return {
    n, nan, inf, valid, min, max,
    meanAbs: valid > 0 ? absSum / valid : NaN,
    rms: valid > 0 ? Math.sqrt(sqSum / valid) : NaN,
  };
}

const args = parseArgs();
if (!args.fp32 || !args.fp16) {
  console.error("Usage: node scripts/validate-fp16-decoder.mjs --fp32-ref <dir> --fp16-candidate <dir> [--speaker <f>] [--tokens <f>]");
  process.exit(2);
}
for (const p of [args.fp32, args.fp16]) {
  if (!existsSync(p)) {
    console.error(`directory missing: ${p}`);
    process.exit(2);
  }
}

console.log(`fp32 reference:  ${args.fp32}`);
console.log(`fp16 candidate:  ${args.fp16}\n`);

const fp32 = await loadDecoder(args.fp32);
const fp16 = await loadDecoder(args.fp16);
console.log("Both models loaded under ORT — graph is well-typed.\n");

let speakerInputs;
if (args.speakerFile) {
  console.log(`Loading real speaker data from ${args.speakerFile}`);
  speakerInputs = await loadSpeaker(args.speakerFile);
} else {
  console.log("Using synthetic speaker inputs (no --speaker provided)");
  speakerInputs = synthSpeakerInputs();
}

let speechTokens;
if (args.tokensFile) {
  speechTokens = await loadTokens(args.tokensFile);
} else if (!args.speakerFile) {
  speechTokens = speakerInputs.speechTokens;
} else {
  speechTokens = synthSpeakerInputs().speechTokens;
}

const feeds = {
  speech_tokens: new ort.Tensor("int64", speechTokens.data, speechTokens.dims),
  speaker_embeddings: new ort.Tensor("float32", speakerInputs.speakerEmbeddings.data, speakerInputs.speakerEmbeddings.dims),
  speaker_features: new ort.Tensor("float32", speakerInputs.speakerFeatures.data, speakerInputs.speakerFeatures.dims),
};

console.log("Running fp32 decoder...");
const t0a = performance.now();
const out32 = await fp32.run(feeds);
const fp32Ms = performance.now() - t0a;

console.log("Running fp16 decoder...");
const t0b = performance.now();
const out16 = await fp16.run(feeds);
const fp16Ms = performance.now() - t0b;

const s32 = audioStats(out32.waveform.data);
const s16 = audioStats(out16.waveform.data);

const fmt = (n) => Number.isFinite(n) ? n.toExponential(3) : String(n);
console.log();
console.log("Metric              fp32                fp16");
console.log("------              ----                ----");
console.log(`runtime (ms)        ${fp32Ms.toFixed(0).padStart(10)}          ${fp16Ms.toFixed(0).padStart(10)}`);
console.log(`samples             ${String(s32.n).padStart(10)}          ${String(s16.n).padStart(10)}`);
console.log(`NaN                 ${String(s32.nan).padStart(10)}          ${String(s16.nan).padStart(10)}`);
console.log(`Inf                 ${String(s32.inf).padStart(10)}          ${String(s16.inf).padStart(10)}`);
console.log(`min                 ${fmt(s32.min).padStart(10)}          ${fmt(s16.min).padStart(10)}`);
console.log(`max                 ${fmt(s32.max).padStart(10)}          ${fmt(s16.max).padStart(10)}`);
console.log(`meanAbs             ${fmt(s32.meanAbs).padStart(10)}          ${fmt(s16.meanAbs).padStart(10)}`);
console.log(`rms                 ${fmt(s32.rms).padStart(10)}          ${fmt(s16.rms).padStart(10)}`);
console.log();

// Smoke-test checks: fp16 must produce audio-shaped, non-degenerate output.
const checks = [];
checks.push({ name: "fp16 output is non-NaN",            pass: s16.nan === 0 });
checks.push({ name: "fp16 output is non-Inf",            pass: s16.inf === 0 });
checks.push({ name: "fp16 magnitude is audio-typical",   pass: s16.meanAbs > 1e-4 && Math.max(Math.abs(s16.min), Math.abs(s16.max)) < 2 });
checks.push({ name: "fp16 output is non-constant",        pass: s16.rms > 1e-3 });
checks.push({ name: "fp16 sample count matches fp32",    pass: s16.n === s32.n });
// And report comparative stats as INFORMATION, not gating.
const magShift = Math.abs(s16.meanAbs - s32.meanAbs) / Math.max(s32.meanAbs, 1e-9);
const rmsShift = Math.abs(s16.rms - s32.rms) / Math.max(s32.rms, 1e-9);
console.log("Smoke-test results:");
let allPass = true;
for (const c of checks) {
  console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (!c.pass) allPass = false;
}
console.log();
console.log("Informational (NOT a gate — see header docstring):");
console.log(`  meanAbs shift vs fp32: ${(magShift * 100).toFixed(1)}%`);
console.log(`  rms shift vs fp32:     ${(rmsShift * 100).toFixed(1)}%`);
console.log();
console.log("These shifts being non-zero is expected for a stochastic");
console.log("vocoder with RandomNormalLike in the synthesis path.");
console.log("Audible quality is the clinical-A/B question, not a numeric one.");
console.log();

if (allPass) {
  console.log("PASS — conversion is mechanically sound. Proceed to A/B bundle");
  console.log("generation and clinical listening review for the ship decision.");
} else {
  console.log("FAIL — the conversion broke the graph. Do NOT spend clinical");
  console.log("reviewer time until this is fixed.");
  process.exit(1);
}
