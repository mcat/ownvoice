import { log } from "./logger";
import { EVENT } from "./events";
import type { ExportArtifact, ExportFormat, RedactionMode } from "./exportFormats";

export interface ShareMeta {
  redaction: RedactionMode;
  format: ExportFormat;
  rowCount: number;
  rangeStart: number;
  rangeEnd: number;
}

export async function shareExport(artifact: ExportArtifact, meta: ShareMeta): Promise<void> {
  log({
    name: EVENT.AUDIT_EXPORT,
    attributes: {
      "ownvoice.export.row_count": meta.rowCount,
      "ownvoice.export.redaction": meta.redaction,
      "ownvoice.export.format": meta.format,
      "ownvoice.export.range_start": meta.rangeStart,
      "ownvoice.export.range_end": meta.rangeEnd,
    },
  });

  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const file = new File([blob], artifact.filename, { type: artifact.mimeType });

  const canShare = typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  if (canShare) {
    try {
      await navigator.share({ files: [file], title: "OwnVoice audit log" });
      return;
    } catch {
      // user dismissed or share failed; fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.filename;
    a.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
