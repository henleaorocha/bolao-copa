# Task Memory: task_09.md

## Objective Snapshot

Replace hardcoded zeros in `GET /api/leagues/[id]` `user_stats` and `ranking` with values computed via `lib/scoring.ts`. Compute-on-read: no persistence to the `scores` table.

## Important Decisions

- **Single champion_bets query for whole league**: replaced the previous per-user `maybeSingle()` query with a single `.eq('league_id', leagueId)` query that returns all member bets. This serves both scoring (all members) and `has_champion_bet`/`champion_bet` for the requesting user.
- **Graceful error fallback**: if `champion_bets`, `predictions`, or `matches` queries fail, the handler logs the error but continues, returning 0 points rather than a 500. This ensures the endpoint stays functional even if scoring queries degrade.
- **Draw final = null winner**: if the finished final's scores are equal (extra time not yet reflected), `realChamp`/`realVice` remain `null` → `scoreChampion` returns 0. No false champion points.
- **Dead `'4th'` phase = 0 points**: the dead enum value in the matches table is explicitly handled by falling through the scoring phase check (not in `KNOCKOUT_SCORING_PHASES`), returning 0.
- **Ranking cap at 5 preserved**: kept the top-5 cap. `user_stats.position` reflects the user's full rank (can be >5); only the ranking array is capped.
- **Tie-break by `joined_at` ascending**: on equal points, the member who joined earlier ranks higher. Consistent with the pre-existing sort pattern.

## Learnings

- **Pre-existing prizes test bug fixed as a side effect**: the old `makeSupabase` mock used `prizes: '...'` in `MOCK_LEAGUE` but the route destructures `prize_pool`. Fixed by changing to `prize_pool` in the mock. Was already failing before this task.
- **Mock factory pattern for simple array queries**: `.select(...).eq(...)` (no `maybeSingle`) is mocked as `makeThenable(result)` returned from `.eq()`. The `makeThenable` helper binds `promise.then/catch` so the `await` chain resolves correctly.
- **PATCH/DELETE coverage**: the route file has PATCH and DELETE handlers that are out of scope for task_09. They are tested in `tests/integration/leagues-detail.test.ts` (skipped without `HAS_SERVICE_KEY`). The GET handler alone has ~100% line coverage.

## Files / Surfaces

- `app/api/leagues/[id]/route.ts` — added imports (`scoreGroup`, `scoreKnockout`, `scoreChampion`, `KnockoutPhase`); added module-level types (`FinishedMatchRow`, `PredictionRow`, `ChampionBetRow`, `MemberScoreStats`) and `KNOCKOUT_SCORING_PHASES` constant; replaced single-user champion_bets query + hardcoded user_stats/ranking with compute-on-read scoring logic.
- `tests/unit/league-detail-get-api.test.ts` — full rewrite: updated mock to handle 3 new table queries (`champion_bets` array, `predictions`, `matches`); 39 tests covering all scoring scenarios, guards, ranking, and error paths. 14 old tests replaced/updated, 25 new tests added.

## Errors / Corrections

- None during implementation.

## Ready for Next Run

task_09 is COMPLETE. All 9 tasks in the mata-mata workflow are done.
