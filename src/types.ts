import type { PhraseKey } from "./data/locales/en";

export interface Phrase {
  text: string;
  icon: string;
  /** Registry key for bilingual resolution. Carried so the speak path can
   *  resolve caregiverLang text for patient voice (and patientLang for
   *  provider voice) without the UI having to do the lookup. */
  key?: PhraseKey;
}

export interface SubCategory {
  label: string;
  phrases: Phrase[];
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  phrases?: Phrase[];
  subs?: SubCategory[];
  isPain?: boolean;
}

export interface PainFace {
  n: number;
  face: string;
  labelKey: PhraseKey;
}

export interface PainDescriptor {
  key: PhraseKey;
  icon: string;
}

export interface WishTopic {
  id: string;
  icon: string;
  labelKey: PhraseKey;
  questionKey: PhraseKey;
  stemKey: PhraseKey;
  responseKeys: PhraseKey[];
}

export interface BodyRegion {
  key: PhraseKey;
}

export interface Speaker {
  name: string;
  type: "patient" | "provider";
  /** Chatterbox Turbo speaker data (all speech encoder outputs for synthesis) */
  embedding?: unknown;
  /** BCP 47 language code (e.g. "en", "es", "zh") */
  lang?: string;
}

export interface Message {
  from: "patient" | "provider";
  text: string;
  /** Secondary-locale rendering for Thread dual-locale display. Populated
   *  by useSpeakActions at add time in PR 4. */
  gloss?: string;
  time: string;
  label: string;
}

export interface Provider {
  name: string;
  hasVoice: boolean;
  emoji?: string;
  /** Chatterbox Turbo speaker data for this provider's cloned voice */
  embedding?: unknown;
}

export interface FallbackVoice {
  voiceURI: string;
  name: string;
}

export interface Patient {
  /** UUID, generated client-side at add-time. Never displayed. */
  id: string;
  name: string;
  bed: string;
  /** BCP 47 — each patient's preferred language. */
  patientLang: string;
  hasVoice: boolean;
  /** Chatterbox Turbo speech-encoder output for this patient's voice clone. */
  speakerData: unknown;
  /** Per-patient system-voice preference paired with patientLang. */
  fallbackVoice?: FallbackVoice | null;
  /** Unix ms when the patient was added. Used for sort order. */
  addedAt: number;
  /** Unix ms of the last time this patient was active. */
  lastActiveAt: number;
}

export interface AppSettings {
  pin: string;
  /** The caregiver/listener's language. Controls the language the patient
   *  voice speaks and the language provider-facing UI renders. Defaults
   *  to "en"; adjustable from Setup and Settings. */
  caregiverLang: string;
  /** Accessibility: amplifies feedback + lengthens debounce for patients using
   *  assistive input devices (trackball, joystick, AssistiveTouch, switch). */
  assistiveInput?: boolean;
  providers: Provider[];
  patients: Patient[];
  /** null when no patient is active (fresh device, or after removing the
   *  last patient). */
  activePatientId: string | null;
}

export interface SpeakingState {
  text: string;
  from: "patient" | "provider";
}

export interface Language {
  code: string;
  label: string;
  flag: string;
}
