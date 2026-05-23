# Ligas — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | DB Migrations: invite_token, active_league_id, member_count, RLS Policies | completed | high | — |
| 02 | Update /api/auth/me: Dynamic Active League (GET + PATCH) | completed | medium | task_01 |
| 03 | LeagueProvider, useLeague() Hook & Layout Integration | completed | medium | task_02 |
| 04 | League List, Create & Discover API Routes | completed | medium | task_01, task_02 |
| 05 | League Detail, Update & Delete API Routes | completed | medium | task_01, task_02 |
| 06 | League Member Management API Routes | completed | medium | task_04, task_05 |
| 07 | League Hub Screen (My Leagues + Discover) | completed | high | task_03, task_04, task_06 |
| 08 | TopBar LeagueSwitcher Component | completed | medium | task_02, task_03, task_04 |
| 09 | League Detail Screen & Admin Actions UI | completed | high | task_03, task_05, task_06 |
| 10 | Join Page & OAuth Cold-Start Redirect Preservation | completed | high | task_04, task_05, task_06 |
| 11 | Dashboard Refactor: Replace DEFAULT_LEAGUE_ID with Dynamic Context | completed | medium | task_02, task_03 |
