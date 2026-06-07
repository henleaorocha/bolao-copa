---
status: completed
title: "POST /api/leagues 403 permission guard + structured log"
type: backend
complexity: low
dependencies:
  - task_03
---

# Task 4: POST /api/leagues 403 permission guard + structured log

## Overview
Add a friendly application-layer permission gate to the league-creation endpoint: before
attempting any insert, `POST /api/leagues` checks `canCreateLeague()` and returns a `403` with a
clear Portuguese message when the caller lacks the capability. This complements the authoritative
RLS `WITH CHECK` (task_02) with a clean error instead of a raw database failure.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST call `canCreateLeague()` with the authenticated user before any validation-passing insert
  attempt in the POST handler.
- MUST return `formatError('FORBIDDEN', 'Você não tem permissão para criar ligas', 403)` when the
  flag is `false`, and MUST NOT attempt the insert in that case.
- MUST emit a structured JSON log line on the block with `reason: 'cannot_create_league'` and the
  `user_id`, consistent with the existing logging style.
- MUST leave the success path (insert + add creator as admin + set active league) unchanged for
  permitted users.
</requirements>

## Subtasks
- [x] 4.1 Read the authenticated user and call `canCreateLeague()` early in the POST handler.
- [x] 4.2 Return the `403 FORBIDDEN` error and short-circuit when the flag is `false`.
- [x] 4.3 Emit the structured `cannot_create_league` log line on the block.
- [x] 4.4 Add integration/unit tests for the blocked and permitted paths.

## Implementation Details
Edit the POST handler in `app/api/leagues/route.ts`. The authenticated user is obtained via
`getSupabaseServerClient()` + `supabase.auth.getUser()` (see the GET handler around lines 21-26).
Errors use the `formatError(code, message, statusCode)` helper from `lib/api/responses.ts`. Insert
the guard after auth resolution and before/around the existing body validation, ahead of the
insert at lines ~220-238. See TechSpec "API Endpoints" and "Monitoring and Observability".

### Relevant Files
- `app/api/leagues/route.ts` — POST handler to modify; insert path at lines ~220-238, auth at
  ~112-122.
- `lib/leagues/can-create-league.ts` — the helper this task consumes (task_03).
- `lib/api/responses.ts` — `formatError` / `formatSuccess` helpers.

### Dependent Files
- `tests/unit/leagues-post-api.test.ts` — existing POST validation tests; extend with the gate
  cases.

### Related ADRs
- [ADR-004: Enforce league-creation permission in RLS and the API](adrs/adr-004.md) — the API 403
  side of the two-place enforcement.

## Deliverables
- `POST /api/leagues` returns `403` for users without the flag and inserts nothing.
- A structured `cannot_create_league` log line is emitted on the block.
- Tests for blocked and permitted paths **(REQUIRED)**.
- Test coverage >=80% for the new branch.

## Tests
- Unit tests:
  - [x] When `canCreateLeague()` returns `false`, the handler responds `403` with code
    `FORBIDDEN` and message "Você não tem permissão para criar ligas", and no insert is attempted.
  - [x] When `canCreateLeague()` returns `true`, a valid body proceeds to insert and returns `201`.
  - [x] The block path logs `reason: 'cannot_create_league'` with the `user_id`.
- Integration tests:
  - [x] End-to-end: a default user `POST /api/leagues` with a valid body gets `403` and zero rows
    are created; an operator user gets `201` and the league + admin membership exist.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Unauthorized callers receive a clean `403` and create no data; authorized callers are
  unaffected.
