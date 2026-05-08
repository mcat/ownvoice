import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { render, screen, waitFor, fireEvent } from "@testing-library/preact";
import { ActivityLog } from "./ActivityLog";
import { initAudit } from "../../audit/init";
import { _resetForTests, log } from "../../audit/logger";
import { resetSessionForTests } from "../../audit/session";
import { AUDIT_DB_NAME, openAuditDb } from "../../audit/db";
import { EVENT } from "../../audit/events";
import { ATTR } from "../../audit/attrs";
import { ulidForTime } from "../../audit/ulid";

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

  it("shows the truncation banner once the limit is hit", async () => {
    // Use a small limit so we don't have to seed thousands of rows in
    // fake-indexeddb. Pre-seed `limit` matching events; the query effect
    // returns exactly that many, satisfying the truncated condition.
    const TEST_LIMIT = 10;
    const now = Date.now();
    const db = await openAuditDb();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction("events", "readwrite");
      const store = tx.objectStore("events");
      for (let i = 0; i < TEST_LIMIT; i++) {
        const time = now - i;
        store.put({
          id: ulidForTime(time) + i.toString().padStart(6, "0"),
          kind: "log",
          time,
          observed_time: time,
          name: "speak.tap",
          severity_number: 9,
          severity_text: "INFO",
          attributes: { [ATTR.SPEECH_TEXT]: `msg-${i}` },
        });
      }
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
    render(<ActivityLog onClose={() => {}} limit={TEST_LIMIT} />);
    await waitFor(() => expect(screen.queryByTestId("truncation-banner")).toBeTruthy());
  });

  it("does NOT show the truncation banner when below the limit", async () => {
    log({ name: EVENT.SPEAK_TAP, attributes: { [ATTR.SPEECH_TEXT]: "hi" } });
    render(<ActivityLog onClose={() => {}} limit={10} />);
    // Wait long enough for the initial query to settle, then assert.
    await waitFor(() => expect(screen.queryByLabelText(/patient/i)).toBeTruthy());
    expect(screen.queryByTestId("truncation-banner")).toBeNull();
  });

  it("switches to the Workflows view and queries the workflows store", async () => {
    render(<ActivityLog onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /^workflows$/i }));
    await waitFor(() =>
      expect(screen.getByText(/no workflows match current filters/i)).toBeTruthy(),
    );
  });
});
