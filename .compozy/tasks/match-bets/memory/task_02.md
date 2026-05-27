# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Added 5 TypeScript interfaces to `lib/api/types.ts`: `Match`, `Prediction`, `MatchWithPrediction`, `OutcomeDistribution`, `MatchDetail`. All exported at module level alongside existing types.

## Important Decisions

- Used `Pick<Prediction, 'predicted_home_score' | 'predicted_away_score'>` for `MatchWithPrediction.prediction` exactly as specified in TechSpec.
- No new files created — all additions appended to the end of `lib/api/types.ts`.

## Learnings

- Test pattern for type-level union rejection: `// @ts-expect-error` comment on the invalid assignment line. This is the project-wide pattern (see `tests/unit/types-hub.test.ts`).
- `satisfies TypeName` is the preferred pattern for runtime fixture assertions in this codebase.

## Files / Surfaces

- `lib/api/types.ts` — 5 new interfaces appended (lines 130–170)
- `tests/unit/match-types.test.ts` — new test file, 20 tests

## Errors / Corrections

None.

## Ready for Next Run

- task_03 can now import `Match` from `lib/api/types.ts`.
- All 5 interfaces are at module level; no namespace nesting.
- `tsc --noEmit` is clean.
