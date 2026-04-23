import type { Message } from "../types";
import type { FewShotExample } from "../models/types";
import { getModelManager } from "../models/modelManager";
import { getSuggestionTree, getKeyedSuggestionTree, t } from "./phraseRegistry";
import type { SuggestionItem } from "./phraseRegistry";

/**
 * Curated sentence completion trees for the Sentence Builder.
 *
 * Layer 1 of the hybrid suggestion architecture:
 * - These trees handle ~80% of sentence starts
 * - Instant lookup (0ms), no model inference
 * - Clinically reviewable and deterministic
 * - LFM2.5-1.2B-Instruct (Layer 2) fires only on cache miss
 *
 * Phrase text is sourced from the central phrase registry.
 */
const BASE_SUGGESTIONS: Record<string, string[]> = getSuggestionTree("en");

/** Keyed curated tree — values carry PhraseKey for bilingual resolution. */
const KEYED_SUGGESTIONS: Record<string, SuggestionItem[]> = getKeyedSuggestionTree("en");

/**
 * Generic word/phrase continuations when both curated trees and LLM
 * have no match. These are common medical-context words that help
 * the patient keep building rather than hitting a dead end.
 */
function genericContinuations(partialKey: string): string[] {
  const words = partialKey.split(" ");
  const lastWord = words[words.length - 1]?.toLowerCase() ?? "";

  // If the sentence looks like a question, offer question endings
  if (
    partialKey.startsWith("when") ||
    partialKey.startsWith("can") ||
    partialKey.startsWith("will") ||
    partialKey.startsWith("how")
  ) {
    return ["the doctor", "my family", "the nurse", "today", "tomorrow", "soon"];
  }

  // Common medical nouns that can follow many sentence patterns
  if (
    lastWord === "my" ||
    lastWord === "the" ||
    lastWord === "a"
  ) {
    return [
      "medication",
      "family",
      "nurse",
      "doctor",
      "bed",
      "water",
      "blanket",
      "pain",
    ];
  }

  // Generic continuations for any partial sentence
  return [
    "please",
    "help",
    "now",
    "soon",
    "again",
    "more",
    "the nurse",
    "the doctor",
  ];
}

/**
 * Keyword-based contextual suggestions (Layer 1.5).
 *
 * When the exact tree lookup misses, scan the phrase for medical/emotional
 * keywords and return contextual next-word suggestions. This handles the
 * combinatorial explosion of possible phrases without needing explicit
 * tree entries for every path.
 *
 * Each pattern has a set of trigger keywords (OR logic — any match fires)
 * and a list of contextual suggestion fragments to append.
 */
interface KeywordPattern {
  keywords: string[];
  suggestions: string[];
}

