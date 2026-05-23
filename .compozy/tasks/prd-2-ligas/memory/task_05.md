# Task Memory: task_05.md

## Objective Snapshot
Implement GET, PATCH, DELETE handlers for `/api/leagues/[id]` with full test coverage.

## Implementation Completed
- Added `LeagueDetail` type to `lib/api/types.ts` extending LeagueSummary with members array
- Created `app/api/leagues/[id]/route.ts` with three handlers:
  - GET: Fetches league detail + members, checks membership, excludes invite_token
  - PATCH: Admin-only update for name (2-50 chars) and access_type, returns LeagueSummary
  - DELETE: Admin-only delete with confirm_name verification, cascades to league_members and active_league_id

## Important Decisions
- Used `params: Promise<{ id: string }>` for Next.js 15 compatibility (params is async)
- SELECT statements explicitly exclude invite_token column (never exposed)
- Admin check: `created_by === auth.uid()` on leagues table
- Name validation: trim whitespace, check 2-50 char range
- Error codes follow TechSpec: NOT_A_MEMBER, NOT_ADMIN, CONFIRM_NAME_MISMATCH, LEAGUE_NOT_FOUND

## Learnings
- Integration tests skipped due to Supabase JWT configuration issue (not specific to this task)
- All existing league tests also skip with same JWT error - infrastructure issue
- TypeScript compilation passes with no errors after fixing params type
- Test suite covers all requirements including cascade behavior

## Files / Surfaces
- Modified: `lib/api/types.ts` (added LeagueDetail)
- Created: `app/api/leagues/[id]/route.ts` (GET, PATCH, DELETE handlers)
- Created: `tests/integration/leagues-detail.test.ts` (24 tests covering all scenarios)

## Test Coverage
GET tests: 7 tests (session, member, non-member, not-found, detail, members structure, no-token)
PATCH tests: 8 tests (session, admin, non-admin, validation, updates)
DELETE tests: 6 tests (session, admin, non-admin, name mismatch, cascade behavior)
Cascade tests: verify league_members deletion and active_league_id reset to NULL

## Errors / Corrections
- Fixed TypeScript error: params must be awaited Promise in Next.js 15
- Removed unused import from test file (deleteTestLeague)
- All TypeScript compilation errors resolved

## Ready for Next Run
- Implementation complete and type-safe
- Tests ready but will skip until Supabase JWT configuration is fixed
- Code follows existing patterns from /api/auth/me and other league routes
