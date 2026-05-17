#!/usr/bin/env node
// Analyze a memdiag trail JSONL (downloaded from Settings → Diagnostics)
// into per-synth timing breakdowns and decoder-time distribution stats.
//
// Usage:
//   node scripts/analyze-memdiag-trail.mjs path/to/memdiag-trail-*.jsonl
//   cat trail.jsonl | node scripts/analyze-memdiag-trail.mjs -
//
// Output (stdout): JSON summary with per-synth rows + histogram + slow/fast
// split. The trail format is one JSON object per line (see readTrail in
// src/diagnostics/crashTombstone.ts). Stage labels of interest:
//   synth:gpu:<id>                          → queue start (recorded when
//                                              speak() enqueues to worker)
//   synth:gpu:<id>:lm-start                 → autoregressive LM begin
//   synth:gpu:<id>:lm-done[:lmTokens=N]     → LM end (N optional, present
//                                              in trails captured on PR #323+)
//   synth:gpu:<id>:decoder-start[:decTokens=N]
//   synth:gpu:<id>:decoder-done
//   synth:gpu:<id>:done                     → main thread finished

import { readFileSync } from "node:fs";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: analyze-memdiag-trail.mjs <trail.jsonl> | -");
  process.exit(1);
}
const raw = arg === "-" ? readFileSync(0, "utf8") : readFileSync(arg, "utf8");
const lines = raw.split("\n").filter((l) => l.trim());
const entries = lines.map((l) => JSON.parse(l));

const synths = new Map();
const stageRe = /^synth:gpu:(\d+)(?::(.+))?$/;

for (const e of entries) {
  const m = stageRe.exec(e.stage);
  if (!m) continue;
  const id = Number(m[1]);
  const suffix = m[2] ?? "";
  if (!synths.has(id)) synths.set(id, { id, ts: {}, lmTokens: null, decTokens: null, queueSettleMs: null });
  const s = synths.get(id);

  if (suffix === "") s.ts.queueStart = e.ts;
  else if (suffix === "lm-start") s.ts.lmStart = e.ts;
  else if (suffix.startsWith("lm-done")) {
    s.ts.lmDone = e.ts;
    const t = suffix.match(/lmTokens=(\d+)/);
    if (t) s.lmTokens = Number(t[1]);
  } else if (suffix.startsWith("decoder-start")) {
    s.ts.decoderStart = e.ts;
    const t = suffix.match(/decTokens=(\d+)/);
    if (t) s.decTokens = Number(t[1]);
    const q = suffix.match(/queueSettleMs=(-?\d+)/);
    if (q) s.queueSettleMs = Number(q[1]);
  } else if (suffix === "decoder-done") s.ts.decoderDone = e.ts;
  else if (suffix === "done") s.ts.done = e.ts;
}

const rows = [];
for (const s of synths.values()) {
  const t = s.ts;
  if (!t.decoderStart || !t.decoderDone) continue;
  const queueMs = t.lmStart && t.queueStart ? t.lmStart - t.queueStart : null;
  const lmMs = t.lmStart && t.lmDone ? t.lmDone - t.lmStart : null;
  const decMs = t.decoderDone - t.decoderStart;
  const totalMs = t.done && t.queueStart ? t.done - t.queueStart : null;
  rows.push({
    id: s.id,
    queueMs,
    lmMs,
    decMs,
    totalMs,
    lmTokens: s.lmTokens,
    decTokens: s.decTokens,
    queueSettleMs: s.queueSettleMs,
  });
}
rows.sort((a, b) => a.id - b.id);

if (rows.length === 0) {
  console.error("no complete synths in trail (need both decoder-start and decoder-done)");
  process.exit(2);
}

const decTimes = rows.map((r) => r.decMs).sort((a, b) => a - b);
const min = decTimes[0];
const max = decTimes[decTimes.length - 1];
const median = decTimes[Math.floor(decTimes.length / 2)];
const p10 = decTimes[Math.floor(decTimes.length * 0.1)];
const p90 = decTimes[Math.floor(decTimes.length * 0.9)];
const p95 = decTimes[Math.floor(decTimes.length * 0.95)];
const mean = decTimes.reduce((a, b) => a + b, 0) / decTimes.length;

