# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `GET /api/leagues/[id]/matches/[matchId]` returning a single `MatchDetail` with embedded user prediction and conditional distribution aggregation (only when `is_deadline_passed === true`).

## Important Decisions

- Distribution aggregation is computed client-side (JS filter/count) rather than via raw SQL `COUNT(*) FILTER (WHERE ...)`. The Supabase JS client does not support that syntax directly without `rpc()`. For league sizes < 50, client-side computation is sub-millisecond and requires no DB function migration.
- User prediction query uses `.single()` (returns null on no-row error, treated as `prediction: null`). Distribution query does NOT use `.single()` (resolves as array). This is the key structural difference between the two `from('predictions')` calls.
- `_request` parameter named with underscore prefix to satisfy `tsc --noEmit` (TypeScript unused-variable rule), consistent with Next.js App Router pattern when request params are not used.

## Learnings

- Unit test mock pattern for two sequential `from('predictions')` calls: use a `predictionsCallCount` counter — first call returns single-result chain (user prediction), second call returns array chain (distribution). This cleanly separates the two queries without inspecting call arguments.
- Integration test for per-league isolation: create predictions in two leagues for the same match; verify only the target league's count appears in the distribution.

## Files / Surfaces

- Created: `app/api/leagues/[id]/matches/[matchId]/route.ts`
- Created: `tests/unit/match-detail-api.test.ts` (12 unit tests, 92.68% stmt coverage)
- Created: `tests/integration/match-detail.test.ts` (5 integration tests)

## Errors / Corrections

- Initial `route.ts` had unused `request` param → renamed to `_request`.
- Initial test file had unused `makeSingleQuery` helper → removed.

## Ready for Next Run

task_06 complete. task_07 (PUT /api/leagues/[id]/predictions/[matchId]) is next.
