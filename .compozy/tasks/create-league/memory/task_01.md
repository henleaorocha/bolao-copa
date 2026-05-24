# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Extend `POST /api/leagues` to accept, validate, and persist `prize_pool` (optional string, max 300 chars). No schema migration needed — column exists.

## Important Decisions

- Used `(prize_pool as string | null | undefined) ?? null` for the insert (matches techspec `?? null` pattern).
- Created a separate unit test file `tests/unit/leagues-post-api.test.ts` that imports and tests the actual route handler (mocking Supabase) rather than extending the existing inline-logic-only `leagues.test.ts`.
- Added validation tests both in the inline-logic style (`leagues.test.ts`) and in the handler-level style (`leagues-post-api.test.ts`).

## Learnings

- The global 80% line coverage threshold was already failing before this task (13.52% → 19.87% after task). The failure is project-wide, not introduced by this task.
- `app/api/leagues/route.ts` coverage improved from 0% to ~44% with the new handler-level unit tests.
- The prize_pool validation code has 100% branch coverage in unit tests.
- Integration tests are gated by `describe.skipIf(!HAS_SERVICE_KEY)` — they don't run without a live Supabase instance.

## Files / Surfaces

- `app/api/leagues/route.ts` — added prize_pool to destructuring, validation block (lines 190–204), and insert (line 213)
- `tests/unit/leagues.test.ts` — added `prize_pool validation` describe block (6 inline tests) + updated LeagueSummary response test
- `tests/unit/leagues-post-api.test.ts` — new file, 9 handler-level unit tests for prize_pool + auth + response shape
- `tests/integration/leagues.test.ts` — added 5 integration tests for prize_pool behavior

## Errors / Corrections

None.

## Ready for Next Run

Task 01 is complete. Task 02 (`CreateLeagueModal` client component) can now proceed — the API accepts `prize_pool` in the request body.
