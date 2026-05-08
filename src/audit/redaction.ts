import { PHI_ATTR_KEYS } from "./attrs";
import type { AuditRecord } from "./types";

export function redactPHI(records: readonly AuditRecord[]): AuditRecord[] {
  return records.map((r) => ({
    ...r,
    attributes: Object.fromEntries(
      Object.entries(r.attributes).map(([k, v]) =>
        PHI_ATTR_KEYS.has(k) ? [k, "[REDACTED]"] : [k, v],
      ),
    ),
  }));
}
