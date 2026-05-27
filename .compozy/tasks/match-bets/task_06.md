---
status: completed
title: "Match detail endpoint (`GET /api/leagues/[id]/matches/[matchId]`)"
type: backend
complexity: medium
dependencies:
  - task_05
---

# Task 06: Match detail endpoint (`GET /api/leagues/[id]/matches/[matchId]`)

## Overview

Creates `app/api/leagues/[id]/matches/[matchId]/route.ts` with a GET handler that returns a single match as `MatchDetail`, including the user's prediction and — only when the betting deadline has passed — the aggregate outcome distribution for the league. This endpoint backs the bet detail screen (task_10).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST authenticate the request via Supabase session cookie; return 401 for unauthenticated users
- MUST verify the user is a member of the league; return 403 `NOT_A_MEMBER` if not
- MUST return 404 if the league or match does not exist
- MUST return the match with the user's prediction embedded (same pattern as task_05)
- MUST compute `is_deadline_passed` server-side using the same formula as task_05
- MUST run the distribution aggregation query ONLY when `is_deadline_passed === true`; set `distribution: null` otherwise
- Distribution query MUST be scoped to `league_id = leagueId` (per-league isolation)
- MUST return `{ status: 'success', data: MatchDetail }`
- SHOULD emit a structured log on each request
</requirements>

## Subtasks

- [x] 6.1 Create `app/api/leagues/[id]/matches/[matchId]/route.ts` with GET handler, auth, and membership check
- [x] 6.2 Query single match + user prediction (reuse query shape from task_05)
- [x] 6.3 Conditionally run distribution aggregation query when `is_deadline_passed === true`
- [x] 6.4 Shape and return `MatchDetail` response
- [x] 6.5 Write unit tests for deadline logic and distribution query gating

## Implementation Details

See TechSpec "API Endpoints — GET /api/leagues/[id]/matches/[matchId]" section for the distribution SQL query and the conditional logic. The distribution query uses `COUNT(*) FILTER (WHERE ...)` syntax — see the exact SQL in the TechSpec "Distribution query" subsection.

Dynamic params: `const { id: leagueId, matchId } = await params`. Reuse the same auth + membership guard pattern from task_05. The match query is identical to the list query but with an added `.eq('id', matchId).single()`.

### Relevant Files

- `app/api/leagues/[id]/matches/route.ts` (task_05) — auth, query, and `is_deadline_passed` pattern to reuse
- `lib/api/types.ts` (task_02) — `MatchDetail`, `OutcomeDistribution` return types
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/supabase/client.ts` — `getSupabaseServerClient`

### Dependent Files

- `app/ligas/[id]/palpites/[matchId]/page.tsx` (task_10) — the only consumer of this endpoint

### Related ADRs

- (No task-specific ADR; follows the pattern established by ADR-002 and ADR-004)

## Deliverables

- `app/api/leagues/[id]/matches/[matchId]/route.ts`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for deadline gating and distribution accuracy **(REQUIRED)**

## Tests

- Unit tests:
  - [x] GET for an unknown `matchId` returns 404
  - [x] GET by a non-member user returns 403 `NOT_A_MEMBER`
  - [x] GET for a match with `match_date` > now + 1h returns `is_deadline_passed: false` and `distribution: null`
  - [x] GET for a match with `match_date` < now + 1h returns `is_deadline_passed: true` and a non-null `distribution`
  - [x] Distribution `home_win + draw + away_win` percentages sum to 100 (or ≈100 with rounding) when `total_predictions > 0`
  - [x] Distribution is `null` (not 0) when `is_deadline_passed` is false
  - [x] Match with an existing user prediction returns non-null `prediction.predicted_home_score` and `prediction.predicted_away_score`
- Integration tests:
  - [x] GET against local Supabase with 3 seeded predictions (2 home wins, 1 draw) after deadline returns `distribution: { home_win: 67, draw: 33, away_win: 0, total_predictions: 3 }` (approximate)
  - [x] GET before deadline returns `distribution: null` for the same match
  - [x] Distribution is scoped per-league: predictions from a different league do not affect the count
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `distribution` is `null` before the deadline and populated after it
- Distribution percentages reflect only predictions from the same `league_id`
- 401/403/404 errors follow project standard error code format
