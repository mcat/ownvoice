import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { EventTable, type EventTableColumn } from "./EventTable";
import type { AuditRecord } from "../../audit/types";

function fakeRecord(i: number): AuditRecord {
  return {
    id: `id-${i.toString().padStart(4, "0")}`,
    kind: "log",
    time: 1700000000000 + i * 1000,
    observed_time: 1700000000000 + i * 1000,
    name: i % 2 === 0 ? "speak.tap" : "model.boot.start",
    severity_number: 9,
    severity_text: "INFO",
    attributes: { "ownvoice.actor": "patient", "ownvoice.speech.text": `phrase ${i}` },
  };
}

const COLUMNS: EventTableColumn[] = [
  { id: "time", header: "Time", render: (r) => new Date(r.time).toISOString() },
  { id: "name", header: "Event", render: (r) => r.name },
];

describe("EventTable", () => {
  it("renders rows for each record", () => {
    const records = Array.from({ length: 10 }, (_, i) => fakeRecord(i));
    render(<EventTable records={records} columns={COLUMNS} />);
    // jsdom-based fallback path: when the virtualizer can't measure,
    // we render all records up to FALLBACK_CAP non-virtualized so the
    // table is never silently truncated to a single row.
    expect(screen.getAllByText("speak.tap").length).toBe(5);
    expect(screen.getAllByText("model.boot.start").length).toBe(5);
  });

  it("renders empty state when no records", () => {
    render(<EventTable records={[]} columns={COLUMNS} />);
    expect(screen.getByText(/no events/i)).toBeTruthy();
  });

  it("renders all column headers", () => {
    render(<EventTable records={[fakeRecord(0)]} columns={COLUMNS} />);
    expect(screen.getByText("Time")).toBeTruthy();
    expect(screen.getByText("Event")).toBeTruthy();
  });
});
