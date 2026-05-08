import { describe, it, expect } from "vitest";
import { traceId, spanId } from "./spanIds";

describe("ID helpers", () => {
  it("traceId is 32 lowercase hex chars", () => {
    expect(traceId()).toMatch(/^[0-9a-f]{32}$/);
  });
  it("spanId is 16 lowercase hex chars", () => {
    expect(spanId()).toMatch(/^[0-9a-f]{16}$/);
  });
  it("two traceIds differ", () => {
    expect(traceId()).not.toBe(traceId());
  });
});
