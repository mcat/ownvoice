import { useCallback } from "preact/hooks";
import { useSettingsStore, useActivePatient } from "../stores/settingsStore";
import { useConversationStore } from "../stores/conversationStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import type { Speaker } from "../types";

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
    (text: string) => {
      if (!cfg || !active) return;
      const speaker: Speaker = {
        name: active.name,
        type: "patient",
        embedding: active.speakerData ?? undefined,
        lang: active.patientLang,
      };
      addMessage(text, "patient", active.name);
      // Speaking drives its own lifecycle via onDone — no external timer
      // here. Setting a duplicate timeout caused the overlay to unmount
      // 400ms before the internal animation's natural end, and rapid
      // successive taps left stale timers from prior phrases pending.
      setSpeaking({ text, from: "patient" });
      speak(text, speaker);
    },
    [cfg, active, addMessage, setSpeaking],
  );

  const speakAsProvider = useCallback(
    (text: string) => {
      if (!cfg || !active) return;
      const provName = activeProv.name || "Care Team";
      const speaker: Speaker = {
        name: provName,
        type: "provider",
        embedding: activeProv.embedding,
        lang: active.patientLang,
      };
      addMessage(text, "provider", provName);
      setSpeaking({ text, from: "provider" });
      speak(text, speaker);
    },
    [cfg, active, activeProv, addMessage, setSpeaking],
  );

  const addToThread = useCallback(
    (text: string, from: "patient" | "provider", label?: string) => {
      if (!cfg || !active) return;
      const fallbackLabel =
        from === "patient" ? active.name : label ?? "Care Team";
      addMessage(text, from, fallbackLabel);
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
      const speaker: Speaker = {
        name,
        type: from,
        embedding,
        lang: active.patientLang,
      };
      setSpeaking({ text, from });
      speak(text, speaker);
    },
    [cfg, active, activeProv, setSpeaking],
  );

  return { speakAsPatient, speakAsProvider, addToThread, repeatSpeak, activeProv };
}
