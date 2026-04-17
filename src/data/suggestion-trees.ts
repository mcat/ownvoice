import type { Message } from "../types";
import { getModelManager } from "../models/modelManager";
import { getSuggestionTree, t } from "./phraseRegistry";

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

  return new Promise<string[]>((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 8000);

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
    worker.postMessage({
      type: "complete",
      partial: partialKey,
      context,
      maxTokens: 64,
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