const KEYWORD_PATTERNS: KeywordPattern[] = [
  {
    keywords: ["pain", "hurts", "hurt", "aching"],
    suggestions: [
      "please help me", "and it's getting worse", "and need medication",
      "in my back", "in my chest", "in my stomach", "it's very bad",
    ],
  },
  {
    keywords: ["cold", "freezing"],
    suggestions: [
      "can I have a blanket?", "please", "I'm very cold", "can you help?",
    ],
  },
  {
    keywords: ["hot"],
    suggestions: [
      "please", "I need water", "very hot", "can you adjust the temperature?",
    ],
  },
  {
    keywords: ["hungry"],
    suggestions: [
      "can I eat?", "when can I eat?", "please", "I'm very hungry",
    ],
  },
  {
    keywords: ["thirsty"],
    suggestions: ["can I have water?", "please", "I'm very thirsty"],
  },
  {
    keywords: ["tired", "exhausted"],
    suggestions: [
      "I need to rest", "please", "can I sleep?", "please turn off the light",
    ],
  },
  {
    keywords: ["scared", "afraid", "frightened"],
    suggestions: [
      "can someone stay with me?", "about the procedure",
      "about what's happening", "I need someone here", "please help",
    ],
  },
  {
    keywords: ["sick", "nauseous"],
    suggestions: [
      "I need help", "please help", "to my stomach",
      "and need a basin", "and dizzy",
    ],
  },
  {
    keywords: ["dizzy", "lightheaded"],
    suggestions: [
      "I need to lie down", "please help", "and sick", "I can't sit up",
    ],
  },
  {
    keywords: ["weak"],
    suggestions: [
      "I can't get up", "please help me", "I need to rest", "I need help",
    ],
  },
  {
    keywords: ["lonely", "alone"],
    suggestions: [
      "can someone stay?", "I want my family", "please stay",
      "I miss my family",
    ],
  },
  {
    keywords: ["confused"],
    suggestions: [
      "what's happening?", "can you explain?", "please explain",
      "I don't understand",
    ],
  },
  {
    keywords: ["uncomfortable"],
    suggestions: [
      "can you adjust my bed?", "please help me",
      "I need to move", "it's my position",
    ],
  },
  {
    keywords: ["breathe", "breathing", "breath"],
    suggestions: [
      "please help me", "I can't breathe well",
      "I need help", "it's getting worse",
    ],
  },
  {
    keywords: ["medication", "medicine"],
    suggestions: [
      "please", "right now", "when is it coming?",
      "it's not working", "I need it now",
    ],
  },
  {
    keywords: ["water"],
    suggestions: ["please", "I'm very thirsty", "right now"],
  },
  {
    keywords: ["family"],
    suggestions: [
      "please call them", "when are they coming?",
      "I miss them", "I want to see them",
    ],
  },
  {
    keywords: ["nurse"],
    suggestions: ["please", "right now", "it's urgent", "I need help"],
  },
  {
    keywords: ["doctor"],
    suggestions: [
      "please", "when are they coming?", "right now",
      "it's urgent", "I have a question",
    ],
  },
  {
    keywords: ["ready"],
    suggestions: [
      "for my medication", "to go home", "to see the doctor",
      "for the procedure",
    ],
  },
  {
    keywords: ["better"],
    suggestions: ["than before", "now", "thank you", "but still some pain"],
  },
  {
    keywords: ["worse"],
    suggestions: [
      "than before", "please help", "I need the doctor", "I need medication",
    ],
  },
  {
    keywords: ["sleep"],
    suggestions: [
      "please turn off the light", "I need help",
      "I'm in pain", "I'm uncomfortable",
    ],
  },
  {
    keywords: ["bathroom"],
    suggestions: [
      "please help me", "right now", "I need help getting up", "it's urgent",
    ],
  },
  {
    keywords: ["worried", "anxious"],
    suggestions: [
      "about what's happening", "about my family",
      "about the procedure", "can you explain?", "please help",
    ],
  },
  {
    keywords: ["frustrated"],
    suggestions: [
      "I don't understand", "can you explain?", "I need help", "please",
    ],
  },
  {
    keywords: ["embarrassed"],
    suggestions: [
      "I need help", "please", "with the bathroom", "can you help me?",
    ],
  },
  {
    keywords: ["help"],
    suggestions: [
      "getting up", "breathing", "with the pain", "right now", "please",
    ],
  },
];

/**
 * Scan the built phrase for medical/emotional keywords and return
 * merged contextual suggestions from all matching patterns.
 *
 * Filters out suggestions that are redundant with the current phrase
 * (substring match) and deduplicates across patterns.
 */
function getKeywordSuggestions(partialKey: string): string[] {
  const words = new Set(partialKey.split(/\s+/));
  const seen = new Set<string>();
  const results: string[] = [];

  for (const pattern of KEYWORD_PATTERNS) {
    if (pattern.keywords.some((kw) => words.has(kw))) {
      for (const suggestion of pattern.suggestions) {
        const lower = suggestion.toLowerCase();
        // Skip if the entire suggestion already appears in the phrase
        if (partialKey.includes(lower)) continue;
        // Deduplicate across multiple matching patterns
        if (seen.has(lower)) continue;
        seen.add(lower);
        results.push(suggestion);
      }
    }
  }

  return results.slice(0, 8);
}

/**
 * Build a completion prompt for the LLM worker.
 *
 * Includes the partial sentence, recent conversation context,
 * and time-of-day hint for contextually relevant completions.
 */
