---
status: completed
title: "League API scoring wiring (replace hardcoded zeros)"
type: backend
complexity: high
dependencies:
  - task_07
  - task_08
---

# Task 09: League API scoring wiring (replace hardcoded zeros)

## Overview

Make the ranking real. Rewrite the league detail endpoint to load each member's predictions, champion bets, and finished matches, reduce them through the pure scoring engine, and build the `user_stats` and ranking from computed points — replacing today's hardcoded zeros. This is the compute-on-read path that finally fulfills the bolão's scoring promise across group, champion/vice, and multiplier-weighted knockout bets.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the hardcoded `user_stats` (`points/exact_scores/...`) and the all-zero `ranking` in `GET /api/leagues/[id]` with values computed via `lib/scoring.ts` (task_07).
- MUST load the league's predictions, champion bets, and finished matches and reduce them through `scoreGroup`/`scoreKnockout`/`scoreChampion`, applying `scoreKnockout` for knockout phases and `scoreGroup` for group matches.
- MUST keep the existing `LeagueDetail` response shape and field names unchanged (only the values become real); existing 401/403/404 guards stay intact.
- MUST resolve champion/vice points only once the relevant results are final (champion when the final is finished, etc.), per ADR-005.
- MUST compute on read with NO persistence — do not write to the `scores` table, add triggers, or create migrations (ADR-005).
- MUST rank members by total points and assign `position`, with a deterministic tie-break, reflecting finished matches only.
</requirements>

## Subtasks
- [x] 9.1 Load predictions, champion_bets, and finished matches for the league members.
- [x] 9.2 Reduce each member's bets through `lib/scoring.ts` (group + knockout multiplier + champion/vice).
- [x] 9.3 Build `user_stats` for the requesting user and the full ranking array from computed points.
- [x] 9.4 Assign ranking positions with a deterministic tie-break; keep the response shape identical.
- [x] 9.5 Rewrite the league-API tests to assert computed (non-zero) points, replacing the zero assertions.

## Implementation Details

Modify `app/api/leagues/[id]/route.ts`. Today it returns `user_stats` with zeros (~lines 133-139) and a ranking array with `points: 0` (~line 149); replace those computed-at-request-time using `lib/scoring.ts` (task_07). Knockout phase → `scoreKnockout(input, phase)`; group → `scoreGroup(input)`; champion/vice via `scoreChampion`. Use the phase value on each match row to pick group vs knockout scoring; only `status='finished'` matches (with real scores from task_08) contribute. Keep the Supabase server-client query style and the existing guard sequence. Per ADR-005 this is compute-on-read: leave the `scores` table untouched, add no writes. Rely on existing indexes; the friends-pool scale makes per-request aggregation cheap.

### Relevant Files
- `app/api/leagues/[id]/route.ts` — the endpoint to rewire (hardcoded `user_stats` ~133-139, ranking `points:0` ~149, returns `LeagueDetail` ~178).
- `lib/scoring.ts` — pure scoring functions (task_07).
- `supabase/migrations/20260522000006_create_predictions.sql` — `predictions` columns reduced into scoring.
- `supabase/migrations/20260522000007_create_champion_bets.sql` — `champion_bets` (`champion_team`, `runner_up_team`) for champion/vice scoring.
- `supabase/migrations/20260522000008_create_scores.sql` — the `scores` table that stays UNUSED (compute-on-read).
- `lib/api/types.ts` — `LeagueDetail`/`user_stats`/ranking types whose shape must not change.
- `app/ligas/[id]/components/ScoringSchemeCard.tsx` — documented scheme the points must match.

### Dependent Files
- `app/ligas/[id]/page.tsx` and ranking/stats UI — consume the now-real `user_stats` and ranking (no shape change needed).

### Related ADRs
- [ADR-003: Mata-mata Establishes the Full-Tournament Scoring Engine](../adrs/adr-003.md) — computed points feed the existing ranking/stats, replacing zeros.
- [ADR-005: Compute-on-Read Scoring with Pure Functions](../adrs/adr-005.md) — reduce on read in the league API; `scores` table stays unused; no new write paths.

## Deliverables
- `GET /api/leagues/[id]` returning computed `user_stats` and ranking (group + champion/vice + multiplier-weighted knockout), same response shape.
- Rewritten league-API tests asserting computed points.
- Integration tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Integration tests (mocked Supabase, per `tests/unit/league-matches-api.test.ts` pattern):
  - [ ] A member with an exact group-stage hit on a finished match has `points` include +10 (replaces the prior zero assertion).
  - [ ] A correct-outcome (non-exact) group hit contributes +5.
  - [ ] A knockout exact hit in `8th` (2.5×) contributes 25; the ranking reflects the multiplier-weighted total.
  - [ ] A correct champion pick contributes +50 once the final is finished; vice +25; neither/unresolved → 0.
  - [ ] Only `status='finished'` matches contribute; scheduled/live matches add 0.
  - [ ] Ranking is ordered by total points with a deterministic tie-break; `position` is assigned accordingly.
  - [ ] 401/403/404 guards remain enforced; `LeagueDetail` response shape is unchanged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Ranking and `user_stats` show correct non-zero points across group, champion/vice, and knockout (with phase multipliers), updating within ~an hour of a result; no persistence added.
- `npm run type-check`, `npm run lint`, and `npm run test` pass.
