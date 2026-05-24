---
status: completed
title: Extend POST /api/leagues with prize_pool field
type: backend
complexity: low
dependencies: []
---

# Task 1: Extend POST /api/leagues with prize_pool field

## Overview

The existing `POST /api/leagues` route accepts `name`, `access_type`, and `description` but does not read or persist `prize_pool`. This task adds `prize_pool` to the request validation and the Supabase insert so the frontend modal can send prize information. No schema migration is needed — the column already exists.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST validate `prize_pool` as an optional field: when present it MUST be a string with a maximum of 300 characters.
- MUST insert `prize_pool` into the `leagues` table row (pass as `null` when absent or when the caller sends `null`).
- MUST return 400 with a descriptive error message when `prize_pool` exceeds 300 characters.
- MUST NOT change the response shape — `prize_pool` is NOT included in the 201 response body.
- MUST NOT break existing behavior for requests that omit `prize_pool`.
</requirements>

## Subtasks

- [x] 1.1 Add `prize_pool` optional validation to the POST handler (after the `description` check, before the Supabase insert).
- [x] 1.2 Include `prize_pool` in the Supabase `.insert({...})` call with `?? null` fallback.
- [x] 1.3 Add integration test cases for `prize_pool` to `tests/integration/leagues.test.ts`.

## Implementation Details

See TechSpec "API Endpoints" and "Data Models" sections for the exact validation logic, variable naming conventions, and insert object pattern to follow.

The current insert object in `app/api/leagues/route.ts` (around line 191) uses: `{ name: trimmedName, access_type, description, created_by: user.id }`. The `prize_pool` field must be added in the same style.

### Relevant Files

- `app/api/leagues/route.ts` — POST handler to extend; validation block is around lines 138–186, insert is around lines 189–198.
- `tests/integration/leagues.test.ts` — integration tests for the leagues API; POST tests start around line 110.

### Dependent Files

- `components/CreateLeagueModal.tsx` — (task_02) will send `prize_pool` in the request body; depends on this validation being in place.

### Related ADRs

- None — this is a straightforward additive API change.

## Deliverables

- Modified `app/api/leagues/route.ts` with `prize_pool` validation and insert.
- Updated `tests/integration/leagues.test.ts` with new prize_pool test cases.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for prize_pool field **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `prize_pool` omitted entirely: request succeeds with 201, `prize_pool` stored as null.
  - [x] `prize_pool: null` explicitly: request succeeds with 201.
  - [x] `prize_pool` = valid 300-char string: request succeeds with 201.
  - [x] `prize_pool` = 301-char string: returns 400 with error code `INVALID_BODY`.
  - [x] `prize_pool` = non-string value (e.g., `123`): returns 400.
  - [x] Response body does NOT contain a `prize_pool` field regardless of input.
- Integration tests:
  - [x] POST with `prize_pool` "1º lugar: jantar" creates the league row with that value persisted in the DB.
  - [x] POST without `prize_pool` creates the league row with `prize_pool = null` in the DB.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `POST /api/leagues` accepts and persists `prize_pool` without breaking existing callers.
- Response shape is unchanged (201 with existing `LeagueSummary` fields only).
