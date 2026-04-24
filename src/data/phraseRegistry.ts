/**
 * Central phrase registry — single source of truth for all speakable text.
 *
 * Structure (icons, colors, category hierarchy) is language-independent.
 * Text comes from locale files. All locales are statically imported so
 * language switching works offline — critical in hospital environments
 * where wifi is unreliable.
 *
 * Exports:
 *   t(key, locale)              — resolve a single phrase key
 *   getCategories(locale)       — patient phrase categories (CATS equivalent)
 *   getProviderCategories(locale) — provider phrase categories
 *   getPainData(locale)         — pain faces, descriptors, regions, template
 *   getWishTopics()             — SICG wish topics (returns keys)
 *   getTimeSuggestions(locale)  — time-of-day suggestions
 *   getSuggestionTree(locale)   — sentence builder suggestion tree
 *   getPatientSpokenPhrases(caregiverLocale) — flat string[] for patient audio cache
 *   composePainSentence(opts)   — fill pain template (key-based)
 *   composeWishSentence(opts)   — fill wish template (key-based)
 *   composeWishSentence(locale, ...) — fill wish template
 */

import en from "./locales/en";
import type { PhraseKey, LocaleStrings } from "./locales/en";
import type {
  Category,
  SubCategory,
  Phrase,
  PainFace,
  PainDescriptor,
  WishTopic,
  BodyRegion,
} from "../types";

// ── Locale registry ──────────────────────────────────────────────
// All locales are imported statically so language switching works offline.
//
// Registered-but-DRAFT locales (see DRAFT_LOCALES below) serve machine-
// translated content that is CLINICALLY UNREVIEWED. They're registered so
// the language picker exercises the bilingual code paths at test time;
// the clinical-review gate is enforced by DRAFT_LOCALES (surfaced to
// clinicians via a "draft" badge in the Settings picker) rather than by
// absence from this map.
import ar from "./locales/ar";
import da from "./locales/da";
import de from "./locales/de";
import el from "./locales/el";
import es from "./locales/es";
import fi from "./locales/fi";
import fr from "./locales/fr";
import he from "./locales/he";
import hi from "./locales/hi";
import it from "./locales/it";
import ja from "./locales/ja";
import ko from "./locales/ko";
import ms from "./locales/ms";
import nl from "./locales/nl";
import no from "./locales/no";
import pl from "./locales/pl";
import pt from "./locales/pt";
import ru from "./locales/ru";
import sw from "./locales/sw";
import tl from "./locales/tl";
import tr from "./locales/tr";
import vi from "./locales/vi";
import zh from "./locales/zh";

const LOCALES: Record<string, LocaleStrings> = {
  en,
  ar, da, de, el, es, fi, fr, he, hi, it, ja, ko, ms, nl, no, pl, pt, ru, sw, tl, tr, vi, zh,
};

/** Locales whose content is machine-translated and pending native-speaker
 *  + clinical review. The UI marks these as "draft" so staff see the
 *  review gate visually. Do NOT use for production patient care. */
export const DRAFT_LOCALES: ReadonlySet<string> = new Set([
  "ar", "da", "de", "el", "es", "fi", "fr", "he", "hi", "it",
  "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sw", "tl", "tr", "vi", "zh",
]);

/** True when the given locale is registered but not yet clinically reviewed. */
export function isDraftLocale(locale: string): boolean {
  return DRAFT_LOCALES.has(locale);
}

/** Resolve a phrase key for a locale, falling back to English. */
export function t(key: PhraseKey, locale: string = "en"): string {
  return LOCALES[locale]?.[key] ?? en[key];
}

// Re-export types for consumers
export type { PhraseKey, LocaleStrings };

/** A suggestion chip that may carry a phrase-registry key for bilingual
 *  resolution. Curated suggestions carry `key`; keyword/generic/LLM
 *  suggestions omit it (they are display-locale-only free text). */
export interface SuggestionItem {
  text: string;
  key?: PhraseKey;
}

// ── Patient categories ───────────────────────────────────────────

function phrase(key: PhraseKey, icon: string, locale: string): Phrase {
  return { text: t(key, locale), icon, key };
}

