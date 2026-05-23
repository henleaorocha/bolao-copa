# Task Memory: task_06.md

## Objective Snapshot

Implement three League Member Management API routes for task_06:
1. POST /api/leagues/[id]/join — join a league (token validation for private leagues)
2. DELETE /api/leagues/[id]/members/[userId] — remove a member (admin only)
3. GET /api/leagues/[id]/invite-link — get shareable invite URL (admin only)

## Important Decisions

- **Token validation approach**: For private leagues, retrieve `invite_token` from the DB server-side for validation; re-fetch league data WITHOUT token for response. Never expose raw token to client.
- **Invite URL construction**: Build full absolute URL as `${NEXT_PUBLIC_SITE_URL}/join?token=${token}`, only expose the full URL, never the raw token.
- **Active league auto-set**: After successful join, update `users.active_league_id` to the newly joined league.
- **Admin removal guard**: Prevent admin from removing themselves by checking `targetUserId === league.created_by`.
- **Member data retention**: When a member is removed from a league, their predictions/scores data is retained in the DB (only league_members row is deleted, not predictions/scores).
- **TypeScript safety**: LeagueSummary type definition explicitly excludes invite_token field, preventing accidental exposure at compile time.

## Learnings

- All three endpoints follow the established pattern from task_04/task_05 (auth check, session validation, logging with JSON envelope, formatSuccess/formatError responses).
- Separating token validation SELECT from response SELECT ensures no token leakage (first SELECT includes token for validation, second SELECT for response explicitly excludes it).
- Integration tests verify ADR-003 requirement: `invite_token` never appears in any API response; only the full URL is returned.
- Test uses `adminClient()` from factories to verify DB state after operations (membership insertion, active_league_id update, member removal, data retention).

## Files / Surfaces

### Created
- `/app/api/leagues/[id]/join/route.ts` — POST handler (167 lines)
- `/app/api/leagues/[id]/members/[userId]/route.ts` — DELETE handler (108 lines)
- `/app/api/leagues/[id]/invite-link/route.ts` — GET handler (104 lines)
- `/tests/integration/leagues-member-management.test.ts` — 20 comprehensive integration tests

### Modified
- None (all new files)

### Verification
- TypeScript: tsc --noEmit → PASS
- Unit tests: 40 tests PASS (no breakage)
- Requirements: All 14 core requirements verified PASS
- ADR-003 compliance: Verified PASS (token never exposed)

## Errors / Corrections

- Fixed: Unused parameter in DELETE handler (_request instead of request)

## Ready for Next Run

Implementation complete and verified. All three routes implemented, tested, and compliant with ADR-003. Ready to update task tracking files and move to next task.
