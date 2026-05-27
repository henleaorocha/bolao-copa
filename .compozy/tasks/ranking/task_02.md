---
status: completed
title: Refactor GET /api/leagues/[id] onto the shared helper
type: refactor
complexity: medium
dependencies:
  - task_01
---

# Task 02: Refactor GET /api/leagues/[id] onto the shared helper

## Overview
Replace the inline scoring loop and `joined_at` tiebreaker in the panel endpoint with a call to the shared `computeRanking()` helper, slicing the result to the top 5 for the `ranking` field and deriving `user_stats` from the same ordered output. This guarantees the panel and the ranking screen share one ordering source of truth. The response shape stays byte-identical; only the tie-break ordering changes.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the inline per-member loop (`route.ts:220-264`) and the `joined_at` sort (`route.ts:266-273`) with a single `computeRanking()` call from `lib/ranking.ts`.
- MUST keep the `GET /api/leagues/[id]` response shape and field names UNCHANGED — only the tie-break ordering and `user_stats.position` may differ. No new fields in this payload.
- MUST slice the helper output to the top 5 for the `ranking` field (panel stays lean).
- MUST derive `user_stats` (the logged-in member's position/points/exact count) from the same `computeRanking()` output rather than a second computation.
- MUST add `match_date` to the matches Supabase query (`route.ts:181-188`) so the helper can apply the most-recent-exact tiebreaker.
- MUST NOT change auth (401), membership guard (403), error handling, or the structured log line.
- MUST rewrite the existing `joined_at` tie-break assertion in `tests/unit/league-detail-get-api.test.ts` to reflect the new tiebreaker while keeping scoring and top-5 assertions intact.
</requirements>

## Subtasks
- [x] 02.1 Add `match_date` to the finished-matches `select(...)` in the panel handler.
- [x] 02.2 Map fetched members/predictions/matches/champion-bets into the helper's input shape and call `computeRanking()`.
- [x] 02.3 Build the `ranking` field by slicing the helper output to the top 5, preserving the existing `RankingEntry` field set.
- [x] 02.4 Derive `user_stats` for the logged-in member from the helper output.
- [x] 02.5 Remove the now-dead inline loop and `joined_at` sort.
- [x] 02.6 Rewrite the tie-break test case; confirm the rest of the suite still passes unchanged.

## Implementation Details
Modify `app/api/leagues/[id]/route.ts`. The fetch stages (auth `73-85`, membership `90-102`, members/predictions/champ-bets/matches queries) stay; only add `match_date` to the matches `select` at `181-188`. Feed the fetched rows into `computeRanking()` (task_01), then slice to 5 for `ranking` and pick the current user's entry for `user_stats`. Keep the `RankingEntry` mapping (`277-286`) field-compatible. Do not touch the success/error log lines (`302-313`). See TechSpec "API Endpoints → GET /api/leagues/[id] (modified)" and the "Known Risks → Panel-endpoint refactor regression" note.

### Relevant Files
- `app/api/leagues/[id]/route.ts` — the handler to refactor (matches query 181-188, loop 220-264, tiebreaker 266-273, ranking slice 277-286).
- `lib/ranking.ts` — `computeRanking()` consumed here (from task_01).
- `lib/api/types.ts` — `RankingEntry`, `UserStats`, `LeagueDetail` shapes that must stay satisfied (74-94).
- `tests/unit/league-detail-get-api.test.ts` — existing suite with factories (`makeSupabase`, `makePrediction`, `makeFinishedMatch`, lines 32-161) and the tie-break case to rewrite.

### Dependent Files
- `app/ligas/[id]/league-panel-context.tsx` — consumes the panel response (`ranking`, `user_stats`); must keep working unchanged.
- `app/ligas/[id]/components/RankingCard.tsx` — renders the top-5 `ranking`; relies on unchanged shape.

### Related ADRs
- [ADR-002: Dedicated Ranking Endpoint Backed by a Shared Scoring Helper](../adrs/adr-002.md) — requires the panel to consume the shared helper.
- [ADR-003: Most-Recent-Exact-Score Tiebreaker](../adrs/adr-003.md) — the tie ordering change applied here.

## Deliverables
- Refactored `app/api/leagues/[id]/route.ts` using `computeRanking()`, top-5 slice, helper-derived `user_stats`, and `match_date` in the matches query.
- Updated `tests/unit/league-detail-get-api.test.ts` with the rewritten tie-break case.
- Unit/integration tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the refactored handler via mocked Supabase **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Response shape regression: returned keys for `ranking[]` and `user_stats` match the pre-refactor field set exactly.
  - [x] Scoring unchanged: a fixture league yields identical `points`/`exact_scores` per member as before.
  - [x] Top-5 truncation: a league with 8 scoring members returns exactly 5 entries in `ranking`.
  - [x] New tiebreaker: two members tied on points are ordered by most-recent-exact `match_date` (NOT `joined_at`).
- Integration tests (mocked Supabase via `makeSupabase()`):
  - [x] 401 when unauthenticated; 403 when not a member (behavior preserved).
  - [x] End-to-end GET returns 200 with `ranking` (≤5) and `user_stats` for the caller.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `league-detail-get-api` suite passes with ONLY the tie-break case rewritten.
- Panel response is byte-compatible except for tie ordering / `user_stats.position`.
