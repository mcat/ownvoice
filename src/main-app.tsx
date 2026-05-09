import { render } from "preact";
import { App } from "./App";
import "./app.css";
import { useUIStore } from "./stores/uiStore";
import { useSettingsStore } from "./stores/settingsStore";
import { themes, type ThemeName } from "./theme/tokens";
import { startVoiceProcessor } from "./models/voiceProcessor";
import { startWakeLock } from "./models/wakeLock";
import { log } from "./audit/logger";
import { EVENT } from "./audit/events";
import { ATTR } from "./audit/attrs";
import { initAudit } from "./audit/init";
import { setActivePatientHash } from "./audit/session";
import { patientIdHash } from "./audit/hash";
import { resumeWorkflow } from "./audit/recovery";

window.addEventListener("error", (ev) => {
  log({
    name: EVENT.ERROR_UNHANDLED,
    severity: "ERROR",
    attributes: {
      [ATTR.ERROR_TYPE]: ev.error?.name ?? "Error",
      [ATTR.ERROR_MESSAGE]: ev.message,
      [ATTR.ERROR_STACK]: (ev.error?.stack ?? "").split("\n").slice(0, 5).join("\n"),
    },
  });
});

window.addEventListener("unhandledrejection", (ev) => {
  const reason = ev.reason;
  log({
    name: EVENT.ERROR_REJECTION,
    severity: "ERROR",
    attributes: {
      [ATTR.ERROR_TYPE]: reason?.name ?? "UnhandledRejection",
      [ATTR.ERROR_MESSAGE]: reason?.message ?? String(reason),
      [ATTR.ERROR_STACK]: (reason?.stack ?? "").split("\n").slice(0, 5).join("\n"),
    },
  });
});

// `?bench=true` enables per-step timing logs in the TTS workers (encoder
// load + per-LM-step latencies + decode time + RTF). Used to compare
// WASM vs WebGPU performance on real devices, especially iPad — see
// issue #163. Look for `[OwnVoice:Bench]` lines in the console. The
// flag is parsed once at boot and propagated to workers via the init
// message; toggling at runtime requires a reload.
if (new URLSearchParams(globalThis.location?.search ?? "").get("bench") === "true") {
  (globalThis as { __OV_BENCH__?: boolean }).__OV_BENCH__ = true;
  console.log("[OwnVoice:Bench] Bench mode active. Per-step TTS timings will be logged.");
}

// Handle PWA shortcut deep-links: ?tab=… and ?overlay=… are dispatched
// after settings hydrate (so onboarding gates still apply), then stripped
// from the URL so a reload doesn't re-fire them.
{
  type OverlayName = "wishes" | "provider" | "listen";
  const ALLOWED_TABS = new Set(["quick", "needs", "feelings", "questions", "pain"]);
  const ALLOWED_OVERLAYS: ReadonlySet<OverlayName> = new Set([
    "wishes",
    "provider",
    "listen",
  ]);

  const applyDeepLink = (): void => {
    const params = new URLSearchParams(globalThis.location?.search ?? "");
    const tab = params.get("tab");
    const overlay = params.get("overlay");
    let touched = false;
    if (tab && ALLOWED_TABS.has(tab)) {
      useUIStore.getState().setTab(tab);
      touched = true;
    }
    if (overlay && ALLOWED_OVERLAYS.has(overlay as OverlayName)) {
      useUIStore.getState().openOverlay(overlay as OverlayName);
      touched = true;
    }
    if (touched) {
      params.delete("tab");
      params.delete("overlay");
      const qs = params.toString();
      const url = globalThis.location.pathname + (qs ? `?${qs}` : "") + globalThis.location.hash;
      history.replaceState(null, "", url);
    }
  };

  if (useSettingsStore.getState()._hasHydrated) {
    applyDeepLink();
  } else {
    useSettingsStore.persist.onFinishHydration?.(() => {
      applyDeepLink();
    });
  }
}

// Subscribe to theme changes outside of Preact to guarantee DOM updates.
// Uses requestAnimationFrame to run AFTER Preact's re-render commits.
useUIStore.subscribe((state, prev) => {
  const resolve = (s: typeof state): ThemeName =>
    s.themeOverride ?? (s.systemDark ? "dark" : "light");
  const theme = resolve(state);
  const prevTheme = resolve(prev);
  if (theme !== prevTheme) {
    const t = themes[theme];
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.style.background = t.bg;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#1C1C1E" : "#FFFFFF");
    // Run after Preact finishes re-rendering
    requestAnimationFrame(() => {
      const appRoot = document.querySelector("#root > div") as HTMLElement | null;
      if (appRoot) {
        appRoot.style.background = t.bg;
        appRoot.style.color = t.text;
      }
    });
  }
});

// Boot the audit logger after settings hydrate so the active patient id
// (used to derive the patient hash) is known. Hydration may have already
// completed by the time this runs — handle both cases.
{
  const bootAudit = (): void => {
    const cfg = useSettingsStore.getState().cfg;
    void initAudit({
      activePatientId: cfg?.activePatientId ?? null,
      onAbandoned: (list) => {
        for (const w of list) {
          if (w.recoveryMode === "auto") {
            void resumeWorkflow(w.workflow_id);
          } else if (w.recoveryMode === "prompt") {
            useUIStore.getState().queueAbandonedWorkflow(w);
          }
          // manual: do nothing
        }
      },
    });
  };
  if (useSettingsStore.getState()._hasHydrated) {
    bootAudit();
  } else {
    useSettingsStore.persist.onFinishHydration?.(() => {
      bootAudit();
    });
  }

  // Keep audit/session.ts patient hash in sync with the store. initAudit
  // sets it once on boot, and setActivePatient updates it on user
  // switches — but neither covers Vite HMR replacing audit/session.ts.
  // The fresh module instance has patientIdHash=undefined, so subsequent
  // events lose their patient hash and the conversation thread (which
  // filters by hash) falls silent until a manual reload. Subscribe so
  // the live store value is re-applied any time activePatientId is
  // observed — including immediately after this subscribe runs.
  let lastSyncedId: string | null | undefined = undefined;
  const syncPatientHash = (id: string | null): void => {
    if (id === lastSyncedId) return;
    lastSyncedId = id;
    if (!id) {
      setActivePatientHash(null);
      return;
    }
    void patientIdHash(id).then((h) => {
      // If a newer change has landed while we awaited, don't clobber it.
      if (lastSyncedId === id) setActivePatientHash(h);
    });
  };
  syncPatientHash(useSettingsStore.getState().cfg?.activePatientId ?? null);
  useSettingsStore.subscribe((s) => {
    syncPatientHash(s.cfg?.activePatientId ?? null);
  });
}

// One-shot best-effort cleanup of the deprecated `ov-conversation`
// IndexedDB database. The conversation thread now derives from the
// audit log (`ov-audit`); the old DB is dead weight on existing
// installs. Failures are silent — if the user has it open in another
// tab, the deletion is "blocked" and we'll try again on the next
// boot. Brand-new installs are no-ops.
try {
  indexedDB.deleteDatabase("ov-conversation");
} catch {
  /* ignore — best-effort cleanup */
}

startVoiceProcessor();

// Wake-lock subscribes to settingsStore, so it can be started before
// hydration — it'll request the lock once `cfg.keepScreenAwake` settles.
startWakeLock();

render(<App />, document.getElementById("root")!);
