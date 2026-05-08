import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen, waitFor, fireEvent } from "@testing-library/preact";
import { ActivityLog } from "./ActivityLog";
import { initAudit } from "../../audit/init";
import { _resetForTests, log } from "../../audit/logger";
import { resetSessionForTests } from "../../audit/session";
import { AUDIT_DB_NAME } from "../../audit/db";
import { EVENT } from "../../audit/events";
import { ATTR } from "../../audit/attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("ActivityLog", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("renders the role toggle + filter bar + table", async () => {
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "test" } });
    render(<ActivityLog onClose={() => {}} />);
    expect(screen.getByRole("group", { name: /view as/i })).toBeTruthy();
    expect(screen.getByLabelText(/patient/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /export/i })).toBeTruthy();
  });

  it("changing role updates default filters", async () => {
    render(<ActivityLog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /developer/i }));
    await waitFor(() => {
      const sevSelect = screen.getByLabelText(/severity/i) as HTMLSelectElement;
      expect(sevSelect.value).toBe("13");
    });
  });
});
