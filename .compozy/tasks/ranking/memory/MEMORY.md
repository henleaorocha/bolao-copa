# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

All tasks 01–07 completed. Full ranking feature is live: `lib/ranking.ts`, `RankingFullEntry`, refactored `GET /api/leagues/[id]`, new `GET /api/leagues/[id]/ranking`, `Podium.tsx`, `RankingTable.tsx`, `app/ligas/[id]/ranking/page.tsx`, and nav activation (BottomTabBar, PainelSidebar, RankingCard "Ver tudo" link) are all done. Pre-existing suite failures: 12 files (down from 13 before task_01).

## Shared Decisions

- **`RankingMatchInput.home_team?` / `.away_team?`**: TechSpec omitted these fields but they are required for champion/vice derivation via `scoreChampion`. Both fields are optional on the interface; all callers (task_02 route refactor, task_03 new endpoint) must select `home_team, away_team` from the matches query along with `match_date`.
- **`correct_outcomes` semantics**: counted as `matchPoints > 0` (both exact and correct-direction-only), aligning with "Acertos includes Exatos" spec intent.
- **`mostRecentExactDate` is sort-only**: not returned in `RankingFullEntry`, computed internally in the helper.

## Shared Learnings

- Pre-existing test failures: before task_01, the suite had 15 failed / 48 passed. After task_01 it improved to 13 failed / 50 passed. The remaining failures are in unrelated test files (`league-page-bet-modal.test.tsx`, etc.) and are not caused by this feature work.

## Open Risks

- `guesses_made` / `guesses_total` are NOT returned by `computeRanking()` — callers must compute them separately from raw predictions/finishedMatches data (as done in task_02's refactor).

## Shared Decisions (continued)

- **`RankingCard` requires `leagueId: string` prop**: added in task_07 to build the "Ver tudo" href. Any future caller of `RankingCard` must pass `leagueId`.

## Handoffs

All tasks complete. No pending handoffs.

## Ranking Endpoint Notes (task_03)

- Guard order: auth → league existence → membership → data (bracket-template order, not panel-order).
- Soft errors for champ_bets/predictions/matches; hard 500 only on members query failure.
- `makeSupabase()` test factory for the ranking endpoint uses `leagueMembersCallCount` to distinguish two `league_members` calls (membership single first, members order second) — same pattern as `league-detail-get-api.test.ts`.
