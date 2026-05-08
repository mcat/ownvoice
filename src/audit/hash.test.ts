import { describe, it, expect } from "vitest";
import { patientIdHash } from "./hash";

describe("patientIdHash", () => {
  it("produces 16 lowercase hex characters", async () => {
    const h = await patientIdHash("patient-uuid-1234");
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic across calls", async () => {
    const a = await patientIdHash("same-id");
    const b = await patientIdHash("same-id");
    expect(a).toBe(b);
  });

  it("differs across distinct ids", async () => {
    const a = await patientIdHash("id-a");
    const b = await patientIdHash("id-b");
    expect(a).not.toBe(b);
  });
});
