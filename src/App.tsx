import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useTheme } from "./hooks/useTheme";
import { useAssistiveInput } from "./hooks/useAssistiveInput";
import { useSpeakActions } from "./hooks/useSpeakActions";
import { useThreadView } from "./audit/useThreadView";
import { useUIStore } from "./stores/uiStore";
import { useSettingsStore, useActivePatient } from "./stores/settingsStore";
import { resetAll } from "./stores/resetAll";
import { t as resolvePhrase, getCategories, getKeyedTimeSuggestionsForPeriod, getPatientSpokenPhrases } from "./data/phraseRegistry";
import { prewarmHotCache } from "./speak";
import { Header } from "./components/layout/Header";
import { TabBar } from "./components/layout/TabBar";

import { Speaking } from "./components/shared/Speaking";
import { PhraseGrid } from "./components/phrases/PhraseGrid";
import { SubcategoryChips } from "./components/phrases/SubcategoryChips";
import { SuggestionChip } from "./components/phrases/SuggestionChip";
import { PainFlow } from "./components/pain/PainFlow";
import { Thread } from "./components/conversation/Thread";
import { MyWishes } from "./components/wishes/MyWishes";
import { ProviderPanel } from "./components/provider/ProviderPanel";
import { SentenceBuilder } from "./components/builder/SentenceBuilder";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { CareTeamSheet } from "./components/settings/CareTeamSheet";
import { AccessibilitySheet } from "./components/settings/AccessibilitySheet";
import { DiagnosticsSheet } from "./components/settings/DiagnosticsSheet";
import { ActivityLog } from "./components/diag/ActivityLog";
import { AboutSheet } from "./components/settings/AboutSheet";
import { ResetSheet } from "./components/settings/ResetSheet";
import { PatientsScreen } from "./components/patients/PatientsScreen";
import { PatientEditSheet } from "./components/patient/PatientEditSheet";
import { PinGate } from "./components/shared/PinGate";
import { ConfirmDialogHost } from "./components/shared/ConfirmDialog";
import { StaffSessionTimer } from "./components/shared/StaffSessionTimer";
import { ResumePromptBanner } from "./components/diag/ResumePromptBanner";
import { Setup } from "./components/settings/Setup";
import { getModelManager } from "./models/modelManager";
import { bootTTSWasm, bootSTT, verifyAllOnBoot, deferIfReload } from "./models/bootModels";
import { drivePrimer } from "./models/drivePrimer";
import { resumePendingOnVisible } from "./models/offlineResume";
import { useOfflineStore } from "./stores/offlineStore";
import { initGPU, isGPUReady, onGPUReady } from "./models/ttsEngine";
import { MODEL_URLS } from "./models/types";
import { primeSpeechSynthesis, setFallbackVoice } from "./speak";
import * as audioCacheRunner from "./models/audioCacheRunner";
import { embeddingFingerprint } from "./models/audioCache";

