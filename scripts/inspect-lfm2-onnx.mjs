// One-shot script: prints the LFM2 ONNX model's inputs/outputs and derives
// the dual-cache topology (attention KV cache + conv state cache).
//
// Run with: node scripts/inspect-lfm2-onnx.mjs

import * as ort from "onnxruntime-node";
import { readFile } from "node:fs/promises";

const base = "public/models/lfm2-1.2b-instruct";
const modelBuf = await readFile(`${base}/model_q4.onnx`);
const session = await ort.InferenceSession.create(modelBuf, {
  externalData: [
    {
      path: "model_q4.onnx_data",
      data: await readFile(`${base}/model_q4.onnx_data`),
    },
  ],
});

// Inspect both names and typed shapes via the private metadata API
const meta = session.inputMetadata;
console.log("=== INPUTS with shapes ===");
for (const name of session.inputNames) {
  const m = meta[name];
  console.log(`  ${name}  type=${m?.type}  dims=${JSON.stringify(m?.shape)}`);
}

console.log();
console.log("=== OUTPUTS with shapes ===");
const outMeta = session.outputMetadata;
for (const name of session.outputNames) {
  const m = outMeta[name];
  console.log(`  ${name}  type=${m?.type}  dims=${JSON.stringify(m?.shape)}`);
}

console.log();
console.log("=== KV-cache topology ===");
const attnLayers = session.inputNames
  .map((n) => n.match(/^past_key_values\.(\d+)\.key$/))
  .filter(Boolean)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b);
const convLayers = session.inputNames
  .map((n) => n.match(/^past_conv\.(\d+)$/))
  .filter(Boolean)
  .map((m) => Number(m[1]))
  .sort((a, b) => a - b);
console.log("  Attention layers:", attnLayers);
console.log("  Conv layers:     ", convLayers);

// Try a dry-run with all empty/zero caches to see what shape the model accepts.
// This is the smoking-gun test for the worker's empty-cache allocation.
console.log();
console.log("=== Dry-run with empty caches ===");
try {
  const feeds = {
    input_ids: new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1]),
    attention_mask: new ort.Tensor("int64", new BigInt64Array([1n]), [1, 1]),
  };
  const HIDDEN = 2048;
  const CONV_L = 3;
  const KV_HEADS = 8;
  const HEAD_DIM = 64;
  for (const i of attnLayers) {
    feeds[`past_key_values.${i}.key`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, KV_HEADS, 0, HEAD_DIM],
    );
    feeds[`past_key_values.${i}.value`] = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [1, KV_HEADS, 0, HEAD_DIM],
    );
  }
  for (const i of convLayers) {
    // Guess: conv cache is [batch, hidden, conv_L_cache]
    feeds[`past_conv.${i}`] = new ort.Tensor(
      "float32",
      new Float32Array(HIDDEN * CONV_L),
      [1, HIDDEN, CONV_L],
    );
  }
  const out = await session.run(feeds);
  console.log("  OK — first-call succeeded");
  for (const name of ["logits", ...Object.keys(out).filter((n) => n !== "logits").slice(0, 4)]) {
    const t = out[name];
    if (t) console.log(`  ${name}  dims=${JSON.stringify(t.dims)}`);
  }
} catch (e) {
  console.log("  DRY-RUN ERROR:", e.message);
}
