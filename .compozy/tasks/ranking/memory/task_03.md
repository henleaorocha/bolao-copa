# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

New `GET /api/leagues/[id]/ranking` endpoint returning the full ordered member list via `computeRanking()`, membership-guarded, no top-5 truncation.

## Important Decisions

- **Guard order**: Used bracket endpoint order (auth → league existence → membership → data), not panel order (membership-first). The task spec says to mirror bracket structure.
- **Members query**: Selects only `user_id, joined_at, users(full_name, avatar_color)` — no `onboarded_at` or `role` since neither is needed by `computeRanking()`.
- **Soft errors for champ_bets/predictions/matches**: These three queries use `const { data } = await supabase...` with no explicit error handling — matches the panel pattern; hard failure only for the members query.
- **Query param rejection**: Used `allowedParams: string[] = []` loop pattern from panel endpoint for consistency.

## Learnings

- `makeSupabase()` test factory for this endpoint needs `leagueMembersCallCount` to distinguish the two `league_members` calls (first: membership single; second: members order). Same pattern as `league-detail-get-api.test.ts`.
- The `champion_bets` / `predictions` / `matches` table mocks use `makeThenable()` with a single `.eq()` terminal, because the route's queries end at `.eq(...)`.

## Files / Surfaces

- `app/api/leagues/[id]/ranking/route.ts` — new (created)
- `tests/unit/league-ranking-api.test.ts` — new (17 tests, all passing)

## Errors / Corrections

None. TypeScript clean; 17/17 tests pass; no regressions in existing suite.

## Ready for Next Run

Task complete. Tasks 04/05/06 (Podium, RankingTable, ranking page) can proceed.
