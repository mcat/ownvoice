# LFM2.5-1.2B-Instruct — OwnVoice System Prompt

Reference copy of the system prompt + few-shot exchanges used by OwnVoice's Sentence Builder LLM (Layer 2). Use this to reproduce the same completion behavior in LM Studio or any other chat interface when evaluating the model outside the app.

**Model:** [LiquidAI/LFM2.5-1.2B-Instruct-ONNX](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX) (in the app; LM Studio can load the GGUF or HF variant of the same weights)

---

## Sampling parameters

Set these in LM Studio's sampling panel. Defaults from the LFM2 model card:

| Parameter | Value |
|---|---|
| Temperature | `0.3` |
| Min-P | `0.15` |
| Top-K | `40` |
| Repetition penalty | `1.05` |
| Max tokens | `64` |

---

## System prompt (bare)

Paste this into LM Studio's "System Prompt" field. This is what's sent as the `<|im_start|>system` turn in production.

```
You complete a hospitalized patient's sentence. Given the start of a sentence, respond with 4-6 short ways (1-6 words each) it could continue. Each continuation must directly attach to the end of the given text as if you read them aloud together. Use only the patient's own first-person voice — never the nurse or doctor.

Respond with ONLY a JSON array of strings, nothing else. No code fence, no explanation.
```

---

## Few-shot exchanges

In production we inject these as real `user` / `assistant` turns before the live user message, because LFM2 (like most instruct-tuned models) follows multi-turn demonstrations more reliably than examples embedded in the system prompt.

In LM Studio you can reproduce this in either of two ways:

### Option A — Multi-turn (preferred, matches production exactly)

Paste the system prompt above, then send each of these user messages and manually edit the assistant response to match the target output below before sending the next user message. LM Studio supports this via "Edit message" on an assistant turn.

**Turn 1**
- User: `Continue: "I feel"`
- Assistant: `["scared", "sick", "dizzy", "weak", "better", "worse", "nauseous", "lonely"]`

**Turn 2**
- User: `Continue: "I am"`
- Assistant: `["in pain", "cold", "hot", "hungry", "thirsty", "tired", "uncomfortable", "okay"]`

**Turn 3**
- User: `Continue: "I need"`
- Assistant: `["water", "my family", "to go home", "to sleep", "my medication", "a blanket", "to talk to someone", "the nurse"]`

**Turn 4**
- User: `Continue: "I need my"`
- Assistant: `["glasses", "phone", "medication", "blanket"]`

**Turn 5**
- User: `Continue: "can you"`
- Assistant: `["help me?", "call my family?", "get the nurse?", "explain what's happening?", "turn off the light?", "adjust my bed?", "stay with me?"]`

**Turn 6**
- User: `Continue: "please help me"`
- Assistant: `["drink", "breathe", "sit up", "find the bathroom"]`

Then type your actual test input on a fresh user turn.

### Option B — Single-turn (embed few-shot in the system prompt)

If your LM Studio workflow is easier with just a system prompt + one user message, use this expanded version as the system prompt. It concatenates the bare prompt with the few-shot demos:

````
You complete a hospitalized patient's sentence. Given the start of a sentence, respond with 4-6 short ways (1-6 words each) it could continue. Each continuation must directly attach to the end of the given text as if you read them aloud together. Use only the patient's own first-person voice — never the nurse or doctor.

Respond with ONLY a JSON array of strings, nothing else. No code fence, no explanation.

Examples:

User: Continue: "I feel"
Assistant: ["scared", "sick", "dizzy", "weak", "better", "worse", "nauseous", "lonely"]

User: Continue: "I am"
Assistant: ["in pain", "cold", "hot", "hungry", "thirsty", "tired", "uncomfortable"]

User: Continue: "I need"
Assistant: ["water", "my family", "to go home", "to sleep", "my medication", "a blanket", "the nurse"]

User: Continue: "I need my"
Assistant: ["glasses", "phone", "medication", "blanket"]

User: Continue: "can you"
Assistant: ["help me?", "call my family?", "get the nurse?", "explain what's happening?", "turn off the light?", "adjust my bed?", "stay with me?"]

User: Continue: "please help me"
Assistant: ["drink", "breathe", "sit up", "find the bathroom"]
````

Multi-turn (Option A) is closer to production and usually yields better results because the instruct model was trained on turn boundaries, but single-turn (Option B) is fine for quick evaluation.

---

## Test prompts

Sample user messages to paste after the system prompt + few-shot. Good coverage of patterns the app sees in practice:

| Partial | What "good" looks like |
|---|---|
| `Continue: "I feel"` | Short adjectives/states: scared, dizzy, cold, tired |
| `Continue: "I need my glasses"` | Coda: to read, please, now, to see |
| `Continue: "My pain is"` | Severity/location: getting worse, sharp, in my back, about a 7 |
| `Continue: "it hurts"` | When/where clauses: when I breathe, a lot, to swallow |
| `Continue: "can you"` | Second-person requests: call my family, get the nurse, stay with me |
| `Continue: "please"` | Imperatives: call my family, help me sit up, bring me water |
| `Continue: "I'm cold"` | States: very cold, shivering, need a blanket |
| `Continue: "when can I"` | Events: go home, eat, drink, see my family |

---

## Expected output

A single bare JSON array of strings. No surrounding prose, no markdown fence.

**Correct:**
```json
["scared", "dizzy", "cold", "tired", "weak"]
```

**Also accepted** (the app's `tryParseJsonArray` will recover these):
````
Sure, here are some ideas:
```json
["scared", "dizzy", "cold"]
```
````

**Wrong shape** (the app's fallback heuristic will try to salvage, quality degraded):
```
scared, dizzy, cold, tired, weak
```

**Wrong voice** (filtered by `isCaregiverVoice` even if shape is right):
```json
["I understand", "Your pain is getting worse", "The nurse is coming soon"]
```

---

## Voice constraints to keep in mind

These are enforced by a regex post-filter in the app (`src/models/llmWorker.ts`), so if LM Studio shows the model producing them we'll still drop them in production. Seeing them is a sign to tighten the prompt, though:

- Third-person ("the patient is…", "your pain is…")
- Caregiver actions ("I'll bring you…", "I'm getting your…")
- Acknowledgment reflexes ("I understand", "I hear you", "don't worry")
- Plural team voice ("we'll check…", "let me know…")
- Staff references ("the nurse is coming soon", "the doctor will be…")