export function buildCompletionPrompt(
  partialKey: string,
  recentMessages: Message[],
  hour: number,
): string {
  const timeContext =
    hour >= 20 || hour < 6
      ? "nighttime"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : "evening";

  const last5 = recentMessages.slice(-5);
  const conversationContext =
    last5.length > 0
      ? `Recent conversation:\n${last5.map((m) => `${m.from === "provider" ? "Provider" : "Patient"}: ${m.text}`).join("\n")}\n\n`
      : "";

  return `${conversationContext}Time of day: ${timeContext}\nPartial sentence: "${partialKey}"`;
}

/**
 * Request completions from the LLM worker with a timeout.
 * Returns an array of completion strings, or [] on timeout/error.
 *
 * Timeout is generous (2s default) because on-device LFM2.5-1.2B-Instruct
 * needs time to tokenize, run inference, and decode — especially
 * on the first request when the execution context is cold.
 */
export function requestLLMCompletions(
  prompt: string,
  timeoutMs: number = 8000,
): Promise<string[]> {
  const manager = getModelManager();
  const worker = manager.getWorker("llm");

  if (!worker) return Promise.resolve([]);

  return new Promise<string[]>((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve([]);
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      const { type, data, message } = event.data;
      if (type === "completions") {
        cleanup();
        resolve(data as string[]);
      } else if (type === "error") {
        console.warn("[OwnVoice:LLM] Completion error:", message);
        cleanup();
        resolve([]);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      worker!.removeEventListener("message", onMessage);
    }

    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "complete", prompt, maxTokens: 64 });
  });
}

/**
 * Get LLM suggestions independently of the curated layers.
 *
 * Always fires the LLM (if ready) and returns up to 8 suggestions.
 * Designed to run in parallel with curated/keyword suggestions,
 * displayed in a dedicated row in the UI.
 *
 * Passes the partial sentence and context separately to the worker
 * so the model sees the partial cleanly in its completion slot.
 */
/**
 * Tree roots used as the trunk for fallback chains when the user's partial
 * doesn't map onto the tree. Ordered by coverage: "i feel" and "i need"
 * dominate real patient input, "i am" and "please" fill in the rest.
 *
 * Each root must have at least one depth-2 child in BASE_SUGGESTIONS and a
 * terminal in CHAIN_TERMINALS below — otherwise walkChain won't produce a
 * useful 3-turn demo.
 */
const CHAIN_ROOTS = ["i feel", "i need", "i am", "please"] as const;

/**
 * Hand-crafted depth-3+ turns appended to the end of a chain walk. The
 * curated tree only reaches depth 2 ("i feel scared", "i need help"), so
 * without these the model never sees a demo where the partial is 4-6 words
 * long — which is exactly the shape real patients type. Each terminal
 * picks up where its chain's tree walk leaves off and demonstrates short
 * attach-on-the-end completions.
 *
 * Keep these grounded in first-person patient voice; the isCaregiverVoice
 * filter in llmWorker would drop them post-hoc, but bad demos also pull
 * the whole distribution off-voice.
 */
const CHAIN_TERMINALS: Record<string, FewShotExample> = {
  "i feel": {
    user: `Continue: "I feel scared about the procedure"`,
    assistant: JSON.stringify([
      "tomorrow",
      "and I'm alone",
      "they're planning",
      "and want to wait",
    ]),
  },
  "i need": {
    user: `Continue: "I need help breathing"`,
    assistant: JSON.stringify([
      "please",
      "right now",
      "it's getting worse",
      "with the oxygen",
    ]),
  },
  "i am": {
    user: `Continue: "I am in pain and"`,
    assistant: JSON.stringify([
      "it's getting worse",
      "need medication",
      "can't sleep",
      "it won't stop",
    ]),
  },
  "please": {
    user: `Continue: "Please help me up"`,
    assistant: JSON.stringify([
      "slowly",
      "to the bathroom",
      "I'm very weak",
      "I need to move",
    ]),
  },
};

/**
 * Find the shortest prefix of `key` that matches a tree entry. Used to
 * locate the top of the user's trunk so walkChain can start at depth 1
 * even when the user's partial is several words deep.
 */
function findTopRoot(key: string): string | null {
  const words = key.trim().toLowerCase().split(/\s+/).filter(Boolean);
  for (let i = 1; i <= words.length; i++) {
    const candidate = words.slice(0, i).join(" ");
    if (BASE_SUGGESTIONS[candidate]) return candidate;
  }
  return null;
}

