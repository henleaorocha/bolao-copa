---
status: completed
title: Add `has_champion_bet` to league detail API
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Add `has_champion_bet` to league detail API

## Overview

Modifies the `GET /api/leagues/{id}` route handler to check whether the current user has a champion bet in the requested league and include the result as `has_champion_bet: boolean` in the response. This single additional field allows the league detail page to decide whether to show the bet modal without a second API call.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a `champion_bets` existence check inside the existing GET handler, scoped to the authenticated user and the requested league ID.
- MUST include `has_champion_bet: boolean` in the `formatSuccess()` response alongside existing `LeagueDetail` fields.
- MUST fail open: if the `champion_bets` query errors, default `has_champion_bet` to `false` and continue returning the league data (do not surface a 500 for this check).
- MUST NOT change the existing response shape for any other field.
- MUST NOT add a new API route — this is a modification to the existing GET handler only.
- SHOULD use a single efficient DB query (e.g., `.maybeSingle()` or an EXISTS-style select) rather than fetching the full row.
</requirements>

## Subtasks

- [x] 2.1 Add a `champion_bets` existence check to the GET handler, using the authenticated `user.id` and the route `leagueId`
- [x] 2.2 Include `has_champion_bet` in the response object passed to `formatSuccess()`
- [x] 2.3 Wrap the bet check in error handling so a DB failure defaults to `false`
- [x] 2.4 Write unit/integration tests for the modified GET handler

## Implementation Details

See TechSpec "Modified: GET /api/leagues/{id}" section for the exact query pattern and fail-open behavior.

The membership check already runs before this point in the handler. The `champion_bets` query should reuse the same `supabase` client instance. Query example (do not copy verbatim — adapt to match existing handler patterns):

```
SELECT id FROM champion_bets
WHERE user_id = <current user> AND league_id = <route param>
LIMIT 1
```

Use `.maybeSingle()` so a missing row returns `null` instead of an error.

### Relevant Files

- `app/api/leagues/[id]/route.ts` — GET handler to modify
- `lib/api/types.ts` — `LeagueDetail` now includes `has_champion_bet` (from task_01)
- `lib/api/responses.ts` — `formatSuccess()` helper used for response formatting
- `supabase/migrations/20260522000007_create_champion_bets.sql` — table schema reference

### Dependent Files

- `app/ligas/[id]/page.tsx` — page (task_05) reads `league.has_champion_bet` from this response
- `lib/api/types.ts` — type already updated in task_01; route must match the type

### Related ADRs

- [ADR-002: Bet Status via Extended LeagueDetail Response](adrs/adr-002.md) — explains why the field is added inline rather than via a separate endpoint

## Deliverables

- Modified `app/api/leagues/[id]/route.ts` GET handler
- Unit tests for the modified handler with 80%+ coverage **(REQUIRED)**
- Integration tests verifying `has_champion_bet` values **(REQUIRED)**

## Tests

- Unit tests:
  - [x] GET handler returns `has_champion_bet: false` when no row exists in `champion_bets` for the user+league pair
  - [x] GET handler returns `has_champion_bet: true` when a row exists in `champion_bets` for the user+league pair
  - [x] GET handler returns `has_champion_bet: false` (not an error) when the `champion_bets` query throws
  - [x] All existing `LeagueDetail` fields are still present and unchanged in the response
- Integration tests:
  - [x] End-to-end: authenticated GET for a league with no bet returns `{ has_champion_bet: false }` in `data`
  - [x] End-to-end: after inserting a row in `champion_bets`, the same GET returns `{ has_champion_bet: true }`
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `has_champion_bet` present in every successful GET `/api/leagues/{id}` response
- A `champion_bets` DB query failure does not cause the league GET to fail
- No regression in existing GET response fields
