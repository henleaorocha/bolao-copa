# Match Bets (Palpites) — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | DB Migration: extend `matches` table | completed | low | — |
| 02 | TypeScript types for matches & predictions | completed | low | — |
| 03 | API Football client (`lib/football-api.ts`) | completed | low | task_02 |
| 04 | Sync endpoint (`POST /api/admin/sync-matches`) | completed | medium | task_02, task_03 |
| 05 | League matches list endpoint (`GET /api/leagues/[id]/matches`) | completed | medium | task_02 |
| 06 | Match detail endpoint (`GET /api/leagues/[id]/matches/[matchId]`) | completed | medium | task_05 |
| 07 | Prediction upsert endpoint (`PUT /api/leagues/[id]/predictions/[matchId]`) | completed | medium | task_02 |
| 08 | `UpcomingMatchesCard` component + panel wiring | completed | medium | task_05 |
| 09 | Palpites list page (`/ligas/[id]/palpites`) | completed | high | task_05, task_07 |
| 10 | Bet detail screen (`/ligas/[id]/palpites/[matchId]`) | completed | high | task_06, task_07 |
