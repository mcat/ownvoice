import { useEffect } from "preact/hooks";
import { useTheme } from "./hooks/useTheme";
import { useSpeakActions } from "./hooks/useSpeakActions";
import { useConversationStore } from "./stores/conversationStore";
import { useUIStore } from "./stores/uiStore";
import { useSettingsStore } from "./stores/settingsStore";
import { resetAll } from "./stores/resetAll";
import { getCategories, getTimeSuggestionsForPeriod } from "./data/phraseRegistry";
import { Header } from "./components/layout/Header";
import { TabBar } from "./components/layout/TabBar";

import { Speaking } from "./components/shared/Speaking";
import { PhraseGrid } from "./components/phrases/PhraseGrid";
import { SubcategoryChips } from "./components/phrases/SubcategoryChips";
import { PainFlow } from "./components/pain/PainFlow";
import { Thread } from "./components/conversation/Thread";
import { MyWishes } from "./components/wishes/MyWishes";
import { ProviderPanel } from "./components/provider/ProviderPanel";
import { ListenPanel } from "./components/provider/ListenPanel";
import { SentenceBuilder } from "./components/builder/SentenceBuilder";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { PinGate } from "./components/shared/PinGate";
import { Setup } from "./components/settings/Setup";
import { getModelManager } from "./models/modelManager";
import { bootModels } from "./models/bootModels";
import { initGPU } from "./models/ttsEngine";
import { MODEL_URLS } from "./models/types";
import { primeSpeechSynthesis, setFallbackVoice } from "./speak";

