# Task Memory: task_11.md

## Objective Snapshot
Task 11: Replace hardcoded DEFAULT_LEAGUE_ID in dashboard with dynamic active_league_id from user context.

## Important Decisions
1. **Extracted shared utility function** — Created `lib/resolve-active-league.ts` to avoid duplication of league resolution logic between `/api/auth/me` and dashboard. Both now use `resolveActiveLeague(supabase, userId)` which handles membership verification and NULL fallback.
2. **Reused existing pattern** — The resolution logic was copied from `/api/auth/me/route.ts` GET handler (task_02 implementation). The shared utility encapsulates the full flow: verify active_league_id membership, reset to NULL if removed, and fallback to first league by joined_at.

## Learnings
- The migration from hardcoded to dynamic context is purely a data-fetching refactor; no visual changes, no component structure changes.
- The NULL fallback (first league by joined_at ASC) is already in place in task_02; task_11 mirrors this behavior.
- factories.ts continues to export DEFAULT_LEAGUE_ID for test setup (test fixtures seed the default league); no dashboard code should import it.

## Files / Surfaces
- **lib/resolve-active-league.ts** — NEW: Shared utility function (exported)
- **app/dashboard/page.tsx** — MODIFIED: Removed DEFAULT_LEAGUE_ID constant, imports resolveActiveLeague, calls it to get dynamic activeLeagueId before queries
- **app/api/auth/me/route.ts** — MODIFIED: GET handler now imports and uses resolveActiveLeague instead of inline resolution logic
- **tests/integration/dashboard.test.ts** — NEW: 5 integration tests covering league resolution scenarios
- **tests/unit/resolve-active-league.test.ts** — NEW: 4 unit tests for the utility function
- **tests/fixtures/factories.ts** — NO CHANGE: Still exports DEFAULT_LEAGUE_ID for test setup

## Errors / Corrections
- Fixed TypeScript nullability in dashboard.test.ts line 182 and resolve-active-league.test.ts line 99 (userResult.data?.active_league_id)

## Ready for Next Run
- Implementation complete
- Tests written (5 integration + 4 unit tests)
- Ready for cy-final-verify before commit
