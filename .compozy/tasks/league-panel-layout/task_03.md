---
status: completed
title: Extend `GET /api/leagues/[id]` with `prizes`, `user_stats`, `ranking`
type: backend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 3: Extend `GET /api/leagues/[id]` with `prizes`, `user_stats`, `ranking`

## Overview

The Painel's data-driven components (StatsRow, PrizesStrip, RankingCard) require three new fields in the league detail API response. This task extends the GET handler to include `prizes` from the DB, a stub `user_stats` object with all zeros, and a `ranking` array of the top-5 members ordered by join date. All existing fields and API consumers remain unchanged.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add `prizes` to the Supabase `SELECT` query on the `leagues` table; return `null` if the column value is null.
2. MUST include `user_stats` in the response as a stub object with all five numeric fields set to `0`.
3. MUST include `ranking` in the response as the top-5 `LeagueMember` entries ordered by `joined_at ASC`, each mapped to `RankingEntry` shape with `points: 0` and `position` as 1-based index.
4. MUST NOT remove, rename, or change any existing response fields.
5. MUST NOT add a new API endpoint — all changes are in the existing GET handler.
6. SHOULD handle the case where fewer than 5 members exist (return all members, not pad with nulls).
</requirements>

## Subtasks

- [x] 3.1 Add `prizes` to the Supabase `SELECT` in the GET handler and include it in the response object.
- [x] 3.2 Construct the stub `user_stats` object and append it to the response.
- [x] 3.3 Derive `ranking` from the existing `members` array (top-5 by `joined_at`, mapped to `RankingEntry` shape).
- [x] 3.4 Update the `formatSuccess` call to include the three new fields.
- [x] 3.5 Confirm `tsc --noEmit` passes after changes.

## Implementation Details

See TechSpec "API Endpoints" and "Data Models — Extended API Response Shape" sections for the exact field names, stub values, and ranking derivation logic.

The GET handler is in `app/api/leagues/[id]/route.ts`. The ranking derivation happens in-memory from the already-fetched `members` array — no additional DB query is needed.

### Relevant Files

- `app/api/leagues/[id]/route.ts` — the only file modified; contains the GET, PATCH, DELETE handlers
- `lib/api/types.ts` — provides `LeagueDetail`, `UserStats`, `RankingEntry` (added in task_02)

### Dependent Files

- `tests/integration/leagues-detail.test.ts` — existing integration test for this endpoint; must remain passing and be extended
- `tests/unit/league-detail-get-api.test.ts` — unit test for the GET handler (new file from recent git status)
- `app/ligas/[id]/page.tsx` — task_09 fetches from this endpoint; depends on the extended response

### Related ADRs

- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Justifies stub values for `user_stats` and the ranking sort order

## Deliverables

- Updated `app/api/leagues/[id]/route.ts` with three new response fields
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the extended endpoint **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `GET /api/leagues/[id]` response includes `prizes` field (may be `null`).
  - [x] `GET /api/leagues/[id]` response includes `user_stats` with `position: 0, points: 0, guesses_made: 0, guesses_total: 0, exact_scores: 0`.
  - [x] `GET /api/leagues/[id]` response includes `ranking` as an array with `points: 0` for each entry.
  - [x] `ranking` entries have `position` as 1-based index (`1`, `2`, ...).
  - [x] `ranking` contains at most 5 entries even when the league has more than 5 members.
  - [x] `ranking` contains all members when the league has fewer than 5 members.
  - [x] All previously existing response fields (`id`, `name`, `members`, `has_champion_bet`, etc.) are present and unchanged.
- Integration tests:
  - [x] Authenticated league member calling `GET /api/leagues/[id]` receives HTTP 200 with `prizes`, `user_stats`, and `ranking` in the response body.
  - [x] Unauthenticated request to `GET /api/leagues/[id]` still returns HTTP 401.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Existing integration tests in `tests/integration/leagues-detail.test.ts` still pass
- `prizes`, `user_stats`, and `ranking` present in every successful GET response