export function getCategories(locale: string = "en"): Category[] {
  return [
    {
      id: "quick",
      label: t("cat.quick", locale),
      icon: "\u26A1",
      color: "#2563EB",
      phrases: [
        phrase("quick.yes", "\uD83D\uDC4D", locale),
        phrase("quick.no", "\uD83D\uDC4E", locale),
        phrase("quick.thank_you", "\uD83D\uDE4F", locale),
        phrase("quick.please_wait", "\u270B", locale),
        phrase("quick.dont_understand", "\u2753", locale),
        phrase("quick.repeat", "\uD83D\uDD04", locale),
      ],
    },
    {
      id: "needs",
      label: t("cat.needs", locale),
      icon: "\uD83E\uDD32",
      color: "#059669",
      subs: [
        {
          label: t("sub.comfort", locale),
          phrases: [
            phrase("needs.comfort.water", "\uD83D\uDCA7", locale),
            phrase("needs.comfort.hungry", "\uD83C\uDF7D\uFE0F", locale),
            phrase("needs.comfort.cold", "\uD83E\uDD76", locale),
            phrase("needs.comfort.hot", "\uD83E\uDD75", locale),
            phrase("needs.comfort.bed", "\uD83D\uDECF\uFE0F", locale),
            phrase("needs.comfort.bathroom", "\uD83D\uDEBB", locale),
          ],
        },
        {
          label: t("sub.medical", locale),
          phrases: [
            phrase("needs.medical.medication", "\uD83D\uDC8A", locale),
            phrase("needs.medical.suction", "\uD83E\uDEC1", locale),
            phrase("needs.medical.nauseous", "\uD83E\uDD22", locale),
            phrase("needs.medical.breathe", "\uD83D\uDE2E\u200D\uD83D\uDCA8", locale),
            phrase("needs.medical.nurse", "\uD83D\uDC69\u200D\u2695\uFE0F", locale),
            phrase("needs.medical.doctor", "\uD83E\uDE7A", locale),
          ],
        },
        {
          label: t("sub.people", locale),
          phrases: [
            phrase("needs.people.family", "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", locale),
            phrase("needs.people.stay", "\uD83E\uDD1D", locale),
            phrase("needs.people.call", "\uD83D\uDCDE", locale),
            phrase("needs.people.interpreter", "\uD83D\uDDE3\uFE0F", locale),
          ],
        },
      ],
    },
    {
      id: "feelings",
      label: t("cat.feelings", locale),
      icon: "\uD83D\uDC9B",
      color: "#D97706",
      subs: [
        {
          label: t("sub.physical", locale),
          phrases: [
            phrase("feelings.physical.tired", "\uD83D\uDE34", locale),
            phrase("feelings.physical.uncomfortable", "\uD83D\uDE23", locale),
            phrase("feelings.physical.weak", "\uD83E\uDD71", locale),
            phrase("feelings.physical.better", "\uD83D\uDCAA", locale),
            phrase("feelings.physical.dizzy", "\uD83D\uDE35\u200D\uD83D\uDCAB", locale),
            phrase("feelings.physical.itchy", "\uD83E\uDD0F", locale),
          ],
        },
        {
          label: t("sub.emotional", locale),
          phrases: [
            phrase("feelings.emotional.scared", "\uD83D\uDE30", locale),
            phrase("feelings.emotional.lonely", "\uD83D\uDE14", locale),
            phrase("feelings.emotional.frustrated", "\uD83D\uDE24", locale),
            phrase("feelings.emotional.confused", "\uD83D\uDE15", locale),
            phrase("feelings.emotional.safe", "\uD83E\uDD17", locale),
            phrase("feelings.emotional.grateful", "\uD83E\uDD70", locale),
            phrase("feelings.emotional.worried", "\uD83D\uDE1F", locale),
            phrase("feelings.emotional.hopeful", "\u2728", locale),
            phrase("feelings.emotional.bored", "\uD83D\uDE11", locale),
            phrase("feelings.emotional.embarrassed", "\uD83D\uDE33", locale),
          ],
        },
      ],
    },
    {
      id: "questions",
      label: t("cat.questions", locale),
      icon: "\u2753",
      color: "#7C3AED",
      phrases: [
        phrase("questions.time", "\uD83D\uDD50", locale),
        phrase("questions.day", "\uD83D\uDCC5", locale),
        phrase("questions.whats_happening", "\u2753", locale),
        phrase("questions.go_home", "\uD83C\uDFE0", locale),
        phrase("questions.next_medication", "\uD83D\uDC8A", locale),
        phrase("questions.explain_treatment", "\uD83D\uDCCB", locale),
        phrase("questions.nurse_today", "\uD83D\uDC69\u200D\u2695\uFE0F", locale),
        phrase("questions.eat_drink", "\uD83C\uDF7D\uFE0F", locale),
        phrase("questions.see_family", "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", locale),
      ],
    },
    { id: "pain", label: t("cat.pain", locale), icon: "\uD83E\uDE79", color: "#DC2626", isPain: true },
  ];
}

// ── Provider categories ──────────────────────────────────────────

