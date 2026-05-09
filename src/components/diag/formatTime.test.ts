import { describe, it, expect } from "vitest";
import { formatLogTimestamp } from "./formatTime";

describe("formatLogTimestamp", () => {
  function fakeDate(parts: {
    yyyy: number; mm: number; dd: number; hh: number; mi: number; ss: number; offsetMin: number;
  }): Date {
    // We construct a Date but stub the getters so the result is deterministic
    // regardless of the host machine's timezone. Date.prototype.getTimezoneOffset
    // returns minutes WEST of UTC — opposite sign from ISO 8601.
    const stub = {
      getFullYear: () => parts.yyyy,
      getMonth: () => parts.mm - 1,
      getDate: () => parts.dd,
      getHours: () => parts.hh,
      getMinutes: () => parts.mi,
      getSeconds: () => parts.ss,
      getTimezoneOffset: () => -parts.offsetMin,
    } as unknown as Date;
    return stub;
  }

  it("renders YYYY-MM-DD HH:mm:ss with positive UTC offset", () => {
    const out = formatLogTimestamp(0, fakeDate({
      yyyy: 2026, mm: 5, dd: 8, hh: 21, mi: 19, ss: 57, offsetMin: 60, // +01:00
    }));
    expect(out).toBe("2026-05-08 21:19:57 +01:00");
  });

  it("renders negative UTC offset with minutes", () => {
    const out = formatLogTimestamp(0, fakeDate({
      yyyy: 2026, mm: 1, dd: 2, hh: 3, mi: 4, ss: 5, offsetMin: -(7 * 60 + 30), // -07:30
    }));
    expect(out).toBe("2026-01-02 03:04:05 -07:30");
  });

  it("renders UTC as +00:00", () => {
    const out = formatLogTimestamp(0, fakeDate({
      yyyy: 2026, mm: 12, dd: 31, hh: 23, mi: 59, ss: 59, offsetMin: 0,
    }));
    expect(out).toBe("2026-12-31 23:59:59 +00:00");
  });

  it("zero-pads single-digit fields", () => {
    const out = formatLogTimestamp(0, fakeDate({
      yyyy: 2026, mm: 1, dd: 1, hh: 1, mi: 1, ss: 1, offsetMin: 60,
    }));
    expect(out).toBe("2026-01-01 01:01:01 +01:00");
  });
});
