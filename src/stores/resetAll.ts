import { useSettingsStore } from "./settingsStore";
import { useInteractionStore } from "./interactionStore";
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
 *   - IndexedDB "ownvoice" / "kv" (settings, speaker data)
 *   - IndexedDB "ov-audit" (audit log — also the conversation thread)
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
  // Awaited (was fire-and-forget): the kv store holds settings, the
  // speaker vault, and the interaction timestamp — resetAll must not
  // resolve while those rows are still being deleted.
  await clearAll();
  await clearAudioCache();
  await clearIndex();
  getModelManager().clearAll();

  // Wipe the audit log database (separate IDB, not covered by clearAll())
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase("ov-audit");
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });

  // 2. In-memory Zustand stores
  useSettingsStore.getState().reset();
  useUIStore.getState().resetUI();
  useOfflineStore.getState().reset();
  useInteractionStore.setState({ lastInteractionAt: null });

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
