import { useSettingsStore } from "../stores/settingsStore";

export const APP_VERSION = "0.1.0";

export interface ServiceMetadata {
  serviceVersion: string;
  deviceInstanceId: string;
}

function randomDeviceId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < 8; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

let sessionFallbackId: string | null = null;

export async function getServiceMetadata(): Promise<ServiceMetadata> {
  const cfg = useSettingsStore.getState().cfg;
  if (!cfg) {
    if (!sessionFallbackId) sessionFallbackId = randomDeviceId();
    return { serviceVersion: APP_VERSION, deviceInstanceId: sessionFallbackId };
  }
  if (!cfg.deviceInstanceId) {
    const id = randomDeviceId();
    useSettingsStore.setState((s) => ({
      cfg: s.cfg ? { ...s.cfg, deviceInstanceId: id } : s.cfg,
    }));
    return { serviceVersion: APP_VERSION, deviceInstanceId: id };
  }
  return { serviceVersion: APP_VERSION, deviceInstanceId: cfg.deviceInstanceId };
}
