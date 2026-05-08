import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { sweepAbandonedWorkflows } from "./recovery";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { _resetForTests as resetLogger } from "./logger";
import { initAudit } from "./init";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("recovery sweep performance", () => {
  beforeEach(async () => {
    resetLogger();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("completes in <100 ms with 50 abandoned workflows", async () => {
    const db = await openAuditDb();
    await new Promise<void>((res) => {
      const tx = db.transaction("workflows", "readwrite");
      const store = tx.objectStore("workflows");
      for (let i = 0; i < 50; i++) {
        store.put({
          workflow_id: `wf-${i}`, name: "voice_enrollment", status: "running",
          started_at: i, attempt: 1, step_history: [],
        });
      }
      tx.oncomplete = () => res();
    });
    db.close();

    const t0 = performance.now();
    const result = await sweepAbandonedWorkflows();
    const elapsed = performance.now() - t0;
    console.log(`recovery sweep: ${elapsed.toFixed(2)}ms for ${result.length} workflows`);
    expect(result).toHaveLength(50);
    expect(elapsed).toBeLessThan(100);
  });
});
