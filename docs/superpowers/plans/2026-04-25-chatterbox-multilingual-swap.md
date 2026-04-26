# Chatterbox Multilingual Swap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bundled English-only Chatterbox Turbo TTS model with `chatterbox-multilingual-ONNX` (23 languages) so cross-lingual provider speech actually works, and runtime control over `exaggeration` becomes available for prosody tuning.

**Architecture:** The multilingual ONNX export uses a different (smaller) BPE tokenizer with language-tag prefixes, exposes `exaggeration` as a runtime input on `embed_tokens.onnx`, runs a 30-layer Llama LM (vs Turbo's 24-layer GPT-2), and shares the same `speech_encoder` / `conditional_decoder` contract as Turbo. The swap is a coordinated change across model files, manifest, tokenizer code, and both inference workers (WASM + GPU). End state ships a single-model bundle — Turbo is deleted, not kept as fallback (review-before-merge gates regression risk).

**Tech Stack:** TypeScript + Preact + Vite + Vitest. ONNX Runtime Web (WASM + WebGPU EPs). HuggingFace `tokenizer.json` BPE format. OPFS for model weight caching.

---

## Out of scope (deferred to follow-up plans)

- Exposing `exaggeration` as a per-patient or per-phrase UI slider. This plan ships with `exaggeration=0.5` constant default. A follow-up plan can add the UI knob once the swap is validated.
- Code-switching support (mixing languages in a single utterance). Multilingual model takes a single `language_id` per generation; multi-language support requires upstream model work.
- Perth watermarking. The reference inference applies it post-decoder; this is on-device-only audio with no exfiltration risk, so we skip it. Same posture as the current Turbo bundle.
- Removing the locale-gating restrictions in `src/data/chatterboxLocales.ts`. Once cross-lingual is verified working, that file becomes a noop and can be deleted in cleanup. Done in this plan but as a single-line task, not a UX redesign.

---

## File Structure

### New files

- `public/models/chatterbox-multilingual/` — model weight directory (replaces `chatterbox-turbo/` after cutover)
  - `speech_encoder.onnx` + `_data` (~592 MB)
  - `embed_tokens.onnx` + `_data` (~68 MB)
  - `language_model_q4f16.onnx` + `_data` (~305 MB)
  - `conditional_decoder.onnx` + `_data` (~540 MB)
  - `tokenizer.json` (~72 kB)
  - `Cangjie5_TC.json` (~1.92 MB) — Chinese character tables
- `src/models/multilingualTokenizer.ts` — new tokenizer for the multilingual BPE format (Whitespace pre-tokenizer, [SPACE] normalizer, language-tag prefixing). Keeps `bpeTokenizer.ts` for any legacy callers but the TTS path no longer uses it.
- `src/models/multilingualTokenizer.test.ts` — unit tests for tokenizer behavior across languages.
- `src/data/chatterboxMultilingualLocales.ts` — the 23 supported language codes + their `[xx]` tag IDs (Arabic, Chinese, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Italian, Japanese, Korean, Malay, Norwegian, Polish, Portuguese, Russian, Spanish, Swahili, Swedish, Turkish).

### Modified files

- `public/models-manifest.json` — replace Turbo entries with multilingual entries.
- `src/models/types.ts` — `CHATTERBOX_FILES` constants point to multilingual; bump `MAX_NEW_TOKENS` if needed; update `MODEL_URLS.tts`.
- `src/models/ttsWorker.ts` — update inference loop: 30-layer KV cache, new `embed_tokens` inputs (`input_ids`, `position_ids`, `exaggeration`), no `position_ids` on LM, language-tag prefix injection.
- `public/tts-gpu-worker.js` — same changes as `ttsWorker.ts` mirrored.
- `src/models/audioCache.ts` — bump `CACHE_DIR` v7 → v8.
- `src/models/integrityCheck.ts` (if it has model-name asserts) — point at new model files.
- `src/data/chatterboxLocales.ts` — replace English-only allowlist with the multilingual 23-language allowlist. Delete the file if it becomes a single-line re-export of `chatterboxMultilingualLocales`.
- `CLAUDE.md` — update model description, sizes, language coverage.
- Auto-memory files — update `project_model_stack.md` and `project_provider_english_only.md` to reflect the swap.

### Deleted (after cutover validates)

- `public/models/chatterbox-turbo/` directory (~1.27 GB on disk).
- `src/models/bpeTokenizer.ts` if no other callers — the LFM2 LLM also uses GPT-2 BPE so this likely stays.

---

## Risk register

These are the unknowns that could blow up the timeline. Each one has a Phase 1 task to de-risk before deeper changes.

1. **Tokenizer parity risk.** New format is BPE but with Whitespace pre-tokenizer + [SPACE] normalizer + language-tag injection. Reusing the merge/vocab logic from `bpeTokenizer.ts` is realistic but the pre-tokenizer/normalizer paths differ enough that a from-scratch port is the right move (~half a day of work).
2. **WebGPU ConvTranspose artifacts.** The current Turbo conditional decoder runs on WASM specifically because the WebGPU q4f16 variant produces artifacts. The multilingual decoder is full-precision (no q4f16 export available), which may behave differently on WebGPU. Phase 5.2 explicitly listening-tests this.
3. **Pre-gen latency.** 30-layer LM + larger conditional decoder = slower per-phrase synth. Pre-gen budget in `audioCacheRunner` may need adjustment.
4. **iPad memory pressure.** A16 iPads have ~6 GB RAM total, app currently needs ~1.1 GB resident. New model is ~1.5 GB on disk; runtime resident footprint likely ~600 MB (LM + decoder always loaded; speech encoder unloaded after enrollment). Should fit but worth measuring.
5. **`prepare_language` exact semantics.** The reference Python is `text = prepare_language(text, language_id)`. We've inferred this prepends `[xx]` from the supported-languages list, but Phase 1 task 1.5 verifies this against the actual chatterbox PyTorch source.
6. **Speech encoder embedding compatibility.** Patient embeddings extracted on the Turbo speech encoder may not work on the multilingual one (different model). Existing patients will need to re-enroll. Phase 6.2 documents this and forces re-enrollment.

---

## Phase 1: Foundation & de-risk

### Task 1.1: Download multilingual model files to public/

**Files:**
- Create: `public/models/chatterbox-multilingual/` (directory)
- Modify: `scripts/download-models.sh` (add multilingual download block)

- [ ] **Step 1: Inspect the existing download script to match its style**

```bash
cat scripts/download-models.sh
```

Expected: a shell script that uses `curl` or `huggingface-cli` against `ResembleAI/chatterbox-turbo-ONNX`. Use the same pattern.

- [ ] **Step 2: Add a multilingual download block**

In `scripts/download-models.sh`, append (or create a sibling block in the same style):

```bash
# Chatterbox Multilingual ONNX (23 languages, ~1.5 GB)
MULTI_DIR="public/models/chatterbox-multilingual"
mkdir -p "$MULTI_DIR"
HF_REPO="onnx-community/chatterbox-multilingual-ONNX"

for f in \
  "onnx/speech_encoder.onnx" \
  "onnx/speech_encoder.onnx_data" \
  "onnx/embed_tokens.onnx" \
  "onnx/embed_tokens.onnx_data" \
  "onnx/language_model_q4f16.onnx" \
  "onnx/language_model_q4f16.onnx_data" \
  "onnx/conditional_decoder.onnx" \
  "onnx/conditional_decoder.onnx_data" \
  "tokenizer.json" \
  "Cangjie5_TC.json"
do
  out="$MULTI_DIR/$(basename "$f")"
  if [ ! -f "$out" ]; then
    echo "Downloading $f..."
    curl -fL "https://huggingface.co/$HF_REPO/resolve/main/$f" -o "$out"
  fi
done
```

- [ ] **Step 3: Run the download**

```bash
bash scripts/download-models.sh
```

Expected: ~1.5 GB downloaded into `public/models/chatterbox-multilingual/`. Total runtime depends on connection — budget 10-30 minutes on a typical hospital network.

- [ ] **Step 4: Verify file sizes match expected**

```bash
ls -la public/models/chatterbox-multilingual/
```

Expected sizes (approximate, regen task in Phase 1.3 will pin them):
- `speech_encoder.onnx`: ~1.18 MB; `_data`: ~591 MB
- `embed_tokens.onnx`: ~13 kB; `_data`: ~68 MB
- `language_model_q4f16.onnx`: ~229 kB; `_data`: ~305 MB
- `conditional_decoder.onnx`: ~6.35 MB; `_data`: ~534 MB
- `tokenizer.json`: ~72 kB
- `Cangjie5_TC.json`: ~1.92 MB

- [ ] **Step 5: Commit**

```bash
git add scripts/download-models.sh
git commit -m "chore(models): add chatterbox-multilingual download script"
```

The actual model files in `public/models/` are gitignored (via existing `.gitignore` rules covering `public/models/*/*.onnx`); the script change is the commit.

---

### Task 1.2: Inspect ONNX inputs/outputs to confirm contract

**Files:**
- (No code change — pure investigation. Findings inform Tasks 3.1 and 4.3.)

- [ ] **Step 1: Inspect each ONNX file with python3**

Run each command and record output. The inspection commands accept the file paths as positional arguments — no shell-interpolated user input.

```bash
python3 -c "import sys, onnx; m = onnx.load(sys.argv[1], load_external_data=False); print('INPUTS:'); [print(f'  {i.name}: dtype={i.type.tensor_type.elem_type} shape={[d.dim_value or d.dim_param for d in i.type.tensor_type.shape.dim]}') for i in m.graph.input]; print('OUTPUTS:'); [print(f'  {o.name}: dtype={o.type.tensor_type.elem_type} shape={[d.dim_value or d.dim_param for d in o.type.tensor_type.shape.dim]}') for o in m.graph.output]" public/models/chatterbox-multilingual/embed_tokens.onnx
```

Repeat with each of: `speech_encoder.onnx`, `language_model_q4f16.onnx`, `conditional_decoder.onnx`.

- [ ] **Step 2: Record findings as a comment block in `src/models/types.ts`**

Add the captured input/output lists as a block comment at the top of `types.ts` so future contributors don't have to re-discover the contract. Specifically pin: KV-cache dtype, KV-cache shape, exaggeration dtype, position_ids dtype.

- [ ] **Step 3: No commit yet** — this task feeds Task 3.1, which lands the constants atomically.

---

### Task 1.3: Add multilingual entries to manifest

**Files:**
- Modify: `public/models-manifest.json` (add entries; do NOT remove Turbo yet — parallel structure for safe cutover)

- [ ] **Step 1: Add a `tts-multilingual` block to the manifest**

Edit `public/models-manifest.json`. Add a new top-level model entry alongside the existing `tts`:

```json
"tts-multilingual": {
  "baseUrl": "/models/chatterbox-multilingual/",
  "files": [
    { "name": "speech_encoder.onnx", "size": 0, "magic": "onnx" },
    { "name": "speech_encoder.onnx_data", "size": 0, "magic": null },
    { "name": "embed_tokens.onnx", "size": 0, "magic": "onnx" },
    { "name": "embed_tokens.onnx_data", "size": 0, "magic": null },
    { "name": "language_model_q4f16.onnx", "size": 0, "magic": "onnx" },
    { "name": "language_model_q4f16.onnx_data", "size": 0, "magic": null },
    { "name": "conditional_decoder.onnx", "size": 0, "magic": "onnx" },
    { "name": "conditional_decoder.onnx_data", "size": 0, "magic": null },
    { "name": "tokenizer.json", "size": 0, "magic": "json" },
    { "name": "Cangjie5_TC.json", "size": 0, "magic": "json" }
  ]
}
```

The `size: 0` placeholders are intentional — the regen script populates real sizes on the next step.

- [ ] **Step 2: Run manifest regen to populate sizes**

```bash
npm run manifest:regen
```

Expected: rewrites `models-manifest.json` with actual file sizes for every entry, including the new multilingual block.

- [ ] **Step 3: Verify the regen succeeded**

```bash
npm run manifest:check
```

Expected: "models-manifest.json is up to date."

- [ ] **Step 4: Commit**

```bash
git add public/models-manifest.json
git commit -m "chore(manifest): register chatterbox-multilingual model files"
```

---

### Task 1.4: Verify integrity check + offline primer paths still work for the new model

**Files:**
- Modify: `src/models/integrityCheck.ts` (only if its model list is hardcoded)
- Modify: `src/models/resumableDownload.ts` (only if its endpoint list is hardcoded)

- [ ] **Step 1: Audit integrity check for hardcoded model names**

```bash
grep -n "chatterbox-turbo\|tts-multilingual\|tts\b" src/models/integrityCheck.ts src/models/resumableDownload.ts src/models/bootModels.ts
```

Expected: most references should be by `ModelId` ("tts" / "llm" / "stt") or read from manifest dynamically. If anything hardcodes `chatterbox-turbo`, fix it to either read from `MODEL_URLS.tts` or use the manifest's `baseUrl`.

- [ ] **Step 2: If any hardcoded names found, replace with manifest lookups**

Show example fix if needed:

```typescript
// Before:
const url = "/models/chatterbox-turbo/" + filename;

// After:
const manifest = await loadManifest();
const url = manifest.models.tts.baseUrl + filename;
```

- [ ] **Step 3: Run the manifest integrity test**

```bash
npx vitest run --reporter=verbose 2>&1 | grep -i "manifest\|integrity"
```

Expected: existing `manifestIntegrity` test still passes.

- [ ] **Step 4: Commit if any changes were needed**

```bash
git add -A
git commit -m "refactor(models): drop hardcoded chatterbox-turbo paths in favor of manifest lookups"
```

If no changes were needed, skip the commit and proceed to Phase 2.

---

### Task 1.5: Resolve `prepare_language` semantics

**Files:**
- Document the finding inline in `src/models/multilingualTokenizer.ts` (created in Phase 2)

- [ ] **Step 1: Fetch the upstream chatterbox PyTorch source for prepare_language**

```bash
curl -s "https://raw.githubusercontent.com/resemble-ai/chatterbox/master/src/chatterbox/mtl_tts.py" | head -200
```

Look for a `prepare_language` or `prepare_text` function. If not in `mtl_tts.py`, try `https://raw.githubusercontent.com/resemble-ai/chatterbox/master/src/chatterbox/text/prepare_language.py` or grep the repo via the GitHub web search.

- [ ] **Step 2: Document the actual behavior in this plan as a note for Phase 2 reference**

Record the exact transformation (likely `f"[{language_id}] {text}"` with normalization). Update Phase 2 Task 2.3 with the exact format if it differs from `[xx] text`. This task has no code change — it's a 5-minute research note that prevents a wrong implementation in Phase 2.

---

## Phase 2: Multilingual tokenizer

### Task 2.1: Write a failing test for the new tokenizer (RED)

**Files:**
- Create: `src/models/multilingualTokenizer.test.ts`

- [ ] **Step 1: Write the first test**

```typescript
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { buildMultilingualTokenizer } from "./multilingualTokenizer";

const TOKENIZER_JSON = JSON.parse(
  readFileSync("public/models/chatterbox-multilingual/tokenizer.json", "utf8"),
);

describe("multilingualTokenizer", () => {
  test("encodes a known English language tag to its dedicated id", () => {
    const tok = buildMultilingualTokenizer(TOKENIZER_JSON);
    const ids = tok.encode("[en] Hello");
    expect(ids[0]).toBe(708); // [en] tag id from tokenizer.json added_tokens
    expect(ids[ids.length - 1]).toBe(0); // [STOP] is appended by post-processor
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/models/multilingualTokenizer.test.ts
```

Expected: FAIL with "Cannot find module './multilingualTokenizer'" or "buildMultilingualTokenizer is not a function".

---

### Task 2.2: Implement minimal tokenizer to pass the first test (GREEN)

**Files:**
- Create: `src/models/multilingualTokenizer.ts`

- [ ] **Step 1: Implement the minimal tokenizer**

```typescript
/**
 * Multilingual Chatterbox BPE tokenizer.
 *
 * Differences from the Turbo GPT-2 BPE in src/models/bpeTokenizer.ts:
 *   1. Whitespace pre-tokenizer (split on spaces only) — no GPT-2 regex.
 *   2. Replace-spaces normalizer: spaces become a [SPACE] special token (id 2).
 *   3. Language-tag injection: prepend [en] / [fr] / [zh] / etc. to the
 *      input text before encoding (handled by prepareLanguage() helper).
 *   4. Vocab is ~2,453 tokens vs Turbo's ~50,000 (much smaller; ~30 kB JSON).
 *   5. [STOP] is id 0, [START] is id 255 — special tokens at low IDs.
 */

interface TokenizerJSON {
  model: { vocab: Record<string, number>; merges: string[] };
  added_tokens?: Array<{ content: string; id: number; special?: boolean }>;
  post_processor?: { type: string; single?: Array<unknown> };
}

export interface MultilingualTokenizer {
  encode: (text: string) => number[];
  decode: (ids: number[]) => string;
}

const SPACE_TOKEN_ID = 2; // [SPACE]
const STOP_TOKEN_ID = 0;  // [STOP]

export function buildMultilingualTokenizer(
  json: TokenizerJSON,
): MultilingualTokenizer {
  const vocab = new Map<string, number>(Object.entries(json.model.vocab));
  const mergeRanks = new Map<string, number>();
  for (let i = 0; i < json.model.merges.length; i++) {
    const m = json.model.merges[i];
    const key = Array.isArray(m) ? (m as string[]).join(" ") : m;
    mergeRanks.set(key as string, i);
  }

  const addedTokens = new Map<string, number>();
  const idToToken = new Map<number, string>();
  for (const t of json.added_tokens ?? []) {
    addedTokens.set(t.content, t.id);
    idToToken.set(t.id, t.content);
  }
  for (const [tok, id] of vocab.entries()) idToToken.set(id, tok);

  const addedPattern = addedTokens.size
    ? new RegExp(
        `(${Array.from(addedTokens.keys())
          .sort((a, b) => b.length - a.length)
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")})`,
      )
    : null;

  return {
    encode(text: string): number[] {
      const ids: number[] = [];
      const segments = addedPattern ? text.split(addedPattern) : [text];

      for (const segment of segments) {
        if (segment === "") continue;
        const specialId = addedTokens.get(segment);
        if (specialId !== undefined) {
          ids.push(specialId);
          continue;
        }
        // Whitespace pre-tokenizer: split on spaces, emit [SPACE] between words.
        const words = segment.split(/\s+/).filter((w) => w.length > 0);
        for (let wi = 0; wi < words.length; wi++) {
          if (wi > 0) ids.push(SPACE_TOKEN_ID);
          // BPE on the word's characters
          const chars = [...words[wi]];
          const merged = applyBPE(chars, mergeRanks);
          for (const tok of merged) {
            const id = vocab.get(tok);
            if (id !== undefined) ids.push(id);
          }
        }
      }
      ids.push(STOP_TOKEN_ID);
      return ids;
    },

    decode(ids: number[]): string {
      const out: string[] = [];
      for (const id of ids) {
        if (id === STOP_TOKEN_ID) break;
        if (id === SPACE_TOKEN_ID) {
          out.push(" ");
          continue;
        }
        const tok = idToToken.get(id);
        if (tok && !tok.startsWith("[")) out.push(tok);
      }
      return out.join("");
    },
  };
}

function applyBPE(chars: string[], ranks: Map<string, number>): string[] {
  if (chars.length <= 1) return chars;
  let word = [...chars];
  while (word.length > 1) {
    let best: [string, string, number] | null = null;
    for (let i = 0; i < word.length - 1; i++) {
      const r = ranks.get(`${word[i]} ${word[i + 1]}`);
      if (r !== undefined && (!best || r < best[2])) best = [word[i], word[i + 1], r];
    }
    if (!best) break;
    const [l, r] = best;
    const next: string[] = [];
    for (let i = 0; i < word.length;) {
      if (i < word.length - 1 && word[i] === l && word[i + 1] === r) {
        next.push(l + r);
        i += 2;
      } else {
        next.push(word[i]);
        i++;
      }
    }
    word = next;
  }
  return word;
}
```

- [ ] **Step 2: Run the test to verify it passes**

```bash
npx vitest run src/models/multilingualTokenizer.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/models/multilingualTokenizer.ts src/models/multilingualTokenizer.test.ts
git commit -m "feat(tts): add multilingual BPE tokenizer with [SPACE] handling"
```

---

### Task 2.3: Add `prepareLanguage` helper

**Files:**
- Modify: `src/models/multilingualTokenizer.ts`
- Modify: `src/models/multilingualTokenizer.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `multilingualTokenizer.test.ts`:

```typescript
import { prepareLanguage } from "./multilingualTokenizer";

describe("prepareLanguage", () => {
  test("prepends a language tag to the text", () => {
    expect(prepareLanguage("Bonjour le monde", "fr")).toBe("[fr] Bonjour le monde");
  });

  test("rejects unsupported language codes", () => {
    expect(() => prepareLanguage("hi", "xyz")).toThrow(/unsupported language/i);
  });
});
```

- [ ] **Step 2: Run to verify red**

```bash
npx vitest run src/models/multilingualTokenizer.test.ts -t prepareLanguage
```

Expected: FAIL — `prepareLanguage` not exported.

- [ ] **Step 3: Implement `prepareLanguage`**

Append to `multilingualTokenizer.ts`:

```typescript
/** Languages supported by chatterbox-multilingual. Each gets a [xx] tag id
 *  in the tokenizer's added_tokens. */
export const SUPPORTED_LANGUAGES = new Set([
  "ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it", "ja",
  "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh",
]);

/** Prepend the language-tag prefix the model expects. Mirrors the upstream
 *  Python `prepare_language(text, language_id)`. The tokenizer recognizes
 *  [en] / [fr] / [zh] / etc. as dedicated added_tokens. */
export function prepareLanguage(text: string, languageId: string): string {
  if (!SUPPORTED_LANGUAGES.has(languageId)) {
    throw new Error(
      `Unsupported language: ${languageId}. Supported: ${Array.from(SUPPORTED_LANGUAGES).sort().join(", ")}`,
    );
  }
  return `[${languageId}] ${text}`;
}
```

- [ ] **Step 4: Run to verify green**

```bash
npx vitest run src/models/multilingualTokenizer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/models/multilingualTokenizer.ts src/models/multilingualTokenizer.test.ts
git commit -m "feat(tts): add prepareLanguage helper with 23-language allowlist"
```

---

### Task 2.4: Round-trip encode/decode tests across languages

- [ ] **Step 1: Add round-trip tests**

Append to `multilingualTokenizer.test.ts`:

```typescript
describe("multilingualTokenizer round-trip", () => {
  const tok = buildMultilingualTokenizer(TOKENIZER_JSON);

  const cases = [
    ["en", "Hello world"],
    ["fr", "Bonjour le monde"],
    ["es", "Hola mundo"],
    ["de", "Hallo Welt"],
    ["ja", "こんにちは"],
    ["zh", "你好"],
  ] as const;

  for (const [lang, phrase] of cases) {
    test(`encodes and decodes ${lang}: ${phrase}`, () => {
      const prepared = prepareLanguage(phrase, lang);
      const ids = tok.encode(prepared);
      expect(ids.length).toBeGreaterThan(0);
      const decoded = tok.decode(ids);
      expect(decoded.trim().toLowerCase()).toContain(phrase.toLowerCase().slice(0, 3));
    });
  }
});
```

- [ ] **Step 2: Run**

```bash
npx vitest run src/models/multilingualTokenizer.test.ts
```

Expected: PASS for all six language cases. If any fail, the tokenizer's BPE coverage may be the issue (e.g., Chinese characters need byte-level handling). Fix per failure — a likely fix is to add a UTF-8 byte-level fallback for unknown chars.

- [ ] **Step 3: Commit**

```bash
git add src/models/multilingualTokenizer.test.ts
git commit -m "test(tts): cover multilingual tokenizer with 6-language round-trip"
```

---

## Phase 3: Inference contract refactor

### Task 3.1: Update SpeakerData and KV cache shape constants in `src/models/types.ts`

**Files:**
- Modify: `src/models/types.ts`

- [ ] **Step 1: Update CHATTERBOX_FILES to point at the multilingual model**

```typescript
export const CHATTERBOX_FILES = {
  speechEncoder: { onnx: "speech_encoder.onnx", data: "speech_encoder.onnx_data" },
  embedTokens: { onnx: "embed_tokens.onnx", data: "embed_tokens.onnx_data" },
  languageModel: { onnx: "language_model_q4f16.onnx", data: "language_model_q4f16.onnx_data" },
  conditionalDecoder: { onnx: "conditional_decoder.onnx", data: "conditional_decoder.onnx_data" },
  tokenizer: "tokenizer.json",
} as const;
```

- [ ] **Step 2: Update CHATTERBOX_TOKENS for the new architecture**

```typescript
export const CHATTERBOX_TOKENS = {
  // Special token IDs from the multilingual tokenizer (tokenizer.json added_tokens).
  STOP: 0,
  UNK: 1,
  SPACE: 2,
  START: 255,
  // Speech-side tokens (post-LM). Verify these against the actual model
  // outputs in Task 4.2 — the multilingual LM has a different speech vocab.
  START_SPEECH: 6561,
  STOP_SPEECH: 6562,
  MAX_NEW_TOKENS: 1024,
  SAMPLE_RATE: 24000,
  // LM architecture (Llama, 30 layers vs Turbo's 24-layer GPT-2).
  NUM_LAYERS: 30,
  NUM_HEADS: 16,
  HEAD_DIM: 64,
} as const;
```

- [ ] **Step 3: Update MODEL_URLS**

```typescript
export const MODEL_URLS = {
  tts: "/models/chatterbox-multilingual/",
  llm: "/models/lfm2-1.2b-instruct/",
  stt: "/models/whisper-small/",
} as const;
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: errors in `ttsWorker.ts` / `tts-gpu-worker.js` references — those get fixed in Phase 4 / 5. The types file itself should compile clean.

- [ ] **Step 5: Commit**

```bash
git add src/models/types.ts
git commit -m "refactor(types): point CHATTERBOX_FILES at multilingual + 30-layer LM constants"
```

---

## Phase 4: WASM worker swap

### Task 4.1: Switch tokenizer load + add language injection

**Files:**
- Modify: `src/models/ttsWorker.ts`

- [ ] **Step 1: Replace BPE tokenizer import + loader**

In `ttsWorker.ts`, change:

```typescript
// OLD:
const { buildBPETokenizer } = await import("./bpeTokenizer");
tokenizer = buildBPETokenizer(json);
```

to:

```typescript
const { buildMultilingualTokenizer, prepareLanguage } = await import("./multilingualTokenizer");
tokenizer = buildMultilingualTokenizer(json);
```

Also store `prepareLanguage` as a module-level helper alongside `tokenizer`:

```typescript
let tokenizer: { encode: (text: string) => number[] } | null = null;
let prepareLanguage: ((text: string, lang: string) => string) | null = null;

// inside loadTokenizer:
const mod = await import("./multilingualTokenizer");
tokenizer = mod.buildMultilingualTokenizer(json);
prepareLanguage = mod.prepareLanguage;
```

- [ ] **Step 2: Update the `embed` and `synthesize` message types to carry languageId**

```typescript
type WorkerRequest =
  | { type: "init"; modelUrl: string }
  | { type: "embed"; audio: Float32Array; sampleRate: number }
  | { type: "synthesize"; text: string; speakerData: SpeakerData; languageId: string; exaggeration?: number };
```

The `languageId` is required (no fallback — caller must pass it). `exaggeration` defaults to 0.5.

- [ ] **Step 3: Tokenize with language prefix**

In `handleSynthesize`:

```typescript
if (!tokenizer || !prepareLanguage) throw new Error("Tokenizer not loaded");

const preparedText = prepareLanguage(text, languageId);
const inputIds = tokenizer.encode(preparedText);
```

- [ ] **Step 4: Build (expect typecheck errors in the next task's KV cache code)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Don't commit yet — Task 4.2 lands the KV cache change atomically.

---

### Task 4.2: Update embed_tokens call signature (add position_ids + exaggeration)

**Files:**
- Modify: `src/models/ttsWorker.ts`

- [ ] **Step 1: Update the first embed_tokens call**

Replace:

```typescript
const embedResult = await embedTokensSession.run({ [idsName]: inputIdsTensor });
```

with:

```typescript
// Multilingual embed_tokens takes (input_ids, position_ids, exaggeration).
// position_ids are 0..N-1 for the prepared input; exaggeration is a scalar.
const positionIds = Array.from({ length: inputIds.length }, (_, i) => i);
const positionIdsTensor = intTensor(positionIds, [1, inputIds.length]);
const exaggerationTensor = new ort.Tensor("float32", new Float32Array([exaggeration ?? 0.5]), [1]);

const embedResult = await embedTokensSession.run({
  input_ids: inputIdsTensor,
  position_ids: positionIdsTensor,
  exaggeration: exaggerationTensor,
});
```

- [ ] **Step 2: Update the per-step embed_tokens call inside the autoregressive loop**

The reference Python increments position_ids per generation step. Mirror that:

```typescript
// In the generation loop, after each new speech token:
const stepPositionTensor = intTensor([step + 1], [1, 1]);
const nextEmbedResult = await embedTokensSession.run({
  input_ids: nextTokenTensor,
  position_ids: stepPositionTensor,
  exaggeration: exaggerationTensor, // reuse same scalar across steps
});
```

- [ ] **Step 3: Build**

```bash
npx tsc --noEmit
```

Expected: still errors in language_model section — fixed in 4.3.

---

### Task 4.3: Update language_model call (30-layer KV cache, no position_ids input)

**Files:**
- Modify: `src/models/ttsWorker.ts`

- [ ] **Step 1: Update KV cache initialization (24 → 30 layers)**

Replace the cache-seeding loop (uses `NUM_LAYERS` constant):

```typescript
import { CHATTERBOX_TOKENS } from "./types";
const { NUM_LAYERS, NUM_HEADS, HEAD_DIM } = CHATTERBOX_TOKENS;

// in handleSynthesize:
for (let i = 0; i < NUM_LAYERS; i++) {
  lmInputs[`past_key_values.${i}.key`] = new ort.Tensor(
    "float32", // multilingual LM uses float32 KV cache; verify with Task 1.2 inspection
    new Float32Array(0),
    [1, NUM_HEADS, 0, HEAD_DIM],
  );
  lmInputs[`past_key_values.${i}.value`] = new ort.Tensor(
    "float32",
    new Float32Array(0),
    [1, NUM_HEADS, 0, HEAD_DIM],
  );
}
```

The dtype change from `float16` to `float32` is conditional on what Task 1.2 inspection found. If multilingual LM uses fp16 KV cache, keep `Uint16Array` and `"float16"`.

- [ ] **Step 2: Drop `position_ids` from the LM input set**

The multilingual Llama LM does NOT take a `position_ids` input — positions are absorbed by the embed_tokens step. Remove:

```typescript
// REMOVE these lines that built positionIds for the LM call:
const positionIds = intTensor(Array.from({ length: totalLen }, (_, i) => i), [1, totalLen]);
// ...
[posName]: positionIds,
```

The LM input set is now just `inputs_embeds`, `attention_mask`, and the 60 `past_key_values.*` tensors.

- [ ] **Step 3: Verify the speech-token mask is still correct**

The multilingual LM's speech token vocab may differ. Inspect:

```bash
python3 -c "import sys, onnx; m = onnx.load(sys.argv[1], load_external_data=False); [print(o.name, [d.dim_value or d.dim_param for d in o.type.tensor_type.shape.dim]) for o in m.graph.output]" public/models/chatterbox-multilingual/language_model_q4f16.onnx
```

If the `logits` last-dim differs from Turbo's 6563, update `START_SPEECH_TOKEN` / `STOP_SPEECH_TOKEN` in `types.ts` accordingly. Then update the masking logic in the generation loop.

- [ ] **Step 4: Build & test**

```bash
npx tsc --noEmit && npx vitest run src/models/multilingualTokenizer.test.ts
```

Expected: TS clean. Tokenizer tests pass.

- [ ] **Step 5: Commit the worker rewrite**

```bash
git add src/models/ttsWorker.ts
git commit -m "feat(tts-wasm): switch worker to chatterbox-multilingual inference contract"
```

---

### Task 4.4: End-to-end synth integration test (gated)

**Files:**
- Modify: `src/models/ttsWorker.test.ts` (if it has integration tests)

- [ ] **Step 1: Run existing TTS worker tests**

```bash
npx vitest run src/models/ttsWorker.test.ts
```

Expected: most pass. Any that asserted on Turbo-specific tokenizer outputs (e.g., `[narration]` token id 50263) will fail and need updating to multilingual equivalents.

- [ ] **Step 2: Update any failing tests inline**

Replace Turbo-specific assertions with multilingual equivalents. Example:

```typescript
// Before (Turbo-era):
expect(ids).toContain(50263); // [narration]
// After (multilingual):
expect(ids[0]).toBe(708); // [en] language tag
```

- [ ] **Step 3: Commit**

```bash
git add src/models/ttsWorker.test.ts
git commit -m "test(tts-wasm): update worker tests for multilingual contract"
```

---

## Phase 5: GPU worker swap

### Task 5.1: Mirror Phase 4 changes in the GPU worker

**Files:**
- Modify: `public/tts-gpu-worker.js`

- [ ] **Step 1: Mirror tokenizer load + language prefix injection**

Same edits as Task 4.1, ported to the JS worker. The GPU worker imports differ — uses dynamic ESM imports.

```javascript
// In the tokenizer load section:
const tokenizerModule = await import("/src/models/multilingualTokenizer.ts");
tokenizer = tokenizerModule.buildMultilingualTokenizer(tokenizerJson);
const prepareLanguage = tokenizerModule.prepareLanguage;
```

If Vite's import path resolution can't reach a TS file from a static-served JS worker, copy `multilingualTokenizer.ts` into a sibling `multilingualTokenizer.js` for the GPU worker to consume, or precompile via Vite. Phase 5.1's first task is to confirm which approach works.

- [ ] **Step 2: Mirror embed_tokens contract change (add position_ids, exaggeration)**

Same shape as Task 4.2 but using the WebGPU int32 tensor names (`input_ids_int32`, `position_ids_int32`).

- [ ] **Step 3: Mirror LM call (30 layers, no position_ids)**

Same as Task 4.3.

- [ ] **Step 4: Build the dev server and load the app**

```bash
npm run dev
```

Visit http://localhost:3000. With patient enrolled, the GPU worker initializes and synthesizes the first phrase. Watch the console for any errors — particularly around input shape mismatches in embed_tokens or LM.

- [ ] **Step 5: Commit**

```bash
git add public/tts-gpu-worker.js
git commit -m "feat(tts-gpu): switch GPU worker to chatterbox-multilingual inference contract"
```

---

### Task 5.2: De-risk WebGPU ConvTranspose for multilingual conditional_decoder

**Files:**
- Modify: `public/tts-gpu-worker.js` (force WASM EP for the decoder if artifacts found)

- [ ] **Step 1: Listen-test a synthesized phrase via the GPU worker**

In the running dev server, tap a cached phrase. Listen for buzziness or metallic artifacts on plosives (the same failure mode that forced Turbo's decoder onto WASM).

- [ ] **Step 2: If artifacts present, force WASM for the decoder**

In `tts-gpu-worker.js`, the conditional decoder load already takes a `wasmOnly` parameter. The Turbo path explicitly forces WASM. Mirror that:

```javascript
conditionalDecoderSession = await createSession(
  baseUrl + "conditional_decoder.onnx",
  /* hasExternalData */ true,
  /* wasmOnly */ true,
);
```

If artifacts are absent, leave it on WebGPU for the speed win.

- [ ] **Step 3: Document the decision in a comment**

Add a one-line comment above the createSession call explaining whether the decoder runs on WASM or WebGPU and why. Reference: Re-evaluate if Resemble publishes a q4f16 conditional_decoder for multilingual (would shrink the file by ~370 MB and may resolve any WebGPU artifacts).

- [ ] **Step 4: Commit**

```bash
git add public/tts-gpu-worker.js
git commit -m "fix(tts-gpu): pin conditional_decoder to WASM for multilingual model"
```

---

## Phase 6: Wire-up

### Task 6.1: Bump audio cache version

**Files:**
- Modify: `src/models/audioCache.ts`

- [ ] **Step 1: Bump CACHE_DIR**

```typescript
// v3 → v4: relaxed post-process LP from 2×7 kHz to 1×9 kHz.
// v4 → v5: lowered TEMPERATURE 0.8 → 0.6.
// v5 → v6: prepended [narration] (REVERTED).
// v6 → v7: rolled back the [narration] prefix.
// v7 → v8: swapped Chatterbox Turbo (English-only) → Chatterbox Multilingual
//          (23 languages, exaggeration runtime input). All cached audio
//          regenerates because the entire model changed, not just one knob.
const CACHE_DIR = "audio-cache-v8";
```

- [ ] **Step 2: Commit**

```bash
git add src/models/audioCache.ts
git commit -m "chore(cache): bump v7 → v8 for multilingual model swap"
```

---

### Task 6.2: Force re-enrollment for existing patients (speech-encoder mismatch)

**Files:**
- Modify: `src/stores/settingsStore.ts` (or wherever speakerData is hydrated)

- [ ] **Step 1: Add a one-time migration that nulls speakerData on hydration**

The Turbo speech encoder's output embeddings won't work in the multilingual conditional decoder. Existing patients must re-enroll. Add a migration step:

```typescript
// In settingsStore.ts, alongside the existing rehydration:
// One-time migration: clearing speakerData forces re-enrollment.
// Patient.hasVoice flips to false; the UI then shows "Record" again.
const MIGRATION_VERSION_KEY = "ov-migration-v";
const TARGET_MIGRATION = 1;

function migrateForMultilingualSwap(state: SettingsState): SettingsState {
  const stored = parseInt(localStorage.getItem(MIGRATION_VERSION_KEY) ?? "0", 10);
  if (stored >= TARGET_MIGRATION) return state;

  const cfg = state.cfg;
  if (!cfg) return state;
  const patients = cfg.patients?.map((p) => ({ ...p, speakerData: null, hasVoice: false }));
  const providers = cfg.providers?.map((p) => ({ ...p, embedding: undefined, hasVoice: false }));

  localStorage.setItem(MIGRATION_VERSION_KEY, String(TARGET_MIGRATION));
  return { ...state, cfg: { ...cfg, patients, providers }, speakerData: null };
}
```

Wire this into the zustand persist `onRehydrateStorage` callback.

- [ ] **Step 2: Add a UI banner explaining the re-enrollment requirement**

In Settings → Patient, when `patient.hasVoice === false` and the migration just ran, show a one-time banner:

> "We've upgraded the voice model to support 23 languages. Please re-record your voice — your previous recording isn't compatible with the new model."

Sets a `dismissed` flag in localStorage so it doesn't reappear after dismissal.

- [ ] **Step 3: Tests**

Add a test in `settingsStore.test.ts`:

```typescript
test("migration v1 nulls speakerData and hasVoice", () => {
  // Arrange: persisted state with a patient who has a voice.
  // Act: trigger rehydration.
  // Assert: speakerData === null, hasVoice === false.
});
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): migrate persisted state to clear Turbo embeddings + prompt re-enroll"
```

---

### Task 6.3: Plumb languageId + exaggeration through the call chain

**Files:**
- Modify: `src/speak.ts`
- Modify: `src/hooks/useSpeakActions.ts`
- Modify: `src/models/ttsEngine.ts`
- Modify: `src/models/audioCacheRunner.ts` (whichever orchestrates pre-gen)

- [ ] **Step 1: Add languageId + exaggeration to the speak() signature**

```typescript
// speak.ts
export async function speak(
  text: string,
  speaker: Speaker,
  opts?: { exaggeration?: number },
): Promise<void> { /* ... */ }
```

The `languageId` is already on `Speaker.lang` — reuse that. `exaggeration` defaults to `0.5` if not supplied.

- [ ] **Step 2: Update useSpeakActions.speakAsPatient + speakAsProvider**

No signature change to consumers — patient speaks in `caregiverLang`, provider in `patientLang`, exaggeration stays at 0.5 default. Just thread the arg through.

- [ ] **Step 3: Update synthesizeGPU + WASM worker postMessage shape**

Both now take `languageId` and `exaggeration` in the synthesize message.

- [ ] **Step 4: Update audioCache pre-gen runner to pass languageId**

Pre-gen knows each phrase's locale from the caller (`cfg.patientLang` or `cfg.caregiverLang`). Pass it through to `synthesizeGPU`.

- [ ] **Step 5: Verify by running**

```bash
npm run dev
```

Tap a phrase, hear the voice clone in the patient's locale.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(tts): plumb languageId + exaggeration through speak() and pre-gen"
```

