import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { shareExport } from "./exportShare";
import { _resetForTests, subscribe } from "./logger";
import { resetSessionForTests } from "./session";
import { initAudit } from "./init";
import { AUDIT_DB_NAME } from "./db";
import type { ExportArtifact } from "./exportFormats";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("shareExport", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("emits an audit.export event with redaction + format + row_count", async () => {
    const seen: { name: string; attributes: Record<string, unknown> }[] = [];
    subscribe((r) => seen.push({ name: r.name, attributes: r.attributes }));
    const artifact: ExportArtifact = {
      content: "{}",
      filename: "test.json",
      mimeType: "application/json",
    };
    await shareExport(artifact, { redaction: "redacted", format: "otlp-json", rowCount: 42, rangeStart: 0, rangeEnd: 100 });
    const exportEv = seen.find((r) => r.name === "audit.export");
    expect(exportEv).toBeTruthy();
    expect(exportEv!.attributes["ownvoice.export.row_count"]).toBe(42);
    expect(exportEv!.attributes["ownvoice.export.redaction"]).toBe("redacted");
    expect(exportEv!.attributes["ownvoice.export.format"]).toBe("otlp-json");
  });

  it("uses anchor-download fallback when navigator.share is unavailable", async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const artifact: ExportArtifact = {
      content: "abc",
      filename: "out.json",
      mimeType: "application/json",
    };
    await shareExport(artifact, { redaction: "raw", format: "otlp-json", rowCount: 1, rangeStart: 0, rangeEnd: 1 });
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
