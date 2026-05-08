import { describe, it, expect } from "vitest";
import { buildOtlpEnvelope } from "./otlp";
import type { AuditRecord } from "./types";

describe("buildOtlpEnvelope", () => {
  it("produces an object with resourceLogs and resource attributes", () => {
    const records: AuditRecord[] = [
      {
        id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        kind: "log",
        time: 1700000000000,
        observed_time: 1700000000000,
        name: "speak.tap",
        severity_number: 9,
        severity_text: "INFO",
        attributes: { "ownvoice.actor": "patient" },
      },
    ];
    const env = buildOtlpEnvelope(records, {
      serviceVersion: "0.1.0",
      deviceInstanceId: "dev-123",
      rangeStart: 0,
      rangeEnd: 2000000000000,
      redaction: "redacted",
    });

    expect(env.resourceLogs).toHaveLength(1);
    const rl = env.resourceLogs[0];
    expect(rl.resource.attributes.find((a) => a.key === "service.name")?.value.stringValue).toBe("ownvoice");
    expect(rl.resource.attributes.find((a) => a.key === "ownvoice.export.row_count")?.value.intValue).toBe(1);
    expect(rl.scopeLogs[0].logRecords).toHaveLength(1);
    expect(rl.scopeLogs[0].logRecords[0].attributes[0].key).toBe("ownvoice.actor");
  });

  it("converts ms epoch to nanos in time fields", () => {
    const records: AuditRecord[] = [
      { id: "01", kind: "log", time: 1, observed_time: 1, name: "x", attributes: {} },
    ];
    const env = buildOtlpEnvelope(records, {
      serviceVersion: "0", deviceInstanceId: "d", rangeStart: 0, rangeEnd: 0, redaction: "raw",
    });
    expect(env.resourceLogs[0].scopeLogs[0].logRecords[0].timeUnixNano).toBe("1000000");
  });
});
