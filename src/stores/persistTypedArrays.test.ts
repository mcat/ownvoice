import { describe, it, expect } from "vitest";
import { f32Replacer, f32Reviver } from "./persistTypedArrays";

function roundTrip(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, f32Replacer), f32Reviver);
}

describe("persistTypedArrays", () => {
  it("tags a Float32Array on write and restores it on read", () => {
    const original = new Float32Array([0.1, -0.2, 3.14, 0]);
    const restored = roundTrip(original) as Float32Array;
    expect(restored).toBeInstanceOf(Float32Array);
    expect(Array.from(restored)).toEqual(Array.from(original));
  });

  it("round-trips nested Float32Array inside an object", () => {
    const original = {
      cfg: {
        patients: [
          {
            speakerData: {
              condEmb: new Float32Array([1, 2, 3]),
              speakerEmbeddings: new Float32Array(192).fill(0.5),
            },
          },
        ],
      },
    };
    type Restored = {
      cfg: {
        patients: { speakerData: { condEmb: unknown; speakerEmbeddings: unknown } }[];
      };
    };
    const restored = roundTrip(original) as Restored;
    const sd = restored.cfg.patients[0].speakerData;
    expect(sd.condEmb).toBeInstanceOf(Float32Array);
    expect(sd.speakerEmbeddings).toBeInstanceOf(Float32Array);
    expect((sd.condEmb as Float32Array).length).toBe(3);
    expect((sd.speakerEmbeddings as Float32Array).length).toBe(192);
  });

  it("passes legacy number[] through unchanged so existing installs hydrate cleanly", () => {
    const legacy = {
      cfg: {
        patients: [{ speakerData: { condEmb: [0.1, 0.2, 0.3] } }],
      },
    };
    type Restored = { cfg: { patients: { speakerData: { condEmb: unknown } }[] } };
    const restored = roundTrip(legacy) as Restored;
    const arr = restored.cfg.patients[0].speakerData.condEmb;
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toEqual([0.1, 0.2, 0.3]);
  });

  it("leaves non-Float32Array typed-array-like objects alone", () => {
    const value = { v: [1, 2, 3], __t: "something-else" };
    const restored = roundTrip(value);
    expect(restored).toEqual(value);
  });
});
