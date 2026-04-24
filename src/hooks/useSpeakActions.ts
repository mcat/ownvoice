import { useCallback } from "preact/hooks";
import { useSettingsStore, useActivePatient } from "../stores/settingsStore";
import { useConversationStore } from "../stores/conversationStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import { t as resolvePhrase } from "../data/phraseRegistry";
import type { PhraseKey } from "../data/locales/en";
import type { Speaker } from "../types";

/** Options for populating `Message.gloss` on the conversation thread.
 *
 *  - `gloss` — pre-composed gloss string (for pain/wish composed sentences)
 *  - `key`   — single PhraseKey; gloss is resolved from the opposite locale
 *
 *  When neither is provided (e.g. SentenceBuilder free-text), `gloss` stays
 *  undefined on the stored Message. */
export interface SpeakGlossOpts {
  gloss?: string;
  key?: PhraseKey;
}

export function useSpeakActions() {
  const cfg = useSettingsStore((s) => s.cfg);
  const active = useActivePatient();
  const addMessage = useConversationStore((s) => s.addMessage);
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

      addMessage(text, "patient", active.name, gloss);
      setSpeaking({ text, from: "patient" });
      speak(gloss ?? text, speaker);
    },
    [cfg, active, addMessage, setSpeaking],
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

      addMessage(text, "provider", provName, gloss);
      setSpeaking({ text, from: "provider" });
      speak(gloss ?? text, speaker);
    },
    [cfg, active, activeProv, addMessage, setSpeaking],
  );

  const addToThread = useCallback(
    (text: string, from: "patient" | "provider", label?: string, gloss?: string) => {
      if (!cfg || !active) return;
      const fallbackLabel =
        from === "patient" ? active.name : label ?? "Care Team";
      addMessage(text, from, fallbackLabel, gloss);
    },
    [cfg, active, addMessage],
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

  return { speakAsPatient, speakAsProvider, addToThread, repeatSpeak, activeProv };
}
