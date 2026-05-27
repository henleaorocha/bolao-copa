# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add `has_champion_bet: boolean` to the GET `/api/leagues/{id}` response. Modified the existing GET handler to query `champion_bets` with `.maybeSingle()` and fail-open on error.

## Important Decisions

- Used `.maybeSingle()` on `champion_bets` (not `.single()`) — missing row returns `null` not an error.
- Fail-open implemented via `if (!betError)` check; the outer handler `catch` block also covers any thrown exceptions.
- No `console.error` added for betError to keep the fail-open silent (not surfaced as a warning).
- The `as LeagueDetail` cast at the response already validates shape at compile time since task_01 added `has_champion_bet` to the type.

## Learnings

- The GET handler calls `from('league_members')` twice (membership check, then members list). Unit test mock uses a counter (`leagueMembersCallCount`) to return different chains for each call.
- Unit tests mock the 2nd `league_members` call with `.order()` as the terminal call (no `.single()`), matching the actual handler.
- Integration tests in `tests/integration/leagues-detail.test.ts` use `describe.skipIf(!HAS_SERVICE_KEY)` — they run only with a real Supabase. Tests added inline to the existing GET describe block.

## Files / Surfaces

- **Modified**: `app/api/leagues/[id]/route.ts` — added champion_bets query (lines 123–133) and `has_champion_bet` to response (line 154)
- **Created**: `tests/unit/league-detail-get-api.test.ts` — 6 unit tests (4 unit + 2 integration scenarios)
- **Modified**: `tests/integration/leagues-detail.test.ts` — 2 new GET tests added after existing GET describe block

## Errors / Corrections

None. All 6 new unit tests passed on first run. tsc clean. 4 pre-existing failures unchanged.

## Ready for Next Run

Task complete. Diff uncommitted (auto-commit=false). All new tests passing.
