# Chrome capture with `?padShape=32` — 2026-05-17

**Setup**: Chrome 140 (M-series Mac), `localhost:3000/app/?memdiag=true&padShape=32`. Same voice clone as the unpadded baseline. Pre-gen ran across 133 captured synths (trail cap evicted earlier entries; total session synths > 800).

## Headline

**Bimodality eliminated. Decoder runs 4-10× faster overall.**

| Metric | Unpadded Chrome (PR #326) | **Padded `?padShape=32`** |
|---|---|---|
| decoder min | ~5900 ms | **1530 ms** |
| decoder p50 | ~12-15 s | **1821 ms** |
| decoder max | ~19600 ms | **1859 ms** |
| Bimodal? | 7/11 slow + 4/11 fast | **133/133 in one 500-ms histogram bin** |
| Shape distribution | 8 distinct values (309-337) | 2 distinct values (320, 352) |

The histogram literally has one entry: `{ binStartMs: 1500, binEndMs: 2000, count: 133 }`.

## What padding did

`?padShape=32` rounds the decoder input up to the next multiple of 32:

- Unpadded shapes 314-320 → padded to 320 (7 synths)
- Unpadded shapes 321-351 → padded to 352 (126 synths)

Both 320 and 352 hit a fast shader path in ORT-Web's WebGPU MatMul. The original 309-337 range was hitting a slow path across most values, with 326 as the lone fast outlier in the unpadded data.

## What the numbers mean

The 320-bucket and 352-bucket synths probably differ slightly in time (Pearson R 0.995 between `decTokens` and `decMs` reflects this small linear effect), but both are well within the previously-fast regime. The entire ~6 s slow tail observed in PR #326 is gone.

`queueSettleMs` was 0-1 on every synth, consistent with prior captures — confirming queue is never the cause.

## Implications

1. **Padding to multiple of 32 is a viable production fix** for the bimodal decoder latency on WebGPU EP.
2. **The root cause matches the agent's source-dive prediction in `docs/probe-ort-shape-dispatch.md`**: ORT-Web's MatMul packed shader path makes shape-dependent selections (`isVec4`, `elementsPerThread`, workgroup-tail divergence at `matmul_packed_webgpu.ts:463-472`). Padding to a 32-aligned shape avoids the slow path.
3. **PR #325's "shape falsified" conclusion was wrong.** The Pearson R = 0.052 on `(decTokens, decMs)` missed the categorical relationship.

## Caveats

- **Audio quality NOT yet verified.** Padding appends `SILENCE_TOKEN`s; the model may produce slightly different audio at the trim boundary. Listen-test required before shipping.
- **Bucket choice may matter.** This run used `padShape=32`. Other boundaries (16, 64, 96) might give different results. 32 is a reasonable default but should be A/B tested.
- **Cross-browser validation pending.** Safari was unavailable due to HTTPS-Only mode — need to re-test there. Per the agent's source dive, the fast cohort differs by browser (Safari liked 316/326/328; Chrome liked 326). Padding to 32 should land everyone in the same bucket regardless, but verify.
- **Audio length effect.** The trim formula assumes linear input→output sample ratio. Should listen to confirm output isn't getting silence-padded at the end.

## Next steps

1. **Listen test**: A/B audio output of padded vs unpadded for several phrase lengths. Critical before shipping.
2. **Safari validation**: Once Safari HTTPS-Only is bypassed (or with a different test environment), confirm padding helps on iPad WebKit too.
3. **Ship as default OR keep behind URL flag**: If audio quality holds, flip `padBoundary` default from 0 to 32 in `ttsEngine.ts`. Otherwise keep behind `?padShape=32` until further investigation.
4. **Consider larger bucket** (64 or 96): if 32 produces audible silence-padding artifacts at the end of short phrases, a larger bucket might be smoother because the silence padding is proportionally smaller. Or trim the audio more conservatively.
