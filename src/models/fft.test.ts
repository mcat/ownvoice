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

  it("returns a single peak at the right bin for a pure sine", () => {
    const N = 128;
    const k0 = 8;
    const x = new Float32Array(N);
    for (let n = 0; n < N; n++) x[n] = Math.sin((2 * Math.PI * k0 * n) / N);
    const { re, im } = fftReal(x);
    const mag = (k: number) => Math.hypot(re[k], im[k]);
    let peakBin = 0;
    let peakMag = 0;
    for (let k = 0; k < N / 2; k++) {
      const m = mag(k);
      if (m > peakMag) { peakMag = m; peakBin = k; }
    }
    expect(peakBin).toBe(k0);
  });

  it("throws on non-power-of-2 length", () => {
    expect(() => fftReal(new Float32Array(100))).toThrow(/power of 2/i);
  });
});
