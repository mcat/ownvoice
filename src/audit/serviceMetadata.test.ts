import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../stores/settingsStore";
import { getServiceMetadata, APP_VERSION } from "./serviceMetadata";

describe("serviceMetadata", () => {
  beforeEach(() => {
    useSettingsStore.setState({ cfg: null });
  });

  it("returns the static APP_VERSION constant", async () => {
    const m = await getServiceMetadata();
    expect(m.serviceVersion).toBe(APP_VERSION);
  });

  it("generates a deviceInstanceId on first call and persists it", async () => {
    useSettingsStore.setState(() => ({
      cfg: { pin: "0000", caregiverLang: "en", providers: [], patients: [], activePatientId: null },
    }));
    const m1 = await getServiceMetadata();
    expect(m1.deviceInstanceId).toMatch(/^[0-9a-f]{16}$/);
    const m2 = await getServiceMetadata();
    expect(m2.deviceInstanceId).toBe(m1.deviceInstanceId);
    expect(useSettingsStore.getState().cfg?.deviceInstanceId).toBe(m1.deviceInstanceId);
  });

  it("falls back to a session-only id when settings are unavailable", async () => {
    const m = await getServiceMetadata();
    expect(m.deviceInstanceId).toMatch(/^[0-9a-f]{16}$/);
  });
});
