---
status: completed
title: New GET /api/leagues/[id]/ranking full-list endpoint
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 03: New GET /api/leagues/[id]/ranking full-list endpoint

## Overview
Add a dedicated, membership-guarded endpoint that returns the FULL ordered ranking of every league member (no top-5 truncation), with per-member `points`, `position`, `exact_scores`, and `correct_outcomes`. It fetches its own Supabase rows and delegates ordering to `computeRanking()`, mirroring the existing bracket endpoint's structure.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `GET /api/leagues/[id]/ranking` returning the FULL member list (no `.slice`), shaped as `{ status, data: { ranking: RankingFullEntry[] }, timestamp }`.
- MUST require an authenticated session (401 `SESSION_EXPIRED`) and league membership (403 `NOT_A_MEMBER`), reusing the guard pattern from the panel/bracket endpoints.
- MUST return 404 `LEAGUE_NOT_FOUND` when the league does not exist and 500 `DATABASE_ERROR` on query failure, using `formatError` / `formatSuccess` from `lib/api/responses`.
- MUST reject unknown query params with 400 `INVALID_PARAMS` (no params are allowed).
- MUST fetch members, predictions, finished matches (including `match_date`), and champion bets, then delegate ordering to `computeRanking()` from `lib/ranking.ts` — NO scoring logic inline.
- MUST emit the same structured JSON log line as the panel endpoint with `endpoint: '/api/leagues/[id]/ranking'` on success and error.
</requirements>

## Subtasks
- [x] 03.1 Create the route file and implement auth + league-existence + membership guards mirroring the bracket endpoint.
- [x] 03.2 Reject any unknown query params with 400 `INVALID_PARAMS`.
- [x] 03.3 Fetch members, predictions, finished matches (with `match_date`), and champion bets.
- [x] 03.4 Delegate to `computeRanking()` and return the full list as `RankingFullEntry[]`.
- [x] 03.5 Add the structured success/error log line with the new endpoint label.
- [x] 03.6 Write integration tests for auth, membership, full-list (no truncation), field set, and ordering parity.

## Implementation Details
Create `app/api/leagues/[id]/ranking/route.ts`. Use `app/api/leagues/[id]/bracket/route.ts` as the structural template (auth `15-28`, league check `32-43`, membership `45-57`, fetch `59-98`, response + logging `100-122`). Reuse the panel's membership-guard wording (`route.ts:90-102`) and the matches query columns plus `match_date`. Map fetched rows into the `computeRanking()` input shape (task_01) and return its output directly under `data.ranking`. `total_players` is derivable client-side as `ranking.length`; prizes/name come from context and are NOT duplicated here. See TechSpec "API Endpoints → GET /api/leagues/[id]/ranking".

### Relevant Files
- `app/api/leagues/[id]/ranking/route.ts` — new endpoint to create.
- `app/api/leagues/[id]/bracket/route.ts` — structural precedent (auth/guard/fetch/response/logging).
- `app/api/leagues/[id]/route.ts` — membership guard wording (90-102), matches query, log line (302-313) to mirror.
- `lib/ranking.ts` — `computeRanking()` consumed here (task_01).
- `lib/api/responses.ts` — `formatSuccess` / `formatError` (3-23).
- `lib/api/types.ts` — `RankingFullEntry` returned here.

### Dependent Files
- `app/ligas/[id]/ranking/page.tsx` — fetches this endpoint on mount (task_06).

### Related ADRs
- [ADR-001: Dedicated Ranking Page as a Separate Route](../adrs/adr-001.md) — the route this endpoint backs.
- [ADR-002: Dedicated Ranking Endpoint Backed by a Shared Scoring Helper](../adrs/adr-002.md) — mandates a dedicated endpoint over extending the panel.

## Deliverables
- `app/api/leagues/[id]/ranking/route.ts` returning the full ordered list via `computeRanking()`.
- Structured logging consistent with the panel endpoint.
- Unit/integration tests with 80%+ coverage **(REQUIRED)**
- Integration tests `tests/unit/league-ranking-api.test.ts` for the handler with mocked Supabase **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Unknown query param (e.g. `?page=2`) returns 400 `INVALID_PARAMS`.
  - [x] Response field set per entry is exactly `user_id, full_name, avatar_color, points, position, exact_scores, correct_outcomes`.
- Integration tests (`tests/unit/league-ranking-api.test.ts`, mocked Supabase reusing `makeSupabase()`/`makePrediction()`/`makeFinishedMatch()`):
  - [x] 401 when unauthenticated.
  - [x] 403 `NOT_A_MEMBER` for a non-member.
  - [x] 404 `LEAGUE_NOT_FOUND` for a missing league.
  - [x] Full list returned with NO top-5 truncation (e.g. 8 members → 8 entries).
  - [x] Ordering matches `computeRanking()` output for the same fixtures (tiebreaker applied).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Endpoint returns every member with the correct field set and ordering, members-only.
- No scoring logic duplicated in the route — ordering comes solely from `computeRanking()`.
