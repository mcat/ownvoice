import { useEffect, useMemo } from "preact/hooks";
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
import { bootModels, verifyAllOnBoot } from "./models/bootModels";
import { resumePendingOnVisible } from "./models/offlineResume";
import { initGPU, isGPUReady, onGPUReady } from "./models/ttsEngine";
import { MODEL_URLS } from "./models/types";
import { primeSpeechSynthesis, setFallbackVoice } from "./speak";
import * as audioCacheRunner from "./models/audioCacheRunner";
import { embeddingFingerprint } from "./models/audioCache";

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
  const speakerData = useSettingsStore((s) => s.speakerData);
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
    // Run OPFS integrity check in parallel — surfaces stale/partial models
    // in Settings without blocking inference boot.
    verifyAllOnBoot().catch((err) =>
      console.warn("[OwnVoice] boot verify failed:", err),
    );
    // Resume any interrupted model downloads — fires on boot if partials
    // exist, and again whenever the tab returns to the foreground.
    const unsubResume = resumePendingOnVisible();
    primeSpeechSynthesis();
    return () => {
      unsubResume();
    };
  }, []);

  // Sync the user-selected fallback voice to the speak module
  useEffect(() => {
    setFallbackVoice(cfg?.fallbackVoice?.voiceURI ?? null);
  }, [cfg?.fallbackVoice?.voiceURI]);

  // Pre-generate cloned-voice audio in the background whenever the set
  // of embeddings or the patient locale changes. The runner aborts any
  // in-flight work on each invocation, and `generateAllPhrases` skips
  // already-cached phrases — so this is also the auto-resume path on
  // page reload once the TTS model is ready.
  const embeddingKey = useMemo(() => {
    if (!cfg) return "";
    const patientFp = embeddingFingerprint(speakerData);
    const providerFps = cfg.providers
      .map((p, i) => `${i}:${embeddingFingerprint(p.embedding)}`)
      .join(",");
    return `${cfg.patientLang}|${patientFp}|${providerFps}`;
  }, [cfg, speakerData]);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    const mgr = getModelManager();

    function tryRun() {
      if (cancelled || !cfg) return false;
      // Start as soon as EITHER TTS path is ready. The audio cache's
      // synthesizeBestAvailable prefers GPU and falls back to WASM —
      // the GPU path is typically ready minutes before the WASM worker
      // finishes downloading its ~1 GB of weights.
      if (!isGPUReady() && !mgr.isReady("tts")) return false;
      audioCacheRunner.runPreGeneration(cfg, speakerData);
      return true;
    }

    if (tryRun()) return;

    // Neither path is ready yet. Listen on both signals.
    const unsubWasm = mgr.onProgress(() => { tryRun(); });
    const unsubGpu = onGPUReady(() => { tryRun(); });
    return () => {
      cancelled = true;
      unsubWasm();
      unsubGpu();
    };
  }, [embeddingKey, cfg, speakerData]);

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
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
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
      class="font-sans flex flex-col relative"
      style={{ background: t.bg, color: t.text, height: "100dvh", overflow: "hidden" }}
    >
      <Header cfg={cfg} />

      {/* Main content area. Thread is pinned at the top; the region below
          scrolls independently so the conversation never scrolls out of view. */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "18px 32px 20px",
          overflow: "hidden",
        }}
      >
        {/* Visually-hidden page heading — inside main landmark so AT sees
            the page title in context of its region. */}
        <h1
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          OwnVoice — {cfg.patientName || "Patient"} conversation
        </h1>

        <Thread messages={messages} t={t} onRepeat={repeatSpeak} />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            // Keep focus rings on edge children from being clipped by the
            // scroll boundary (WCAG 2.4.11 / 2.4.13).
            padding: "4px 4px 0",
          }}
        >
          {/* Time-of-day suggestions on Quick tab */}
          {tab === "quick" && !builderOpen && (
            <div style={{ marginBottom: 16, flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  // overflowX:auto implies overflow-y:auto, and this row is
                  // the clip boundary for its chip children. Pad all four
                  // sides so focus rings on the leftmost/rightmost chips
                  // aren't clipped.
                  padding: "4px 4px 6px",
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
                      borderRadius: 10,
                      padding: "10px 16px",
                      fontSize: 16,
                      // Patient blue text: darker shade for AAA 7:1 on card bg
                      color: theme === "dark" ? "#60A5FA" : "#1E40AF",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
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
      </main>

      <TabBar />

      {/* Overlays */}
      {speaking && (
        <Speaking
          text={speaking.text}
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
