import { useCallback } from "preact/hooks";
import { useSettingsStore, useActivePatient } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import { t as resolvePhrase } from "../data/phraseRegistry";
import { log } from "../audit/logger";
import { EVENT } from "../audit/events";
import { ATTR } from "../audit/attrs";
import type { PhraseKey } from "../data/locales/en";
import type { Speaker } from "../types";

/** Options for populating `Message.gloss` on the conversation thread.
 *
 *  - `gloss` — pre-composed gloss string (for pain/wish composed sentences)
 *  - `key`   — single PhraseKey; gloss is resolved from the opposite locale
 *  - `icon`  — decorative emoji from the originating phrase button
 *
 *  When neither is provided (e.g. SentenceBuilder free-text), `gloss` stays
 *  undefined on the stored Message. */
export interface SpeakGlossOpts {
  gloss?: string;
  key?: PhraseKey;
  icon?: string;
}

export function useSpeakActions() {
  const cfg = useSettingsStore((s) => s.cfg);
  const active = useActivePatient();
  const setSpeaking = useUIStore((s) => s.setSpeaking);
  const activeProvIdx = useUIStore((s) => s.activeProvIdx);

  const activeProv = cfg?.providers?.[activeProvIdx] ?? cfg?.providers?.[0] ?? {
    name: "Care Team",
    hasVoice: false,
  };

  const speakAsPatient = useCallback(
    (text: string, opts?: SpeakGlossOpts) => {
      if (!cfg || !active) return;
      const caregiverLang = cfg.caregiverLang ?? "en";
      const speaker: Speaker = {
        name: active.name,
        type: "patient",
        embedding: active.speakerData ?? undefined,
        lang: caregiverLang,
      };

      // Resolve gloss: explicit > key-based > undefined.
      //
      // Voice-direction model: patient voice speaks caregiverLang, so the
      // gloss (caregiverLang rendering) IS the speech text. When present,
      // speak the gloss; otherwise fall back to the display text.
      const gloss = opts?.gloss
        ?? (opts?.key ? resolvePhrase(opts.key, caregiverLang) : undefined);

      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: text,
          [ATTR.SPEECH_GLOSS]: gloss ?? "",
          [ATTR.SPEECH_ICON]: opts?.icon ?? "",
          [ATTR.SPEECH_PHRASE_KEY]: opts?.key ?? "",
          [ATTR.ACTOR]: "patient",
          [ATTR.SPEECH_LANG]: caregiverLang,
        },
      });
      setSpeaking({ text, from: "patient", gloss });
      speak(gloss ?? text, speaker);
    },
    [cfg, active, setSpeaking],
  );

  const speakAsProvider = useCallback(
    (text: string, opts?: SpeakGlossOpts) => {
      if (!cfg || !active) return;
      const patientLang = active.patientLang ?? "en";
      const provName = activeProv.name || "Care Team";
      const speaker: Speaker = {
        name: provName,
        type: "provider",
        embedding: activeProv.embedding,
        lang: patientLang,
      };

      // Voice-direction model: provider voice speaks patientLang, so gloss
      // IS the speech text. Speak gloss when present; fall back to text.
      const gloss = opts?.gloss
        ?? (opts?.key ? resolvePhrase(opts.key, patientLang) : undefined);

      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: text,
          [ATTR.SPEECH_GLOSS]: gloss ?? "",
          [ATTR.SPEECH_ICON]: opts?.icon ?? "",
          [ATTR.SPEECH_PHRASE_KEY]: opts?.key ?? "",
          [ATTR.ACTOR]: "provider",
          [ATTR.PROVIDER_NAME]: provName,
          [ATTR.SPEECH_LANG]: patientLang,
        },
      });
      setSpeaking({ text, from: "provider", gloss });
      speak(gloss ?? text, speaker);
    },
    [cfg, active, activeProv, setSpeaking],
  );

  /** Add a thread entry without speaking it.
   *
   *  Used by surfaces that pre-compose a thread item (e.g. MyWishes injecting
   *  the SICG question alongside the spoken response). Emits THREAD_COMPOSE
   *  so `useThreadView` picks it up and renders it.
   *
   *  Defaults to a patient-actor entry. SICG question stems in MyWishes are
   *  provider-direction (the care team is asking the patient about goals of
   *  care), so callers pass `from: "provider"` with an optional providerLabel
   *  to flip the styling. */
  const composeThread = useCallback(
    (
      text: string,
      opts?: { gloss?: string; from?: "patient" | "provider"; providerLabel?: string },
    ) => {
      if (!cfg || !active) return;
      const from = opts?.from ?? "patient";
      const attributes: Record<string, string> = {
        [ATTR.SPEECH_TEXT]: text,
        [ATTR.SPEECH_GLOSS]: opts?.gloss ?? "",
        [ATTR.ACTOR]: from,
      };
      if (from === "provider") {
        attributes[ATTR.PROVIDER_NAME] = opts?.providerLabel ?? "Care Team";
      }
      log({ name: EVENT.THREAD_COMPOSE, attributes });
    },
    [cfg, active],
  );

  const repeatSpeak = useCallback(
    (text: string, from: "patient" | "provider") => {
      if (!cfg || !active) return;
      const name =
        from === "patient"
          ? active.name
          : activeProv.name || "Care Team";
      const embedding =
        from === "patient" ? active.speakerData ?? undefined : activeProv.embedding;
      // Patient voice speaks caregiverLang; provider voice speaks patientLang.
      const lang =
        from === "patient"
          ? (cfg.caregiverLang ?? "en")
          : (active.patientLang ?? "en");
      const speaker: Speaker = {
        name,
        type: from,
        embedding,
        lang,
      };
      setSpeaking({ text, from });
      speak(text, speaker);
    },
    [cfg, active, activeProv, setSpeaking],
  );

  return {
    speakAsPatient,
    speakAsProvider,
    composeThread,
    repeatSpeak,
    activeProv,
  };
}
