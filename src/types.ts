import type { PhraseKey } from "./data/locales/en";

export interface Phrase {
  text: string;
  icon: string;
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

export interface AppSettings {
  patientName: string;
  bed: string;
  patientLang: string;
  /** The caregiver/listener's language. Controls the language the patient
   *  voice speaks and the language provider-facing UI renders. Defaults
   *  to "en"; adjustable from Setup and Settings. */
  caregiverLang: string;
  patientVoice: boolean;
  pin: string;
  providers: Provider[];
  /** User-selected Web Speech API voice for the fallback TTS path */
  fallbackVoice?: FallbackVoice | null;
  /** Accessibility: amplifies feedback + lengthens debounce for patients using
   *  assistive input devices (trackball, joystick, AssistiveTouch, switch). */
  assistiveInput?: boolean;
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