---

### Task 6.4: Update locale gating

**Files:**
- Modify: `src/data/chatterboxLocales.ts`

- [ ] **Step 1: Replace English-only allowlist with multilingual 23-language list**

```typescript
const SUPPORTED_LOCALES = new Set([
  "ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it", "ja",
  "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh",
]);

export function canCloneForLocale(locale: string): boolean {
  if (!locale) return false;
  const base = locale.split("-")[0].toLowerCase();
  return SUPPORTED_LOCALES.has(base);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/chatterboxLocales.ts
git commit -m "feat(locales): unlock 23 languages for cross-lingual cloning"
```

---

## Phase 7: Validation

### Task 7.1: English baseline regression test (listening)

- [ ] **Step 1: Re-enroll the English patient voice**

In Settings → Patient, record the Rainbow Passage in a calm/even tone (per the tone hint in the recording UI).

- [ ] **Step 2: Listen to a known phrase**

Tap "I need water" or similar. Compare to the prior Turbo render (in your memory or a recording).

Expected: similar quality or better. The multilingual model has more parameters (500M vs 350M) so quality should be at least as good. If perceptibly worse, escalate to debugging Phase 7.5 below.

- [ ] **Step 3: Document the comparison**

Note in commit message or PR description.

---

### Task 7.2: Cross-lingual cloning test