export function getProviderCategories(locale: string = "en"): Record<string, string[]> {
  return {
    [t("provider.cat.responses", locale).toLowerCase()]: [
      t("provider.responses.help", locale),
      t("provider.responses.interpreter", locale),
      t("provider.responses.family", locale),
      t("provider.responses.get_that", locale),
      t("provider.responses.doctor_know", locale),
      t("provider.responses.medication", locale),
      t("provider.responses.family_coming", locale),
      t("provider.responses.doctor_soon", locale),
      t("provider.responses.doing_well", locale),
      t("provider.responses.rest", locale),
    ],
    [t("provider.cat.questions", locale).toLowerCase()]: [
      t("provider.questions.feeling", locale),
      t("provider.questions.need", locale),
      t("provider.questions.where_hurts", locale),
      t("provider.questions.rate_pain", locale),
      t("provider.questions.sleep", locale),
      t("provider.questions.comfortable", locale),
    ],
    [t("provider.cat.directions", locale).toLowerCase()]: [
      t("provider.directions.procedure", locale),
      t("provider.directions.stay_in_bed", locale),
      t("provider.directions.vitals", locale),
      t("provider.directions.medication_time", locale),
      t("provider.directions.breathe", locale),
      t("provider.directions.call_button", locale),
    ],
    [t("provider.cat.goals_of_care", locale).toLowerCase()]: [
      t("provider.goals_of_care.matters_most", locale),
      t("provider.goals_of_care.goals", locale),
      t("provider.goals_of_care.worries", locale),
      t("provider.goals_of_care.strength", locale),
      t("provider.goals_of_care.joy", locale),
      t("provider.goals_of_care.wishes", locale),
      t("provider.goals_of_care.hopes", locale),
    ],
  };
}

/** Keyed variant of {@link getProviderCategories}. Each phrase carries its
 *  PhraseKey so `speakAsProvider` can resolve patientLang for speech
 *  (provider voice speaks patient's language per the voice-direction
 *  model). Section labels remain display-locale strings so the existing
 *  `activeSection` state, which stores the resolved label, still works. */
export function getKeyedProviderCategories(
  locale: string = "en",
): Record<string, SuggestionItem[]> {
  return {
    [t("provider.cat.responses", locale).toLowerCase()]: [
      si("provider.responses.help", locale),
      si("provider.responses.interpreter", locale),
      si("provider.responses.family", locale),
      si("provider.responses.get_that", locale),
      si("provider.responses.doctor_know", locale),
      si("provider.responses.medication", locale),
      si("provider.responses.family_coming", locale),
      si("provider.responses.doctor_soon", locale),
      si("provider.responses.doing_well", locale),
      si("provider.responses.rest", locale),
    ],
    [t("provider.cat.questions", locale).toLowerCase()]: [
      si("provider.questions.feeling", locale),
      si("provider.questions.need", locale),
      si("provider.questions.where_hurts", locale),
      si("provider.questions.rate_pain", locale),
      si("provider.questions.sleep", locale),
      si("provider.questions.comfortable", locale),
    ],
    [t("provider.cat.directions", locale).toLowerCase()]: [
      si("provider.directions.procedure", locale),
      si("provider.directions.stay_in_bed", locale),
      si("provider.directions.vitals", locale),
      si("provider.directions.medication_time", locale),
      si("provider.directions.breathe", locale),
      si("provider.directions.call_button", locale),
    ],
    [t("provider.cat.goals_of_care", locale).toLowerCase()]: [
      si("provider.goals_of_care.matters_most", locale),
      si("provider.goals_of_care.goals", locale),
      si("provider.goals_of_care.worries", locale),
      si("provider.goals_of_care.strength", locale),
      si("provider.goals_of_care.joy", locale),
      si("provider.goals_of_care.wishes", locale),
      si("provider.goals_of_care.hopes", locale),
    ],
  };
}

// ── Pain data ────────────────────────────────────────────────────

export function getEmojiFPS(): PainFace[] {
  return [
    { n: 0,  face: "\uD83D\uDE00", labelKey: "pain.face.0" },
    { n: 2,  face: "\uD83D\uDE42", labelKey: "pain.face.2" },
    { n: 4,  face: "\uD83D\uDE10", labelKey: "pain.face.4" },
    { n: 6,  face: "\uD83D\uDE41", labelKey: "pain.face.6" },
    { n: 8,  face: "\uD83D\uDE23", labelKey: "pain.face.8" },
    { n: 10, face: "\uD83D\uDE2D", labelKey: "pain.face.10" },
  ];
}

