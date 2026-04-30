#!/usr/bin/env node
/**
 * Compare the fp16 speech_encoder against the fp32 reference on real audio.
 *
 * Why: fp16 quantization can subtly drift speaker-embedding values.
 * `speakerEmbeddings` (192-dim x-vector) drives cloned-voice identity, so a
 * cosine similarity below ~0.99 against the fp32 reference would degrade
 * cloning fidelity. This script provides a numeric quality signal that
 * doesn't require a real iPad to run — invoke after re-running
 * `convert-encoder-fp16.py` to confirm the conversion didn't regress.
 *
 * Usage:
 *   node scripts/validate-fp16-encoder.mjs --fp32-ref <dir> <wav-file> [<wav-file>...]
 *
 * `--fp32-ref` points to a chatterbox-multilingual directory containing the
 * fp32 `speech_encoder.onnx` + `speech_encoder.onnx_data` (e.g. an older
 * MODELS_RELEASE before fp16 conversion). The fp16 candidate is read from
 * the current MODELS_RELEASE (parsed out of public/models-manifest.json so
 * the path tracks future bumps automatically).
 *
 * Audio inputs must be mono 16-bit PCM WAV. Convert with:
 *   ffmpeg -i input.m4a -ac 1 -ar 16000 -sample_fmt s16 output.wav
 */
import * as ort from "onnxruntime-node";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function readFp16Dir() {
  const manifest = JSON.parse(await readFile("public/models-manifest.json", "utf8"));
  // baseUrl is "/models/<release>/chatterbox-multilingual/"; convert to filesystem path
  const baseUrl = manifest.models.tts.baseUrl;
  return "public" + baseUrl.replace(/\/$/, "");
}

function decodeWav(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, false) !== 0x52494646) throw new Error("not RIFF");
  if (view.getUint32(8, false) !== 0x57415645) throw new Error("not WAVE");
  let off = 12;
  let fmt = null, dataOff = 0, dataLen = 0;
  while (off < view.byteLength) {
    const id = view.getUint32(off, false);
    const size = view.getUint32(off + 4, true);
    if (id === 0x666d7420) {
      fmt = {
        format: view.getUint16(off + 8, true),
        channels: view.getUint16(off + 10, true),
        sampleRate: view.getUint32(off + 12, true),
        bitsPerSample: view.getUint16(off + 22, true),
      };
    } else if (id === 0x64617461) {
      dataOff = off + 8;
      dataLen = size;
      break;
    }
    off += 8 + size;
  }
  if (!fmt) throw new Error("no fmt chunk");
  if (fmt.format !== 1) throw new Error(`unsupported format ${fmt.format} (want 1=PCM)`);
  if (fmt.bitsPerSample !== 16) throw new Error(`unsupported bps ${fmt.bitsPerSample}`);
  const numSamples = dataLen / (2 * fmt.channels);
  const out = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    out[i] = view.getInt16(dataOff + i * 2 * fmt.channels, true) / 32768.0;
  }
  return { audio: out, sampleRate: fmt.sampleRate };
}

async function loadEncoder(dir) {
  const onnx = await readFile(join(dir, "speech_encoder.onnx"));
  const data = await readFile(join(dir, "speech_encoder.onnx_data"));
  return ort.InferenceSession.create(onnx, {
    executionProviders: ["cpu"],
    externalData: [{ path: "speech_encoder.onnx_data", data }],
  });
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function l2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}
function maxAbs(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; }
  return m;
}

const argv = process.argv.slice(2);
const fp32RefIdx = argv.indexOf("--fp32-ref");
if (fp32RefIdx === -1 || !argv[fp32RefIdx + 1]) {
  console.error("Usage: node scripts/validate-fp16-encoder.mjs --fp32-ref <dir> <wav-file> [<wav-file>...]");
  process.exit(2);
}
const fp32RefDir = argv[fp32RefIdx + 1];
const wavPaths = argv.filter((_, i) => i !== fp32RefIdx && i !== fp32RefIdx + 1);
if (wavPaths.length === 0) {
  console.error("no wav files provided");
  process.exit(2);
}
if (!existsSync(fp32RefDir)) {
  console.error(`fp32 reference dir missing: ${fp32RefDir}`);
  process.exit(2);
}

const fp16Dir = await readFp16Dir();
if (!existsSync(fp16Dir)) {
  console.error(`fp16 candidate dir missing: ${fp16Dir} (run npm run assets:download)`);
  process.exit(2);
}

console.log(`fp32 reference: ${fp32RefDir}`);
console.log(`fp16 candidate: ${fp16Dir}\n`);

const fp32 = await loadEncoder(fp32RefDir);
const fp16 = await loadEncoder(fp16Dir);

const COSINE_THRESHOLD = 0.99;
let pass = true;

console.log("Sample".padEnd(38) + " | secs   | cos sim   | emb L2  | feat max-abs");
console.log("-".repeat(82));

for (const path of wavPaths) {
  const buf = await readFile(path);
  const { audio, sampleRate } = decodeWav(buf);
  if (sampleRate !== 16000) {
    console.error(`${path}: sample rate ${sampleRate} ≠ 16000; skipping (resample with ffmpeg)`);
    continue;
  }
  const clip = audio.slice(0, Math.min(audio.length, 16000 * 6));
  const tensor = new ort.Tensor("float32", clip, [1, clip.length]);
  const [out32, out16] = await Promise.all([
    fp32.run({ audio_values: tensor }),
    fp16.run({ audio_values: tensor }),
  ]);
  const cos = cosine(out32.speaker_embeddings.data, out16.speaker_embeddings.data);
  const distance = l2(out32.speaker_embeddings.data, out16.speaker_embeddings.data);
  const featMax = maxAbs(out32.speaker_features.data, out16.speaker_features.data);
  const ok = cos >= COSINE_THRESHOLD;
  if (!ok) pass = false;

  const name = path.split("/").pop().padEnd(36).slice(0, 36);
  const dur = (clip.length / 16000).toFixed(2).padStart(5);
  const cosStr = cos.toFixed(6).padStart(8);
  const l2Str = distance.toFixed(4).padStart(7);
  const featStr = featMax.toFixed(4).padStart(7);
  const flag = ok ? " " : "!";
  console.log(`${flag} ${name} | ${dur}s | ${cosStr} | ${l2Str} | ${featStr}`);
}

console.log();
if (pass) {
  console.log(`PASS — all samples cosine sim ≥ ${COSINE_THRESHOLD}`);
} else {
  console.log(`FAIL — at least one sample below cosine sim ${COSINE_THRESHOLD}`);
  process.exit(1);
}