- [ ] **Step 1: Add a non-English patient locale**

Settings → Patient → set patientLang to `es` (Spanish). Add a Spanish phrase in the registry or use an existing one if present.

- [ ] **Step 2: Tap a Spanish phrase**

Listen for: Spanish pronunciation of the patient's voice (cross-lingual transfer). Should sound like a Spanish-speaking version of the user, not English-accented Spanish.

- [ ] **Step 3: Repeat for French, Japanese, Chinese**

Each test confirms the language-tag prefix injection works correctly. Failures here mean either `prepareLanguage` is wrong or the tokenizer's language-tag handling is wrong.

- [ ] **Step 4: Document results**

---

### Task 7.3: Exaggeration knob test

- [ ] **Step 1: Add a one-off debug button (re-using PR #108's pattern)**

In `PatientInfoSection.tsx`, temporarily add three buttons that synthesize the same phrase with `exaggeration` ∈ {0.0, 0.5, 1.0}.

- [ ] **Step 2: Listen to all three**

Expected: 0.0 sounds neutral/generic, 0.5 sounds normal, 1.0 sounds more expressive/dramatic. If all three sound identical, the exaggeration plumbing is broken.

- [ ] **Step 3: Remove the debug buttons** (don't ship)

---

### Task 7.4: Pre-gen budget check

- [ ] **Step 1: Watch a fresh pre-gen run**

In dev console, observe the time-per-phrase logs. Compare to the Turbo baseline (typical was sub-second on M5 GPU).

- [ ] **Step 2: If significantly slower, bump pre-gen timeouts**

In `audioCache.ts` or wherever pre-gen budgets live, double the per-phrase timeout to absorb the larger model. Document the new budget with a comment.

- [ ] **Step 3: Commit any timeout changes**

```bash
git add -A
git commit -m "fix(cache): bump pre-gen timeouts to accommodate multilingual model latency"
```

---

## Phase 8: Cleanup

### Task 8.1: Delete Turbo model files and Turbo-specific code

**Files:**
- Delete: `public/models/chatterbox-turbo/` (and its entries from manifest)
- Delete: `src/models/bpeTokenizer.ts` IF the LFM2 LLM doesn't use it
- Delete: `src/models/bpeTokenizer.test.ts` IF the helper is deleted

- [ ] **Step 1: Confirm no other module imports `bpeTokenizer`**

```bash
grep -rn "buildBPETokenizer\|bpeTokenizer" src/ public/ 2>/dev/null | grep -v "\.test\.ts"
```

If LFM2 LLM uses it, keep the file. The Whisper STT model has its own tokenization path.

- [ ] **Step 2: Remove Turbo entries from manifest**

Edit `public/models-manifest.json`: delete the `tts` block (the Turbo one) and rename `tts-multilingual` back to `tts` so existing `ModelId` lookups continue to work without further changes.

Run `npm run manifest:check` to confirm clean.

- [ ] **Step 3: Delete Turbo files**

```bash
rm -rf public/models/chatterbox-turbo/
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: all green. If `bpeTokenizer.test.ts` references files that no longer exist, delete the test file too.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(models): drop chatterbox-turbo model and bpeTokenizer (replaced by multilingual)"
```

---

### Task 8.2: Update CLAUDE.md and memory

**Files:**
- Modify: `CLAUDE.md`
- Modify: `~/.claude/projects/.../memory/project_model_stack.md`
- Modify: `~/.claude/projects/.../memory/project_provider_english_only.md`
- Modify: `~/.claude/projects/.../memory/MEMORY.md`

- [ ] **Step 1: Update CLAUDE.md**

Replace the "TTS: Chatterbox Turbo (English only)" lines with multilingual specs. Update size estimates (1.5 GB instead of 561 MB).

- [ ] **Step 2: Update auto-memory**

In `project_model_stack.md`: rewrite the TTS section. In `project_provider_english_only.md`: change the file's framing — cross-lingual provider speech now actually works. Or rename the file (`project_provider_cross_lingual.md`) for clarity. Update `MEMORY.md` index pointers.

- [ ] **Step 3: Commit (CLAUDE.md only — memory is outside the repo)**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for multilingual TTS swap"
```

---

### Task 8.3: Open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/chatterbox-multilingual
```

- [ ] **Step 2: Open PR with the description template**

```bash
gh pr create --title "Swap TTS to chatterbox-multilingual (23 languages + exaggeration)" --body "$(cat <<'EOF'
## Summary
- Replaces Chatterbox Turbo (English-only, 561 MB) with chatterbox-multilingual ONNX (23 languages, ~1.5 GB)
- Cross-lingual provider speech actually works for non-English patients (was silently broken)
- exaggeration is now a runtime input (default 0.5 — no UI knob in this PR; follow-up)
- Forces re-enrollment for existing patients (speech encoder embeddings are not cross-compatible)

## Test plan
- [ ] Re-enroll English patient — listen to a phrase, confirm quality is at least as good as v7
- [ ] Add Spanish patient — listen to Spanish phrase in cloned voice
- [ ] Add Japanese patient — listen to Japanese phrase in cloned voice
- [ ] Confirm pre-gen completes in reasonable time (compare to Turbo baseline)
- [ ] Confirm WebGPU ConvTranspose has no audible artifacts (or is force-pinned to WASM)
- [ ] Confirm migration banner shows once and dismisses cleanly
EOF
)"
```

- [ ] **Step 3: Stop**

Don't merge. User reviews and merges manually per the PR cadence preference.

---

## Self-Review (filled in)

**Spec coverage:**
- Cross-lingual support → Phases 4.1, 6.4, 7.2 cover it.
- Exaggeration runtime input → Phases 4.2, 6.3, 7.3 cover it.
- Tokenizer rewrite → Phase 2 covers it (tasks 2.1-2.4).
- KV cache reshape (24→30 layers) → Task 4.3.
- Pre-gen budget → Task 7.4.
- Migration for existing patients → Task 6.2.
- Cleanup of Turbo artifacts → Task 8.1.

**Placeholder scan:** None — every code step has the actual code or commands.

**Type consistency:** `CHATTERBOX_TOKENS.NUM_LAYERS = 30` in Task 3.1 is referenced as `NUM_LAYERS` in Task 4.3 — consistent. `prepareLanguage` is exported in Task 2.3 and imported in Task 4.1. `buildMultilingualTokenizer` introduced in 2.2, used in 4.1 and 5.1.

---

## Open questions to resolve during execution

1. **KV cache dtype.** Turbo uses fp16. Multilingual reference inference uses fp32. Confirm via Task 1.2 inspection — adjust Phase 4.3 if needed.
2. **prepare_language exact behavior.** Task 1.5 must verify against upstream PyTorch source. Update Task 2.3 if the format differs from `[xx] text`.
3. **Speech-token vocab size.** Multilingual LM may have a different speech vocab (Turbo: 0-6562). If so, update `START_SPEECH_TOKEN` / `STOP_SPEECH_TOKEN` constants in Task 4.3.
4. **Worker-to-TS imports for the GPU worker.** Task 5.1 may require precompiling `multilingualTokenizer.ts` to JS for the static-served worker — investigate during execution.
5. **Memory pressure on A16 iPads.** Task 7.4 + a final memory-pressure observation will tell us if we need to release the speech encoder more aggressively or keep models out of memory between synth calls.
