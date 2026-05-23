---
status: completed
title: Hub API Route
type: backend
complexity: low
dependencies:
  - task_02
  - task_03
---

# Task 4: Hub API Route

## Overview

Create `app/api/leagues/hub/route.ts`, a thin GET handler that calls `getLeaguesHub()` and `getDaysUntilCopa()` and returns the combined payload as a JSON response. This route exists so that future HTTP clients (mobile apps, external integrations) can consume the same hub data that the Server Component renders directly — no additional logic lives here beyond auth validation and error wrapping.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST implement `GET /api/leagues/hub` returning `ApiSuccessResponse<{ leagues: LeagueHubItem[], user: { first_name: string }, countdown: CopaCountdown }>` on success (HTTP 200).
2. MUST return `ApiErrorResponse` with HTTP 401 when no valid session is present.
3. MUST return `ApiErrorResponse` with HTTP 500 when `getLeaguesHub()` throws a database error.
4. MUST use `getSupabaseServerClient()` (server-side cookie-based client) — never the anon/public client.
5. MUST follow the existing route pattern from `app/api/leagues/route.ts`: use `formatSuccess()` / `formatError()` helpers, log with the project's JSON structured format including `timestamp`, `level`, `endpoint`, and `duration`.
6. MUST NOT contain any sorting, deduplication, or countdown logic — delegate entirely to `getLeaguesHub()` and `getDaysUntilCopa()`.
7. `user.first_name` MUST be derived from the authenticated session's user metadata (Google display name), not from the database.
</requirements>

## Subtasks

- [x] 4.1 Create `app/api/leagues/hub/route.ts` with a named `GET` export following the Next.js 16 route handler convention.
- [x] 4.2 Add session validation returning 401 when unauthenticated.
- [x] 4.3 Call `getLeaguesHub()` and `getDaysUntilCopa()` and compose the response payload.
- [x] 4.4 Add structured error handling for database errors (500).
- [x] 4.5 Write integration tests covering the 200, 401, and 500 response paths.

## Implementation Details

See TechSpec "API Endpoints" → "New: GET /api/leagues/hub" for the exact response shape, status codes, and auth requirements.

Pattern reference: `app/api/leagues/route.ts` for the full handler structure (auth check, formatSuccess/formatError, logging). Read Next.js 16 docs in `node_modules/next/dist/docs/` for the route handler export convention before writing the file.

### Relevant Files

- `app/api/leagues/hub/route.ts` — new file to create
- `app/api/leagues/route.ts` — pattern reference for handler structure, logging, and error codes
- `lib/leagues/get-leagues-hub.ts` — called by this route (Task 03)
- `lib/leagues/get-days-until-copa.ts` — called by this route (Task 01)
- `lib/api/types.ts` — `LeagueHubItem`, `CopaCountdown`, response wrapper (Task 02)
- `lib/api/responses.ts` — `formatSuccess()` and `formatError()` helpers
- `lib/supabase/client.ts` — `getSupabaseServerClient()`
- `tests/integration/` — Vitest integration test directory

### Dependent Files

- No downstream files depend on this route handler directly; the Server Component (`app/ligas/page.tsx`) calls `getLeaguesHub()` directly, not this endpoint.

## Deliverables

- `app/api/leagues/hub/route.ts` — GET route handler
- `tests/integration/leagues-hub-api.test.ts` — integration test suite
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the API route **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Handler returns 401 when `getSupabaseServerClient()` returns a null session.
  - [x] Handler returns 500 with `DATABASE_ERROR` code when `getLeaguesHub()` throws.
- Integration tests:
  - [x] `GET /api/leagues/hub` with a valid authenticated session returns HTTP 200 with `{ leagues: LeagueHubItem[], user: { first_name: string }, countdown: CopaCountdown }`.
  - [x] `GET /api/leagues/hub` without a session cookie returns HTTP 401.
  - [x] Response body matches the `ApiSuccessResponse` wrapper shape (has `status: 'success'`, `data`, `timestamp`).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `GET /api/leagues/hub` returns 200 with correct payload for an authenticated session verified with `curl` or a REST client.
- `GET /api/leagues/hub` returns 401 without a session cookie.
