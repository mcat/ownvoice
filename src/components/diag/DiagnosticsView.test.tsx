import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/preact";
import { DiagnosticsView } from "./DiagnosticsView";
import { initAudit } from "../../audit/init";
import { log, _resetForTests } from "../../audit/logger";
import { resetSessionForTests } from "../../audit/session";
import { EVENT } from "../../audit/events";
import { AUDIT_DB_NAME } from "../../audit/db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("DiagnosticsView", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("renders recent events in the table", async () => {
    log({ name: EVENT.MODEL_BOOT_COMPLETE });
    render(<DiagnosticsView onClose={() => {}} />);
    expect(await screen.findByText(/model.boot.complete/)).toBeTruthy();
  });
});
