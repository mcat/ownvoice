import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { ov } from "./workflow";
import { initAudit } from "./init";
import { _resetForTests } from "./logger";
import { resetSessionForTests } from "./session";
import { AUDIT_DB_NAME, openAuditDb } from "./db";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("ov.workflow happy path", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("runs the runner and returns its result", async () => {
    const result = await ov.workflow("voice_enrollment", async (ctx) => {
      const a = await ctx.step("first", async () => 1);
      const b = await ctx.step("second", async () => a + 1);
      return b;
    });
    expect(result).toBe(2);
  });

  it("marks workflow completed in the workflows store", async () => {
    await ov.workflow("voice_enrollment", async () => {});
    const db = await openAuditDb();
    const rows = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("completed");
    expect(rows[0].step_history).toHaveLength(0);
  });

  it("appends one step to step_history per ctx.step call", async () => {
    await ov.workflow("voice_enrollment", async (ctx) => {
      await ctx.step("a", async () => "x");
      await ctx.step("b", async () => "y");
    });
    const db = await openAuditDb();
    const rows = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(rows[0].step_history.map((s: any) => s.step_name)).toEqual(["a", "b"]);
  });

  it("step throw marks workflow failed and rethrows", async () => {
    await expect(
      ov.workflow("voice_enrollment", async (ctx) => {
        await ctx.step("boom", async () => { throw new Error("nope"); });
      }),
    ).rejects.toThrow("nope");

    const db = await openAuditDb();
    const rows = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(rows[0].status).toBe("failed");
    expect(rows[0].step_history[0].status).toBe("failed");
    expect(rows[0].step_history[0].error?.message).toBe("nope");
  });

  it("uncaught throw in runner marks workflow failed", async () => {
    await expect(
      ov.workflow("voice_enrollment", async () => {
        throw new Error("runner exploded");
      }),
    ).rejects.toThrow("runner exploded");

    const db = await openAuditDb();
    const rows = await new Promise<any[]>((res) => {
      const r = db.transaction("workflows", "readonly").objectStore("workflows").getAll();
      r.onsuccess = () => res(r.result);
    });
    db.close();
    expect(rows[0].status).toBe("failed");
  });
});
