import type { AuditRecord, AttrValue } from "./types";

export interface EnvelopeOpts {
  serviceVersion: string;
  deviceInstanceId: string;
  rangeStart: number;
  rangeEnd: number;
  redaction: "redacted" | "raw";
}

interface OtlpAttr {
  key: string;
  value: { stringValue?: string; intValue?: number; boolValue?: boolean; doubleValue?: number };
}

function attr(key: string, value: AttrValue): OtlpAttr {
  if (typeof value === "string") return { key, value: { stringValue: value } };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { key, value: { intValue: value } }
      : { key, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") return { key, value: { boolValue: value } };
  return { key, value: { stringValue: "" } };
}

export function buildOtlpEnvelope(records: AuditRecord[], opts: EnvelopeOpts) {
  const resourceAttrs: OtlpAttr[] = [
    attr("service.name", "ownvoice"),
    attr("service.version", opts.serviceVersion),
    attr("service.instance.id", opts.deviceInstanceId),
    attr("ownvoice.export.exported_at", Date.now()),
    attr("ownvoice.export.range_start", opts.rangeStart),
    attr("ownvoice.export.range_end", opts.rangeEnd),
    attr("ownvoice.export.redaction", opts.redaction),
    attr("ownvoice.export.row_count", records.length),
    attr("ownvoice.export.schema_version", 1),
  ];

  return {
    resourceLogs: [
      {
        resource: { attributes: resourceAttrs },
        scopeLogs: [
          {
            scope: { name: "ownvoice-audit", version: "1" },
            logRecords: records.map((r) => ({
              timeUnixNano: String(r.time * 1_000_000),
              observedTimeUnixNano: String(r.observed_time * 1_000_000),
              severityNumber: r.severity_number ?? 9,
              severityText: r.severity_text ?? "INFO",
              body: { stringValue: r.body ?? r.name },
              attributes: Object.entries(r.attributes).map(([k, v]) => attr(k, v)),
            })),
          },
        ],
      },
    ],
  };
}
