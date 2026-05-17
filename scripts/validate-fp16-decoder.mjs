#!/usr/bin/env node
/**
 * Compare the fp16 conditional_decoder against the fp32 reference on real
 * speaker_data + speech_tokens. fp16 quantization can subtly drift the
 * synthesized waveform — this script provides a numeric quality signal
 * (SNR, max-abs delta, L2 distance) without requiring a clinical
 * listening review.
 *
 * The clinical A/B (issue #287) is the authoritative gate on shipping;
 * this script catches gross regressions before any humans burn time on
 * them. SNR > 30 dB means "near-imperceptible drift" by typical audio
 * standards; SNR < 20 dB likely needs the human ear.
 *
 * Usage:
 *   node scripts/validate-fp16-decoder.mjs \\
 *     --fp32-ref <dir> \\
 *     --fp16-candidate <dir> \\
 *     [--speaker <speaker.json>] [--tokens <tokens.json>]
 *
 * The --speaker and --tokens inputs are JSON dumps of a real
 * `speakerData` object and a real `decoderTokens` array as the GPU
 * worker constructs them. Capture them by adding a one-shot
 * console.log(JSON.stringify(...)) in `handleSynthesize` and pasting the
 * output into a file. Without them, the script falls back to
 * deterministic synthetic inputs that still exercise the graph but
 * don't replicate real prosody.
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
  // Deterministic synthetic inputs that exercise the full decoder graph.
  // Real speakerData has speaker_embeddings (192,), speaker_features
  // (~feature_dim x 80). speech_tokens is the LM output: a sequence of
  // int64 speech codes prepended by the prompt_token. We use realistic
  // shapes so ConvTranspose ops land in the same regime, but the values
  // are dummy.
  const embDim = 192;
  const featRows = 64; // typical feature_dim for a short phrase
  const featCols = 80;
  const numTokens = 250 + 60 + 3; // prompt(250) + speech(60) + silence(3)
  const speakerEmbeddings = new Float32Array(embDim);
  const speakerFeatures = new Float32Array(featRows * featCols);
  // Deterministic non-zero fill so neither tensor is just a vector of zeros
  // (some kernels behave differently on all-zero inputs).
  for (let i = 0; i < embDim; i++) speakerEmbeddings[i] = (i % 13) * 0.07 - 0.4;
  for (let i = 0; i < featRows * featCols; i++) speakerFeatures[i] = ((i * 17) % 31 - 15) * 0.05;
  const speechTokens = new BigInt64Array(numTokens);
  // Prompt tokens use values < 6561; speech tokens too. Final 3 are silence
  // (4299 per the GPU worker constant).
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
    speakerEmbeddings: {
      data: emb,
      dims: raw.speakerEmbeddingsShape ?? [1, emb.length],
    },
    speakerFeatures: {
      data: feat,
      dims: raw.speakerFeaturesShape ?? [1, 1, feat.length],
    },
  };
}

async function loadTokens(tokensFile) {
  const raw = JSON.parse(await readFile(tokensFile, "utf8"));
  const arr = Array.isArray(raw) ? raw : raw.tokens;
  const data = BigInt64Array.from(arr.map((n) => BigInt(n)));
  return { data, dims: [1, data.length] };
}

function snrDb(ref, cand) {
  // 10 * log10(sum(ref^2) / sum((ref - cand)^2))
  let sigSq = 0, noiseSq = 0;
  const n = Math.min(ref.length, cand.length);
  for (let i = 0; i < n; i++) {
    sigSq += ref[i] * ref[i];
    const d = ref[i] - cand[i];
    noiseSq += d * d;
  }
  if (noiseSq === 0) return Infinity;
  return 10 * Math.log10(sigSq / noiseSq);
}

function maxAbs(ref, cand) {
  let m = 0;
  const n = Math.min(ref.length, cand.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(ref[i] - cand[i]);
    if (d > m) m = d;
  }
  return m;
}

function l2(ref, cand) {
  let s = 0;
  const n = Math.min(ref.length, cand.length);
  for (let i = 0; i < n; i++) {
    const d = ref[i] - cand[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

const SNR_PASS_DB = 30;

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
  console.log(`Loading real tokens from ${args.tokensFile}`);
  speechTokens = await loadTokens(args.tokensFile);
} else if (!args.speakerFile) {
  speechTokens = speakerInputs.speechTokens;
} else {
  // Speaker provided but tokens not; fall back to synthetic tokens with
  // a length-compatible shape (the decoder is agnostic to token values
  // for our quality check).
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

const ref = out32.waveform.data;
const cand = out16.waveform.data;

const snr = snrDb(ref, cand);
const mx = maxAbs(ref, cand);
const distance = l2(ref, cand);

console.log();
console.log(`waveform samples:     ${ref.length}`);
console.log(`fp32 runtime:         ${fp32Ms.toFixed(0)} ms`);
console.log(`fp16 runtime:         ${fp16Ms.toFixed(0)} ms`);
console.log(`SNR (vs fp32 ref):    ${snr.toFixed(2)} dB   (pass: ≥${SNR_PASS_DB} dB)`);
console.log(`max-abs delta:        ${mx.toExponential(3)}`);
console.log(`L2 distance:          ${distance.toExponential(3)}`);
console.log();

if (snr >= SNR_PASS_DB) {
  console.log(`PASS — SNR ${snr.toFixed(2)} dB ≥ ${SNR_PASS_DB} dB. Numeric quality looks safe; proceed to clinical A/B review.`);
} else {
  console.log(`FAIL — SNR ${snr.toFixed(2)} dB < ${SNR_PASS_DB} dB. Audible drift likely; investigate before burning clinical reviewer time.`);
  process.exit(1);
}