/**
 * Walk the suggestion tree DOWNWARD from `rootKey`, emitting one few-shot
 * turn per tree depth. At each step, pick the first completion whose
 * leading words form another tree key when appended — this keeps the walk
 * on a realistic trunk instead of randomly concatenating. When the tree
 * runs out (typically depth 2), append the hand-crafted depth-3 terminal.
 *
 * Result: 2-3 turns demonstrating ONE sentence growing from depth 1 to
 * depth 3, which is the shape real patient input takes.
 */
function walkChain(rootKey: string, maxDepth: number): FewShotExample[] {
  const turns: FewShotExample[] = [];
  const seen = new Set<string>();
  let key = rootKey;

  for (let d = 0; d < maxDepth; d++) {
    if (seen.has(key)) break;
    seen.add(key);
    const completions = BASE_SUGGESTIONS[key];
    if (!completions || completions.length === 0) break;

    const display = key.charAt(0).toUpperCase() + key.slice(1);
    turns.push({
      user: `Continue: "${display}"`,
      // JSON-array format: the worker's parseCompletions prefers JSON
      // parsing, so demonstrating it here trains the model to emit the
      // same shape.
      assistant: JSON.stringify(completions.slice(0, 6)),
    });

    // Advance to the next depth: try each completion in order, taking as
    // many leading words as needed to land on another tree key.
    let advanced = false;
    for (const comp of completions) {
      const normalized = comp.toLowerCase().replace(/[?.,!]+$/, "").trim();
      const compWords = normalized.split(/\s+/);
      for (let take = compWords.length; take >= 1; take--) {
        const candidate = `${key} ${compWords.slice(0, take).join(" ")}`;
        if (BASE_SUGGESTIONS[candidate] && !seen.has(candidate)) {
          key = candidate;
          advanced = true;
          break;
        }
      }
      if (advanced) break;
    }
    if (!advanced) break;
  }

  const extension = CHAIN_TERMINALS[rootKey];
  if (extension && turns.length >= 2) turns.push(extension);

  return turns;
}

/**
 * Build progressive-chain few-shot examples from the curated tree.
 *
 * Instead of demonstrating 5-6 different sentence STARTS (which teaches
 * the model "completions = opening words"), we demonstrate 2-3 complete
 * sentences GROWING from depth 1 to depth 3 across consecutive turns.
 * Real patient sentences are 1-10 words long, so the model needs to see
 * that completions can attach at any depth — not just the beginning.
 *
 * Chain 1 is seeded from the user's trunk (if it maps to a tree root);
 * Chains 2-3 fill in with other common roots the user hasn't seen yet.
 * Each chain produces ~3 turns (2 from tree walk + 1 hand-crafted
 * terminal), so total turn budget is ~6-9.
 */
export function buildLLMFewShot(partialKey: string): FewShotExample[] {
  const chains: FewShotExample[][] = [];
  const usedRoots = new Set<string>();
  const MAX_DEPTH_PER_CHAIN = 3;
  const MAX_CHAINS = 3;
  const MAX_TURNS = 9;

  // Chain 1: user's actual trunk, when the tree has a root for it.
  const topRoot = partialKey ? findTopRoot(partialKey) : null;
  if (topRoot) {
    const chain = walkChain(topRoot, MAX_DEPTH_PER_CHAIN);
    if (chain.length > 0) {
      chains.push(chain);
      usedRoots.add(topRoot);
    }
  }

  // Chains 2-3: default roots, skipping any already in chain 1.
  for (const root of CHAIN_ROOTS) {
    if (chains.length >= MAX_CHAINS) break;
    if (usedRoots.has(root)) continue;
    const chain = walkChain(root, MAX_DEPTH_PER_CHAIN);
    if (chain.length > 0) {
      chains.push(chain);
      usedRoots.add(root);
    }
  }

  return chains.flat().slice(0, MAX_TURNS);
}