const binMs = 500;
const histBins = new Map();
for (const d of decTimes) {
  const bin = Math.floor(d / binMs) * binMs;
  histBins.set(bin, (histBins.get(bin) ?? 0) + 1);
}
const histogram = [...histBins.entries()].sort((a, b) => a[0] - b[0]).map(([bin, count]) => ({
  binStartMs: bin,
  binEndMs: bin + binMs,
  count,
}));

const binAt = (ms) => {
  const bin = Math.floor(ms / binMs) * binMs;
  return histBins.get(bin) ?? 0;
};
const bimodalSignal = {
  countAtP10: binAt(p10),
  countAtMedian: binAt(median),
  countAtP90: binAt(p90),
  bimodalLikely: binAt(p10) > binAt(median) && binAt(p90) > binAt(median),
};

const withTokens = rows.filter((r) => r.decTokens != null && r.decMs != null);
let pearson = null;
if (withTokens.length >= 3) {
  const xs = withTokens.map((r) => r.decTokens);
  const ys = withTokens.map((r) => r.decMs);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, dxSq = 0, dySq = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dxSq += dx * dx;
    dySq += dy * dy;
  }
  const denom = Math.sqrt(dxSq * dySq);
  pearson = denom === 0 ? null : num / denom;
}

// Queue-settle analysis (Probe 3a). If slow synths consistently show
// high queueSettleMs while fast synths show <50ms, queue congestion is
// the cause. If both populations show similar settle times, queue is
// falsified as the discriminator and we're looking at shader-cache or
// other in-decoder costs.
const withSettle = rows.filter((r) => r.queueSettleMs != null && r.queueSettleMs >= 0);
const slowThreshold = (min + max) / 2;
const slowSynths = withSettle.filter((r) => r.decMs > slowThreshold);
const fastSynths = withSettle.filter((r) => r.decMs <= slowThreshold);
const meanOf = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const queueSettleAnalysis = withSettle.length >= 3 ? {
  sampleSize: withSettle.length,
  slowMeanSettleMs: Math.round(meanOf(slowSynths.map((r) => r.queueSettleMs))),
  fastMeanSettleMs: Math.round(meanOf(fastSynths.map((r) => r.queueSettleMs))),
  slowCount: slowSynths.length,
  fastCount: fastSynths.length,
  note: (() => {
    const slowMean = meanOf(slowSynths.map((r) => r.queueSettleMs));
    const fastMean = meanOf(fastSynths.map((r) => r.queueSettleMs));
    if (slowMean > 1000 && fastMean < 100) return "queue-settle differs ≥10× — queue congestion supported";
    if (Math.abs(slowMean - fastMean) < 50) return "queue-settle similar — queue falsified; shader/compile is the suspect";
    return "intermediate signal — needs more data";
  })(),
} : { note: "queueSettleMs not in trail or fewer than 3 datapoints" };

const summary = {
  source: arg === "-" ? "stdin" : arg,
  totalEntries: entries.length,
  synthsParsed: synths.size,
  synthsComplete: rows.length,
  decoderMs: { min, p10, median, mean: Math.round(mean), p90, p95, max },
  histogram,
  bimodalSignal,
  lengthCorrelation: pearson != null ? {
    pearsonR: Number(pearson.toFixed(3)),
    sampleSize: withTokens.length,
    note: pearson > 0.5 ? "decoder time correlates with decTokens — shape-driven hypothesis supported"
        : pearson < -0.5 ? "inverse correlation — unexpected, investigate"
        : Math.abs(pearson) < 0.2 ? "weak/no correlation — shape isn't the discriminator"
        : "moderate correlation — partial story",
  } : { note: "decTokens not in trail (pre-PR-323 capture)" },
  queueSettleAnalysis,
  rows,
};

console.log(JSON.stringify(summary, null, 2));
