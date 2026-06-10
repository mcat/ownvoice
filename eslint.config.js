// ESLint flat config (eslint 9).
//
// Layers:
//   - js.configs.recommended everywhere
//   - typescript-eslint recommended for ts/tsx
//   - jsx-a11y recommended for tsx — accessibility is a hard product
//     requirement (see CLAUDE.md / docs/DESIGN_GUIDELINES.md)
//   - environment globals per area: browser+worker for src/ and the
//     plain-JS workers in public/, node for scripts/ and config files
//
// public/{ort,models} are downloaded third-party assets, not source.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      ".stryker-tmp/**",
      "logs/**",
      "public/ort/**",
      "public/models/**",
      "reports/**",
      // Archived WebKit-bug repro artifacts, not shipped code.
      "docs/**",
      // Local Python virtualenvs (model-conversion tooling).
      ".venv*/**",
    ],
  },
  js.configs.recommended,
  {
    // typescript-eslint scoped to TS — its configs default to all files,
    // which double-reports plain-JS findings under both rule namespaces.
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
    rules: {
      // Codebase idiom: intentionally-unused args/captures are underscore-
      // prefixed (e.g. `_key` in JSON replacers, `{ quality: _drop, ...rest }`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ["**/*.tsx"],
    rules: {
      // ignoreNonDOM: several components take a domain prop named `role`
      // (e.g. <ExportMenu role="healthcare">) — only DOM elements carry
      // ARIA roles.
      "jsx-a11y/aria-role": ["error", { ignoreNonDOM: true }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  {
    // Plain-JS module workers + service worker: outside the TS build, so
    // this is their ONLY static check. Worker globals, browser APIs.
    files: ["public/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker, ...globals.serviceworker },
    },
  },
  {
    files: ["scripts/**/*.mjs", "*.config.{js,ts,mjs}", "functions/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["**/*.test.{ts,tsx,mjs}", "src/__tests__/**", "src/test/**"],
    languageOptions: {
      globals: {
        ...globals.node,
        // vitest config sets globals: true
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      // Fake async generators (`async function* () {}` driving consumers
      // step-by-step) intentionally yield nothing.
      "require-yield": "off",
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "src/__tests__/**/*.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
    ],
    rules: {
      // Tests legitimately cast through `any` to poke module internals and
      // build partial fakes; production src/ keeps the rule on (and is
      // currently clean).
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    rules: {
      // Empty catch is the project's documented best-effort idiom; every
      // other empty block still errors.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Base no-unused-vars only for plain JS — typescript-eslint replaces
    // it on ts/tsx (the base rule false-positives on interface members).
    files: ["**/*.{js,mjs}"],
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
