import { describe, it, expect } from "vitest";
import { ulid, ulidForTime } from "./ulid";

describe("ulid", () => {
  it("produces 26-character Crockford base32 strings", () => {
    const id = ulid();
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("is monotonically sortable across times", () => {
    const a = ulidForTime(1000);
    const b = ulidForTime(2000);
    expect(a < b).toBe(true);
  });

  it("differs across two same-instant calls", () => {
    const a = ulid();
    const b = ulid();
    expect(a).not.toBe(b);
  });

  it("encodes timestamp recoverably from the first 10 chars", () => {
    const id = ulidForTime(1700000000000);
    const head = id.slice(0, 10);
    expect(head).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
  });
});
