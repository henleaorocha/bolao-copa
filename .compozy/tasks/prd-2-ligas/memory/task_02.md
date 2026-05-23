# Task Memory: task_02.md

## Objective Snapshot

Update `/api/auth/me` endpoint to:
1. Replace hardcoded DEFAULT_LEAGUE_ID with dynamic active_league_id from DB
2. Implement fallback: when NULL, use first league_members row (by joined_at ASC)
3. Verify user is still a member of active_league_id, reset to NULL if not
4. Add new PATCH handler to set active_league_id with membership validation
5. Add LeagueSummary interface with member_count field
6. Write comprehensive tests for both GET and PATCH

## Implementation Status

### Completed
- ✓ Added LeagueSummary and LeagueMember interfaces to lib/api/types.ts
- ✓ Updated AuthMeResponse to use LeagueSummary (includes member_count)
- ✓ Refactored GET handler to fetch active_league_id, with NULL fallback logic
- ✓ Added membership validation in GET — resets to NULL if user not in target league
- ✓ Implemented PATCH handler with body validation and membership check
- ✓ Returns 403 NOT_A_MEMBER if PATCH targets league user isn't in
- ✓ Returns 400 INVALID_BODY if active_league_id missing or malformed
- ✓ Returns 401 SESSION_EXPIRED if no session
- ✓ Removed all DEFAULT_LEAGUE_ID references from route file
- ✓ Build succeeds with no TypeScript errors

### Tests Added
- GET tests:
  - GET with NULL active_league_id → fallback to first league
  - GET with valid active_league_id → returns that league
  - GET when user not a member → resets to NULL, uses fallback
  - GET without session → 401 SESSION_EXPIRED
- PATCH tests:
  - PATCH with valid membership → updates active_league_id
  - PATCH without membership → 403 NOT_A_MEMBER
  - PATCH missing active_league_id → 400 INVALID_BODY
  - PATCH without session → 401 SESSION_EXPIRED

## Important Decisions

- Query strategy: Fetch user's active_league_id, check membership, fall back to first league_members row if needed
- Error handling: Reset active_league_id to NULL when user is not a member (per ADR-002)
- Response structure: LeagueSummary now includes member_count for league switcher context
- PATCH body validation: strict type checking on active_league_id

## Learnings

- The test suite requires running local Supabase (supabase start + SUPABASE_SERVICE_ROLE_KEY)
- Build system uses Next.js Turbopack and TypeScript compiler; both verify successfully
- Factory helpers (createTestLeague, addTestLeagueMember, etc.) from task_01 work well for test setup

## Files / Surfaces

- app/api/auth/me/route.ts — GET (refactored) + PATCH (new)
- lib/api/types.ts — added LeagueSummary, LeagueMember; updated AuthMeResponse
- tests/integration/auth.test.ts — expanded with 8 new test scenarios

## Next Steps

1. Use cy-final-verify to validate behavior with running app
2. Commit changes (auto-commit disabled for this run)
3. Update task tracking status to completed