export function getPainDescriptors(): PainDescriptor[] {
  return [
    { key: "pain.descriptor.aching",        icon: "\u3030\uFE0F" },
    { key: "pain.descriptor.burning",       icon: "\uD83D\uDD25" },
    { key: "pain.descriptor.sharp",         icon: "\u26A1" },
    { key: "pain.descriptor.throbbing",     icon: "\uD83D\uDCA2" },
    { key: "pain.descriptor.cramping",      icon: "\uD83D\uDD04" },
    { key: "pain.descriptor.constant",      icon: "\u27A1\uFE0F" },
    { key: "pain.descriptor.comes_and_goes", icon: "\u2194\uFE0F" },
    { key: "pain.descriptor.numb",          icon: "\u2744\uFE0F" },
    { key: "pain.descriptor.pressure",      icon: "\u2B07\uFE0F" },
  ];
}

export function getBodyRegions(): BodyRegion[] {
  return [
    { key: "pain.region.head" },
    { key: "pain.region.face" },
    { key: "pain.region.neck" },
    { key: "pain.region.chest" },
    { key: "pain.region.left_shoulder" },
    { key: "pain.region.right_shoulder" },
    { key: "pain.region.left_arm" },
    { key: "pain.region.right_arm" },
    { key: "pain.region.stomach" },
    { key: "pain.region.upper_back" },
    { key: "pain.region.lower_back" },
    { key: "pain.region.left_leg" },
    { key: "pain.region.right_leg" },
  ];
}

/** Compose a pain sentence using the locale's template and word order. */
export function composePainSentence(opts: {
  locale: string;
  descriptorKey: PhraseKey;
  regionKey: PhraseKey;
  severity: number;
}): string {
  const { locale, descriptorKey, regionKey, severity } = opts;
  return t("pain.sentence", locale)
    .replace("{descriptor}", t(descriptorKey, locale).toLowerCase())
    .replace("{region}", t(regionKey, locale))
    .replace("{severity}", String(severity));
}

// ── SICG Wish topics ─────────────────────────────────────────────

const WISH_IDS = ["goals", "worries", "strength", "joy", "tradeoffs", "family", "hopes"] as const;

const WISH_ICONS: Record<string, string> = {
  goals: "\uD83C\uDFAF",
  worries: "\uD83D\uDE1F",
  strength: "\uD83D\uDCAA",
  joy: "\u2728",
  tradeoffs: "\u2696\uFE0F",
  family: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67",
  hopes: "\uD83C\uDF05",
};

const WISH_RESPONSE_KEYS: Record<string, PhraseKey[]> = {
  goals: [
    "wishes.goals.r.family", "wishes.goals.r.comfort", "wishes.goals.r.longevity",
    "wishes.goals.r.home", "wishes.goals.r.independence", "wishes.goals.r.peace",
  ],
  worries: [
    "wishes.worries.r.suffering", "wishes.worries.r.alone", "wishes.worries.r.burden",
    "wishes.worries.r.activities", "wishes.worries.r.leaving", "wishes.worries.r.unknown",
  ],
  strength: [
    "wishes.strength.r.family", "wishes.strength.r.faith", "wishes.strength.r.friends",
    "wishes.strength.r.wishes_heard", "wishes.strength.r.hope", "wishes.strength.r.carers",
  ],
  joy: [
    "wishes.joy.r.family", "wishes.joy.r.outdoors", "wishes.joy.r.hobbies",
    "wishes.joy.r.helping", "wishes.joy.r.spiritual", "wishes.joy.r.routines",
  ],
  tradeoffs: [
    "wishes.tradeoffs.r.everything", "wishes.tradeoffs.r.good_chance", "wishes.tradeoffs.r.try_stop",
    "wishes.tradeoffs.r.comfortable", "wishes.tradeoffs.r.think", "wishes.tradeoffs.r.family_first",
  ],
  family: [
    "wishes.family.r.know_well", "wishes.family.r.know_some", "wishes.family.r.not_talked",
    "wishes.family.r.need_help", "wishes.family.r.team_explain",
  ],
  hopes: [
    "wishes.hopes.r.get_better", "wishes.hopes.r.go_home", "wishes.hopes.r.comfortable",
    "wishes.hopes.r.family_ok", "wishes.hopes.r.more_time", "wishes.hopes.r.peace",
  ],
};

export function getWishTopics(): WishTopic[] {
  return WISH_IDS.map((id) => ({
    id,
    icon: WISH_ICONS[id],
    labelKey: `wishes.${id}.label` as PhraseKey,
    questionKey: `wishes.${id}.question` as PhraseKey,
    stemKey: `wishes.${id}.stem` as PhraseKey,
    responseKeys: WISH_RESPONSE_KEYS[id],
  }));
}

