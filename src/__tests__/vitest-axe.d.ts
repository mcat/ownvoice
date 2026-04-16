// vitest-axe ships type augmentation against `Vi.Assertion`, but vitest 4
// exposes `Assertion` directly from the "vitest" module. Bridge it here.
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
