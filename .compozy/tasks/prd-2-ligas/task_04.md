---
status: completed
title: League List, Create & Discover API Routes
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 4: League List, Create & Discover API Routes

## Overview
Three new API route files implement the league listing, creation, and discovery endpoints. These are the write path (create league) and primary read paths (user's leagues, open leagues) that the League Hub screen and LeagueSwitcher will consume. All follow the Foundation's `ApiResponse<T>` envelope and session-validation pattern established in `GET /api/auth/me`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `GET /api/leagues` MUST return `LeagueSummary[]` for all leagues the authenticated user is a member of, ordered by `joined_at DESC`.
2. `POST /api/leagues` MUST create a new league, insert the creator as an `'admin'` member in `league_members`, and set `users.active_league_id` to the new league's ID in the same transaction (or sequential writes).
3. `POST /api/leagues` MUST validate: `name` is 2–50 characters (trimmed); `access_type` is `'open'` or `'private'`; `description` is optional and at most 200 characters.
4. `POST /api/leagues` MUST return the new league as `LeagueSummary` with HTTP 201.
5. `GET /api/leagues/discover` MUST return `LeagueSummary[]` of open leagues (`access_type = 'open'`) that the authenticated user has NOT joined, ordered by `member_count DESC`, then `created_at DESC`.
6. The `invite_token` column MUST NEVER be included in any response from these endpoints.
7. All endpoints MUST return `401 SESSION_EXPIRED` when no valid session exists and `500 DATABASE_ERROR` on unexpected Supabase errors.
8. `POST /api/leagues` MUST additionally return `400 INVALID_BODY` on validation failure.
9. Logging MUST follow the existing structured JSON pattern from `app/api/auth/me/route.ts` (timestamp, endpoint, status, duration_ms).
</requirements>

## Subtasks
- [x] 4.1 Create `app/api/leagues/route.ts` with `GET` (user's leagues) handler
- [x] 4.2 Add `POST` handler to `app/api/leagues/route.ts` with validation and auto-admin enrollment
- [x] 4.3 Create `app/api/leagues/discover/route.ts` with `GET` handler for open leagues
- [x] 4.4 Write integration tests for all three handlers including error paths
- [x] 4.5 Verify `invite_token` is excluded from all responses

## Implementation Details
All files go under `app/api/leagues/`. The route files export named async functions (`GET`, `POST`) following Next.js App Router conventions. Session validation uses `getSupabaseServerClient()` from `lib/supabase/client.ts` and `supabase.auth.getUser()`, identical to the pattern in `app/api/auth/me/route.ts`.

For `POST /api/leagues`: the Supabase INSERT on `leagues` uses the DB default for `invite_token` and `member_count`; no need to pass these. After insert, run two more writes: INSERT into `league_members` (role: 'admin') and UPDATE `users` (set `active_league_id`).

For `GET /api/leagues/discover`: the query must JOIN or subquery against `league_members` to exclude leagues the current user is already in.

See TechSpec "API Endpoints" section for exact request/response shapes and error codes.

### Relevant Files
- `app/api/auth/me/route.ts` — reference for session-validation and logging pattern
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/api/types.ts` — `LeagueSummary` (added in task_02)
- `lib/supabase/client.ts` — `getSupabaseServerClient()`
- `supabase/migrations/20260522000002_create_leagues.sql` — current `leagues` schema
- `supabase/migrations/20260522000003_create_league_members.sql` — `league_members` schema

### Dependent Files
- `app/ligas/page.tsx` — calls `GET /api/leagues` and `GET /api/leagues/discover` (task_07)
- `components/topbar/LeagueSwitcher.tsx` — calls `GET /api/leagues` to populate the picker list (task_08)
- `app/api/leagues/[id]/route.ts` — sibling route; shares the `app/api/leagues/` directory (task_05)

## Deliverables
- `app/api/leagues/route.ts` (new — GET + POST)
- `app/api/leagues/discover/route.ts` (new — GET)
- Integration tests for all three endpoints **(REQUIRED)**
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `GET /api/leagues` with a valid session returns an array of `LeagueSummary` objects for all leagues the user belongs to, ordered by `joined_at DESC`
  - [ ] `GET /api/leagues` with no session returns `401 SESSION_EXPIRED`
  - [ ] `POST /api/leagues` with `{ name: "Bolão Família", access_type: "private" }` returns `201` and `LeagueSummary` with the creator's data
  - [ ] `POST /api/leagues` with `name` shorter than 2 characters returns `400 INVALID_BODY`
  - [ ] `POST /api/leagues` with `name` longer than 50 characters returns `400 INVALID_BODY`
  - [ ] `POST /api/leagues` with an invalid `access_type` value returns `400 INVALID_BODY`
  - [ ] `POST /api/leagues` with `description` exceeding 200 characters returns `400 INVALID_BODY`
  - [ ] `GET /api/leagues/discover` returns only `access_type = 'open'` leagues the user has NOT joined
  - [ ] `GET /api/leagues/discover` does NOT return leagues the user is already a member of
  - [ ] No response from any endpoint includes the `invite_token` field
- Integration tests:
  - [ ] After `POST /api/leagues`, the creator appears in `league_members` with `role = 'admin'`
  - [ ] After `POST /api/leagues`, `users.active_league_id` is set to the new league's ID
  - [ ] A league created with `access_type = 'private'` does NOT appear in `GET /api/leagues/discover` for any user
  - [ ] A league created with `access_type = 'open'` by User A appears in `GET /api/leagues/discover` for User B (who is not yet a member)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `GET /api/leagues`, `POST /api/leagues`, and `GET /api/leagues/discover` return correctly structured `ApiResponse<T>` envelopes
- `invite_token` is never present in any API response
- RLS policies added in task_01 enforce the correct access at the DB layer (verified by integration tests)
