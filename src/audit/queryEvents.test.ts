import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { queryEvents } from "./queryEvents";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { ulidForTime } from "./ulid";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seed(records: Array<Partial<{ id: string; time: number; name: string; severity_number: number; patient_id_hash: string; attributes: Record<string, unknown> }>>) {
  const db = await openAuditDb();
  await new Promise<void>((res) => {
    const tx = db.transaction("events", "readwrite");
    for (const r of records) {
      tx.objectStore("events").put({
        id: r.id ?? ulidForTime(r.time ?? 0),
        kind: "log",
        time: r.time ?? 0,
        observed_time: r.time ?? 0,
        name: r.name ?? "speak.tap",
        severity_number: r.severity_number ?? 9,
        patient_id_hash: r.patient_id_hash,
        attributes: r.attributes ?? {},
      });
    }
    tx.oncomplete = () => res();
  });
  db.close();
}

describe("queryEvents", () => {
  beforeEach(clearDb);

  it("returns all events when filters are empty", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }]);
    const out = await queryEvents({ limit: 100 });
    expect(out).toHaveLength(3);
  });

  it("filters by patient_id_hash via by_patient_time", async () => {
    await seed([
      { time: 100, patient_id_hash: "A" },
      { time: 200, patient_id_hash: "B" },
      { time: 300, patient_id_hash: "A" },
    ]);
    const out = await queryEvents({ patientIdHash: "A", limit: 100 });
    expect(out.map((r) => r.time).sort()).toEqual([100, 300]);
  });

  it("filters by date range", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }, { time: 400 }]);
    const out = await queryEvents({ rangeStart: 150, rangeEnd: 350, limit: 100 });
    expect(out.map((r) => r.time).sort()).toEqual([200, 300]);
  });

  it("filters by minimum severity", async () => {
    await seed([
      { time: 100, severity_number: 5 },
      { time: 200, severity_number: 13 },
      { time: 300, severity_number: 17 },
    ]);
    const out = await queryEvents({ minSeverity: 13, limit: 100 });
    expect(out.map((r) => r.severity_number).sort()).toEqual([13, 17]);
  });

  it("filters by event name prefix", async () => {
    await seed([
      { time: 100, name: "speak.tap" },
      { time: 200, name: "speak.cache.hit" },
      { time: 300, name: "model.boot.start" },
    ]);
    const out = await queryEvents({ namePrefix: "speak.", limit: 100 });
    expect(out.map((r) => r.name).sort()).toEqual(["speak.cache.hit", "speak.tap"]);
  });

  it("post-filters by attribute substring", async () => {
    await seed([
      { time: 100, attributes: { "ownvoice.speech.text": "I'm in pain" } },
      { time: 200, attributes: { "ownvoice.speech.text": "Thank you" } },
    ]);
    const out = await queryEvents({ attributeSubstring: "pain", limit: 100 });
    expect(out).toHaveLength(1);
  });

  it("respects limit", async () => {
    await seed(Array.from({ length: 100 }, (_, i) => ({ time: i })));
    const out = await queryEvents({ limit: 10 });
    expect(out).toHaveLength(10);
  });

  it("returns most-recent first when no patient filter", async () => {
    await seed([{ time: 100 }, { time: 200 }, { time: 300 }]);
    const out = await queryEvents({ limit: 100 });
    expect(out.map((r) => r.time)).toEqual([300, 200, 100]);
  });
});
