// One-shot inspection script for the Chatterbox conditional decoder ONNX.
// Answers the question for issue #75: is the batch dimension dynamic
// (symbolic name like "batch") or baked to 1? That determines whether
// per-phrase batching is a runtime code change or needs a model re-export.
//
// Run with: node scripts/inspect-decoder-onnx.mjs

import * as ort from "onnxruntime-node";
import { readFile } from "node:fs/promises";

const base = "public/models/chatterbox-turbo";
const modelBuf = await readFile(`${base}/conditional_decoder_q4f16.onnx`);
const session = await ort.InferenceSession.create(modelBuf, {
  externalData: [
    {
      path: "conditional_decoder_q4f16.onnx_data",
      data: await readFile(`${base}/conditional_decoder_q4f16.onnx_data`),
    },
  ],
});

// inputMetadata / outputMetadata return arrays in onnxruntime-node >=1.24,
// not maps. Build lookup by name.
const inByName = Object.fromEntries(
  session.inputMetadata.map((m) => [m.name, m]),
);
const outByName = Object.fromEntries(
  session.outputMetadata.map((m) => [m.name, m]),
);

console.log("=== INPUTS ===");
for (const name of session.inputNames) {
  const m = inByName[name];
  console.log(`  ${name}  type=${m?.type}  shape=${JSON.stringify(m?.shape)}`);
}

console.log();
console.log("=== OUTPUTS ===");
for (const name of session.outputNames) {
  const m = outByName[name];
  console.log(`  ${name}  type=${m?.type}  shape=${JSON.stringify(m?.shape)}`);
}

console.log();
console.log("=== Batch-dim verdict ===");
for (const name of session.inputNames) {
  const shape = inByName[name]?.shape;
  if (!Array.isArray(shape) || shape.length === 0) continue;
  const dim0 = shape[0];
  const verdict =
    typeof dim0 === "string"
      ? `DYNAMIC (symbolic: "${dim0}")`
      : dim0 === 1
        ? "BAKED to 1"
        : `FIXED at ${dim0}`;
  console.log(`  ${name}  batch=${verdict}`);
}

async function tryRun(label, { N, tokenLen, featDim }) {
  console.log(`\n=== ${label} (N=${N}, tokenLen=${tokenLen}, featDim=${featDim}) ===`);
  try {
    const speechTokens = new BigInt64Array(N * tokenLen);
    speechTokens.fill(BigInt(4299)); // SILENCE_TOKEN
    const spkEmb = new Float32Array(N * 192);
    const spkFeat = new Float32Array(N * featDim * 80);
    const out = await session.run({
      speech_tokens: new ort.Tensor("int64", speechTokens, [N, tokenLen]),
      speaker_embeddings: new ort.Tensor("float32", spkEmb, [N, 192]),
      speaker_features: new ort.Tensor("float32", spkFeat, [N, featDim, 80]),
    });
    for (const name of session.outputNames) {
      const t = out[name];
      console.log(`  OK — ${name}  dims=${JSON.stringify(t.dims)}  totalElems=${t.data.length}`);
    }
    const wav = out["waveform"];
    if (wav) {
      const perSample = wav.dims[wav.dims.length - 1];
      console.log(`  Upsample ratio: ${perSample / tokenLen}× per token`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message.split("\n")[0].slice(0, 200)}`);
  }
}

// Baseline: batch=1, matches the shapes real synthesis uses today
await tryRun("Baseline batch=1", { N: 1, tokenLen: 32, featDim: 32 });
// Does batch=2 break for any featDim?
await tryRun("Batch=2, same dims", { N: 2, tokenLen: 32, featDim: 32 });
// Is the "2 by 4" because tokenLen/featDim ratio matters?
await tryRun("Batch=2, tokenLen=128 featDim=32", { N: 2, tokenLen: 128, featDim: 32 });
await tryRun("Batch=2, featDim=16", { N: 2, tokenLen: 32, featDim: 16 });
