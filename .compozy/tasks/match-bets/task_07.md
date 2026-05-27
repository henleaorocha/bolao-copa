---
status: completed
title: "Prediction upsert endpoint (`PUT /api/leagues/[id]/predictions/[matchId]`)"
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 07: Prediction upsert endpoint (`PUT /api/leagues/[id]/predictions/[matchId]`)

## Overview

Creates `app/api/leagues/[id]/predictions/[matchId]/route.ts` with a PUT handler that validates and upserts a user's score prediction for a specific match in a league. The server enforces the 1-hour deadline and rejects writes after it passes with a distinct `DEADLINE_PASSED` error code. Both the bet detail screen (task_10) and the Palpites list "Salvar todos" action (task_09) call this endpoint.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST authenticate the request; return 401 for unauthenticated users
- MUST verify the user is a member of the league; return 403 `NOT_A_MEMBER` if not
- MUST return 404 if the match does not exist
- MUST validate `home_score` and `away_score` are non-negative integers in the request body; return 400 `INVALID_BODY` if not
- MUST enforce deadline server-side: if `match.match_date - 1h < now()`, return 403 with error code `DEADLINE_PASSED`
- MUST upsert the prediction using `onConflict: 'user_id,league_id,match_id'` (see TechSpec upsert block and ADR-004)
- MUST emit `prediction_saved` log event with `match_id`, `league_id`, `is_update: boolean`
- MUST emit `prediction_rejected_deadline` log event when returning 403 `DEADLINE_PASSED`
- Response body on success MUST include `match_id`, `predicted_home_score`, `predicted_away_score`, `updated_at`
</requirements>

## Subtasks

- [x] 7.1 Create `app/api/leagues/[id]/predictions/[matchId]/route.ts` with PUT handler
- [x] 7.2 Implement auth, membership, body validation, and match existence checks
- [x] 7.3 Implement server-side deadline enforcement with `DEADLINE_PASSED` error code
- [x] 7.4 Implement upsert via Supabase `onConflict: 'user_id,league_id,match_id'`
- [x] 7.5 Emit log events for saved predictions and deadline violations
- [x] 7.6 Write unit tests covering all validation and error paths

## Implementation Details

See TechSpec "API Endpoints — PUT /api/leagues/[id]/predictions/[matchId]" for the full request/response contract, upsert snippet, and log event fields. See ADR-004 for why PUT upsert was chosen over POST/PATCH split.

Deadline check: fetch `match.match_date` from the `matches` table, then compare `new Date(match.match_date).getTime() - 60 * 60 * 1000 < Date.now()`. This is one additional DB read per write — acceptable per TechSpec "Key Decisions" section.

Body parsing: `const { home_score, away_score } = await request.json()`. Validate both are present, are numbers, are integers (no decimals), and are >= 0.

Reference `app/api/leagues/[id]/champion-bet/route.ts` for the existing upsert pattern, deadline guard, and log event structure.

### Relevant Files

- `app/api/leagues/[id]/champion-bet/route.ts` — existing upsert + deadline guard pattern to follow
- `app/api/leagues/[id]/route.ts` — auth and membership check pattern
- `lib/api/types.ts` (task_02) — `Prediction` type
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/supabase/client.ts` — `getSupabaseServerClient`

### Dependent Files

- `app/ligas/[id]/palpites/page.tsx` (task_09) — "Salvar todos" calls PUT for each unsaved row
- `app/ligas/[id]/palpites/[matchId]/page.tsx` (task_10) — "Salvar palpite" button calls PUT
- `tests/fixtures/factories.ts` — `createTestPrediction` used in integration tests

### Related ADRs

- [ADR-004: PUT Upsert for Prediction Save/Update API](../adrs/adr-004.md) — mandates PUT verb with upsert semantics matching the DB UNIQUE constraint

## Deliverables

- `app/api/leagues/[id]/predictions/[matchId]/route.ts`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for upsert idempotency and deadline rejection **(REQUIRED)**

## Tests

- Unit tests:
  - [x] PUT with missing `Authorization` cookie returns 401
  - [x] PUT by a non-member user returns 403 `NOT_A_MEMBER`
  - [x] PUT with `{ home_score: -1, away_score: 0 }` returns 400 `INVALID_BODY`
  - [x] PUT with `{ home_score: 1.5, away_score: 0 }` (non-integer) returns 400 `INVALID_BODY`
  - [x] PUT with `{ home_score: 2 }` (missing `away_score`) returns 400 `INVALID_BODY`
  - [x] PUT for a match with `match_date` within the next 30 minutes returns 403 `DEADLINE_PASSED`
  - [x] PUT for a non-existent `matchId` returns 404
  - [x] PUT with valid scores and open deadline returns 200 with `match_id`, `predicted_home_score`, `predicted_away_score`, `updated_at`
  - [x] Calling PUT twice with the same `matchId` updates the row (prediction count stays 1, `updated_at` changes)
- Integration tests:
  - [x] PUT with `{ home_score: 2, away_score: 1 }` inserts a new `predictions` row; second PUT with `{ home_score: 3, away_score: 0 }` updates the same row (idempotent)
  - [x] PUT for a match past deadline returns 403 with `code: 'DEADLINE_PASSED'`
  - [x] Predictions from user A in league X do not affect user B in league X (each upsert is isolated by `user_id`)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- PUT upsert is idempotent — calling twice with different scores results in exactly 1 prediction row with the latest scores
- Deadline enforcement is server-side and returns `DEADLINE_PASSED` error code
- 400/401/403/404 errors follow project standard error code format
