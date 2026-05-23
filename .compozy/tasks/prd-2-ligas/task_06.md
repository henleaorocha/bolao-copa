---
status: completed
title: League Member Management API Routes
type: backend
complexity: medium
dependencies:
    - task_04
    - task_05
---

# Task 6: League Member Management API Routes

## Overview
Three new sub-route handlers manage the membership lifecycle for a specific league: joining via invite token or open access, removing a member (admin only), and retrieving the shareable invite URL (admin only). Together with the routes from tasks 04 and 05, these complete the full API surface for the Leagues feature.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `POST /api/leagues/[id]/join` MUST accept an optional `{ token?: string }` body; for private leagues the token is required and MUST match `leagues.invite_token` exactly; for open leagues the token is optional and ignored.
2. `POST /api/leagues/[id]/join` MUST return `400 ALREADY_A_MEMBER` if the user is already in `league_members` for that league.
3. `POST /api/leagues/[id]/join` MUST return `403 INVALID_TOKEN` when a private league is requested without a valid token.
4. `POST /api/leagues/[id]/join` on success MUST insert the user into `league_members` with `role = 'member'` and update `users.active_league_id` to this league; return the `LeagueSummary` of the joined league.
5. `DELETE /api/leagues/[id]/members/[userId]` MUST only be callable by the league admin; return `403 NOT_ADMIN` otherwise.
6. `DELETE /api/leagues/[id]/members/[userId]` MUST NOT allow the admin to remove themselves (`leagues.created_by`); return `400 CANNOT_REMOVE_ADMIN` if attempted.
7. `GET /api/leagues/[id]/invite-link` MUST only be callable by the league admin; return `{ invite_url: string }` constructed as `${NEXT_PUBLIC_SITE_URL}/join?token=${league.invite_token}`; NEVER return the raw `invite_token`.
8. All three handlers MUST use the `formatSuccess` / `formatError` envelope and the same session-validation and logging pattern used throughout the API.
</requirements>

## Subtasks
- [ ] 6.1 Create `app/api/leagues/[id]/join/route.ts` with `POST` handler (token validation, member insert, active league update)
- [ ] 6.2 Create `app/api/leagues/[id]/members/[userId]/route.ts` with `DELETE` handler (admin check, self-remove guard)
- [ ] 6.3 Create `app/api/leagues/[id]/invite-link/route.ts` with `GET` handler (admin check, URL construction)
- [ ] 6.4 Write integration tests for all three handlers including all error paths
- [ ] 6.5 Confirm `invite_token` is never returned directly in any response

## Implementation Details
Three new route files, all under `app/api/leagues/[id]/`. The join handler needs to read `leagues.invite_token` server-side (via the service-role Supabase client or via a direct `SELECT` that is allowed because the route runs server-side) but must never forward that value to the client.

For `POST join`: check membership first (ALREADY_A_MEMBER), then check access_type. For private leagues, validate the provided token against `leagues.invite_token`. Then insert into `league_members` and update `users.active_league_id`.

For the invite-link endpoint: the `invite_token` is read from the DB server-side, concatenated into the full URL, and only the URL is returned. Read `NEXT_PUBLIC_SITE_URL` from `process.env`.

See TechSpec "API Endpoints" section for exact error codes and response shapes.

### Relevant Files
- `app/api/auth/me/route.ts` — session-validation and logging pattern
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/api/types.ts` — `LeagueSummary`
- `lib/supabase/client.ts` — `getSupabaseServerClient()`
- `supabase/migrations/20260522000011_*` — `invite_token` column on `leagues` (task_01)
- `app/api/leagues/[id]/route.ts` — sibling route, shares the `[id]` dynamic segment context (task_05)

### Dependent Files
- `app/join/page.tsx` — calls the join endpoint after user confirms (task_10)
- `app/ligas/page.tsx` — Discover tab join flow calls `POST /api/leagues/[id]/join` (task_07)
- `app/ligas/[id]/page.tsx` — calls `GET /api/leagues/[id]/invite-link` and `DELETE /api/leagues/[id]/members/[userId]` (task_09)

### Related ADRs
- [ADR-003: Invite Token as Column on leagues Table](adrs/adr-003.md) — Defines token-never-exposed rule and the full-URL-only response requirement

## Deliverables
- `app/api/leagues/[id]/join/route.ts` (new)
- `app/api/leagues/[id]/members/[userId]/route.ts` (new)
- `app/api/leagues/[id]/invite-link/route.ts` (new)
- Integration tests for all three endpoints **(REQUIRED)**
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `POST /api/leagues/[id]/join` on an open league without a token adds the user as a member and returns `LeagueSummary`
  - [ ] `POST /api/leagues/[id]/join` on a private league with the correct token adds the user as a member
  - [ ] `POST /api/leagues/[id]/join` on a private league without a token returns `403 INVALID_TOKEN`
  - [ ] `POST /api/leagues/[id]/join` on a private league with an incorrect token returns `403 INVALID_TOKEN`
  - [ ] `POST /api/leagues/[id]/join` when the user is already a member returns `400 ALREADY_A_MEMBER`
  - [ ] `POST /api/leagues/[id]/join` on a non-existent league returns `404 LEAGUE_NOT_FOUND`
  - [ ] `DELETE /api/leagues/[id]/members/[userId]` by the admin removes the target user from `league_members`
  - [ ] `DELETE /api/leagues/[id]/members/[userId]` when the target is the admin themselves returns `400 CANNOT_REMOVE_ADMIN`
  - [ ] `DELETE /api/leagues/[id]/members/[userId]` by a non-admin member returns `403 NOT_ADMIN`
  - [ ] `GET /api/leagues/[id]/invite-link` by the admin returns `{ invite_url }` containing `/join?token=` (not the raw token)
  - [ ] `GET /api/leagues/[id]/invite-link` by a non-admin member returns `403 NOT_ADMIN`
- Integration tests:
  - [ ] After a successful join via invite token, the user appears in `GET /api/leagues/[id]` member list and `users.active_league_id` is set to that league
  - [ ] After `DELETE /api/leagues/[id]/members/[userId]`, the removed user's `league_members` row is gone; their `predictions` and `scores` rows for that league remain untouched in the DB
  - [ ] The `invite_url` returned by the invite-link endpoint is a full absolute URL and does not contain the raw `invite_token` as a named field
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `invite_token` is never a direct field in any API response from this task
- Removed member's prediction and score data persists in the DB after removal (verified by integration test)
- Private league join is rejected without a valid token (verified by integration test)
