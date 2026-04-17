# Mutation Testing Audit Skill

Run Stryker mutation testing against OwnVoice's pure-logic modules, triage surviving mutants, and automatically write tests that kill the real gaps. Built on top of `@stryker-mutator/vitest-runner` with the project's existing `stryker.config.json` and `vitest.stryker.config.ts`.

## Triggers
- User says "run mutation test", "mutation audit", "stryker", "check test quality", "find test gaps"
- User references `/mutation-audit`
- User asks to "improve test coverage for <file>" — prefer mutation testing over line coverage

## What this skill does NOT do
- Run on every commit or in CI. Full runs take ~40 min. This is a **manual, on-demand audit**.
- Audit UI components (`src/components/**`). Mutations on inline style values produce noise.
- Audit workers (`src/models/**`). Tests are heavily mocked; mutants mostly hit shim code.

Scope is locked in `stryker.config.json` to `src/data/**` + `src/stores/**`. Do not widen without a reason.

## Modes

| Mode | When | Command | Runtime |
|------|------|---------|---------|
| **Full baseline** | First time, or after major refactor | `npm run test:mutation` | ~40 min |
| **Scoped file** | Iterating on one file's tests | `npx stryker run --mutate 'src/<path>.ts'` | 30 s – 3 min |
| **Scoped directory** | Iterating on one subsystem | `npx stryker run --mutate 'src/stores/**/*.ts'` | 5–10 min |

Prefer scoped runs during fix iteration — only redo the full baseline at the end.

## Auto-proceed workflow

When the user invokes this skill, execute the following end-to-end **without asking for confirmation between steps** unless (a) a test starts failing or (b) a fix would require changing source code (not test code).

### Step 1 — Decide scope
- If the user named a file/directory, use a scoped run.
- Otherwise, ask once: "Full baseline (~40 min) or scoped? If scoped, which file?" — then proceed.

### Step 2 — Run Stryker, capture output
```bash
npx stryker run [--mutate '<glob>'] 2>&1 | tee stryker-run.log
```
Do not delete the log — it's gitignored via `.gitignore` (`reports/`, `.stryker-tmp/`). The HTML report is at `reports/mutation/mutation.html`.

### Step 3 — Extract surviving mutants
From `stryker-run.log`, pull every `[Survived]` block (file, line, mutant type, diff). Group by file.

Mutant types you will see:
- `ConditionalExpression` — `if (cond)` → `if (true)` / `if (false)`
- `EqualityOperator` — `===` → `!==`, `<` → `<=`
- `LogicalOperator` — `&&` → `||`
- `StringLiteral` — `"foo"` → `""`
- `ArrowFunction` — `() => expr` → `() => undefined`
- `BlockStatement` — entire `{ ... }` removed
- `ArrayDeclaration`, `ObjectLiteral` — empties out structure

### Step 4 — Triage each surviving mutant

Classify into three buckets:

**(a) Equivalent mutant — ignore.** Known equivalents in this codebase:
- `typeof window !== "undefined"` → `true` — jsdom always defines `window`.
- `"caches" in self` → `true`, `"serviceWorker" in navigator` → `true` — both mocked in `src/__tests__/setup.ts` so the property is always present. The `→ false` variants kill (we test the block runs); only the `→ true` variants survive.
- Any guard that tests for a globally-mocked API in setup.ts.

**(b) Low-value mutant — ignore with judgment.** Examples:
- `StringLiteral` mutations on user-facing copy like `"Help"` → `""` where the string isn't load-bearing for behavior, only for display. These are better caught by snapshot/visual tests.
- `ArrowFunction` mutants on trivial getters returning already-asserted state.

**(c) Real gap — fix.** Everything else. These are the ones where mutating the source would silently change observable behavior and no test notices.

### Step 5 — Fix real gaps (test-only changes)

For each real gap, write or strengthen the test. **Modify tests only**, never source code. Use these patterns (seen in OwnVoice already):

