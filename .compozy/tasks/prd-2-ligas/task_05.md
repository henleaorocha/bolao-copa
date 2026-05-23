---
status: completed
title: League Detail, Update & Delete API Routes
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 5: League Detail, Update & Delete API Routes

## Overview
A single `app/api/leagues/[id]/route.ts` file implements `GET` (league detail with member list), `PATCH` (rename or change access type, admin only), and `DELETE` (delete league with name confirmation, admin only). These are the three methods on the league resource itself, distinct from member management operations that live under sub-routes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `GET /api/leagues/[id]` MUST return a `LeagueDetail` response (see TechSpec "Core Interfaces") including the `members` array; the `invite_token` column MUST be excluded.
2. `GET /api/leagues/[id]` MUST return `403 NOT_A_MEMBER` when the authenticated user is not in `league_members` for that league.
3. `GET /api/leagues/[id]` MUST return `404 LEAGUE_NOT_FOUND` when no league with that ID exists.
4. `PATCH /api/leagues/[id]` MUST only be callable by the league admin (`leagues.created_by = auth.uid()`); return `403 NOT_ADMIN` otherwise.
5. `PATCH /api/leagues/[id]` MUST accept `{ name?: string, access_type?: 'open'|'private' }` and validate `name` is 2–50 characters if provided; return `400 INVALID_BODY` on failure.
6. `DELETE /api/leagues/[id]` MUST only be callable by the league admin; require `{ confirm_name: string }` in the body that exactly matches `leagues.name`; return `400 CONFIRM_NAME_MISMATCH` if it does not.
7. `DELETE /api/leagues/[id]` cascade behavior (all `league_members` rows deleted, `users.active_league_id` set to NULL by FK) is handled by the DB; the API only needs to issue the DELETE.
8. All three handlers MUST use the `formatSuccess` / `formatError` envelope and the same session-validation pattern as `app/api/auth/me/route.ts`.
</requirements>

## Subtasks
- [x] 5.1 Create `app/api/leagues/[id]/route.ts` with `GET` handler (detail + members, membership guard)
- [x] 5.2 Add `PATCH` handler (admin-only rename/access type change with validation)
- [x] 5.3 Add `DELETE` handler (admin-only, `confirm_name` verification)
- [x] 5.4 Write integration tests for all three handlers including permission and error paths
- [x] 5.5 Confirm `invite_token` is absent from GET and PATCH responses

## Implementation Details
The route file `app/api/leagues/[id]/route.ts` exports `GET`, `PATCH`, and `DELETE` async functions. The `[id]` dynamic segment is accessed from `params` in the Next.js App Router handler signature.

The `GET` handler fetches the league row and then fetches `league_members` joined with `users` to build the `LeagueMember[]` array (see TechSpec "Core Interfaces — League detail (API response)" for the exact shape).

For `PATCH`, after the admin check, perform the UPDATE and return the updated `LeagueSummary`.

For `DELETE`, read the league name first (to compare `confirm_name`), then issue the DELETE. The FK `ON DELETE CASCADE` on `league_members` and `ON DELETE SET NULL` on `users.active_league_id` handle cleanup automatically.

See TechSpec "API Endpoints" section for exact request/response shapes and all error codes.

### Relevant Files
- `app/api/auth/me/route.ts` — session-validation and logging pattern to follow
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/api/types.ts` — `LeagueSummary`, `LeagueDetail`, `LeagueMember` (added in task_02)
- `lib/supabase/client.ts` — `getSupabaseServerClient()`
- `supabase/migrations/20260522000002_create_leagues.sql` — `leagues` schema
- `supabase/migrations/20260522000003_create_league_members.sql` — `league_members` schema

### Dependent Files
- `app/ligas/[id]/page.tsx` — calls `GET /api/leagues/[id]` to render the detail screen (task_09)
- `app/api/leagues/[id]/join/route.ts` — sibling sub-route under `[id]/` (task_06)
- `app/api/leagues/[id]/members/[userId]/route.ts` — sibling sub-route under `[id]/` (task_06)
- `app/api/leagues/[id]/invite-link/route.ts` — sibling sub-route under `[id]/` (task_06)

## Deliverables
- `app/api/leagues/[id]/route.ts` (new — GET + PATCH + DELETE)
- Integration tests for all three handlers **(REQUIRED)**
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `GET /api/leagues/[id]` with a valid league ID and the user as a member returns `200` with `LeagueDetail` including a non-empty `members` array
  - [ ] `GET /api/leagues/[id]` when the user is NOT a member returns `403 NOT_A_MEMBER`
  - [ ] `GET /api/leagues/[id]` with a non-existent league ID returns `404 LEAGUE_NOT_FOUND`
  - [ ] `GET /api/leagues/[id]` response does NOT contain `invite_token`
  - [ ] `PATCH /api/leagues/[id]` by the admin with `{ name: "Novo Nome" }` returns `200` with updated `LeagueSummary`
  - [ ] `PATCH /api/leagues/[id]` by a non-admin member returns `403 NOT_ADMIN`
  - [ ] `PATCH /api/leagues/[id]` with `name` of 1 character returns `400 INVALID_BODY`
  - [ ] `DELETE /api/leagues/[id]` by the admin with the correct `confirm_name` returns `200 { ok: true }`
  - [ ] `DELETE /api/leagues/[id]` with a `confirm_name` that does not match the league name returns `400 CONFIRM_NAME_MISMATCH`
  - [ ] `DELETE /api/leagues/[id]` by a non-admin member returns `403 NOT_ADMIN`
- Integration tests:
  - [ ] After `DELETE /api/leagues/[id]`, all `league_members` rows for that league are gone from the DB
  - [ ] After `DELETE /api/leagues/[id]`, any `users.active_league_id` pointing to that league is NULL in the DB
  - [ ] A private league is not accessible via `GET /api/leagues/[id]` to a non-member (returns `403`, not `404`)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `invite_token` is never present in any response from this route
- `DELETE` cascade is confirmed by integration test (no orphaned `league_members` rows)
- All admin-only operations correctly reject non-admin requests with `403 NOT_ADMIN`
