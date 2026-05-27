# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Implement `lib/scoring.ts` as a pure, I/O-free scoring engine with `PHASE_MULTIPLIERS`, `scoreGroup`, `scoreKnockout`, and `scoreChampion`. Write exhaustive table-driven unit tests with ≥80% coverage.

**Status: COMPLETED.**

## Important Decisions

- **No rounding of fractional results**: `5 × 1.5x = 7.5`, `5 × 2.5x = 12.5`, `5 × 3.5x = 17.5` are returned as-is (JavaScript floats). The task spec explicitly lists these values in the test expectations — no `Math.round` applied.
- **KnockoutPhase imported from `lib/bracket-skeleton.ts`**: Re-use the existing type rather than re-declaring, keeping types in sync.
- **`scoreChampion` returns 0 when either real argument is null**: Checked with `realChamp === null || realVice === null` — both must be resolved for any points to be awarded.

## Learnings

- Coverage scope matters: running `vitest --coverage` for a single file against the whole-project threshold produces a misleading FAIL. The scoring module itself hit 100% on all four metrics; the global threshold failure is a pre-existing property of running partial test suites.

## Files / Surfaces

- `lib/scoring.ts` — new pure module (created).
- `tests/unit/scoring.test.ts` — 43 table-driven tests (created).

## Errors / Corrections

None.

## Ready for Next Run

- task_09 (league API scoring wiring) can import `scoreGroup`, `scoreKnockout`, `scoreChampion`, and `PHASE_MULTIPLIERS` directly from `@/lib/scoring`.
- Shape consumed by task_09: `ScoreInput = { ph, pa, rh, ra }` where ph/pa = predicted home/away, rh/ra = real home/away.
- Pass `null` for `realChamp`/`realVice` when the final hasn't been played; `scoreChampion` returns 0 gracefully.