/** Compose a wish sentence using the locale's template. */
export function composeWishSentence(opts: {
  locale: string;
  topicId: string;
  selectedResponseKeys: PhraseKey[];
}): string {
  const { locale, topicId, selectedResponseKeys } = opts;
  if (!selectedResponseKeys.length) return "";
  const items = selectedResponseKeys.map((k) => t(k, locale).toLowerCase());
  const list =
    items.length === 1
      ? items[0]
      : items.length === 2
        ? `${items[0]} and ${items[1]}`
        : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  const stem = t(`wishes.${topicId}.stem` as PhraseKey, locale);
  return t("wishes.compose", locale)
    .replace("{stem}", stem)
    .replace("{list}", list);
}

// ── Time suggestions ─────────────────────────────────────────────

export function getTimeSuggestionsForPeriod(
  locale: string = "en",
): { morning: string[]; afternoon: string[]; evening: string[] } {
  return {
    morning: [
      t("time.morning.slept_well", locale),
      t("time.morning.didnt_sleep", locale),
      t("time.morning.breakfast", locale),
      t("time.morning.doctor_coming", locale),
    ],
    afternoon: [
      t("time.afternoon.tired", locale),
      t("time.afternoon.lunch", locale),
      t("time.afternoon.see_family", locale),
      t("time.afternoon.rest", locale),
    ],
    evening: [
      t("time.evening.cant_sleep", locale),
      t("time.evening.medication", locale),
      t("time.evening.call_family", locale),
      t("time.evening.pain", locale),
    ],
  };
}

/** Keyed variant of {@link getTimeSuggestionsForPeriod}. Each item carries
 *  its phrase-registry key so the speak path can resolve the caregiverLang
 *  text for the patient voice (voice-direction model). */
export function getKeyedTimeSuggestionsForPeriod(
  locale: string = "en",
): { morning: SuggestionItem[]; afternoon: SuggestionItem[]; evening: SuggestionItem[] } {
  return {
    morning: [
      si("time.morning.slept_well", locale),
      si("time.morning.didnt_sleep", locale),
      si("time.morning.breakfast", locale),
      si("time.morning.doctor_coming", locale),
    ],
    afternoon: [
      si("time.afternoon.tired", locale),
      si("time.afternoon.lunch", locale),
      si("time.afternoon.see_family", locale),
      si("time.afternoon.rest", locale),
    ],
    evening: [
      si("time.evening.cant_sleep", locale),
      si("time.evening.medication", locale),
      si("time.evening.call_family", locale),
      si("time.evening.pain", locale),
    ],
  };
}

// ── Sentence builder suggestion tree ─────────────────────────────

