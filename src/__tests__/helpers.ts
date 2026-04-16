/**
 * Reusable test helpers. Keep thin — each helper should replace copy-paste
 * across multiple test files.
 */

import { vi } from "vitest";

/**
 * Install a `window.matchMedia` stub that reports whether the given media
 * query should match. Tests that exercise theme resolution, reduced-motion,
 * etc. call this inside the test (or beforeEach) to simulate a system setting.
 *
 * The default setup.ts stub reports `matches: false` for everything; use
 * this when a specific query needs to report `matches: true`.
 */
export function mockMatchMedia(prefersDark: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });
}