/**
 * Pull the most recent UNIQUE phrases the patient has actually said, most
 * recent first. Feeds the LLM a small vocabulary bank so its suggestions
 * can echo phrasings the patient has used before — a per-session
 * personalization signal that would otherwise be wasted (the conversation
 * store already persists this in IndexedDB; we were just ignoring it
 * past the last 3 messages).
 *
 * Guards:
 *   - Patient-only. Provider messages are what OTHERS say, not vocabulary
 *     the patient would reuse.
 *   - Dedup on normalized text so "I'm in pain" / "I'm in pain." collapse.
 *   - Phrase length cap at 12 words: trims the rare long narration from
 *     eating into the 1.2B model's prompt budget.
 */
export function extractPatientVocabulary(
  messages: Message[],
  limit: number,
): string[] {
  const seen = new Set<string>();
  const phrases: string[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.from !== "patient") continue;
    const text = m.text.trim();
    if (!text) continue;
    const words = text.split(/\s+/);
    if (words.length > 12) continue;
    const key = text.toLowerCase().replace(/[.!?]+$/, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push(text);
    if (phrases.length >= limit) break;
  }
  return phrases;
}

/**
 * Monotonically increasing request ID. Each getLLMSuggestions call gets
 * its own ID, which the worker echoes back on the completion/error reply.
 * Without this, multiple overlapping calls (rapid typing) would attach
 * multiple `message` listeners to the worker, each resolving its own
 * promise on the FIRST completion it saw — even if that completion was
 * for a different request. The result was every pending promise
 * resolving with stale data and the latest useEffect picking up
 * yesterday's answer.
 */
let nextLLMRequestId = 1;

export async function getLLMSuggestions(
  partialKey: string,
  recentMessages: Message[],
  hour: number,
): Promise<string[]> {
  if (!partialKey) return [];

  const manager = getModelManager();
  if (!manager.isReady("llm")) return [];

  const worker = manager.getWorker("llm");
  if (!worker) return [];

  const timeContext =
    hour >= 20 || hour < 6
      ? "nighttime"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : "evening";

  const last3 = recentMessages.slice(-3);
  const context = last3.length > 0
    ? `${last3.map((m) => `${m.from === "provider" ? "Provider" : "Patient"}: ${m.text}`).join("; ")} (${timeContext})`
    : timeContext;

  const requestId = nextLLMRequestId++;

  return new Promise<string[]>((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 8000);

    function onMessage(event: MessageEvent) {
      const { type, data, message, requestId: replyId } = event.data;
      // Only react to the reply matching THIS call — older in-flight
      // listeners must ignore unrelated completions.
      if (replyId !== requestId) return;
      if (type === "completions") {
        cleanup();
        resolve(data as string[]);
      } else if (type === "error") {
        console.warn("[OwnVoice:LLM] Completion error:", message);
        cleanup();
        resolve([]);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      worker!.removeEventListener("message", onMessage);
    }

    worker.addEventListener("message", onMessage);
    worker.postMessage({
      type: "complete",
      partial: partialKey,
      context,
      priorPhrases: extractPatientVocabulary(recentMessages, 8),
      maxTokens: 64,
      fewShot: buildLLMFewShot(partialKey),
      requestId,
    });
  });
}

/**
 * Get contextual sentence suggestions.
 *
 * Checks curated trees first (Layer 1). If no match, falls through
 * to keyword patterns (Layer 1.5), then generic continuations.
 * LLM suggestions are fetched separately via getLLMSuggestions().
 */