export function getSuggestionTree(locale: string = "en"): Record<string, string[]> {
  return {
    "": [
      t("suggest.start.i_am", locale), t("suggest.start.i_feel", locale),
      t("suggest.start.i_want", locale), t("suggest.start.i_need", locale),
      t("suggest.start.please", locale), t("suggest.start.when", locale),
      t("suggest.start.can_you", locale), t("suggest.start.tell_me", locale),
    ],
    "i am": [
      t("suggest.i_am.in_pain", locale), t("suggest.i_am.cold", locale),
      t("suggest.i_am.hot", locale), t("suggest.i_am.hungry", locale),
      t("suggest.i_am.thirsty", locale), t("suggest.i_am.tired", locale),
      t("suggest.i_am.uncomfortable", locale), t("suggest.i_am.okay", locale),
      t("suggest.i_am.not_okay", locale), t("suggest.i_am.ready", locale),
    ],
    "i feel": [
      t("suggest.i_feel.scared", locale), t("suggest.i_feel.sick", locale),
      t("suggest.i_feel.dizzy", locale), t("suggest.i_feel.weak", locale),
      t("suggest.i_feel.better", locale), t("suggest.i_feel.worse", locale),
      t("suggest.i_feel.nauseous", locale), t("suggest.i_feel.lonely", locale),
      t("suggest.i_feel.confused", locale), t("suggest.i_feel.safe", locale),
    ],
    "i feel scared": [
      t("suggest.i_feel_scared.procedure", locale), t("suggest.i_feel_scared.happening", locale),
      t("suggest.i_feel_scared.alone", locale), t("suggest.i_feel_scared.need_someone", locale),
    ],
    "i feel sick": [
      t("suggest.i_feel_sick.stomach", locale), t("suggest.i_feel_sick.dizzy", locale),
      t("suggest.i_feel_sick.help", locale),
    ],
    "i want": [
      t("suggest.i_want.water", locale), t("suggest.i_want.family", locale),
      t("suggest.i_want.go_home", locale), t("suggest.i_want.sleep", locale),
      t("suggest.i_want.medication", locale), t("suggest.i_want.blanket", locale),
      t("suggest.i_want.talk", locale), t("suggest.i_want.nurse", locale),
    ],
    "i want to go": [
      t("suggest.i_want_to_go.home", locale), t("suggest.i_want_to_go.sleep", locale),
      t("suggest.i_want_to_go.bathroom", locale),
    ],
    "i want my": [
      t("suggest.i_want_my.family", locale), t("suggest.i_want_my.medication", locale),
      t("suggest.i_want_my.phone", locale), t("suggest.i_want_my.glasses", locale),
      t("suggest.i_want_my.blanket", locale),
    ],
    "i need": [
      t("suggest.i_need.help", locale), t("suggest.i_need.water", locale),
      t("suggest.i_need.bathroom", locale), t("suggest.i_need.medication", locale),
      t("suggest.i_need.nurse", locale), t("suggest.i_need.doctor", locale),
      t("suggest.i_need.rest", locale), t("suggest.i_need.blanket", locale),
      t("suggest.i_need.suction", locale),
    ],
    "i need the": [
      t("suggest.i_need_the.nurse", locale), t("suggest.i_need_the.doctor", locale),
      t("suggest.i_need_the.bathroom", locale), t("suggest.i_need_the.light_off", locale),
      t("suggest.i_need_the.light_on", locale),
    ],
    "i need my": [
      t("suggest.i_need_my.medication", locale), t("suggest.i_need_my.family", locale),
      t("suggest.i_need_my.glasses", locale), t("suggest.i_need_my.phone", locale),
    ],
    "please": [
      t("suggest.please.help_me", locale), t("suggest.please.call_family", locale),
      t("suggest.please.light_off", locale), t("suggest.please.adjust_bed", locale),
      t("suggest.please.give_me", locale), t("suggest.please.explain", locale),
      t("suggest.please.come_back", locale), t("suggest.please.stay", locale),
      t("suggest.please.dont_leave", locale),
    ],
    "please help me": [
      t("suggest.please_help_me.pain", locale), t("suggest.please_help_me.breathe", locale),
      t("suggest.please_help_me.sick", locale), t("suggest.please_help_me.scared", locale),
    ],
    "please give me": [
      t("suggest.please_give_me.water", locale), t("suggest.please_give_me.medication", locale),
      t("suggest.please_give_me.blanket", locale), t("suggest.please_give_me.pain_relief", locale),
    ],
    "when": [
      t("suggest.when.go_home", locale), t("suggest.when.family", locale),
      t("suggest.when.medication", locale), t("suggest.when.doctor", locale),
      t("suggest.when.eat", locale), t("suggest.when.over", locale),
    ],
    "can you": [
      t("suggest.can_you.help", locale), t("suggest.can_you.call_family", locale),
      t("suggest.can_you.get_nurse", locale), t("suggest.can_you.explain", locale),
      t("suggest.can_you.light_off", locale), t("suggest.can_you.adjust_bed", locale),
      t("suggest.can_you.stay", locale),
    ],
    "tell me": [
      t("suggest.tell_me.happening", locale), t("suggest.tell_me.time", locale),
      t("suggest.tell_me.go_home", locale), t("suggest.tell_me.day", locale),
      t("suggest.tell_me.treatment", locale),
    ],
    "i am in pain": [
      t("suggest.i_am_in_pain.help", locale), t("suggest.i_am_in_pain.worse", locale),
      t("suggest.i_am_in_pain.medication", locale), t("suggest.i_am_in_pain.back", locale),
      t("suggest.i_am_in_pain.chest", locale), t("suggest.i_am_in_pain.stomach", locale),
    ],
    "i need help": [
      t("suggest.i_need_help.up", locale), t("suggest.i_need_help.breathing", locale),
      t("suggest.i_need_help.pain", locale), t("suggest.i_need_help.now", locale),
      t("suggest.i_need_help.please", locale),
    ],
    "i feel better": [
      t("suggest.i_feel_better.than_before", locale), t("suggest.i_feel_better.now", locale),
      t("suggest.i_feel_better.thanks", locale),
    ],
    "i feel worse": [
      t("suggest.i_feel_worse.than_before", locale), t("suggest.i_feel_worse.need_doctor", locale),
      t("suggest.i_feel_worse.help", locale), t("suggest.i_feel_worse.medication", locale),
    ],
  };
}

/** Helper: build a SuggestionItem from a PhraseKey. */
function si(key: PhraseKey, locale: string): SuggestionItem {
  return { text: t(key, locale), key };
}

/**
 * Keyed version of the suggestion tree — each entry carries both the
 * resolved display text AND the original PhraseKey.  Used by
 * SentenceBuilder to produce bilingual token arrays.
 *
 * Tree keys (the `Record` keys) remain resolved patientLang strings so
 * existing tree-traversal logic doesn't need changes — only the leaf
 * values gain the extra `.key` field.
 */
