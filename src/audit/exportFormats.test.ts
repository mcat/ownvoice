import { describe, it, expect } from "vitest";
import { buildExport, type ExportRequest } from "./exportFormats";
import { ATTR } from "./attrs";

const SAMPLE = [
  {
    id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    kind: "log" as const,
    time: 1700000000000,
    observed_time: 1700000000000,
    name: "speak.tap",
    severity_number: 9,
    severity_text: "INFO" as const,
    attributes: {
      [ATTR.SPEECH_TEXT]: "I'm in pain",
      [ATTR.ACTOR]: "patient",
    },
  },
];

const REQ: Omit<ExportRequest, "format" | "redaction"> = {
  records: SAMPLE,
  rangeStart: 0,
  rangeEnd: 2000000000000,
  serviceVersion: "0.1.0",
  deviceInstanceId: "dev-test",
};

describe("buildExport", () => {
  it("OTLP/JSON envelope contains records when redaction=raw", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "raw" });
    const parsed = JSON.parse(out.content);
    expect(parsed.resourceLogs).toHaveLength(1);
    const attrs = parsed.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const text = attrs.find((a: { key: string }) => a.key === ATTR.SPEECH_TEXT);
    expect(text.value.stringValue).toBe("I'm in pain");
    expect(out.filename).toMatch(/\.json$/);
  });

  it("OTLP/JSON envelope redacts SPEECH_TEXT when redaction=redacted", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "redacted" });
    const parsed = JSON.parse(out.content);
    const attrs = parsed.resourceLogs[0].scopeLogs[0].logRecords[0].attributes;
    const text = attrs.find((a: { key: string }) => a.key === ATTR.SPEECH_TEXT);
    expect(text.value.stringValue).toBe("[REDACTED]");
  });

  it("NDJSON one record per line, redaction respected", () => {
    const out = buildExport({ ...REQ, format: "ndjson", redaction: "redacted" });
    const lines = out.content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const obj = JSON.parse(lines[0]);
    expect(obj.attributes[ATTR.SPEECH_TEXT]).toBe("[REDACTED]");
    expect(out.filename).toMatch(/\.ndjson$/);
  });

  it("Print HTML contains spoken text rendered for clinician review", () => {
    const out = buildExport({ ...REQ, format: "print-html", redaction: "raw" });
    expect(out.content).toContain("I&#x27;m in pain");
    expect(out.filename).toMatch(/\.html$/);
    expect(out.mimeType).toBe("text/html");
  });

  it("MIME types are correct per format", () => {
    expect(buildExport({ ...REQ, format: "otlp-json", redaction: "raw" }).mimeType).toBe("application/json");
    expect(buildExport({ ...REQ, format: "ndjson", redaction: "raw" }).mimeType).toBe("application/x-ndjson");
    expect(buildExport({ ...REQ, format: "print-html", redaction: "raw" }).mimeType).toBe("text/html");
  });

  it("filename includes range bounds and device id", () => {
    const out = buildExport({ ...REQ, format: "otlp-json", redaction: "raw" });
    expect(out.filename).toContain("dev-test");
    expect(out.filename).toContain("0");
    expect(out.filename).toContain("2000000000000");
  });
});
