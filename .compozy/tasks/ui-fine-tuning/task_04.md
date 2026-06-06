---
status: completed
title: Painel "JOGOS JÁ REALIZADOS" card (finished / 104, tournament-wide)
type: frontend
complexity: medium
dependencies:
  - task_01
---

# Task 4: Painel "JOGOS JÁ REALIZADOS" card (finished / 104, tournament-wide)

## Overview
Repurpose the Painel's personal predictions card into a tournament-wide progress
indicator that shows how many of the 104 matches have a final result. This makes the
platform's progress legible at a glance and is identical for every league member. The
removal of the now-unused `UserStats` guesses fields is done here, atomically with the
API and component edits, so the build stays green.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `matches_played` to the `GET /api/leagues/[id]` response, computed from the already-loaded finished matches counting those with non-null `home_score` AND `away_score`.
- MUST remove the per-user `guesses_made` / `guesses_total` computation from `app/api/leagues/[id]/route.ts`.
- MUST remove `guesses_made` and `guesses_total` from `UserStats` in `lib/api/types.ts` (atomic with this task to keep the build green).
- MUST relabel the third `StatsRow` card to title `JOGOS JÁ REALIZADOS`, value `matches_played / 104` (using `TOTAL_MATCH_COUNT`), subtitle `fase de grupos + mata-mata`.
- The numerator MUST be tournament-wide (group + knockout), identical for every member — not a personal count.
- MUST NOT change scoring, ranking, position, points, or exact-scores computation.
</requirements>

## Subtasks
- [x] 4.1 Compute and return `matches_played` from the finished-match rows in the league detail handler.
- [x] 4.2 Remove the `guesses_made` / `guesses_total` calculation from the same handler.
- [x] 4.3 Drop `guesses_made` / `guesses_total` from `UserStats` and fix the resulting reference(s).
- [x] 4.4 Re-label and re-wire the third `StatsRow` card to the new title/value/subtitle using `TOTAL_MATCH_COUNT`.
- [x] 4.5 Add unit tests for the count + denominator and an integration check for the rendered card.

## Implementation Details
The handler already loads finished matches (around `app/api/leagues/[id]/route.ts:173-180`)
and computes guesses around lines 217-231 — replace that block with the `matches_played`
count and drop the guesses fields. `StatsRow.tsx` third card is around lines 48-51. Use
`TOTAL_MATCH_COUNT` from task_01 for the denominator and the new `LeagueDetail.matches_played`
field. See TechSpec "API Endpoints" and "Data Models" for the exact contract.

### Relevant Files
- `app/api/leagues/[id]/route.ts` — loads finished matches; remove guesses calc, add `matches_played` count.
- `app/ligas/[id]/components/StatsRow.tsx` — third card to relabel/re-source (~lines 43-52).
- `lib/api/types.ts` — `UserStats` (remove two fields) and `LeagueDetail.matches_played` (added in task_01).
- `lib/copa-teams.ts` — `TOTAL_MATCH_COUNT` denominator (added in task_01).

### Dependent Files
- `app/ligas/[id]/page.tsx` (or the Painel container) — passes `LeagueDetail` to `StatsRow`; verify it forwards `matches_played`.
- Any test/fixture asserting `user_stats.guesses_made` / `guesses_total` — must be updated for the removed fields.

### Related ADRs
- [ADR-001: Single-batch delivery with a unified match-card pattern](../adrs/adr-001.md) — establishes the repurposed tournament-wide card and the accepted removal of the personal counter.

## Deliverables
- `matches_played` returned by the league detail API, counting finished matches with both scores.
- `guesses_made` / `guesses_total` removed from API and `UserStats`.
- `StatsRow` third card showing `JOGOS JÁ REALIZADOS`, `matches_played / 104`, `fase de grupos + mata-mata`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test for the rendered card **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] API returns `matches_played` equal to the number of finished matches with non-null `home_score` and `away_score`.
  - [ ] Matches missing a score are excluded from `matches_played`.
  - [ ] The card denominator is `104` (`TOTAL_MATCH_COUNT`).
  - [ ] Ranking/points/position/exact-scores outputs are unchanged by the handler edit (regression guard).
- Integration tests:
  - [ ] `GET /api/leagues/[id]` response includes `matches_played` and no longer includes `guesses_made` / `guesses_total`.
  - [ ] The Painel renders the third card with title `JOGOS JÁ REALIZADOS`, value `N / 104`, subtitle `fase de grupos + mata-mata`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The Painel card reflects the tournament-wide finished-match count out of 104, identical for all members.
- No `guesses_made` / `guesses_total` remain; scoring/ranking is unchanged.
