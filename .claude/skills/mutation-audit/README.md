# mutation-audit

Project-local Claude Code skill for running and acting on Stryker mutation testing in OwnVoice.

## Usage

Invoke with any of:
- `/mutation-audit`
- "run mutation test"
- "stryker audit"
- "find test gaps in `<file>`"

## What happens

1. Claude runs `npm run test:mutation` (or scoped via `npx stryker run --mutate ...`).
2. Parses `stryker-run.log` for surviving mutants.
3. Triages each: equivalent mutant (ignore), low-value (ignore with note), real gap (fix).
4. Writes new test assertions for real gaps — **test files only**, never source code.
5. Re-runs Stryker scoped to the changed file to verify score improved.
6. Runs `npm test` to check nothing else regressed.
7. Reports the score delta.

By default, steps 2–6 proceed without human confirmation. Claude stops and asks only if:
- A fix would require changing source code.
- A test starts failing.
- Scope is ambiguous.

## Scope

Fixed in `stryker.config.json` to `src/data/**` + `src/stores/**`. Excludes:
- `src/data/locales/**` (static string tables — mutations produce noise)
- `src/components/**` (UI)
- `src/models/**` (workers, heavily mocked)

## Runtime expectations

| Command | Time |
|---|---|
| `npm run test:mutation` (full) | ~40 min |
| `npx stryker run --mutate 'src/stores/resetAll.ts'` | ~20 s |
| `npx stryker run --mutate 'src/stores/**/*.ts'` | ~8 min |

## Config files this skill depends on

- `stryker.config.json` — mutate scope, reporters, concurrency
- `vitest.stryker.config.ts` — Vitest config with `pool: "threads"` (required by Stryker; the main `vitest.config.ts` uses `forks`)
- `src/__tests__/setup.ts` — global mocks; changes here affect the whole suite, so always run `npm test` after touching it

## OwnVoice-specific priorities

When the user doesn't name a file, the skill defaults to fixing in clinical-safety order:

1. `resetAll.ts` — cross-patient data wipe
2. `settingsStore.ts` — patient identity / cloned voice
3. `phraseRegistry.ts` — clinical phrase composition
4. The `stores/` tier before the `data/` tier

See `skill.md` for the full ranking and triage playbook.
