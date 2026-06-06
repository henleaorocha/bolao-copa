# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Additive only: `TOTAL_MATCH_COUNT = 104` in `lib/copa-teams.ts`; `matches_played: number` in `LeagueDetail` (`lib/api/types.ts`). Field NOT populated yet (task_04). UserStats guesses fields kept. Done.

## Important Decisions
- Field added as required `number` (per TechSpec Data Models), placed between `user_stats` and `ranking` in `LeagueDetail`.

## Learnings
- Adding the required `matches_played` field forced updating 4 existing test fixtures that build `LeagueDetail` literals (otherwise tsc fails). This is a mechanical consequence of a required field, not scope creep — purely test fixtures, no production logic.

## Files / Surfaces
- `lib/copa-teams.ts`, `lib/api/types.ts` (prod, additive)
- Fixtures patched with `matches_played: 0/10`: `tests/unit/api-responses.test.ts` (3 fixtures), `tests/integration/league-detail-page.test.tsx`, `tests/unit/ranking-page.test.tsx`
- New tests: `tests/unit/copa-teams.test.ts` (match-count denominators describe block)

## Errors / Corrections
- None.

## Ready for Next Run
- task_04 will populate `matches_played` in `app/api/leagues/[id]/route.ts` and remove `guesses_made`/`guesses_total` from `UserStats` + `StatsRow`.