export async function getContextualSuggestions(
  partialKey: string,
  recentMessages: Message[],
  hour: number,
): Promise<string[]> {
  const base = BASE_SUGGESTIONS[partialKey];

  // No partial input — generate context-aware starters
  if (partialKey === "") {
    const starters = [...(BASE_SUGGESTIONS[""] ?? [])];
    const lastProviderMsg = [...recentMessages]
      .reverse()
      .find((m) => m.from === "provider");

    // If provider just asked a question, suggest relevant responses
    if (lastProviderMsg) {
      const q = lastProviderMsg.text.toLowerCase();
      if (q.includes("how are you") || q.includes("how are you feeling"))
        return [
          t("suggest.ctx.feeling.i_feel"), t("suggest.ctx.feeling.i_am"),
          t("suggest.ctx.feeling.better"), t("suggest.ctx.feeling.not_great"),
          t("suggest.ctx.feeling.pain"), t("suggest.ctx.feeling.okay"),
          t("suggest.ctx.feeling.help"),
        ];
      if (q.includes("anything you need") || q.includes("is there anything"))
        return [
          t("suggest.ctx.need.i_need"), t("suggest.ctx.need.i_want"),
          t("suggest.ctx.need.fine"), t("suggest.ctx.need.yes"),
          t("suggest.ctx.need.no"), t("suggest.ctx.need.stay"),
        ];
      if (q.includes("where") && q.includes("hurt"))
        return [
          t("suggest.ctx.where_hurts.head"), t("suggest.ctx.where_hurts.chest"),
          t("suggest.ctx.where_hurts.stomach"), t("suggest.ctx.where_hurts.back"),
          t("suggest.ctx.where_hurts.left_arm"), t("suggest.ctx.where_hurts.right_leg"),
          t("suggest.ctx.where_hurts.everywhere"),
        ];
      if (q.includes("rate your pain") || q.includes("pain"))
        return [
          t("suggest.ctx.pain.very_bad"), t("suggest.ctx.pain.worse"),
          t("suggest.ctx.pain.same"), t("suggest.ctx.pain.little_better"),
          t("suggest.ctx.pain.need_relief"),
        ];
      if (q.includes("comfortable") || q.includes("sleep"))
        return [
          t("suggest.ctx.comfort.comfortable"), t("suggest.ctx.comfort.not_comfortable"),
          t("suggest.ctx.comfort.cant_sleep"), t("suggest.ctx.comfort.cold"),
          t("suggest.ctx.comfort.hot"), t("suggest.ctx.comfort.adjust_bed"),
        ];
    }

    // Time-aware reranking
    if (hour >= 20 || hour < 6) {
      return [
        t("suggest.ctx.night.cant_sleep"), t("suggest.ctx.night.i_need"),
        t("suggest.ctx.night.pain"), t("suggest.ctx.night.i_feel"),
        t("suggest.ctx.night.can_you"), t("suggest.ctx.night.please"),
        t("suggest.ctx.night.i_am"), t("suggest.ctx.night.when"),
      ];
    }
    if (hour < 10) {
      return [
        t("suggest.ctx.morning.i_am"), t("suggest.ctx.morning.i_need"),
        t("suggest.ctx.morning.i_feel"), t("suggest.ctx.morning.doctor"),
        t("suggest.ctx.morning.i_want"), t("suggest.ctx.morning.can_you"),
        t("suggest.ctx.morning.please"), t("suggest.ctx.morning.tell_me"),
      ];
    }
    return starters;
  }

  // Has base suggestions — return them (Layer 1 hit)
  if (base) {
    const recentTexts = recentMessages.map((m) => m.text.toLowerCase()).join(" ");
    return [...base].sort((a, b) => {
      const aRelevance = recentTexts.includes(a.toLowerCase()) ? -1 : 0;
      const bRelevance = recentTexts.includes(b.toLowerCase()) ? -1 : 0;
      return aRelevance - bRelevance;
    });
  }

  // No curated match — Layer 1.5 (keyword-based contextual suggestions)
  // Scans the phrase for medical/emotional keywords and returns relevant
  // continuations. Instant, deterministic, no model inference needed.
  const keywordResults = getKeywordSuggestions(partialKey);
  if (keywordResults.length > 0) return keywordResults;

  // No keyword match — provide generic continuations
  // so the user always has something to tap.
  // LLM suggestions are fetched separately via getLLMSuggestions().
  return genericContinuations(partialKey);
}

// ── Keyed suggestions (bilingual token support) ─────────────────

import type { PhraseKey } from "./phraseRegistry";

/** Shorthand: build a SuggestionItem from a PhraseKey. */
function sk(key: PhraseKey): SuggestionItem {
  return { text: t(key), key };
}

/** Wrap a plain string as a keyless SuggestionItem. */
function sf(text: string): SuggestionItem {
  return { text };
}

/**
 * Like `getContextualSuggestions` but each result carries an optional
 * PhraseKey for bilingual resolution.  Curated results (base tree,
 * context-aware, time-aware) carry keys; keyword/generic continuations
 * do not.
 */
