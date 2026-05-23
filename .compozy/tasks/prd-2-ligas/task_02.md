---
status: completed
title: "Update /api/auth/me: Dynamic Active League (GET + PATCH)"
type: backend
complexity: medium
dependencies:
    - task_01
---

# Task 2: Update /api/auth/me: Dynamic Active League (GET + PATCH)

## Overview
The existing `GET /api/auth/me` endpoint returns a hardcoded `DEFAULT_LEAGUE_ID` for every user. This task replaces that with a dynamic lookup of `users.active_league_id`, falling back to the user's first `league_members` row when the column is NULL. It also adds a new `PATCH /api/auth/me` handler that allows the client to set the active league (the context switcher's write path).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `GET /api/auth/me` MUST replace the hardcoded `DEFAULT_LEAGUE_ID` with a lookup of `users.active_league_id`; when NULL, fall back to the first `league_members` row ordered by `joined_at ASC`.
2. `GET /api/auth/me` MUST verify the user is still a member of their `active_league_id` before returning it; if not a member (e.g., removed), reset `users.active_league_id` to NULL and use the fallback.
3. `PATCH /api/auth/me` MUST be a new handler in the same route file accepting `{ active_league_id: string }` in the request body.
4. `PATCH /api/auth/me` MUST validate that the requesting user is a member of the target league before updating `users.active_league_id`; return `403 NOT_A_MEMBER` if not.
5. Both GET and PATCH MUST use the existing `ApiResponse<T>` envelope via `formatSuccess` / `formatError` from `lib/api/responses.ts`.
6. `LeagueSummary` and updated `AuthMeResponse` interfaces MUST be added to `lib/api/types.ts` to reflect the dynamic league shape (see TechSpec "Core Interfaces" section).
7. The `DEFAULT_LEAGUE_ID` constant MUST NOT be used anywhere in this file after the refactor.
8. All existing error codes (`SESSION_EXPIRED`, `DATABASE_ERROR`) MUST be preserved; add `NOT_A_MEMBER` and `INVALID_BODY` for the PATCH handler.
</requirements>

## Subtasks
- [ ] 2.1 Add `LeagueSummary` and `LeagueMember` interfaces to `lib/api/types.ts`
- [ ] 2.2 Update `GET /api/auth/me`: replace `DEFAULT_LEAGUE_ID` with dynamic `active_league_id` + fallback logic
- [ ] 2.3 Add membership validation guard to the GET handler (reset to NULL if no longer a member)
- [ ] 2.4 Add `PATCH /api/auth/me` handler with body validation and membership check
- [ ] 2.5 Update existing unit tests for the GET handler; add unit tests for the PATCH handler

## Implementation Details
All changes are confined to `app/api/auth/me/route.ts` and `lib/api/types.ts`. No new files.

The GET handler currently does three parallel Supabase queries (user, league_members, leagues). The refactor changes the leagues query from `WHERE id = DEFAULT_LEAGUE_ID` to `WHERE id = user.active_league_id` with the fallback sub-query.

See TechSpec "API Endpoints — `GET /api/auth/me`" and "API Endpoints — `PATCH /api/auth/me`" for exact response shapes and error codes.

The PATCH handler is a new `export async function PATCH(req: Request)` in the same route file, following the same session-validation and error-handling pattern as the existing `GET`.

### Relevant Files
- `app/api/auth/me/route.ts` — file to modify; contains hardcoded `DEFAULT_LEAGUE_ID` and the GET handler
- `lib/api/types.ts` — add `LeagueSummary`, update `AuthMeResponse`
- `lib/api/responses.ts` — `formatSuccess` / `formatError` helpers (unchanged, reference only)
- `lib/supabase/client.ts` — `getSupabaseServerClient()` (unchanged, reference only)
- `tests/integration/auth.test.ts` — existing tests for `/api/auth/me` GET that must be updated

### Dependent Files
- `lib/league-context.tsx` — will import `LeagueSummary` from `lib/api/types.ts` (task_03)
- `app/api/leagues/route.ts` — will follow the same auth session pattern (task_04)
- `tests/fixtures/factories.ts` — `DEFAULT_LEAGUE_ID` constant still used in test fixtures; update only within this task's scope

### Related ADRs
- [ADR-002: Active League Persisted as DB Column on users Table](adrs/adr-002.md) — Defines the fallback behavior and membership-check requirement on every GET

## Deliverables
- Updated `app/api/auth/me/route.ts` with dynamic GET and new PATCH handler
- Updated `lib/api/types.ts` with `LeagueSummary` interface
- Updated unit tests in `tests/integration/auth.test.ts` **(REQUIRED)**
- New unit tests for PATCH handler **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `GET /api/auth/me` with `active_league_id = NULL` returns the first `league_members` row (by `joined_at ASC`) as the active league
  - [ ] `GET /api/auth/me` with a valid `active_league_id` returns that league's data
  - [ ] `GET /api/auth/me` when `active_league_id` points to a league the user is no longer a member of returns the fallback league and resets the column to NULL
  - [ ] `GET /api/auth/me` with no active session returns `401 SESSION_EXPIRED`
  - [ ] `PATCH /api/auth/me` with `{ active_league_id: "<valid-id-user-is-member-of>" }` returns updated `AuthMeResponse` with the new active league
  - [ ] `PATCH /api/auth/me` with a league ID the user is not a member of returns `403 NOT_A_MEMBER`
  - [ ] `PATCH /api/auth/me` with missing or malformed `active_league_id` returns `400 INVALID_BODY`
  - [ ] `PATCH /api/auth/me` with no active session returns `401 SESSION_EXPIRED`
- Integration tests:
  - [ ] End-to-end: user switches active league via PATCH, then GET returns the newly selected league
  - [ ] After the referenced league is deleted, GET resets `active_league_id` and returns the fallback
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No reference to `DEFAULT_LEAGUE_ID` remains in `app/api/auth/me/route.ts`
- Existing `tests/integration/auth.test.ts` passes with updated assertions
- `GET /api/auth/me` behavior is unchanged for users who already have a valid `active_league_id` (no regression)
