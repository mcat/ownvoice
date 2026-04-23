import { useSettingsStore } from "./settingsStore";
import { useConversationStore } from "./conversationStore";
import { useUIStore } from "./uiStore";
import { useOfflineStore } from "./offlineStore";
import { clearIndex } from "./patientIndex";
import { clearAll } from "../store";
import { clearAudioCache } from "../models/audioCache";
import * as audioCacheRunner from "../models/audioCacheRunner";
import { getModelManager } from "../models/modelManager";

/**
 * Full application reset — clears all persistent and in-memory state.
 *
 * Storage cleared:
 *   - IndexedDB "ownvoice" / "kv" (settings, speaker data, conversation)
 *   - OPFS "audio-cache-v3" (pre-generated TTS clips)
 *   - OPFS "audio-cache-v3/patient-index.json" (patient→hashes metadata)
 *   - OPFS "models" (downloaded ONNX weights) + terminates workers
 *   - Cache API (service worker cached responses including model files)
 *   - Service worker registration
 *   - localStorage "ov-theme" (theme preference)
 *   - All in-memory Zustand stores
 */
export async function resetAll(): Promise<void> {
  // 0. Stop any in-flight pre-generation so the worker isn't mid-write
  //    when we delete OPFS entries underneath it.
  audioCacheRunner.abort();

  // 1. Persistent storage (IndexedDB, OPFS)
  clearAll();
  await clearAudioCache();
  await clearIndex();
  getModelManager().clearAll();

  // 2. In-memory Zustand stores
  // Clear conversation BEFORE settings reset — settings reset nulls cfg,
  // making activePatientId unavailable for per-patient clear. Instead,
  // wipe the entire messagesByPatientId map directly.
  useConversationStore.setState({ messagesByPatientId: {} });
  useSettingsStore.getState().reset();
  useUIStore.getState().resetUI();
  useOfflineStore.getState().reset();

  // 3. localStorage
  localStorage.removeItem("ov-theme");

  // 4. Service worker cache (includes cached model files ~1.2 GB)
  if ("caches" in self) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // 5. Unregister service worker so the next load starts clean
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
}
