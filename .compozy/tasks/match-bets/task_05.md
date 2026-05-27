---
status: completed
title: "League matches list endpoint (`GET /api/leagues/[id]/matches`)"
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 05: League matches list endpoint (`GET /api/leagues/[id]/matches`)

## Overview

Creates `app/api/leagues/[id]/matches/route.ts` with a GET handler that returns all matches for a league, enriched with the authenticated user's predictions. Supports four optional query parameters (`next`, `phase`, `date`, `group`) for filtering, and server-computes `is_deadline_passed` for each match. This endpoint feeds both the upcoming-matches widget (task_08) and the full Palpites page (task_09).

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
- MUST return 404 if the league does not exist
- MUST join `matches` with `predictions` (LEFT JOIN scoped to the current user and league) to embed `prediction` on each match
- MUST compute `is_deadline_passed` server-side: `match.match_date < new Date(Date.now() + 60 * 60 * 1000)`
- MUST support `next=N` query param: return only the next N scheduled matches ordered by `match_date ASC`
- MUST support `phase=group` query param: filter to group-stage matches only
- MUST support `date=today` and `date=tomorrow` query params: filter by kickoff date in UTC
- MUST support `group=A`…`group=L` query param: filter by match group
- All query params are optional and combinable
- MUST return `{ status: 'success', data: { matches: MatchWithPrediction[], total: number } }`
- SHOULD emit a structured log on each request (endpoint, method, status, duration_ms, user_id)
</requirements>

## Subtasks

- [x] 5.1 Create `app/api/leagues/[id]/matches/route.ts` with GET handler, auth, and membership check
- [x] 5.2 Implement the Supabase query joining `matches` LEFT JOIN `predictions` with filter logic for all 4 params
- [x] 5.3 Compute `is_deadline_passed` on each returned match and shape `MatchWithPrediction[]` response
- [x] 5.4 Write unit tests mocking the Supabase client for all filter combinations and error paths

## Implementation Details

See TechSpec "API Endpoints — GET /api/leagues/[id]/matches" section for the full query parameter specification and response contract. Follow the auth + membership check pattern established in `app/api/leagues/[id]/route.ts`.

The LEFT JOIN on `predictions` should be scoped by `user_id = authenticated user` AND `league_id = leagueId` to avoid leaking other users' predictions. Query `matches` ordered by `match_date ASC`; apply `LIMIT` for the `next` param after filtering.

`date=today` filter: match rows where `DATE(match_date) = CURRENT_DATE` in UTC. `date=tomorrow` filter: `DATE(match_date) = CURRENT_DATE + INTERVAL '1 day'`. These can be computed server-side and passed as range filters.

### Relevant Files

- `app/api/leagues/[id]/route.ts` — auth, membership check, logging, and response formatting patterns
- `lib/api/types.ts` (task_02) — `MatchWithPrediction` return type
- `lib/api/responses.ts` — `formatSuccess`, `formatError`
- `lib/supabase/client.ts` — `getSupabaseServerClient`

### Dependent Files

- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` (task_08) — calls `?next=4`
- `app/ligas/[id]/palpites/page.tsx` (task_09) — calls with `phase=group` + date/group filters
- `app/api/leagues/[id]/matches/[matchId]/route.ts` (task_06) — shares same query pattern
- `tests/fixtures/factories.ts` — `createTestMatch` and `createTestPrediction` factories used in integration tests

## Deliverables

- `app/api/leagues/[id]/matches/route.ts`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering member/non-member access and filter params **(REQUIRED)**

## Tests

- Unit tests:
  - [x] GET with no session cookie returns 401
  - [x] GET by a user not in the league returns 403 `NOT_A_MEMBER`
  - [x] GET with `?next=4` returns at most 4 matches ordered by `match_date ASC`
  - [x] GET with `?phase=group` returns only matches where `phase = 'group'`
  - [x] GET with `?date=today` returns only matches whose kickoff date equals today in UTC
  - [x] GET with `?date=tomorrow` returns only matches whose kickoff date equals tomorrow in UTC
  - [x] GET with `?group=A` returns only matches where `group = 'A'`
  - [x] Matches with existing user predictions have non-null `prediction` field with `predicted_home_score` and `predicted_away_score`
  - [x] Matches without user predictions have `prediction: null`
  - [x] `is_deadline_passed` is `true` for a match with `match_date` < now + 1h; `false` otherwise
  - [x] Response body shape matches `{ status: 'success', data: { matches: [...], total: N } }`
- Integration tests:
  - [x] GET with authenticated member and 4 seeded matches + 2 predictions returns 200 with all 4 matches, 2 with non-null predictions
  - [x] GET with `?next=2` against 4 seeded matches returns exactly 2 matches (the earliest by date)
  - [x] GET by a non-member user returns 403
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Endpoint returns `MatchWithPrediction[]` with correct `is_deadline_passed` values
- All four filter params work independently and in combination
- 401/403/404 errors use the project's standard error code format