export function App() {
  // Theme state — useTheme attaches the system listener and syncs side effects.
  // The main.tsx subscribe callback handles DOM updates for the root div.
  const { theme, t } = useTheme();

  const messages = useConversationStore((s) => s.messages);
  const { speakAsPatient, speakAsProvider, addToThread, repeatSpeak, activeProv } =
    useSpeakActions();

  // UI store — transient navigation and overlay state
  const tab = useUIStore((s) => s.tab);
  const sub = useUIStore((s) => s.sub);
  const setSub = useUIStore((s) => s.setSub);
  const builderOpen = useUIStore((s) => s.builderOpen);
  const wishesOpen = useUIStore((s) => s.wishesOpen);
  const providerOpen = useUIStore((s) => s.providerOpen);
  const listenOpen = useUIStore((s) => s.listenOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const pinEntryOpen = useUIStore((s) => s.pinEntryOpen);
  const activeProvIdx = useUIStore((s) => s.activeProvIdx);
  const speaking = useUIStore((s) => s.speaking);
  const setSpeaking = useUIStore((s) => s.setSpeaking);
  const closeOverlay = useUIStore((s) => s.closeOverlay);
  const openOverlay = useUIStore((s) => s.openOverlay);
  const setActiveProvIdx = useUIStore((s) => s.setActiveProvIdx);

  // Settings store — persisted to IndexedDB
  const cfg = useSettingsStore((s) => s.cfg);
  const setCfg = useSettingsStore((s) => s.setCfg);
  const hasHydrated = useSettingsStore((s) => s._hasHydrated);

  // Initialize model manager and boot all on-device models (TTS, LLM, STT)
  useEffect(() => {
    // Boot GPU TTS first (main thread, WebGPU/Metal). If it fails,
    // the WASM worker acts as fallback. Don't run both simultaneously —
    // concurrent ORT WASM init causes contention.
    initGPU(MODEL_URLS.tts).then(ok => {
      console.log("[OwnVoice] GPU TTS:", ok ? "ready" : "unavailable");
      // Boot workers (LLM, STT, and TTS WASM fallback if GPU unavailable)
      bootModels();
    }).catch(err => {
      console.warn("[OwnVoice] GPU TTS error:", err);
      bootModels();
    });
    primeSpeechSynthesis();
  }, []);

  // Sync the user-selected fallback voice to the speak module
  useEffect(() => {
    setFallbackVoice(cfg?.fallbackVoice?.voiceURI ?? null);
  }, [cfg?.fallbackVoice?.voiceURI]);

  // Wait for IndexedDB hydration before deciding setup vs main app
  if (!hasHydrated) return null;
  if (!cfg) return <Setup onDone={setCfg} />;

  const cats = getCategories(cfg.patientLang);
  const cat = cats.find((c) => c.id === tab);
  const timeSugs = getTimeSuggestionsForPeriod(cfg.patientLang);
  const hr = new Date().getHours();
  const sug = hr < 12 ? timeSugs.morning : hr < 17 ? timeSugs.afternoon : timeSugs.evening;


  const renderContent = () => {
    if (builderOpen) {
      return (
        <SentenceBuilder
          key="builder"
          onSend={(text) => {
            speakAsPatient(text);
          }}
          t={t}
          theme={theme}
          messages={messages}
        />
      );
    }

    if (tab === "pain") {
      return <PainFlow onSelect={speakAsPatient} t={t} theme={theme} />;
    }

    if (cat?.subs) {
      return (
        <div>
          <SubcategoryChips
            labels={cat.subs.map((s) => s.label)}
            activeIndex={sub}
            onSelect={setSub}
            t={t}
          />
          <PhraseGrid phrases={cat.subs[sub].phrases} onTap={speakAsPatient} t={t} />
        </div>
      );
    }

    if (cat?.phrases) {
      return <PhraseGrid phrases={cat.phrases} onTap={speakAsPatient} t={t} />;
    }

    return null;
  };

  return (
    <div
      class="font-sans min-h-screen flex flex-col relative"
      style={{ background: t.bg, color: t.text }}
    >
      <Header cfg={cfg} />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "18px 32px",
          paddingBottom: 160,
        }}
      >
        <Thread messages={messages} t={t} onRepeat={repeatSpeak} />

        {/* Time-of-day suggestions on Quick tab */}
        {tab === "quick" && !builderOpen && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
              }}
            >
              {sug.map((s) => (
                <button
                  key={s}
                  onClick={() => speakAsPatient(s)}
                  class="font-sans"
                  style={{
                    background: t.card,
                    border: `1.5px solid ${theme === "dark" ? "#60A5FA30" : "#2563EB30"}`,
                    borderRadius: 24,
                    padding: "12px 20px",
                    fontSize: 16,
                    color: theme === "dark" ? "#60A5FA" : "#2563EB",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    boxShadow:
                      theme === "dark" ? "none" : "0 1px 4px rgba(37,99,235,0.06)",
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {renderContent()}
      </div>

      <TabBar />

      {/* Overlays */}
      {speaking && (
        <Speaking
          text={speaking.text}
          speaker={
            speaking.from === "patient"
              ? cfg.patientName
              : activeProv.name || "Care Team"
          }
          isVoice={
            speaking.from === "patient"
              ? cfg.patientVoice
              : activeProv.hasVoice
          }
          isProvider={speaking.from === "provider"}
          onDone={() => setSpeaking(null)}
          t={t}
        />
      )}

      {wishesOpen && (
        <MyWishes
          onSpeak={speakAsPatient}
          onAddToThread={addToThread}
          onClose={() => closeOverlay("wishes")}
          t={t}
          theme={theme}
          patientName={cfg.patientName}
        />
      )}

      {providerOpen && (
        <ProviderPanel
          onSend={(text) => {
            speakAsProvider(text);
            closeOverlay("provider");
          }}
          onClose={() => closeOverlay("provider")}
          cfg={cfg}
          t={t}
          theme={theme}
          activeProvIdx={activeProvIdx}
          onSelectProvider={setActiveProvIdx}
        />
      )}

      {listenOpen && (
        <ListenPanel
          onAddMessage={(text, providerLabel) => {
            addToThread(text, "provider", providerLabel);
            closeOverlay("listen");
          }}
          onClose={() => closeOverlay("listen")}
          t={t}
          theme={theme}
          providers={cfg.providers}
          activeProvIdx={activeProvIdx}
          onSelectProvider={setActiveProvIdx}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          cfg={cfg}
          onUpdate={(c) => {
            useSettingsStore.getState().setCfg(c);
            closeOverlay("settings");
          }}
          onReset={resetAll}
          onClose={() => closeOverlay("settings")}
          t={t}
          theme={theme}
        />
      )}

      {pinEntryOpen && (
        <PinGate
          pin={cfg.pin}
          onSuccess={() => {
            closeOverlay("pinEntry");
            openOverlay("settings");
          }}
          onClose={() => closeOverlay("pinEntry")}
          t={t}
          theme={theme}
        />
      )}
    </div>
  );
}
