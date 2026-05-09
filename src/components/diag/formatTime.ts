/**
 * Single timestamp format used everywhere on the Activity log screen and
 * the print-HTML export. ISO-shaped (`YYYY-MM-DD HH:mm:ss ±HH:MM`) in the
 * device's local time with an explicit numeric UTC offset so the value
 * stays unambiguous when a printout leaves the device.
 *
 * Sortable, mono-aligned in the log rows, and fixed-width (25 chars) so
 * column sizing can be uniform across roles. The `±HH:MM` form follows
 * ISO 8601's offset convention; OTLP / NDJSON exports keep the raw epoch
 * ms in `record.time`, so this string is purely for display.
 */
export function formatLogTimestamp(ms: number, d: Date = new Date(ms)): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} ${formatOffset(d)}`;
}

function formatOffset(d: Date): string {
  // getTimezoneOffset returns minutes WEST of UTC, i.e. the sign is inverted
  // relative to the ISO 8601 convention (+HH:MM means east of UTC).
  const totalMin = -d.getTimezoneOffset();
  const sign = totalMin >= 0 ? "+" : "-";
  const abs = Math.abs(totalMin);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}