export function getKeyedSuggestionTree(locale: string = "en"): Record<string, SuggestionItem[]> {
  return {
    "": [
      si("suggest.start.i_am", locale), si("suggest.start.i_feel", locale),
      si("suggest.start.i_want", locale), si("suggest.start.i_need", locale),
      si("suggest.start.please", locale), si("suggest.start.when", locale),
      si("suggest.start.can_you", locale), si("suggest.start.tell_me", locale),
    ],
    "i am": [
      si("suggest.i_am.in_pain", locale), si("suggest.i_am.cold", locale),
      si("suggest.i_am.hot", locale), si("suggest.i_am.hungry", locale),
      si("suggest.i_am.thirsty", locale), si("suggest.i_am.tired", locale),
      si("suggest.i_am.uncomfortable", locale), si("suggest.i_am.okay", locale),
      si("suggest.i_am.not_okay", locale), si("suggest.i_am.ready", locale),
    ],
    "i feel": [
      si("suggest.i_feel.scared", locale), si("suggest.i_feel.sick", locale),
      si("suggest.i_feel.dizzy", locale), si("suggest.i_feel.weak", locale),
      si("suggest.i_feel.better", locale), si("suggest.i_feel.worse", locale),
      si("suggest.i_feel.nauseous", locale), si("suggest.i_feel.lonely", locale),
      si("suggest.i_feel.confused", locale), si("suggest.i_feel.safe", locale),
    ],
    "i feel scared": [
      si("suggest.i_feel_scared.procedure", locale), si("suggest.i_feel_scared.happening", locale),
      si("suggest.i_feel_scared.alone", locale), si("suggest.i_feel_scared.need_someone", locale),
    ],
    "i feel sick": [
      si("suggest.i_feel_sick.stomach", locale), si("suggest.i_feel_sick.dizzy", locale),
      si("suggest.i_feel_sick.help", locale),
    ],
    "i want": [
      si("suggest.i_want.water", locale), si("suggest.i_want.family", locale),
      si("suggest.i_want.go_home", locale), si("suggest.i_want.sleep", locale),
      si("suggest.i_want.medication", locale), si("suggest.i_want.blanket", locale),
      si("suggest.i_want.talk", locale), si("suggest.i_want.nurse", locale),
    ],
    "i want to go": [
      si("suggest.i_want_to_go.home", locale), si("suggest.i_want_to_go.sleep", locale),
      si("suggest.i_want_to_go.bathroom", locale),
    ],
    "i want my": [
      si("suggest.i_want_my.family", locale), si("suggest.i_want_my.medication", locale),
      si("suggest.i_want_my.phone", locale), si("suggest.i_want_my.glasses", locale),
      si("suggest.i_want_my.blanket", locale),
    ],
    "i need": [
      si("suggest.i_need.help", locale), si("suggest.i_need.water", locale),
      si("suggest.i_need.bathroom", locale), si("suggest.i_need.medication", locale),
      si("suggest.i_need.nurse", locale), si("suggest.i_need.doctor", locale),
      si("suggest.i_need.rest", locale), si("suggest.i_need.blanket", locale),
      si("suggest.i_need.suction", locale),
    ],
    "i need the": [
      si("suggest.i_need_the.nurse", locale), si("suggest.i_need_the.doctor", locale),
      si("suggest.i_need_the.bathroom", locale), si("suggest.i_need_the.light_off", locale),
      si("suggest.i_need_the.light_on", locale),
    ],
    "i need my": [
      si("suggest.i_need_my.medication", locale), si("suggest.i_need_my.family", locale),
      si("suggest.i_need_my.glasses", locale), si("suggest.i_need_my.phone", locale),
    ],
    "please": [
      si("suggest.please.help_me", locale), si("suggest.please.call_family", locale),
      si("suggest.please.light_off", locale), si("suggest.please.adjust_bed", locale),
      si("suggest.please.give_me", locale), si("suggest.please.explain", locale),
      si("suggest.please.come_back", locale), si("suggest.please.stay", locale),
      si("suggest.please.dont_leave", locale),
    ],
    "please help me": [
      si("suggest.please_help_me.pain", locale), si("suggest.please_help_me.breathe", locale),
      si("suggest.please_help_me.sick", locale), si("suggest.please_help_me.scared", locale),
    ],
    "please give me": [
      si("suggest.please_give_me.water", locale), si("suggest.please_give_me.medication", locale),
      si("suggest.please_give_me.blanket", locale), si("suggest.please_give_me.pain_relief", locale),
    ],
    "when": [
      si("suggest.when.go_home", locale), si("suggest.when.family", locale),
      si("suggest.when.medication", locale), si("suggest.when.doctor", locale),
      si("suggest.when.eat", locale), si("suggest.when.over", locale),
    ],
    "can you": [
      si("suggest.can_you.help", locale), si("suggest.can_you.call_family", locale),
      si("suggest.can_you.get_nurse", locale), si("suggest.can_you.explain", locale),
      si("suggest.can_you.light_off", locale), si("suggest.can_you.adjust_bed", locale),
      si("suggest.can_you.stay", locale),
    ],
    "tell me": [
      si("suggest.tell_me.happening", locale), si("suggest.tell_me.time", locale),
      si("suggest.tell_me.go_home", locale), si("suggest.tell_me.day", locale),
      si("suggest.tell_me.treatment", locale),
    ],
    "i am in pain": [
      si("suggest.i_am_in_pain.help", locale), si("suggest.i_am_in_pain.worse", locale),
      si("suggest.i_am_in_pain.medication", locale), si("suggest.i_am_in_pain.back", locale),
      si("suggest.i_am_in_pain.chest", locale), si("suggest.i_am_in_pain.stomach", locale),
    ],
    "i need help": [
      si("suggest.i_need_help.up", locale), si("suggest.i_need_help.breathing", locale),
      si("suggest.i_need_help.pain", locale), si("suggest.i_need_help.now", locale),
      si("suggest.i_need_help.please", locale),
    ],
    "i feel better": [
      si("suggest.i_feel_better.than_before", locale), si("suggest.i_feel_better.now", locale),
      si("suggest.i_feel_better.thanks", locale),
    ],
    "i feel worse": [
      si("suggest.i_feel_worse.than_before", locale), si("suggest.i_feel_worse.need_doctor", locale),
      si("suggest.i_feel_worse.help", locale), si("suggest.i_feel_worse.medication", locale),
    ],
  };
}

