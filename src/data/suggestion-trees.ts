/** Structural shape used by suggestion helpers — accepts both legacy `Message`
 *  records and the new audit-derived `ThreadEntry`s. Only `from`, `text`,
 *  and the optional `key` are read; other fields differ between the two
 *  shapes (Message.time is a string, ThreadEntry.time is epoch ms) but
 *  aren't consumed here. */
export interface SuggestionContextMessage {
  from: "patient" | "provider";
  text: string;
  /** PhraseKey of the originating phrase tap, when known. Lets provider-
   *  question triggers match exactly across locales instead of relying
   *  on English substrings of the display text. */
  key?: string;
}
type Message = SuggestionContextMessage;
import { getSuggestionTree, getKeyedSuggestionTree, t } from "./phraseRegistry";
import type { SuggestionItem } from "./phraseRegistry";

/**
 * Curated sentence completion trees for the Sentence Builder.
 *
 * - These trees handle ~80% of sentence starts
 * - Instant lookup (0ms), no model inference
 * - Clinically reviewable and deterministic
 *
 * Phrase text is sourced from the central phrase registry.
 */
const BASE_SUGGESTIONS: Record<string, string[]> = getSuggestionTree("en");

/** Keyed curated tree — values carry PhraseKey for bilingual resolution. */
const KEYED_SUGGESTIONS: Record<string, SuggestionItem[]> = getKeyedSuggestionTree("en");

/**
 * Generic word/phrase continuations when neither the curated tree nor
 * the keyword patterns match. These are common medical-context words that help
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
 * Get contextual sentence suggestions.
 *
 * Checks curated trees first. If no match, falls through to keyword
 * patterns, then generic continuations.
 */
export async function getContextualSuggestions(
  partialKey: string,
  recentMessages: readonly Message[],
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
  return genericContinuations(partialKey);
}

// ── Keyed suggestions (bilingual token support) ─────────────────

import type { PhraseKey } from "./phraseRegistry";

/** Wrap a plain string as a keyless SuggestionItem. */
function sf(text: string): SuggestionItem {
  return { text };
}

/**
 * Which contextual-response set a provider question maps to.
 * Key-based matching is exact and locale-independent; the English
 * substring checks below remain as a fallback for thread entries that
 * predate key plumbing (or free-typed provider questions).
 */
type ProviderTriggerSet = "feeling" | "need" | "where_hurts" | "pain" | "comfort";

const PROVIDER_KEY_TRIGGERS: Record<string, ProviderTriggerSet> = {
  "provider.questions.feeling": "feeling",
  "provider.questions.need": "need",
  "provider.questions.where_hurts": "where_hurts",
  "provider.questions.rate_pain": "pain",
  "provider.questions.comfortable": "comfort",
  "provider.questions.sleep": "comfort",
};

function providerTriggerSetFor(
  msg: SuggestionContextMessage,
): ProviderTriggerSet | null {
  if (msg.key && PROVIDER_KEY_TRIGGERS[msg.key]) {
    return PROVIDER_KEY_TRIGGERS[msg.key];
  }
  const q = msg.text.toLowerCase();
  if (q.includes("how are you")) return "feeling";
  if (q.includes("anything you need") || q.includes("is there anything")) return "need";
  if (q.includes("where") && q.includes("hurt")) return "where_hurts";
  if (q.includes("rate your pain") || q.includes("pain")) return "pain";
  if (q.includes("comfortable") || q.includes("sleep")) return "comfort";
  return null;
}

/**
 * Like `getContextualSuggestions` but each result carries an optional
 * PhraseKey for bilingual resolution, and curated text resolves in
 * `locale` (the patient's language — these chips are patient-facing).
 * Keyword/generic continuations stay keyless English: they extend
 * English free-typed input and have no registry entries to localize.
 */
