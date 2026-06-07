---
status: completed
title: "GET /api/auth/me + AuthUser type: expose flag, return league: null"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 6: GET /api/auth/me + AuthUser type: expose flag, return league: null

## Overview
Expose the new capability to client components and make "no active league" a valid state. Today
`GET /api/auth/me` throws/500 when a user has no active league; after this task it returns `200`
with `league: null` and includes `can_create_league` in the user payload, so clients can render
the no-league experience and gate the create UI without a second round-trip.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
- READ node_modules/next/dist/docs/ for this project's modified Next.js before writing code
</critical>

<requirements>
- MUST add `can_create_league: boolean` to the `AuthUser` interface in `lib/api/types.ts` and
  allow the `/api/auth/me` response `league` to be `null`.
- MUST include `can_create_league` (sourced from `public.users`) in the `GET /api/auth/me` user
  payload.
- MUST return `200` with `league: null` when the caller has no active league, instead of throwing
  a 500.
- MUST audit `/api/auth/me` consumers so none assume `league` is always present (per ADR-005 and
  the Impact Analysis risk).
</requirements>

## Subtasks
- [x] 6.1 Extend `AuthUser` with `can_create_league` and widen the me-response `league` type to
  allow `null`.
- [x] 6.2 Include `can_create_league` in the user select within `GET /api/auth/me`.
- [x] 6.3 Replace the no-active-league throw with a `200` + `league: null` response.
- [x] 6.4 Audit and update consumers of `/api/auth/me` that assume a non-null league.
- [x] 6.5 Add tests for the flag in the payload and the `league: null` path.

## Implementation Details
Edit `app/api/auth/me/route.ts` (GET handler; the no-league throw is around lines 57-63, user
select around lines 38-50). Update `lib/api/types.ts` (`AuthUser` at lines ~21-28; `AuthMeResponse`
at lines ~107-110). The user is read via `getSupabaseServerClient()`; active league via
`resolveActiveLeague()`. Consult `node_modules/next/dist/docs/` for route-handler conventions in
this Next.js build. See TechSpec "Core Interfaces", "API Endpoints", and "Impact Analysis".

### Relevant Files
- `app/api/auth/me/route.ts` — GET handler; no-league throw (~57-63), user select (~38-50).
- `lib/api/types.ts` — `AuthUser` (~21-28) and `AuthMeResponse` (~107-110) to update.
- `lib/leagues/get-leagues-hub.ts` / `resolveActiveLeague` usage — context for the league
  resolution that may now yield none.

### Dependent Files
- Client consumers of `/api/auth/me` / `AuthMeResponse` — must handle `league: null` and may read
  `can_create_league`.
- `tests/unit/resolve-active-league.test.ts` — related existing tests; extend or reference for the
  no-league case.

### Related ADRs
- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — the flag exposed in
  the payload.
- [ADR-005: Graceful no-league state guiding users to an invite link](adrs/adr-005.md) — the
  `league: null` decision.

## Deliverables
- `AuthUser.can_create_league` field and a nullable `league` in the me-response type.
- `GET /api/auth/me` returns the flag and `200 + league: null` for no-league users.
- Updated consumers that previously assumed a non-null league.
- Tests for both behaviors **(REQUIRED)**.
- Test coverage >=80% for the changed handler.

## Tests
- Unit tests:
  - [x] `GET /api/auth/me` includes `can_create_league` matching the user's row value.
  - [x] A user with no active league receives `200` with `league: null` (not a 500).
  - [x] A user with an active league receives `200` with the populated `league` and the flag.
- Integration tests:
  - [x] A freshly created (no-league) user calling `/api/auth/me` gets `200` + `league: null`;
    a user with a membership gets the populated league.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `/api/auth/me` never 500s solely due to a missing active league; the flag is present in the
  payload and consumers handle `league: null`.
