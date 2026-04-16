import { useCallback } from "preact/hooks";
import { useSettingsStore } from "../stores/settingsStore";
import { useConversationStore } from "../stores/conversationStore";
import { useUIStore } from "../stores/uiStore";
import { speak } from "../speak";
import type { Speaker } from "../types";

export function useSpeakActions() {
  const cfg = useSettingsStore((s) => s.cfg);
  const speakerData = useSettingsStore((s) => s.speakerData);
  const addMessage = useConversationStore((s) => s.addMessage);
  const setSpeaking = useUIStore((s) => s.setSpeaking);
  const activeProvIdx = useUIStore((s) => s.activeProvIdx);

  const activeProv = cfg?.providers?.[activeProvIdx] ?? cfg?.providers?.[0] ?? {
    name: "Care Team",
    hasVoice: false,
  };

  const speakAsPatient = useCallback(
    (text: string) => {
      if (!cfg) return;
      const speaker: Speaker = {
        name: cfg.patientName,
        type: "patient",
        embedding: speakerData ?? undefined,
        lang: cfg.patientLang,
      };
      addMessage(text, "patient", cfg.patientName);
      setSpeaking({ text, from: "patient" });
      const dur = Math.max(1400, text.length * 55);
      speak(text, speaker);
      setTimeout(() => setSpeaking(null), dur);
    },
    [cfg, speakerData, addMessage, setSpeaking],
  );

  const speakAsProvider = useCallback(
    (text: string) => {
      if (!cfg) return;
      const provName = activeProv.name || "Care Team";
      const speaker: Speaker = { name: provName, type: "provider" };
      addMessage(text, "provider", provName);
      setSpeaking({ text, from: "provider" });
      const dur = Math.max(1400, text.length * 55);
      speak(text, speaker);
      setTimeout(() => setSpeaking(null), dur);
    },
    [cfg, activeProv, addMessage, setSpeaking],
  );

  const addToThread = useCallback(
    (text: string, from: "patient" | "provider", label?: string) => {
      if (!cfg) return;
      const fallbackLabel =
        from === "patient" ? cfg.patientName : label ?? "Care Team";
      addMessage(text, from, fallbackLabel);
    },
    [cfg, addMessage],
  );

  const repeatSpeak = useCallback(
    (text: string, from: "patient" | "provider") => {
      if (!cfg) return;
      const name =
        from === "patient"
          ? cfg.patientName
          : activeProv.name || "Care Team";
      const speaker: Speaker = { name, type: from };
      setSpeaking({ text, from });
      const dur = Math.max(1400, text.length * 55);
      speak(text, speaker);
      setTimeout(() => setSpeaking(null), dur);
    },
    [cfg, activeProv, setSpeaking],
  );

  return { speakAsPatient, speakAsProvider, addToThread, repeatSpeak, activeProv };
}
