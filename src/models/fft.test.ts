import { describe, it, expect } from "vitest";
import { fftReal } from "./fft";

describe("fftReal", () => {
  it("returns a single peak at bin 0 for a DC signal", () => {
    const N = 64;
    const x = new Float32Array(N).fill(1);
    const { re, im } = fftReal(x);
    expect(re[0]).toBeCloseTo(N, 3);
    expect(im[0]).toBeCloseTo(0, 5);
    for (let k = 1; k < N / 2; k++) {
      expect(Math.hypot(re[k], im[k])).toBeLessThan(1e-3);
    }
  });

  it("returns a single peak at the right bin for a pure sine, with all other bins near zero", () => {
    const N = 128;
    const k0 = 8;
    const x = new Float32Array(N);
    for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * k0 * n) / N);
    const { re, im } = fftReal(x);
    const mag = (k: number) => Math.hypot(re[k], im[k]);
    expect(mag(k0)).toBeGreaterThan(N / 4);
    for (let k = 0; k < N / 2; k++) {
      if (k === k0) continue;
      expect(mag(k)).toBeLessThan(1e-3);
    }
  });

  it("works correctly across a range of lengths and frequencies (catches twiddle-factor bugs)", () => {
    for (const N of [16, 64, 256, 1024]) {
      for (const k0 of [1, 3, N / 8, N / 4 - 1]) {
        const x = new Float32Array(N);
        for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * k0 * n) / N);
        const { re, im } = fftReal(x);
        const mag = (k: number) => Math.hypot(re[k], im[k]);
        for (let k = 0; k < N / 2; k++) {
          if (k === k0) {
            expect(mag(k)).toBeGreaterThan(N / 4);
          } else {
            expect(mag(k)).toBeLessThan(1e-2);
          }
        }
      }
    }
  });

  it("throws on non-power-of-2 length", () => {
    expect(() => fftReal(new Float32Array(100))).toThrow(/power of 2/i);
  });
});
