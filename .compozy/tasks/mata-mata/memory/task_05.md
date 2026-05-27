---
name: task-05-predictions-guard
description: Task 05 execution memory — confirmed-teams guard on PUT predictions endpoint
metadata:
  type: project
---

# Task Memory: task_05.md

## Objective Snapshot

COMPLETED. Confirmed-teams guard added to `PUT /api/leagues/[id]/predictions/[matchId]`.

## Important Decisions

- Guard order: confirmed-teams check BEFORE deadline check.
- HTTP status: `409 Conflict` for `MATCH_NOT_CONFIRMED` (distinct from `403 DEADLINE_PASSED`).
- Knockout detection: explicit `KNOCKOUT_PHASES` set at module level (not `!== 'group'`).
- Match query expanded from `'id, match_date'` → `'id, match_date, phase, home_team, away_team'`.
- Existing test fixtures updated to include `phase: 'group', home_team, away_team`.

## Files / Surfaces

- `app/api/leagues/[id]/predictions/[matchId]/route.ts` — modified
- `tests/unit/predictions-put-api.test.ts` — modified (fixtures + 5 new tests, 20 total)

## Learnings

- Pre-existing test fixtures only had `id` and `match_date`; adding `phase/home_team/away_team` was required for new guard to work correctly with existing tests.
- `isConfirmedMatchup('Vencedor 1º Grupo A', ...)` → `false` — placeholder labels are not in `VALID_TEAM_NAMES`.

## Errors / Corrections

(none)

## Ready for Next Run

DONE.
