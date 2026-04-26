# Qwen3-TTS Swap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bundled Chatterbox Turbo TTS model with Qwen3-TTS-12Hz-0.6B (INT8 ONNX export by sivasub987) — a 10-language voice-cloning TTS from Alibaba's Qwen team.

**Architecture:** Qwen3-TTS uses a 3-stage discrete multi-codebook autoregressive pipeline: text encoder → talker LM (prefill + decode) → code predictor → 12 Hz speech tokenizer decoder (the "vocoder") → 24 kHz audio. Voice cloning is zero-shot from a 3-second reference clip via a separate speaker encoder. Inference is split across **9 ONNX components** vs Chatterbox's 4 — significantly more surface area to wire up.

**Tech Stack:** TypeScript + Preact + Vite + Vitest. ONNX Runtime Web (WASM + WebGPU EPs). Custom HuggingFace tokenizer (BPE with merges.txt). OPFS for model weight caching.

---

## ⚠️ READ THIS FIRST: Recommendation

**This plan exists for completeness. The recommended path forward is the chatterbox-multilingual swap (PR #109's plan), not this one.** Direct comparison:

| Dimension | Chatterbox Multilingual | Qwen3-TTS 0.6B INT8 |
|---|---|---|
| **Size on disk** | ~1.5 GB | **2.08 GB** (39% larger) |
| **ONNX components** | 4 | **9** (2.25× implementation surface) |
| **Languages** | 23 | **10** (loses Hindi, Hebrew, Arabic, Polish, etc.) |
| **Voice cloning** | Zero-shot ~10s reference | Zero-shot 3s reference |
| **Browser validation** | ONNX export by community, inference scripts published | **None** — closest is a .NET 10 console app |
| **License** | MIT | Apache 2.0 (both fine) |
| **Inference complexity** | Standard TTS (3 stages) | Multi-codebook autoregressive + Mimi codec — non-standard |
| **Vocoder risks** | Same ConvTranspose-on-WebGPU issue we already hit on Turbo | Unknown (no browser demo to inspect); INT8 fuses vocoder into tokenizer_decode |
| **Implementation estimate** | 1.5-2 days | **4-6 days** |
| **Risk profile** | Medium (familiar architecture, public ONNX export) | High (novel pipeline, zero browser precedent) |

**The case for this plan despite the above:** Qwen3-TTS-1.7B-VoiceDesign supports free-form voice description ("a soft female voice in her 30s, slow and calm") — a meaningful capability advantage. But that's the 1.7B variant (~5+ GB), too big for our budget. The 0.6B variant we'd actually ship doesn't have that feature; it's voice cloning + 10 languages, which chatterbox-multilingual already does at smaller size.

**My read: ship chatterbox-multilingual unless you have a specific reason to want Qwen-flavored output.** This plan is here so the comparison is auditable.

If you decide to proceed with this plan anyway, continue reading.

---

## Out of scope (deferred to follow-up plans)

- The 1.7B variant's voice-design feature. Too big for our budget (5-10 GB) regardless of quantization.
- Streaming inference (Qwen3-TTS supports it; OwnVoice's pre-gen architecture doesn't need it).
- Custom voice design via natural-language description. Requires the 1.7B model.
- Code-switching across languages mid-utterance. Not a documented Qwen3-TTS feature.

---

## File Structure

### New files

- `public/models/qwen3-tts/` — model weight directory (replaces `chatterbox-turbo/`)
  - `talker_prefill_q.onnx` (~448 MB) — first-token autoregressive forward
  - `talker_decode_q.onnx` (~448 MB) — per-step decode pass with KV cache
  - `text_project_q.onnx` (~317 MB) — text encoder projection
  - `tokenizer12hz_encode_q.onnx` (~226 MB) — speech tokenizer encoder (used during reference audio enrollment)
  - `tokenizer12hz_decode_q.onnx` (~457 MB) — speech tokenizer decoder (vocoder equivalent)
  - `code_predictor_q.onnx` (~111 MB) — multi-codebook code predictor
  - `code_predictor_embed_q.onnx` (~31.5 MB) — code embedding lookup
  - `speaker_encoder_q.onnx` (~35.5 MB) — extracts speaker embedding from reference
  - `codec_embed_q.onnx` (~3.15 MB) — codec embedding table
  - `vocab.json` (~2.78 MB) — text tokenizer vocab
  - `merges.txt` (~1.67 MB) — BPE merges
  - `tokenizer_config.json` (~7 kB)
  - `config.json` (~5 kB)
- `src/models/qwen3Tokenizer.ts` — text tokenizer (HuggingFace BPE with vocab.json + merges.txt)
- `src/models/qwen3Tokenizer.test.ts` — tokenizer unit tests
- `src/models/qwen3InferenceWorker.ts` — replaces `ttsWorker.ts` for the Qwen3 pipeline. The 9-component flow is significantly different from Chatterbox's 4-component flow; a fresh worker is cleaner than retrofitting `ttsWorker.ts`.
- `public/qwen3-tts-gpu-worker.js` — replaces `tts-gpu-worker.js`.
- `src/data/qwen3Locales.ts` — the 10 supported language codes (Chinese, English, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian).

### Modified files

- `public/models-manifest.json` — replace TTS entries.
- `src/models/types.ts` — `CHATTERBOX_FILES` either renamed to `QWEN3_FILES` or replaced; new constants for the 9-component pipeline.
- `src/models/audioCache.ts` — bump `CACHE_DIR` v7 → v8.
- `src/data/recordingScripts.ts` — Qwen3 wants ~3s of reference audio (vs Chatterbox's 10-15s). Add a `referenceDurationSec` field; default 3 for Qwen3.
- `src/data/chatterboxLocales.ts` — replace with `qwen3Locales` import or rename.
- `CLAUDE.md` — update model description, sizes (~2.08 GB), language coverage (10 langs), pipeline complexity note.
- Auto-memory files — supersede the prior `project_model_stack.md` Turbo entry.

### Deleted (after cutover validates)

- `public/models/chatterbox-turbo/` (~1.27 GB on disk).
- `src/models/ttsWorker.ts` and `public/tts-gpu-worker.js` if the new workers fully replace them.
- `src/models/bpeTokenizer.ts` if the LFM2 LLM doesn't use it.

---

## Risk register (much heavier than the multilingual plan)

1. **Zero browser precedent.** The single biggest risk. No one has run Qwen3-TTS in a browser via ONNX Runtime Web. We're the proof of concept. ONNX Runtime Web has known coverage gaps for some ops; an unsupported op in any of the 9 components fails the whole pipeline. Phase 1 must validate every component loads + runs a single inference before the rest of the plan is committed to.
2. **9-component pipeline complexity.** Each component has its own input/output contract that must be wired correctly. Compared to Chatterbox's 4 components, this roughly doubles implementation effort and introduces 5 more failure modes.
3. **Mimi codec / multi-codebook autoregression.** Qwen3-TTS uses a discrete multi-codebook LM where each step generates multiple parallel codes. This is structurally different from Chatterbox's single-codebook AR. The sampling pipeline (currently rep_penalty → temp → top-k → top-p) may need to be applied per-codebook or jointly — not yet established for browser inference.
4. **Memory pressure.** 2.08 GB on disk + working memory during inference probably puts runtime resident at ~1 GB. Adding LFM2 (850 MB) + Whisper (~285 MB) tips us toward 2.2 GB resident. A16 iPad has 6 GB physical RAM with iPadOS reserving some — feasible but tighter than chatterbox-multilingual.
5. **Tokenizer rewrite.** Qwen3 uses a HuggingFace `vocab.json + merges.txt` BPE format. Different from Turbo's `tokenizer.json` GPT-2 BPE and different from chatterbox-multilingual's BPE-with-language-tags. Need a third tokenizer implementation. Reusing `bpeTokenizer.ts` may work since it's a similar pattern, but unclear without inspection.
6. **Vocoder unknown.** The INT8 export doesn't separate vocoder from tokenizer_decode; the vocoder may be fused into the tokenizer-decode ONNX. WebGPU ConvTranspose artifacts could emerge here as they did on Chatterbox's decoder.
7. **Speech-token range.** Qwen3 uses 12 Hz speech tokens with a multi-codebook structure. We'll need to figure out the vocab range, START / STOP tokens, and how the code_predictor stitches codebooks back together.
8. **Reference audio length.** Qwen3 wants ~3s of reference (not 10-15s like Chatterbox). Existing patient enrollment recordings (15s Rainbow Passage) need to be either truncated or re-recorded. Phase 6.2 forces re-enrollment regardless.

---

## Phase 1: Foundation & de-risk (CRITICAL — do not skip)

### Task 1.1: Download all 9 ONNX components

**Files:**
- Modify: `scripts/download-models.sh` (add Qwen3-TTS download block)

- [ ] **Step 1: Add a Qwen3-TTS download block to the existing script**

```bash
# Qwen3-TTS-0.6B-ONNX-INT8 (10 languages, ~2.08 GB)
QWEN_DIR="public/models/qwen3-tts"
mkdir -p "$QWEN_DIR"
HF_REPO="sivasub987/Qwen3-TTS-0.6B-ONNX-INT8"

for f in \
  "talker_prefill_q.onnx" \
  "talker_decode_q.onnx" \
  "text_project_q.onnx" \
  "tokenizer12hz_encode_q.onnx" \
  "tokenizer12hz_decode_q.onnx" \
  "code_predictor_q.onnx" \
  "code_predictor_embed_q.onnx" \
  "speaker_encoder_q.onnx" \
  "codec_embed_q.onnx" \
  "vocab.json" \
  "merges.txt" \
  "tokenizer_config.json" \
  "config.json"
do
  out="$QWEN_DIR/$f"
  if [ ! -f "$out" ]; then
    echo "Downloading $f..."
    curl -fL "https://huggingface.co/$HF_REPO/resolve/main/$f" -o "$out"
  fi
done
```

- [ ] **Step 2: Run download**

```bash
bash scripts/download-models.sh
```

Expected: ~2.08 GB total. Budget 30-60 minutes on hospital wifi.

- [ ] **Step 3: Verify sizes**

```bash
ls -la public/models/qwen3-tts/
```

Total should approximate 2.08 GB. The largest single file (tokenizer12hz_decode_q.onnx) is ~457 MB.

- [ ] **Step 4: Commit**

```bash
git add scripts/download-models.sh
git commit -m "chore(models): add qwen3-tts download script"
```

---

### Task 1.2: Inspect every ONNX component's input/output contract

**Files:**
- Modify: `src/models/types.ts` (record findings as a comment block)

For each of the 9 ONNX files, run the inspection command and record findings. This is the de-risk pass — if any component has unsupported ops or weird input shapes, we find out NOW, not 4 days into the rewrite.

- [ ] **Step 1: Inspect each component**

```bash
for f in talker_prefill_q talker_decode_q text_project_q tokenizer12hz_encode_q tokenizer12hz_decode_q code_predictor_q code_predictor_embed_q speaker_encoder_q codec_embed_q; do
  echo "=== $f ==="
  python3 -c "import sys, onnx; m = onnx.load(sys.argv[1], load_external_data=False); print('INPUTS:'); [print(f'  {i.name}: dtype={i.type.tensor_type.elem_type} shape={[d.dim_value or d.dim_param for d in i.type.tensor_type.shape.dim]}') for i in m.graph.input]; print('OUTPUTS:'); [print(f'  {o.name}: dtype={o.type.tensor_type.elem_type} shape={[d.dim_value or d.dim_param for d in o.type.tensor_type.shape.dim]}') for o in m.graph.output]" "public/models/qwen3-tts/${f}.onnx"
done
```

- [ ] **Step 2: For each component, identify any unusual ops**

```bash
for f in talker_prefill_q talker_decode_q text_project_q tokenizer12hz_encode_q tokenizer12hz_decode_q code_predictor_q code_predictor_embed_q speaker_encoder_q codec_embed_q; do
  echo "=== $f ==="
  python3 -c "import sys, onnx; m = onnx.load(sys.argv[1], load_external_data=False); ops = sorted({n.op_type for n in m.graph.node}); print(', '.join(ops))" "public/models/qwen3-tts/${f}.onnx"
done
```

Expected: standard ops (MatMul, Add, Softmax, LayerNormalization, Conv, etc.). RED FLAGS to escalate:
- `Custom*` or any op with a non-standard domain → likely unsupported in ONNX Runtime Web
- `STFT`, `iSTFT`, `MelSpectrogram` → may need pre/post-processing in JS
- `If`, `Loop`, `Scan` → control-flow ops have known browser issues
- Any op with `_int4` suffix → may need specific ORT version

- [ ] **Step 3: Record findings as a top-of-file comment in `src/models/types.ts`**

Write the input/output table for all 9 components and the op set. This is the contract we'll wire against in Phases 3-5.

- [ ] **Step 4: Hard checkpoint — proceed only if no unsupported ops**

If any component uses ops not supported by ONNX Runtime Web 1.19+, STOP and reconsider. Either:
(a) Wait for upstream ORT to add support (timeline unknown).
(b) Pre-process / post-process the offending op in JS (significant added complexity).
(c) Abandon this plan and use chatterbox-multilingual.

Document the decision before continuing.

---

### Task 1.3: Browser smoke-test each component

**Files:**
- Create: `scripts/qwen3-onnx-smoke.html` — a minimal standalone HTML page that loads each ONNX file via ONNX Runtime Web and runs a single forward with dummy inputs

- [ ] **Step 1: Build the smoke-test page**

Create `scripts/qwen3-onnx-smoke.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Qwen3-TTS ONNX Smoke Test</title>
  <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.wasm.min.js"></script>
</head>
<body>
  <h1>Qwen3-TTS ONNX Smoke Test</h1>
  <div id="results"></div>
  <script>
    const COMPONENTS = [
      "speaker_encoder_q",
      "codec_embed_q",
      "code_predictor_embed_q",
      "code_predictor_q",
      "text_project_q",
      "tokenizer12hz_encode_q",
      "tokenizer12hz_decode_q",
      "talker_prefill_q",
      "talker_decode_q",
    ];
    const resultsDiv = document.getElementById("results");

    function makeRow(result) {
      const div = document.createElement("div");
      div.style.padding = "8px";
      div.style.borderBottom = "1px solid #ccc";
      div.style.color = result.status === "FAILED" ? "red" : "green";
      const strong = document.createElement("strong");
      strong.textContent = result.name;
      div.appendChild(strong);
      div.appendChild(document.createTextNode(`: ${result.status}`));
      div.appendChild(document.createElement("br"));
      if (result.error) {
        const pre = document.createElement("pre");
        pre.textContent = result.error;
        div.appendChild(pre);
      } else {
        div.appendChild(document.createTextNode(`inputs: ${result.inputs.join(", ")}`));
        div.appendChild(document.createElement("br"));
        div.appendChild(document.createTextNode(`outputs: ${result.outputs.join(", ")}`));
      }
      return div;
    }

    async function smokeOne(name) {
      const url = `/models/qwen3-tts/${name}.onnx`;
      try {
        const session = await ort.InferenceSession.create(url, {
          executionProviders: ["wasm"],
        });
        return {
          name,
          status: "loaded",
          inputs: session.inputNames,
          outputs: session.outputNames,
        };
      } catch (err) {
        return { name, status: "FAILED", error: String(err) };
      }
    }

    (async () => {
      for (const c of COMPONENTS) {
        const result = await smokeOne(c);
        resultsDiv.appendChild(makeRow(result));
      }
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Serve and run**

```bash
npx http-server public -p 8888 -c-1
```

Copy `scripts/qwen3-onnx-smoke.html` into `public/scripts/` (or adjust path) so the static server can serve it. Open the page and watch every component report "loaded" or "FAILED".

- [ ] **Step 3: Hard checkpoint — proceed only if all 9 load**

If ANY component fails to load on WASM EP, this plan dies here. The most likely cause is an unsupported op or unexpected dtype. Do NOT attempt to work around — escalate to the user.

- [ ] **Step 4: Commit if green**

```bash
git add scripts/qwen3-onnx-smoke.html
git commit -m "chore(qwen3): add ONNX Runtime Web smoke test page"
```

---

### Task 1.4: Locate inference reference (Python or .NET)

**Files:**
- Document findings inline in this plan's Phase 4 / 5 tasks

The sivasub987 repo includes `full_tts_test.py` and `sample_inference.py`. These are the source of truth for how the 9 components wire together. Other reference: the elbruno/ElBruno.QwenTTS C# code. We need to study one of them carefully to understand the inference flow.

- [ ] **Step 1: Fetch full_tts_test.py**

```bash
curl -fL "https://huggingface.co/sivasub987/Qwen3-TTS-0.6B-ONNX-INT8/resolve/main/full_tts_test.py" -o /tmp/qwen3_full_tts_test.py
cat /tmp/qwen3_full_tts_test.py
```

- [ ] **Step 2: Fetch sample_inference.py**

```bash
curl -fL "https://huggingface.co/sivasub987/Qwen3-TTS-0.6B-ONNX-INT8/resolve/main/sample_inference.py" -o /tmp/qwen3_sample_inference.py
cat /tmp/qwen3_sample_inference.py
```

- [ ] **Step 3: Document the inference flow in this plan**

Update Phase 4's task list with the actual flow extracted from these scripts. Pay specific attention to:
- Order of component invocations
- How tokens flow from text encoder → talker → code predictor → vocoder
- Any pre-processing of audio for speaker_encoder
- Sampling strategy (greedy? sampling? per-codebook?)
- KV cache structure for talker_prefill vs talker_decode

This is the spec that drives Phase 4. Without it, Phase 4 is guesswork.

---

## Phase 2: Text tokenizer

### Task 2.1: Implement HuggingFace BPE tokenizer (vocab.json + merges.txt)

**Files:**
- Create: `src/models/qwen3Tokenizer.ts`
- Create: `src/models/qwen3Tokenizer.test.ts`

The Qwen3-TTS text tokenizer uses the HuggingFace BPE format (separate vocab.json + merges.txt files), distinct from both Chatterbox Turbo's tokenizer.json GPT-2 BPE AND chatterbox-multilingual's tokenizer.json BPE. Different layout, but the same algorithm at heart.

- [ ] **Step 1: Write the failing first test (RED)**

```typescript
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { buildQwen3Tokenizer } from "./qwen3Tokenizer";

const VOCAB = JSON.parse(readFileSync("public/models/qwen3-tts/vocab.json", "utf8"));
const MERGES = readFileSync("public/models/qwen3-tts/merges.txt", "utf8")
  .split("\n").filter(l => l.length > 0 && !l.startsWith("#"));

describe("qwen3Tokenizer", () => {
  test("encodes a simple English phrase to non-empty token ids", () => {
    const tok = buildQwen3Tokenizer(VOCAB, MERGES);
    const ids = tok.encode("Hello world");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => Number.isInteger(id) && id >= 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify red**

```bash
npx vitest run src/models/qwen3Tokenizer.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement minimal tokenizer (GREEN)**

```typescript
/**
 * Qwen3-TTS HuggingFace BPE tokenizer.
 *
 * Loads from vocab.json (token → id map) + merges.txt (newline-delimited
 * "left right" pairs in order). Byte-level pre-tokenization like GPT-2:
 * encode UTF-8 bytes to a stable Unicode mapping, split on the GPT-2 regex,
 * apply BPE merges per word, look up final token IDs.
 */

export interface Qwen3Tokenizer {
  encode: (text: string) => number[];
  decode: (ids: number[]) => string;
}

const GPT2_PAT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

function buildByteToUnicode(): Map<number, string> {
  const bs: number[] = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) { bs.push(b); cs.push(256 + n); n++; }
  }
  const map = new Map<number, string>();
  for (let i = 0; i < bs.length; i++) map.set(bs[i], String.fromCodePoint(cs[i]));
  return map;
}

const BYTE_TO_UNICODE = buildByteToUnicode();

export function buildQwen3Tokenizer(
  vocab: Record<string, number>,
  merges: string[],
): Qwen3Tokenizer {
  const vocabMap = new Map<string, number>(Object.entries(vocab));
  const idToToken = new Map<number, string>();
  for (const [tok, id] of vocabMap.entries()) idToToken.set(id, tok);

  const mergeRanks = new Map<string, number>();
  for (let i = 0; i < merges.length; i++) {
    const parts = merges[i].split(" ");
    if (parts.length === 2) mergeRanks.set(merges[i], i);
  }

  const unicodeToByte = new Map<string, number>();
  for (const [b, c] of BYTE_TO_UNICODE.entries()) unicodeToByte.set(c, b);

  function bytesToUnicode(text: string): string {
    const enc = new TextEncoder().encode(text);
    let out = "";
    for (const b of enc) out += BYTE_TO_UNICODE.get(b) ?? String.fromCodePoint(b);
    return out;
  }

  function applyBPE(chars: string[]): string[] {
    if (chars.length <= 1) return chars;
    let word = [...chars];
    while (word.length > 1) {
      let best: [string, string, number] | null = null;
      for (let i = 0; i < word.length - 1; i++) {
        const r = mergeRanks.get(`${word[i]} ${word[i + 1]}`);
        if (r !== undefined && (!best || r < best[2])) best = [word[i], word[i + 1], r];
      }
      if (!best) break;
      const next: string[] = [];
      for (let i = 0; i < word.length;) {
        if (i < word.length - 1 && word[i] === best[0] && word[i + 1] === best[1]) {
          next.push(best[0] + best[1]); i += 2;
        } else { next.push(word[i]); i++; }
      }
      word = next;
    }
    return word;
  }

  return {
    encode(text: string): number[] {
      const ids: number[] = [];
      const words = text.match(GPT2_PAT) ?? [];
      for (const word of words) {
        const byteStr = bytesToUnicode(word);
        const merged = applyBPE([...byteStr]);
        for (const tok of merged) {
          const id = vocabMap.get(tok);
          if (id !== undefined) ids.push(id);
        }
      }
      return ids;
    },
    decode(ids: number[]): string {
      let byteStr = "";
      for (const id of ids) {
        const tok = idToToken.get(id);
        if (tok !== undefined) byteStr += tok;
      }
      const bytes: number[] = [];
      for (const ch of byteStr) {
        const b = unicodeToByte.get(ch);
        if (b !== undefined) bytes.push(b);
        else for (const eb of new TextEncoder().encode(ch)) bytes.push(eb);
      }
      return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(bytes));
    },
  };
}
```

- [ ] **Step 4: Run to verify green**

```bash
npx vitest run src/models/qwen3Tokenizer.test.ts
```

- [ ] **Step 5: Add round-trip tests for the 10 supported languages**

```typescript
const SUPPORTED = [
  ["en", "Hello world"],
  ["zh", "你好"],
  ["ja", "こんにちは"],
  ["ko", "안녕하세요"],
  ["de", "Hallo Welt"],
  ["fr", "Bonjour le monde"],
  ["ru", "Привет мир"],
  ["pt", "Olá mundo"],
  ["es", "Hola mundo"],
  ["it", "Ciao mondo"],
] as const;

describe("qwen3Tokenizer round-trip", () => {
  const tok = buildQwen3Tokenizer(VOCAB, MERGES);
  for (const [lang, phrase] of SUPPORTED) {
    test(`${lang}: ${phrase}`, () => {
      const ids = tok.encode(phrase);
      expect(ids.length).toBeGreaterThan(0);
      const decoded = tok.decode(ids);
      expect(decoded.trim()).toBe(phrase);
    });
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add src/models/qwen3Tokenizer.ts src/models/qwen3Tokenizer.test.ts
git commit -m "feat(qwen3): add HuggingFace BPE text tokenizer"
```

---

## Phase 3: Manifest + types wire-up

### Task 3.1: Register all 9 ONNX components in the manifest

**Files:**
- Modify: `public/models-manifest.json`

- [ ] **Step 1: Add a `tts-qwen3` block to the manifest**

```json
"tts-qwen3": {
  "baseUrl": "/models/qwen3-tts/",
  "files": [
    { "name": "talker_prefill_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "talker_decode_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "text_project_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "tokenizer12hz_encode_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "tokenizer12hz_decode_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "code_predictor_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "code_predictor_embed_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "speaker_encoder_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "codec_embed_q.onnx", "size": 0, "magic": "onnx" },
    { "name": "vocab.json", "size": 0, "magic": "json" },
    { "name": "merges.txt", "size": 0, "magic": null },
    { "name": "tokenizer_config.json", "size": 0, "magic": "json" },
    { "name": "config.json", "size": 0, "magic": "json" }
  ]
}
```

Note: no `_data` files — the INT8 export embeds all weights inside the .onnx files (per Task 1.1 inspection).

- [ ] **Step 2: Run regen**

```bash
npm run manifest:regen
npm run manifest:check
```

- [ ] **Step 3: Commit**

```bash
git add public/models-manifest.json
git commit -m "chore(manifest): register qwen3-tts model files"
```

---

### Task 3.2: Update types.ts constants

**Files:**
- Modify: `src/models/types.ts`

- [ ] **Step 1: Add a Qwen3 file constants block**

Replace the `CHATTERBOX_FILES` block (or co-exist temporarily — clean up in Phase 8):

```typescript
export const QWEN3_FILES = {
  talkerPrefill: { onnx: "talker_prefill_q.onnx" },
  talkerDecode: { onnx: "talker_decode_q.onnx" },
  textProject: { onnx: "text_project_q.onnx" },
  tokenizerEncode: { onnx: "tokenizer12hz_encode_q.onnx" },
  tokenizerDecode: { onnx: "tokenizer12hz_decode_q.onnx" },
  codePredictor: { onnx: "code_predictor_q.onnx" },
  codePredictorEmbed: { onnx: "code_predictor_embed_q.onnx" },
  speakerEncoder: { onnx: "speaker_encoder_q.onnx" },
  codecEmbed: { onnx: "codec_embed_q.onnx" },
  vocab: "vocab.json",
  merges: "merges.txt",
} as const;

// Speech token / sampling constants — VERIFY against Phase 1.2 inspection
// before relying on these values.
export const QWEN3_TOKENS = {
  // The talker LM's vocab is split across N codebooks; specific values
  // come from the Phase 1.2 inspection findings. Placeholder values:
  NUM_CODEBOOKS: 0, // TODO: fill in from inspection
  CODEBOOK_SIZE: 0, // TODO: fill in
  STOP_TOKEN: 0, // TODO: fill in
  SAMPLE_RATE: 24000,
  MAX_NEW_TOKENS: 1024,
} as const;

export const MODEL_URLS = {
  tts: "/models/qwen3-tts/",
  llm: "/models/lfm2-1.2b-instruct/",
  stt: "/models/whisper-small/",
} as const;
```

The TODO placeholders are a deliberate failure mode — Phase 1.2 must populate them before Phase 4 starts.

- [ ] **Step 2: Run typecheck (will fail in workers; that's expected)**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors in `ttsWorker.ts` / GPU worker — fixed in Phase 4.

- [ ] **Step 3: Commit**

```bash
git add src/models/types.ts
git commit -m "refactor(types): add QWEN3_FILES constants for new TTS pipeline"
```

---

## Phase 4: WASM inference worker

### Task 4.1: Create the new worker shell

**Files:**
- Create: `src/models/qwen3InferenceWorker.ts`

- [ ] **Step 1: Stub out the worker with all 9 sessions**

```typescript
/**
 * Qwen3-TTS WASM inference worker.
 *
 * 9-component pipeline (vs Chatterbox's 4):
 *   Enrollment: speaker_encoder + tokenizer12hz_encode → speaker_emb + ref_codes
 *   Synthesis:
 *     1. text_project(text_ids) → text_emb
 *     2. talker_prefill(text_emb, speaker_emb, ref_codes) → first hidden + KV cache
 *     3. talker_decode(prev_hidden, KV) repeated → next code (multi-codebook)
 *     4. code_predictor(codes) → speech_tokens
 *     5. tokenizer12hz_decode(speech_tokens) → 24 kHz audio
 *
 * codec_embed and code_predictor_embed are lookup tables used inside the
 * autoregressive loop. Exact wiring confirmed in Phase 1.4 from
 * full_tts_test.py reference.
 */

import * as ort from "onnxruntime-web";

let textProjectSession: ort.InferenceSession | null = null;
let talkerPrefillSession: ort.InferenceSession | null = null;
let talkerDecodeSession: ort.InferenceSession | null = null;
let codePredictorSession: ort.InferenceSession | null = null;
let codePredictorEmbedSession: ort.InferenceSession | null = null;
let codecEmbedSession: ort.InferenceSession | null = null;
let tokenizerDecodeSession: ort.InferenceSession | null = null;
let tokenizerEncodeSession: ort.InferenceSession | null = null; // enrollment-only
let speakerEncoderSession: ort.InferenceSession | null = null;  // enrollment-only

let tokenizer: { encode: (text: string) => number[] } | null = null;

async function handleInit(modelUrl: string): Promise<void> {
  // Load all 9 ONNX components.
  // Speech encoder + tokenizerEncode are loaded on-demand for enrollment;
  // released after to free memory.
  // Follow the pattern in src/models/ttsWorker.ts handleInit.
}

async function handleSynthesize(
  text: string,
  speakerData: unknown,
  languageId: string,
): Promise<void> {
  // Implemented in Task 4.3.
  throw new Error("Not implemented");
}

async function handleEmbed(audio: Float32Array): Promise<void> {
  // Implemented in Task 4.2.
  throw new Error("Not implemented");
}

self.addEventListener("message", async (e: MessageEvent) => {
  const msg = e.data;
  if (!msg || !msg.type || !["init", "embed", "synthesize"].includes(msg.type)) return;
  try {
    switch (msg.type) {
      case "init": await handleInit(msg.modelUrl); break;
      case "embed": await handleEmbed(msg.audio); break;
      case "synthesize": await handleSynthesize(msg.text, msg.speakerData, msg.languageId); break;
    }
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
```

- [ ] **Step 2: Build & commit (skeleton only)**

```bash
npx tsc --noEmit
git add src/models/qwen3InferenceWorker.ts
git commit -m "scaffold(qwen3): worker skeleton with 9-session structure"
```

---

### Task 4.2: Implement enrollment (handleEmbed)

**Files:**
- Modify: `src/models/qwen3InferenceWorker.ts`

The enrollment path takes ~3 seconds of reference audio and produces a SpeakerData blob. The full inference flow comes from Phase 1.4's reference scripts — fill in the actual contracts based on what those scripts do. Below is the structural shape.

- [ ] **Step 1: Implement handleEmbed**

```typescript
interface QwenSpeakerData {
  speakerEmbedding: number[];
  speakerEmbeddingShape: number[];
  refCodes: number[];
  refCodesShape: number[];
}

async function handleEmbed(audio: Float32Array): Promise<void> {
  if (!speakerEncoderSession || !tokenizerEncodeSession) {
    throw new Error("Encoder sessions not initialized");
  }

  // 1. Speaker encoder: produces a fixed-size speaker embedding from the reference clip.
  const audioTensor = new ort.Tensor("float32", audio, [1, audio.length]);
  const speakerOut = await speakerEncoderSession.run({ audio_values: audioTensor });
  const speakerEmbedding = speakerOut.speaker_embedding ?? speakerOut[Object.keys(speakerOut)[0]];

  // 2. Tokenizer-encode: produces reference speech codes from the audio.
  // These are fed into talker_prefill alongside the text embedding to bias toward the speaker's prosody.
  const refCodesOut = await tokenizerEncodeSession.run({ audio_values: audioTensor });
  const refCodes = refCodesOut.audio_tokens ?? refCodesOut[Object.keys(refCodesOut)[0]];

  const speakerData: QwenSpeakerData = {
    speakerEmbedding: Array.from(speakerEmbedding.data as Float32Array),
    speakerEmbeddingShape: speakerEmbedding.dims as number[],
    refCodes: Array.from(refCodes.data as Float32Array | BigInt64Array, (n) =>
      typeof n === "bigint" ? Number(n) : n,
    ),
    refCodesShape: refCodes.dims as number[],
  };

  speakerEncoderSession.release();
  speakerEncoderSession = null;
  tokenizerEncodeSession.release();
  tokenizerEncodeSession = null;

  self.postMessage({ type: "embedding", data: speakerData });
}
```

The exact input/output names depend on the actual ONNX exports — Phase 1.2 inspection findings drive this. If `speaker_encoder` outputs are named differently (e.g., `speaker_features` or `x_vector`), update accordingly.

- [ ] **Step 2: Update embed handler tests**

The existing `ttsWorker.test.ts` tests the embed flow. Adapt those tests for the Qwen3 contract (different input shape, different output names). Key invariant: an embed call must return a non-empty `speakerData` blob.

- [ ] **Step 3: Commit**

```bash
git add src/models/qwen3InferenceWorker.ts
git commit -m "feat(qwen3-wasm): implement reference-audio enrollment via speaker_encoder + tokenizer_encode"
```

---

### Task 4.3: Implement synthesis (handleSynthesize) — the big one

**Files:**
- Modify: `src/models/qwen3InferenceWorker.ts`

This is the core of the rewrite. The 5-stage flow described in Task 4.1's docstring runs here. Without Phase 1.4's reference script analysis, this is guesswork — DO NOT proceed without that information.

- [ ] **Step 1: Implement based on Phase 1.4 findings**

Pseudo-structure to fill in from the reference script:

```typescript
async function handleSynthesize(
  text: string,
  speakerData: QwenSpeakerData,
  languageId: string,
): Promise<void> {
  // 1. Tokenize text (with optional language tag injection — Qwen3 may or may
  //    not use prefix-style language IDs; verify in Phase 1.4).
  const inputIds = tokenizer!.encode(text);

  // 2. text_project → produces text embedding for the talker LM.
  const textIds = new ort.Tensor("int64", BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
  const textProj = await textProjectSession!.run({ input_ids: textIds });
  const textEmb = textProj.text_embeddings ?? textProj[Object.keys(textProj)[0]];

  // 3. talker_prefill → first multi-codebook step + KV cache.
  //    Inputs: text_emb, speaker_emb (from speakerData), ref_codes (from speakerData).
  //    Outputs: hidden state, codes (one per codebook), KV cache for talker_decode.
  // 4. Loop: talker_decode + code_predictor for each subsequent step.
  //    Stop when STOP token emitted (per-codebook? jointly? — Phase 1.4).
  // 5. Stitch all codes through code_predictor / codec_embed → final speech tokens.
  // 6. tokenizer12hz_decode(speech_tokens) → 24 kHz audio.
  // 7. self.postMessage({ type: "audio", data: audio, sampleRate: 24000 });

  throw new Error("Stub — fill in based on Phase 1.4 findings");
}
```

The actual implementation is approximately 100-200 lines. Estimate: 3-5 hours of careful porting from Python reference + ~1 hour of debugging tensor shape mismatches.

- [ ] **Step 2: Test end-to-end with a single phrase**

Add a smoke test in `qwen3InferenceWorker.test.ts` that does the equivalent of the smoke-test page from Phase 1.3 but invokes the full synthesize path:

```typescript
test("end-to-end synth produces non-empty audio buffer", async () => {
  // Set up worker, init, embed (with dummy audio), synthesize ("Hello world", "en").
  // Assert the resulting Float32Array length corresponds to ~1-2 seconds of 24 kHz audio.
}, 60_000);
```

- [ ] **Step 3: Commit**

```bash
git add src/models/qwen3InferenceWorker.ts src/models/qwen3InferenceWorker.test.ts
git commit -m "feat(qwen3-wasm): implement 5-stage synthesis pipeline"
```

---

## Phase 5: GPU worker

### Task 5.1: Mirror Phase 4 in the GPU worker

**Files:**
- Create: `public/qwen3-tts-gpu-worker.js`

- [ ] **Step 1: Port the WASM worker to the GPU worker pattern**

Same 9 sessions, same 5-stage flow, but with WebGPU EP for the heavy components (talker_prefill / talker_decode / tokenizer12hz_decode). Keep speaker_encoder / tokenizer12hz_encode on WASM (only used during enrollment; not on the hot path).

- [ ] **Step 2: KV cache pinning for talker_decode**

The autoregressive decode loop runs hot. Pin the KV cache outputs to GPU memory using `preferredOutputLocation: "gpu-buffer"` to avoid PCIe round-trips. Mirror the pattern in `public/tts-gpu-worker.js:130-137`.

- [ ] **Step 3: Test loading + first synthesis**

```bash
npm run dev
```

Open the app, enroll a voice, tap a phrase. Watch console for any GPU-EP errors (unsupported ops, dtype mismatches).

- [ ] **Step 4: Commit**

```bash
git add public/qwen3-tts-gpu-worker.js
git commit -m "feat(qwen3-gpu): GPU worker with KV-cache pinning"
```

---

### Task 5.2: De-risk the tokenizer12hz_decode (vocoder)

**Files:**
- Modify: `public/qwen3-tts-gpu-worker.js`

The 457 MB tokenizer12hz_decode is functionally the vocoder — converts speech tokens to audio. Vocoders historically have ConvTranspose ops that misbehave on WebGPU q4f16 (the reason Chatterbox's decoder runs on WASM).

- [ ] **Step 1: Listen-test a synthesized phrase**

Listen for: buzziness, metallic artifacts, plosive distortion. If present, force WASM for tokenizer12hz_decode.

- [ ] **Step 2: If artifacts present, pin to WASM**

```javascript
tokenizerDecodeSession = await createSession(
  baseUrl + "tokenizer12hz_decode_q.onnx",
  /* hasExternalData */ false,
  /* wasmOnly */ true,
);
```

- [ ] **Step 3: Document the decision**

- [ ] **Step 4: Commit**

```bash
git add public/qwen3-tts-gpu-worker.js
git commit -m "fix(qwen3-gpu): pin tokenizer_decode to WASM if WebGPU artifacts present"
```

---

## Phase 6: Wire-up

### Task 6.1: Update modelManager + bootModels to point at Qwen3

**Files:**
- Modify: `src/models/modelManager.ts`
- Modify: `src/models/bootModels.ts`
- Modify: `src/models/ttsEngine.ts`

- [ ] **Step 1: Update worker URL**

The model manager spawns workers from a known path. Point it at `qwen3InferenceWorker.ts` and `qwen3-tts-gpu-worker.js`.

- [ ] **Step 2: Update synthesizeGPU signature**

Add `languageId` parameter (Qwen3 may or may not use it; verify in Phase 1.4).

- [ ] **Step 3: Update synthesize message shape**

Both workers need `text`, `speakerData`, `languageId`.

- [ ] **Step 4: Build & test**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tts): switch active TTS to qwen3 in modelManager + ttsEngine"
```

---

### Task 6.2: Reference audio duration change (15s → 3s)

**Files:**
- Modify: `src/components/shared/VoiceCapture.tsx`
- Modify: `src/data/recordingScripts.ts`

Qwen3 wants ~3s of reference. Existing 15s recordings will work (just truncated) but the UX should match.

- [ ] **Step 1: Add a `referenceDurationSec` field to RecordingScript**

```typescript
export interface RecordingScript {
  // existing fields
  referenceDurationSec: number; // 3 for Qwen3, 15 for Chatterbox
}
```

Set to 3 on both english and freeSpeakFallback.

- [ ] **Step 2: Update VoiceCapture to use the script's duration**

Replace the hardcoded `RECORD_DURATION = 15` with `script.referenceDurationSec`.

- [ ] **Step 3: Update the recording passage**

The Rainbow Passage opening fits 14s. For 3s, a much shorter passage is needed:

> "The quick brown fox jumps over the lazy dog."

Or the user can free-speak for 3s. Update both the english script and the tone-hint UX accordingly.

- [ ] **Step 4: Migration: clear existing 15s recordings**

Force re-enrollment so 15s audio doesn't get fed into a 3s-trained encoder. Same migration mechanism as the chatterbox-multilingual plan's Task 6.2.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(voice-capture): drop reference duration to 3s for Qwen3-TTS"
```

---

### Task 6.3: Locale gating

**Files:**
- Create: `src/data/qwen3Locales.ts`
- Modify: `src/data/chatterboxLocales.ts` (or replace)

- [ ] **Step 1: Add Qwen3 locale list**

```typescript
const QWEN3_SUPPORTED = new Set([
  "en", "zh", "ja", "ko", "de", "fr", "ru", "pt", "es", "it",
]);

export function canCloneForLocale(locale: string): boolean {
  if (!locale) return false;
  const base = locale.split("-")[0].toLowerCase();
  return QWEN3_SUPPORTED.has(base);
}
```

- [ ] **Step 2: Commit**

---

### Task 6.4: Cache version bump

**Files:**
- Modify: `src/models/audioCache.ts`

```typescript
// v3 → v4: relaxed post-process LP.
// v4 → v5: lowered TEMPERATURE.
// v5 → v6: [narration] (REVERTED).
// v6 → v7: rolled back [narration].
// v7 → v8: swapped Chatterbox Turbo (English-only) → Qwen3-TTS-0.6B-INT8
//          (10 languages, multi-codebook autoregressive). Entire model swap;
//          all cached audio regenerates.
const CACHE_DIR = "audio-cache-v8";
```

---

## Phase 7: Validation

### Task 7.1: English baseline regression

- [ ] **Step 1: Re-enroll English voice (3s recording)**
- [ ] **Step 2: Listen to a known phrase**

Compare quality to the prior Turbo / chatterbox-multilingual render (whichever the user shipped most recently). Expected: comparable or better. Qwen3-TTS is reportedly higher quality than Chatterbox in published benchmarks but real-world depends on reference audio + ICU phrase distribution.

- [ ] **Step 3: Document**

---

### Task 7.2: Cross-lingual cloning across all 10 languages

- [ ] **Step 1: For each of the 10 supported locales (en/zh/ja/ko/de/fr/ru/pt/es/it):**

Add a patient with that locale, listen to a synthesized phrase. Confirm the cloned voice speaks the target language with the patient's voice characteristics.

- [ ] **Step 2: Document any languages that fail**

Failures here usually mean the tokenizer doesn't have good coverage for that language's script, or the talker LM wasn't well-trained on that language. Either way: report and decide whether to surface in the locale picker.

---

### Task 7.3: Pre-gen budget + memory pressure

- [ ] **Step 1: Time a fresh pre-gen**

Compare to the Turbo baseline. Qwen3-TTS has 9 components running per phrase (vs Chatterbox's 4). Latency may be 2-3× higher.

- [ ] **Step 2: Watch resident memory during pre-gen**

In Safari Inspector → Memory tab, observe peak heap. If above 1.5 GB, may need to release some sessions between calls.

- [ ] **Step 3: Adjust timeouts if needed**

---

## Phase 8: Cleanup

### Task 8.1: Delete Chatterbox Turbo files + ttsWorker.ts

**Files:**
- Delete: `public/models/chatterbox-turbo/`
- Delete: `src/models/ttsWorker.ts`
- Delete: `public/tts-gpu-worker.js`
- Delete: `src/models/bpeTokenizer.ts` if unused

- [ ] **Step 1: Confirm nothing else imports the old workers**
- [ ] **Step 2: Delete files**
- [ ] **Step 3: Update manifest to drop the old `tts` block**
- [ ] **Step 4: Run tests**
- [ ] **Step 5: Commit**

---

### Task 8.2: Update CLAUDE.md and memory

Update CLAUDE.md to reflect Qwen3-TTS swap. Update `project_model_stack.md`.

---

### Task 8.3: Open PR

```bash
gh pr create --title "Swap TTS to Qwen3-TTS-0.6B-INT8 (10 languages)" --body "..."
```

Don't merge — user reviews.

---

## Self-Review (filled in)

**Spec coverage:**
- 10 languages → Phase 7.2.
- Voice cloning → Phase 4.2.
- Reference audio 3s → Task 6.2.
- 9-component pipeline → Phase 1.2 inspection + Phase 4.3 synth implementation.
- Memory pressure check → Task 7.3.

**Placeholder scan:** Phase 1.4's findings drive Phase 4.3 — unavoidable given the lack of public browser inference reference. Phase 1.2 must populate `QWEN3_TOKENS` constants before Phase 4 starts.

**Hard checkpoints:** Phase 1.2 step 4 and Phase 1.3 step 3 are go/no-go gates. If either fails, this plan dies and we fall back to chatterbox-multilingual.

---

## Open questions to resolve during execution

1. **Multi-codebook sampling.** Per-codebook sampling pipeline vs jointly? Do rep_penalty / temperature operate per codebook or across the joint distribution? Phase 1.4 reference script will show.
2. **Language tag format (if any).** Qwen3-TTS may accept text directly without a language tag; or it may want one. Phase 1.4 reveals.
3. **Speaker embedding compatibility.** Cannot reuse Turbo embeddings — different model. Migration in Task 6.2 forces re-enrollment.
4. **WebGPU EP coverage for talker_decode.** Llama-style attention typically works on WebGPU but the Qwen3 talker has multi-codebook output heads — non-standard shape. Phase 5.1 validates.

---

## Final reminder

Re-read the **Recommendation** section at the top before starting Phase 1. **Chatterbox-multilingual is the smaller, simpler, better-supported, more-languages alternative.** Use this plan only if you have a specific reason to want Qwen3-TTS over Chatterbox.
