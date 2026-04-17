import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

// Vitest config used exclusively by Stryker (mutation testing).
// Differs from vitest.config.ts only in using the threads pool, which
// @stryker-mutator/vitest-runner requires. The main suite keeps pool: "forks"
// because some tests (workers, fake-indexeddb teardown) are sensitive to
// thread reuse — but the files Stryker mutates (src/data, src/stores) are
// pure and run fine on threads.
export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    pool: "threads",
    server: {
      deps: {
        inline: ["zustand"],
      },
    },
  },
});
