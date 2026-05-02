/**
 * Radix-2 Cooley-Tukey forward FFT for real-valued input.
 *
 * Length must be a power of 2. Returns full complex output as parallel
 * Float32Arrays (real and imaginary parts). Use bins 0..N/2 — bins above
 * Nyquist are the conjugate mirror and carry no new information.
 *
 * Self-contained, no dependencies. Used by spectral-tilt scoring.
 */
export function fftReal(x: Float32Array): { re: Float32Array; im: Float32Array } {
  const N = x.length;
  if ((N & (N - 1)) !== 0 || N === 0) {
    throw new Error(`fftReal: length must be a power of 2 (got ${N})`);
  }
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = x[i];
  bitReversePermute(re, im);

  // Twiddle index `k` advances by `tableStep = N/size` each butterfly,
  // so it indexes a virtual length-N twiddle table tw[m] = exp(-2πi·m/N).
  // The angle formula must therefore divide by N, not by size — using
  // /size produces a (N/size)× phase error for every stage except the last.
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const tableStep = N / size;
    for (let i = 0; i < N; i += size) {
      let k = 0;
      for (let j = i; j < i + half; j++) {
        const angle = (-2 * Math.PI * k) / N;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const tre = re[j + half] * cos - im[j + half] * sin;
        const tim = re[j + half] * sin + im[j + half] * cos;
        re[j + half] = re[j] - tre;
        im[j + half] = im[j] - tim;
        re[j] += tre;
        im[j] += tim;
        k += tableStep;
      }
    }
  }
  return { re, im };
}

function bitReversePermute(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
}
