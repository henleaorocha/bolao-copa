# League Panel — Open League Dashboard — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Verify and migrate `prizes` column in `leagues` table | completed | low | — |
| 02 | Extend `LeagueDetail` types (`UserStats`, `RankingEntry`) | completed | low | — |
| 03 | Extend `GET /api/leagues/[id]` with `prizes`, `user_stats`, `ranking` | completed | medium | task_01, task_02 |
| 04 | Static section components (`ScoringSchemeCard`, `UpcomingGamesStub`, `BottomTabBar`) | completed | medium | task_02 |
| 05 | `ChampionBanner` component | completed | medium | task_02 |
| 06 | `YourBetCard` component | completed | medium | task_02 |
| 07 | Navigation shell (`PainelSidebar`, `PainelTopBar`, `InviteShareButton`) | completed | medium | task_02 |
| 08 | Data-driven components (`StatsRow`, `PrizesStrip`, `RankingCard`) | completed | medium | task_02, task_03 |
| 09 | Page orchestrator rewrite (`app/ligas/[id]/page.tsx`) | completed | high | task_03, task_04, task_05, task_06, task_07, task_08 |
