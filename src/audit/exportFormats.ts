import type { AuditRecord } from "./types";
import { redactPHI } from "./redaction";
import { buildOtlpEnvelope } from "./otlp";
import { ATTR } from "./attrs";
import { formatLogTimestamp } from "../components/diag/formatTime";

export type ExportFormat = "otlp-json" | "ndjson" | "print-html";
export type RedactionMode = "raw" | "redacted";

export interface ExportRequest {
  records: AuditRecord[];
  format: ExportFormat;
  redaction: RedactionMode;
  rangeStart: number;
  rangeEnd: number;
  serviceVersion: string;
  deviceInstanceId: string;
}

export interface ExportArtifact {
  content: string;
  filename: string;
  mimeType: string;
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch] ?? ch);
}

export function buildExport(req: ExportRequest): ExportArtifact {
  const records = req.redaction === "redacted" ? redactPHI(req.records) : req.records;
  const baseFilename = `ownvoice-audit-${req.deviceInstanceId}-${req.rangeStart}-${req.rangeEnd}`;

  switch (req.format) {
    case "otlp-json": {
      const envelope = buildOtlpEnvelope(records, {
        serviceVersion: req.serviceVersion,
        deviceInstanceId: req.deviceInstanceId,
        rangeStart: req.rangeStart,
        rangeEnd: req.rangeEnd,
        redaction: req.redaction,
      });
      return {
        content: JSON.stringify(envelope, null, 2),
        filename: `${baseFilename}.json`,
        mimeType: "application/json",
      };
    }
    case "ndjson": {
      const lines = records.map((r) => JSON.stringify(r)).join("\n");
      return {
        content: lines + "\n",
        filename: `${baseFilename}.ndjson`,
        mimeType: "application/x-ndjson",
      };
    }
    case "print-html": {
      const rows = records.map((r) => {
        const t = formatLogTimestamp(r.time);
        const actor = String(r.attributes[ATTR.ACTOR] ?? "");
        const text = String(r.attributes[ATTR.SPEECH_TEXT] ?? r.name);
        return `<tr><td>${escapeHtml(t)}</td><td>${escapeHtml(actor)}</td><td>${escapeHtml(text)}</td></tr>`;
      }).join("");
      return {
        content: `<!doctype html><html><head><meta charset="utf-8"><title>OwnVoice Activity Log</title>
<style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}td:first-child{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}@media print{body{padding:0}}</style>
</head><body><h1>OwnVoice Activity Log</h1>
<p>Range ${escapeHtml(formatLogTimestamp(req.rangeStart))} → ${escapeHtml(formatLogTimestamp(req.rangeEnd))}</p>
<table><thead><tr><th>Time</th><th>Actor</th><th>Spoken text</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.print();</script></body></html>`,
        filename: `${baseFilename}.html`,
        mimeType: "text/html",
      };
    }
  }
}