export async function getKeyedContextualSuggestions(
  partialKey: string,
  recentMessages: Message[],
  hour: number,
): Promise<SuggestionItem[]> {
  const keyed = KEYED_SUGGESTIONS[partialKey];

  // No partial input — generate context-aware starters
  if (partialKey === "") {
    const starters = [...(KEYED_SUGGESTIONS[""] ?? [])];
    const lastProviderMsg = [...recentMessages]
      .reverse()
      .find((m) => m.from === "provider");

    if (lastProviderMsg) {
      const q = lastProviderMsg.text.toLowerCase();
      if (q.includes("how are you") || q.includes("how are you feeling"))
        return [
          sk("suggest.ctx.feeling.i_feel"), sk("suggest.ctx.feeling.i_am"),
          sk("suggest.ctx.feeling.better"), sk("suggest.ctx.feeling.not_great"),
          sk("suggest.ctx.feeling.pain"), sk("suggest.ctx.feeling.okay"),
          sk("suggest.ctx.feeling.help"),
        ];
      if (q.includes("anything you need") || q.includes("is there anything"))
        return [
          sk("suggest.ctx.need.i_need"), sk("suggest.ctx.need.i_want"),
          sk("suggest.ctx.need.fine"), sk("suggest.ctx.need.yes"),
          sk("suggest.ctx.need.no"), sk("suggest.ctx.need.stay"),
        ];
      if (q.includes("where") && q.includes("hurt"))
        return [
          sk("suggest.ctx.where_hurts.head"), sk("suggest.ctx.where_hurts.chest"),
          sk("suggest.ctx.where_hurts.stomach"), sk("suggest.ctx.where_hurts.back"),
          sk("suggest.ctx.where_hurts.left_arm"), sk("suggest.ctx.where_hurts.right_leg"),
          sk("suggest.ctx.where_hurts.everywhere"),
        ];
      if (q.includes("rate your pain") || q.includes("pain"))
        return [
          sk("suggest.ctx.pain.very_bad"), sk("suggest.ctx.pain.worse"),
          sk("suggest.ctx.pain.same"), sk("suggest.ctx.pain.little_better"),
          sk("suggest.ctx.pain.need_relief"),
        ];
      if (q.includes("comfortable") || q.includes("sleep"))
        return [
          sk("suggest.ctx.comfort.comfortable"), sk("suggest.ctx.comfort.not_comfortable"),
          sk("suggest.ctx.comfort.cant_sleep"), sk("suggest.ctx.comfort.cold"),
          sk("suggest.ctx.comfort.hot"), sk("suggest.ctx.comfort.adjust_bed"),
        ];
    }

    // Time-aware reranking
    if (hour >= 20 || hour < 6) {
      return [
        sk("suggest.ctx.night.cant_sleep"), sk("suggest.ctx.night.i_need"),
        sk("suggest.ctx.night.pain"), sk("suggest.ctx.night.i_feel"),
        sk("suggest.ctx.night.can_you"), sk("suggest.ctx.night.please"),
        sk("suggest.ctx.night.i_am"), sk("suggest.ctx.night.when"),
      ];
    }
    if (hour < 10) {
      return [
        sk("suggest.ctx.morning.i_am"), sk("suggest.ctx.morning.i_need"),
        sk("suggest.ctx.morning.i_feel"), sk("suggest.ctx.morning.doctor"),
        sk("suggest.ctx.morning.i_want"), sk("suggest.ctx.morning.can_you"),
        sk("suggest.ctx.morning.please"), sk("suggest.ctx.morning.tell_me"),
      ];
    }
    return starters;
  }

  // Has base suggestions — return them (Layer 1 hit)
  if (keyed) {
    const recentTexts = recentMessages.map((m) => m.text.toLowerCase()).join(" ");
    return [...keyed].sort((a, b) => {
      const aRelevance = recentTexts.includes(a.text.toLowerCase()) ? -1 : 0;
      const bRelevance = recentTexts.includes(b.text.toLowerCase()) ? -1 : 0;
      return aRelevance - bRelevance;
    });
  }

  // No curated match — Layer 1.5 (keyword-based contextual suggestions)
  const keywordResults = getKeywordSuggestions(partialKey);
  if (keywordResults.length > 0) return keywordResults.map(sf);

  // No keyword match — generic continuations (no keys)
  return genericContinuations(partialKey).map(sf);
}
