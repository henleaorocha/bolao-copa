# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

COMPLETE. `app/api/leagues/[id]/matches/route.ts` created with GET handler. 12 unit + 3 integration tests pass. 90.9% stmt / 83.33% branch / 100% function coverage. TypeScript clean.

## Important Decisions

- Check league existence (404) BEFORE membership (403) — deviates from route.ts pattern (which checks membership first) but satisfies the task's 404 requirement unambiguously.
- Two separate queries (matches, then predictions) instead of PostgREST LEFT JOIN embedding — simpler to mock and test; same semantics.
- Integration tests: import handler directly + hybrid mock (`auth.getUser()` mocked, `from()` delegated to adminClient). Promoted to shared workflow memory.

## Files / Surfaces

- `app/api/leagues/[id]/matches/route.ts` — created
- `tests/unit/league-matches-api.test.ts` — created (12 tests)
- `tests/integration/league-matches.test.ts` — created (3 tests)

## Errors / Corrections

- Initial TypeScript error: `.map()` typed `match` as `{ id: string; match_date: string } & Record<string, unknown>` — spread result didn't satisfy `MatchWithPrediction`. Fixed by casting `matchList` as `Match[]` before mapping.

## Ready for Next Run

task_06 shares the same query pattern as task_05 (single-match variant) — see shared workflow memory Handoffs section.
