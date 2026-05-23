# Task Memory: task_04.md

## Objective Snapshot
Implement three API endpoints for league listing, creation, and discovery:
- GET /api/leagues: return user's leagues
- POST /api/leagues: create new league with creator as admin
- GET /api/leagues/discover: return open leagues not yet joined by user

## Important Decisions
1. **Discover filter approach**: Fetch user's league memberships separately, then filter in-memory rather than using SQL string interpolation. Safer and more maintainable.
2. **Response structure**: All endpoints return LeagueSummary without invite_token, following established ApiResponse<T> envelope pattern.
3. **Error handling**: Consistent 401 SESSION_EXPIRED and 500 DATABASE_ERROR codes across all endpoints.

## Learnings
- Supabase nested selects work well for GET /api/leagues (joining league_members with leagues)
- POST endpoint requires 3 sequential writes: league creation, member insertion, active_league_id update
- Tests properly skip when SERVICE_ROLE_KEY is unavailable (integration tests)
- Unit tests validate constraints at business logic level (name length, access_type validation)

## Files / Surfaces
- **Created**: app/api/leagues/route.ts (GET + POST handlers)
- **Created**: app/api/leagues/discover/route.ts (GET handler)
- **Created**: tests/unit/leagues.test.ts (15 unit tests, all passing)
- **Created**: tests/integration/leagues.test.ts (15 integration tests, properly skipped without SERVICE_ROLE_KEY)
- **Verified**: No invite_token exposure in responses
- **Verified**: Type checking passes (npm run type-check)
- **Verified**: Logging follows structured JSON pattern from /api/auth/me

## Errors / Corrections
- Fixed: SQL injection risk in discover endpoint by separating queries instead of string interpolation
- Fixed: Unused variable in integration test (admin client)

## Ready for Next Run
All endpoints follow the established pattern from /api/auth/me:
- Session validation via supabase.auth.getUser()
- ApiResponse<T> envelope via formatSuccess/formatError
- Structured JSON logging with timestamp, endpoint, duration_ms
- Proper error codes: SESSION_EXPIRED (401), DATABASE_ERROR (500), INVALID_BODY (400)

Dependencies satisfied:
- task_01 (DB migrations with invite_token, member_count, RLS policies)
- task_02 (auth/me endpoint with active_league_id)

Ready for task_05 (League Detail, Update & Delete routes) and task_07 (League Hub screen).