export function App() {
  // Theme state — useTheme attaches the system listener and syncs side effects.
  // The main.tsx subscribe callback handles DOM updates for the root div.
  const { theme, t } = useTheme();

  // Assistive Input Mode — bridges cfg.assistiveInput to <html data-assistive>
  // so CSS rules in app.css can amplify focus rings etc. JS-driven values
  // (debounce, hover intensity) read the setting directly from the store.
  useAssistiveInput();

  const activePatientId = useSettingsStore((s) => s.cfg?.activePatientId ?? null);
  // Thread is derived from the audit log: useThreadView seeds from
  // IndexedDB on mount and subscribes to the live logger feed. No
  // separate conversation store anymore.
  const messages = useThreadView(activePatientId);
  const { speakAsPatient, speakAsProvider, composeThread, repeatSpeak } =
    useSpeakActions();

  // UI store — transient navigation and overlay state
  const tab = useUIStore((s) => s.tab);
  const sub = useUIStore((s) => s.sub);
  const setSub = useUIStore((s) => s.setSub);
  const builderOpen = useUIStore((s) => s.builderOpen);
  const wishesOpen = useUIStore((s) => s.wishesOpen);
  const providerOpen = useUIStore((s) => s.providerOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const careTeamOpen = useUIStore((s) => s.careTeamOpen);
  const accessibilityOpen = useUIStore((s) => s.accessibilityOpen);
  const diagnosticsOpen = useUIStore((s) => s.diagnosticsOpen);
  const activityLogOpen = useUIStore((s) => s.activityLogOpen);
  const aboutOpen = useUIStore((s) => s.aboutOpen);
  const resetOpen = useUIStore((s) => s.resetOpen);
  const pinEntryOpen = useUIStore((s) => s.pinEntryOpen);
  const switchSheetOpen = useUIStore((s) => s.switchSheetOpen);
  const addPatientOpen = useUIStore((s) => s.addPatientOpen);
  const patientEditId = useUIStore((s) => s.patientEditId);
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
  const active = useActivePatient();

  // PIN-gated intent: the Settings (🔐) header button and the patient pill
  // may need PIN entry first. pinIntent tracks what to open after a
  // successful PIN.
  const [pinIntent, setPinIntent] = useState<"settings" | "patientEdit" | null>(null);

  const handleOpenSettings = useCallback(() => {
    if (useUIStore.getState().staffAuthed || !cfg?.pin) {
      useUIStore.getState().bumpStaffAuthed();
      openOverlay("settings");
    } else {
      setPinIntent("settings");
      openOverlay("pinEntry");
    }
  }, [cfg?.pin, openOverlay]);

  const handleOpenActivePatientEdit = useCallback(() => {
    const activeId = useSettingsStore.getState().cfg?.activePatientId;
    if (!activeId) return;
    if (useUIStore.getState().staffAuthed || !cfg?.pin) {
      useUIStore.getState().bumpStaffAuthed();
      useUIStore.getState().openPatientEdit(activeId);
    } else {
      setPinIntent("patientEdit");
      openOverlay("pinEntry");
    }
  }, [cfg?.pin, openOverlay]);

  const handlePinSuccess = useCallback(() => {
    closeOverlay("pinEntry");
    useUIStore.getState().setStaffAuthed(true);
    useUIStore.getState().bumpStaffAuthed();
    if (pinIntent === "patientEdit") {
      const activeId = useSettingsStore.getState().cfg?.activePatientId;
      if (activeId) {
        useUIStore.getState().openPatientEdit(activeId);
      }
    } else {
      // "settings" or null fallback — open the settings panel by default after auth.
      openOverlay("settings");
    }
    setPinIntent(null);
  }, [pinIntent, closeOverlay, openOverlay]);

  const handlePinClose = useCallback(() => {
    closeOverlay("pinEntry");
    setPinIntent(null);
  }, [closeOverlay]);

  // Initialize model manager and boot the TTS + STT workers.
  useEffect(() => {
    // On manual nav-bar refresh, Safari briefly rejects valid same-origin
    // subresource fetches (worker scripts, /models/*, ORT .wasm) with
    // "access control checks". The window is short; deferring boot moves
    // past it. Cold navigations resolve immediately (no delay).
    void deferIfReload().then(() => {
      // STT begins booting immediately, in parallel with GPU TTS shader
      // compile. An earlier shape (pre-#234) that chained STT behind
      // initGPU() meant STT could not start downloading until TTS shader
      // compile finished — minutes on cold load. The parallel pattern
      // restored by Listen v2 (see #233 hints) is what makes the pill
      // available within seconds of boot rather than minutes.
      bootSTT();

      // GPU TTS in parallel; defer the WASM TTS fallback until GPU TTS resolves
      // either way, to avoid concurrent ORT-WASM/ORT-WebGPU init contention.
      initGPU(MODEL_URLS.tts).then(ok => {
        console.log("[OwnVoice] GPU TTS:", ok ? "ready" : "unavailable");
        bootTTSWasm();
      }).catch(err => {
        console.warn("[OwnVoice] GPU TTS error:", err);
        bootTTSWasm();
      });
    });
    // Run OPFS integrity check in parallel, then auto-prime if needed.
    // The primer moves models into OPFS with resumable downloads + integrity
    // verification. Without this, the app still works on first boot (workers
    // fetch via the SW → network), but the bytes don't persist in a way that
    // survives storage-pressure eviction.
    verifyAllOnBoot()
      .then(() => {
        const verified = useOfflineStore.getState().verified;
        const needsPriming = Object.values(verified).some(
          (s) => s !== "verified",
        );
        if (needsPriming) {
          drivePrimer().catch((err) =>
            console.warn("[OwnVoice] auto-prime failed:", err),
          );
        }
      })
      .catch((err) => console.warn("[OwnVoice] boot verify failed:", err));
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
    setFallbackVoice(active?.fallbackVoice?.voiceURI ?? null);
  }, [active?.fallbackVoice?.voiceURI]);

  // Pre-generate cloned-voice audio in the background whenever the set
  // of embeddings or the patient locale changes. The runner aborts any
  // in-flight work on each invocation, and `generateAllPhrases` skips
  // already-cached phrases — so this is also the auto-resume path on
  // page reload once the TTS model is ready.
  const embeddingKey = useMemo(() => {
    if (!cfg) return "";
    const active = cfg.activePatientId
      ? cfg.patients.find((p) => p.id === cfg.activePatientId)
      : null;
    if (!active) return "no-active";
    const patientFp = embeddingFingerprint(active.speakerData);
    const providerFps = cfg.providers
      .map((p, i) => `${i}:${embeddingFingerprint(p.embedding)}`)
      .join(",");
    return `${cfg.caregiverLang}:${active.id}:${patientFp}|${active.patientLang}:${providerFps}`;
  }, [cfg]);

  // Hold the latest cfg in a ref so the pre-gen effect can read it without
  // depending on it. Writing refs inline during render keeps them in lockstep
  // with the committed cfg — by the time any effect fires, the ref reflects
  // the same cfg that produced the current render.
  //
  // Why: with cfg in the effect deps, every `cfg` change (e.g. auto-save of
  // the Settings panel's patientName field as the user types) would abort the
  // in-flight pre-gen run and restart from scratch. The memoised embeddingKey
  // already captures the only things pre-gen cares about — locale, active
  // patient, and embedding fingerprints — so that's all the effect should
  // depend on.
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  useEffect(() => {
    const initialCfg = cfgRef.current;
    if (!initialCfg) return;
    let cancelled = false;
    // `started` makes tryRun idempotent across the many onProgress events
    // the WASM download fires after the GPU path already became ready.
    // Without this, each progress tick called runPreGeneration again, which
    // aborts the in-flight run and restarts from phrase 0 — visible in
    // production logs as the same phrase being synthesized 2–3× at boot.
    let started = false;
    const mgr = getModelManager();

    function tryRun() {
      if (started || cancelled || !cfgRef.current) return false;
      // Start as soon as EITHER TTS path is ready. The audio cache's
      // synthesizeBestAvailable prefers GPU and falls back to WASM —
      // the GPU path is typically ready minutes before the WASM worker
      // finishes downloading its ~1 GB of weights.
      if (!isGPUReady() && !mgr.isReady("tts")) return false;
      started = true;
      audioCacheRunner.runPreGeneration(cfgRef.current);
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
  }, [embeddingKey]);

  // Pre-warm the in-memory hot cache from already-cached OPFS entries.
  // Runs once per active-patient/embedding change, cooperatively (yields
  // between phrases via requestIdleCallback) so it doesn't compete with
  // the user's first taps. First-press latency stays cold-OPFS; every
  // pre-warmed phrase becomes sub-ms on first user tap.
  useEffect(() => {
    const initialCfg = cfgRef.current;
    if (!initialCfg) return;
    const active = initialCfg.activePatientId
      ? initialCfg.patients.find((p) => p.id === initialCfg.activePatientId)
      : null;
    if (!active?.speakerData) return;

    const phrases = getPatientSpokenPhrases(initialCfg.caregiverLang ?? "en");
    let cancelled = false;
    void (async () => {
      // Defer until after the first paint so initial render isn't blocked.
      await new Promise<void>((res) => {
        const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
        if (ric) ric(() => res());
        else setTimeout(res, 0);
      });
      if (cancelled) return;
      await prewarmHotCache(
        {
          name: active.name,
          type: "patient",
          embedding: active.speakerData,
          lang: initialCfg.caregiverLang ?? "en",
        },
        phrases,
      );
    })();
    return () => { cancelled = true; };
  }, [embeddingKey]);

  // Wait for IndexedDB hydration before deciding setup vs main app
  if (!hasHydrated) return null;
  if (!cfg || cfg.patients.length === 0 || cfg.activePatientId === null) {
    // ConfirmDialogHost MUST be in this branch — Setup uses confirm() for
    // its Skip flow, and without a mounted host the promise never resolves
    // (Skip silently hangs). The host is also mounted in the main-app
    // branch below; both branches need their own copy because this is an
    // early return.
    return (
      <>
        <Setup onFirstRunDone={setCfg} mode="first-run" />
        <ConfirmDialogHost />
      </>
    );
  }

  // After the gate above, active is guaranteed non-null.
  const patientLang = active!.patientLang;

  const cats = getCategories(patientLang);
  const cat = cats.find((c) => c.id === tab);
  const timeSugs = getKeyedTimeSuggestionsForPeriod(patientLang);
  const hr = new Date().getHours();
  const sug = hr < 12 ? timeSugs.morning : hr < 17 ? timeSugs.afternoon : timeSugs.evening;


  const renderContent = () => {
    if (builderOpen) {
      return (
        <SentenceBuilder
          key="builder"
          onSend={(text, opts) => {
            speakAsPatient(text, opts);
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
            ariaLabel={resolvePhrase("ui.patient.subcategory.aria_label", patientLang).replace("{cat}", cat.label)}
          />
          <PhraseGrid
            phrases={cat.subs[sub].phrases}
            onTap={speakAsPatient}
            t={t}
            ariaLabel={`${cat.label}: ${cat.subs[sub].label}`}
          />
        </div>
      );
    }

    if (cat?.phrases) {
      return <PhraseGrid phrases={cat.phrases} onTap={speakAsPatient} t={t} ariaLabel={cat.label} />;
    }

    return null;
  };

  return (
    <div
      class="font-sans flex flex-col relative"
      style={{ background: t.bg, color: t.text, height: "100dvh", overflow: "hidden" }}
    >
      <ResumePromptBanner />

      <Header
        cfg={cfg}
        onOpenSettings={handleOpenSettings}
        onEditPatient={handleOpenActivePatientEdit}
      />

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
          {resolvePhrase("ui.patient.app.aria_label", patientLang).replace("{name}", active!.name || resolvePhrase("ui.patient.app.name_fallback", patientLang))}
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
                role="group"
                aria-label={resolvePhrase("ui.patient.suggestions.time_of_day_aria", patientLang)}
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
                  <SuggestionChip
                    key={s.key ?? s.text}
                    text={s.text}
                    phraseKey={s.key}
                    onTap={speakAsPatient}
                    t={t}
                    theme={theme}
                  />
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
          gloss={speaking.gloss}
          isProvider={speaking.from === "provider"}
          onDone={() => setSpeaking(null)}
          t={t}
        />
      )}

      {wishesOpen && (
        <MyWishes
          onSpeak={speakAsPatient}
          // MyWishes injects the SICG question as a thread entry alongside
          // the spoken response. composeThread emits THREAD_COMPOSE, which
          // useThreadView surfaces. SICG question stems are provider-direction
          // (care team asking the patient), so the `from` and `label` from
          // MyWishes flow through to flip styling and provider name.
          onAddToThread={(text, from, label, gloss) =>
            composeThread(text, { gloss, from, providerLabel: label })
          }
          onClose={() => closeOverlay("wishes")}
          t={t}
          theme={theme}
          patientName={active!.name}
        />
      )}

      {providerOpen && (
        <ProviderPanel
          onSend={(text, opts) => {
            speakAsProvider(text, opts);
          }}
          onClose={() => closeOverlay("provider")}
          cfg={cfg}
          t={t}
          theme={theme}
          activeProvIdx={activeProvIdx}
          onSelectProvider={setActiveProvIdx}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          cfg={cfg}
          onUpdate={(c) => {
            // Auto-save: persist only. Dismissal is user-initiated via the
            // "Done" button or backdrop tap, which fire onClose — closing
            // the sheet on every edit would make any text-field keystroke
            // instantly dismiss the panel.
            useSettingsStore.getState().setCfg(c);
          }}
          onClose={() => closeOverlay("settings")}
          t={t}
          theme={theme}
        />
      )}

      {resetOpen && (
        <ResetSheet onResetEverything={resetAll} t={t} />
      )}

      {careTeamOpen && (
        <CareTeamSheet cfg={cfg} t={t} theme={theme} />
      )}

      {accessibilityOpen && (
        <AccessibilitySheet
          cfg={cfg}
          onUpdate={(c) => useSettingsStore.getState().setCfg(c)}
          t={t}
        />
      )}

      {diagnosticsOpen && <DiagnosticsSheet t={t} />}

      {activityLogOpen && (
        <ActivityLog onClose={() => closeOverlay("activityLog")} />
      )}

      {aboutOpen && <AboutSheet t={t} />}

      {pinEntryOpen && (
        <PinGate
          pin={cfg.pin}
          onSuccess={handlePinSuccess}
          onClose={handlePinClose}
          t={t}
          theme={theme}
        />
      )}

      {switchSheetOpen && (
        <PatientsScreen
          open={switchSheetOpen}
          onClose={() => closeOverlay("switch")}
          t={t}
          theme={theme}
        />
      )}

      {addPatientOpen && (
        <Setup
          mode="add-patient"
          onAddPatientDone={() => {
            closeOverlay("addPatient");
          }}
          onCancel={() => closeOverlay("addPatient")}
        />
      )}

      {patientEditId && (
        <PatientEditSheet
          patientId={patientEditId}
          onClose={() => useUIStore.getState().closePatientEdit()}
          t={t}
          theme={theme}
        />
      )}

      <StaffSessionTimer />
      <ConfirmDialogHost />
    </div>
  );
}