| Mutant signature | Fix pattern |
|---|---|
| `ArrowFunction` on a Zustand action | Call the action; assert the resulting `getState()` shape changed as expected. See `resetAll.test.ts` after fix. |
| `StringLiteral` on a clinical phrase | Assert exact value with `toEqual`, not existence with `toBeDefined`. See `pain.test.ts:13-14` for the pattern that gets 100% on `phrases.ts`. |
| `ConditionalExpression` on a branch | Write two tests — one for each branch — each with a distinct observable outcome. |
| `EqualityOperator` on a number comparison | Add boundary tests (just-below, just-at, just-above). |
| `ArrayDeclaration` emptied | Assert `.length` AND assert on specific contents. |
| Missing coverage (`[NoCoverage]`) on a guarded block | Mock the guard's condition to be true; assert side effects. Pattern: `vi.mocked(global.X).mockResolvedValueOnce(...)` with `-Once` to avoid leaking to next test. |

### Step 6 — Re-run scoped Stryker
```bash
npx stryker run --mutate 'src/<path>.ts'
```
Report the before → after score delta.

### Step 7 — Run full Vitest suite
```bash
npm test
```
Catches regressions from changes to `setup.ts` or shared fixtures. **Do not skip this step** — changes to `setup.ts` can silently break unrelated tests.

### Step 8 — Summarize
Report:
- Files audited and score delta per file (e.g., `resetAll.ts: 25% → 83%`)
- Count of real gaps fixed vs equivalent mutants ignored
- Any surviving mutants deliberately left (with one-line justification each)
- Whether the full suite still passes

## File risk rankings (OwnVoice-specific)

When the user doesn't specify a file, default to fixing in this order:

**HIGH — clinical-safety impact:**
1. `src/stores/resetAll.ts` — cross-patient data wipe on shared iPads. Silent failure = privacy breach.
2. `src/stores/settingsStore.ts` — patient identity, language, cloned voice. Wrong state = wrong patient.
3. `src/data/phraseRegistry.ts` (composition functions only: `composePainSentence`, `composeWishSentence`) — clinical output text.
4. `src/data/pain.ts` — FPS scale; wrong levels invalidate the measurement. Currently **100%**; maintain as regression canary.

**MEDIUM — correctness impact:**
5. `src/stores/conversationStore.ts` — message history shown to clinicians.
6. `src/stores/idbStorage.ts` — Zustand IDB adapter.
7. `src/stores/audioCacheStore.ts` — pregen progress accounting.
8. `src/stores/uiStore.ts` — theme/navigation; user-visible but not safety-critical.

**LOW — heuristic output:**
9. `src/data/suggestion-trees.ts` — brittle to assert exact traversal. Acceptable to leave lower score.
10. `src/data/suggestions.ts` — keyword matching; same.
11. `src/data/locales/**` — excluded from mutate glob by default.

## Common mistakes

- **Running Stryker with `pool: "forks"`.** Stryker's vitest-runner requires `threads`. Always use `vitest.stryker.config.ts`, not the main `vitest.config.ts`. The project's `stryker.config.json` already points to the right file.
- **Using `mockResolvedValue` without `-Once`.** `afterEach` in `setup.ts` calls `vi.restoreAllMocks()`, which wipes implementations for `vi.fn()` mocks back to `() => undefined`. A `mockResolvedValue` leaks until the next `afterEach` and can break subsequent test files. Always prefer `mockResolvedValueOnce`.
- **Fixing source code instead of tests.** Mutation testing evaluates *tests*, not code. If a mutant survives, the fix is almost always a missing assertion, not a code change. If you find yourself "simplifying" source code to make a mutant easier to kill, stop and reconsider.
- **Chasing 100% score.** The `uiStore` theme-detection `typeof window !== "undefined"` mutants cannot be killed in jsdom. Document them as equivalent mutants; move on.
- **Running full Stryker after every fix.** Use scoped runs during iteration. A full run is only valuable as a final baseline.

## Quick reference — commands

```bash
# Full audit (first time or pre-release)
npm run test:mutation

# Scoped to one file (iteration)
npx stryker run --mutate 'src/stores/resetAll.ts'

# Scoped to one directory
npx stryker run --mutate 'src/stores/**/*.ts'

# After fixes, verify nothing else regressed
npm test

# View the HTML report
open reports/mutation/mutation.html
```

## When to stop

Stop fixing when any of these is true:
- All surviving mutants in the scoped file are classified as equivalent or low-value.
- Mutation score for the file is ≥80% and remaining survivors each have a written one-line justification.
- A fix would require changing source code — pause and discuss with the user instead.
- A fix would make a test overly brittle (asserting on internal call order, test-only state). Prefer accepting the surviving mutant.