export async function getKeyedContextualSuggestions(
  partialKey: string,
  recentMessages: readonly Message[],
  hour: number,
  locale: string = "en",
): Promise<SuggestionItem[]> {
  /** Build a SuggestionItem from a PhraseKey, resolved in `locale`. */
  const ski = (key: PhraseKey): SuggestionItem => ({ text: t(key, locale), key });
  /** Re-resolve a curated item's display text in `locale` (the lookup
   *  tables are built once with en text at module load). */
  const localize = (item: SuggestionItem): SuggestionItem =>
    item.key ? { text: t(item.key, locale), key: item.key } : item;

  const keyed = KEYED_SUGGESTIONS[partialKey];

  // No partial input — generate context-aware starters
  if (partialKey === "") {
    const starters = (KEYED_SUGGESTIONS[""] ?? []).map(localize);
    const lastProviderMsg = [...recentMessages]
      .reverse()
      .find((m) => m.from === "provider");

    const triggerSet = lastProviderMsg ? providerTriggerSetFor(lastProviderMsg) : null;
    switch (triggerSet) {
      case "feeling":
        return [
          ski("suggest.ctx.feeling.i_feel"), ski("suggest.ctx.feeling.i_am"),
          ski("suggest.ctx.feeling.better"), ski("suggest.ctx.feeling.not_great"),
          ski("suggest.ctx.feeling.pain"), ski("suggest.ctx.feeling.okay"),
          ski("suggest.ctx.feeling.help"),
        ];
      case "need":
        return [
          ski("suggest.ctx.need.i_need"), ski("suggest.ctx.need.i_want"),
          ski("suggest.ctx.need.fine"), ski("suggest.ctx.need.yes"),
          ski("suggest.ctx.need.no"), ski("suggest.ctx.need.stay"),
        ];
      case "where_hurts":
        return [
          ski("suggest.ctx.where_hurts.head"), ski("suggest.ctx.where_hurts.chest"),
          ski("suggest.ctx.where_hurts.stomach"), ski("suggest.ctx.where_hurts.back"),
          ski("suggest.ctx.where_hurts.left_arm"), ski("suggest.ctx.where_hurts.right_leg"),
          ski("suggest.ctx.where_hurts.everywhere"),
        ];
      case "pain":
        return [
          ski("suggest.ctx.pain.very_bad"), ski("suggest.ctx.pain.worse"),
          ski("suggest.ctx.pain.same"), ski("suggest.ctx.pain.little_better"),
          ski("suggest.ctx.pain.need_relief"),
        ];
      case "comfort":
        return [
          ski("suggest.ctx.comfort.comfortable"), ski("suggest.ctx.comfort.not_comfortable"),
          ski("suggest.ctx.comfort.cant_sleep"), ski("suggest.ctx.comfort.cold"),
          ski("suggest.ctx.comfort.hot"), ski("suggest.ctx.comfort.adjust_bed"),
        ];
      case null:
        break;
    }

    // Time-aware reranking
    if (hour >= 20 || hour < 6) {
      return [
        ski("suggest.ctx.night.cant_sleep"), ski("suggest.ctx.night.i_need"),
        ski("suggest.ctx.night.pain"), ski("suggest.ctx.night.i_feel"),
        ski("suggest.ctx.night.can_you"), ski("suggest.ctx.night.please"),
        ski("suggest.ctx.night.i_am"), ski("suggest.ctx.night.when"),
      ];
    }
    if (hour < 10) {
      return [
        ski("suggest.ctx.morning.i_am"), ski("suggest.ctx.morning.i_need"),
        ski("suggest.ctx.morning.i_feel"), ski("suggest.ctx.morning.doctor"),
        ski("suggest.ctx.morning.i_want"), ski("suggest.ctx.morning.can_you"),
        ski("suggest.ctx.morning.please"), ski("suggest.ctx.morning.tell_me"),
      ];
    }
    return starters;
  }

  // Has base suggestions — return them (Layer 1 hit)
  if (keyed) {
    const recentTexts = recentMessages.map((m) => m.text.toLowerCase()).join(" ");
    return keyed.map(localize).sort((a, b) => {
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
