// vitest-axe ships type augmentation against `Vi.Assertion`, but vitest 4
// exposes `Assertion` directly from the "vitest" module. Bridge it here.
// The "empty" interfaces are the declaration-merging idiom — they splice
// AxeMatchers into vitest's own types.
/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