// ── Flat phrase lists for audio cache ────────────────────────────

/**
 * 702 composed pain sentences for the patient-voice cache runner (GPU-only
 * pass). Speaks in the caregiver's language. Deliberately separated from
 * getPatientSpokenPhrases because this set is only viable on WebGPU — WASM
 * would take hours.
 */
export function getPatientPainSentencesForSpeech(caregiverLocale: string = "en"): string[] {
  const phrases = new Set<string>();
  const descriptors = getPainDescriptors();
  const regions = getBodyRegions();
  const severities = getEmojiFPS();
  for (const d of descriptors) {
    for (const r of regions) {
      for (const s of severities) {
        phrases.add(composePainSentence({
          locale: caregiverLocale,
          descriptorKey: d.key,
          regionKey: r.key,
          severity: s.n,
        }));
      }
    }
  }
  return Array.from(phrases);
}

/**
 * Flat phrase list for the patient-voice audio cache runner. The patient
 * voice speaks the caregiver's language, so callers pass cfg.caregiverLang.
 * Excludes composed sentences (pain, wishes) — those assemble at runtime
 * from keys via composePainSentence / composeWishSentence.
 */
export function getPatientSpokenPhrases(caregiverLocale: string = "en"): string[] {
  const phrases = new Set<string>();

  for (const cat of getCategories(caregiverLocale)) {
    if (cat.phrases) {
      for (const p of cat.phrases) phrases.add(p.text);
    }
    if (cat.subs) {
      for (const sub of cat.subs) {
        for (const p of sub.phrases) phrases.add(p.text);
      }
    }
  }

  for (const f of getEmojiFPS()) phrases.add(t(f.labelKey, caregiverLocale));
  for (const d of getPainDescriptors()) phrases.add(t(d.key, caregiverLocale));
  for (const r of getBodyRegions()) phrases.add(t(r.key, caregiverLocale));

  for (const topic of getWishTopics()) {
    phrases.add(t(topic.questionKey, caregiverLocale));
    for (const rk of topic.responseKeys) phrases.add(t(rk, caregiverLocale));
  }

  const time = getTimeSuggestionsForPeriod(caregiverLocale);
  for (const arr of Object.values(time)) {
    for (const s of arr) phrases.add(s);
  }

  return Array.from(phrases);
}

/**
 * Flat phrase list for each provider-voice audio cache runner. Provider
 * voices speak the patient's language, so callers pass cfg.patientLang.
 */
export function getProviderSpokenPhrases(patientLocale: string = "en"): string[] {
  const phrases = new Set<string>();
  for (const arr of Object.values(getProviderCategories(patientLocale))) {
    for (const p of arr) phrases.add(p);
  }
  return Array.from(phrases);
}

