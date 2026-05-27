# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `lib/standings.ts` (pure computeStandings module) and `tests/unit/standings.test.ts`. Status: **completed**.

## Important Decisions

- Used `string.localeCompare()` for both group ordering (A→L) and team name tie-break to ensure deterministic, locale-aware sort.
- Split the loop into two passes: first pass builds the full roster from all group-phase matches; second pass aggregates only `finished` match results. This ensures scheduled-only groups still list all 4 teams.
- `?? null` for flag codes (not `|| null`) to avoid overwriting a legitimate empty string.
- `?? 0` for null scores in finished matches — treats them as 0 goals (0-0 draw if both null).

## Learnings

- `vitest.config.ts` global 80% line threshold applies across all `lib/**` + `app/api/**` files. Running a single test file will fail the global threshold because other files (pre-existing) have 0% coverage. This is a pre-existing repo issue; `standings.ts` itself has 100% coverage.
- TypeScript `--noEmit` flags unused variables in test files — removed the unused `GROUPS` constant.

## Files / Surfaces

- Created: `lib/standings.ts`
- Created: `tests/unit/standings.test.ts`

## Errors / Corrections

- Removed unused `GROUPS` constant from test file flagged by `tsc --noEmit`.

## Ready for Next Run

Task 01 is complete. Tasks 03 and 04 can now import `GroupStanding[]` and `TeamStanding` from `lib/standings.ts` and call `computeStandings(matches)`.
