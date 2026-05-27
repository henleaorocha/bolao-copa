---
status: completed
title: Create `PUT /api/leagues/[id]/champion-bet` endpoint
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 03: Create `PUT /api/leagues/[id]/champion-bet` endpoint

## Overview

Creates a new API route that accepts a champion and vice-champion team name and upserts a row in the `champion_bets` table. The handler enforces a 6-guard validation chain (auth → membership → deadline → body → team validity → distinct teams) before performing the DB upsert. This is the sole write path for champion bets in Phase 1.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `app/api/leagues/[id]/champion-bet/route.ts` with a single exported `PUT` handler.
- MUST follow the existing route handler pattern from `app/api/leagues/[id]/me/route.ts` (auth check, membership check, error formatting, structured logging).
- MUST implement the full 6-guard validation chain in order: (1) auth, (2) membership, (3) deadline, (4) body params present, (5) team names in `VALID_TEAM_NAMES`, (6) `champion_team !== runner_up_team`.
- MUST use the exact error codes: `SESSION_EXPIRED` (401), `NOT_A_MEMBER` (403), `BET_DEADLINE_PASSED` (409), `INVALID_PARAMS` (400), `INVALID_TEAM` (400), `SAME_TEAM` (400), `DATABASE_ERROR` (500).
- MUST use Supabase upsert with `onConflict: 'user_id,league_id'` and set `updated_at` on conflict.
- MUST return `ApiSuccessResponse<ChampionBet>` with HTTP 200 on success.
- MUST import `VALID_TEAM_NAMES` and `BET_DEADLINE` from `lib/copa-teams.ts` (created in task_01).
- MUST include structured logging (endpoint, method, user_id, league_id, status_code, duration_ms) matching the existing route pattern.
- SHOULD reject requests where `runner_up_team` is missing or empty (both fields required by the 3-step modal flow).
</requirements>

## Subtasks

- [x] 3.1 Create `app/api/leagues/[id]/champion-bet/route.ts` with the PUT handler skeleton following the existing route pattern
- [x] 3.2 Implement guards 1-3: auth check, membership check, deadline check
- [x] 3.3 Implement guards 4-6: body validation, team name validation, distinct-team validation
- [x] 3.4 Implement the Supabase upsert and return the `ChampionBet` response
- [x] 3.5 Add structured logging and error handling matching the existing route pattern
- [x] 3.6 Write unit and integration tests for all guards and the happy path

## Implementation Details

See TechSpec "New: PUT /api/leagues/{id}/champion-bet" section for the complete validation sequence, upsert query, request/response formats, and error code definitions.

Pattern reference: `app/api/leagues/[id]/me/route.ts` shows the exact auth+membership check pattern, `formatSuccess()`/`formatError()` usage, and structured log format.

The `BET_DEADLINE` comparison should use `new Date() > BET_DEADLINE` (both are `Date` objects after importing from `lib/copa-teams.ts`).

### Relevant Files

- `app/api/leagues/[id]/champion-bet/route.ts` — new file to create
- `app/api/leagues/[id]/me/route.ts` — pattern reference for auth/membership/error handling
- `lib/copa-teams.ts` — imports `VALID_TEAM_NAMES`, `BET_DEADLINE` (from task_01)
- `lib/api/types.ts` — imports `ChampionBet` (from task_01)
- `lib/api/responses.ts` — `formatSuccess()`, `formatError()` helpers
- `supabase/migrations/20260522000007_create_champion_bets.sql` — table schema

### Dependent Files

- `components/PreCopaBetModal.tsx` — calls this endpoint on step 3 confirm (task_04)
- `lib/api/types.ts` — `ChampionBet` type consumed by this route's response

### Related ADRs

- [ADR-003: Single PUT Endpoint with Upsert](adrs/adr-003.md) — rationale for PUT-upsert over POST/PATCH pair
- [ADR-001: 3-Step Fullscreen Modal Flow](adrs/adr-001.md) — context: both `champion_team` and `runner_up_team` are always present when the user confirms

## Deliverables

- New `app/api/leagues/[id]/champion-bet/route.ts`
- Unit tests for all 6 guards and the success path with 80%+ coverage **(REQUIRED)**
- Integration tests verifying DB upsert behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [x] PUT with no session returns 401 `SESSION_EXPIRED`
  - [x] PUT with valid session but non-member user returns 403 `NOT_A_MEMBER`
  - [x] PUT with valid member after deadline (mock `new Date()` past `BET_DEADLINE`) returns 409 `BET_DEADLINE_PASSED`
  - [x] PUT with missing `champion_team` field returns 400 `INVALID_PARAMS`
  - [x] PUT with missing `runner_up_team` field returns 400 `INVALID_PARAMS`
  - [x] PUT with `champion_team` not in `VALID_TEAM_NAMES` returns 400 `INVALID_TEAM`
  - [x] PUT with `runner_up_team` not in `VALID_TEAM_NAMES` returns 400 `INVALID_TEAM`
  - [x] PUT with `champion_team === runner_up_team` returns 400 `SAME_TEAM`
  - [x] PUT with valid payload creates a `champion_bets` row and returns 200 with `ChampionBet` data
  - [x] PUT with valid payload called a second time updates the existing row (upsert — `updated_at` changes, no duplicate row)
- Integration tests:
  - [x] Full round-trip: PUT with `{ champion_team: 'Brasil', runner_up_team: 'Argentina' }` returns 200 and the row exists in `champion_bets`
  - [x] Second PUT with different teams overwrites the first (verify by querying `champion_bets`)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- All 6 guards reject invalid input with the correct error code and HTTP status
- Upsert creates a new row on first call; updates the existing row on subsequent calls (no constraint violation)
- Deadline guard rejects requests after `2026-06-11T21:00:00.000Z`
- Structured log emitted for every request (matching existing route format)
