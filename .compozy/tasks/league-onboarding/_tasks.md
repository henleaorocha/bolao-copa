# League Welcome Onboarding — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Database migration: add `onboarded_at` to `league_members` | completed | low | — |
| 02 | Extend `LeagueDetail` TypeScript type | completed | low | task_01 |
| 03 | Update `GET /api/leagues/{id}` — expose `invite_token` and `user_onboarded_at` | completed | medium | task_02 |
| 04 | Create `PATCH /api/leagues/{id}/me` endpoint | completed | low | task_01, task_02 |
| 05 | Build `LeagueWelcomeModal` component (4-screen wizard) | completed | high | task_02, task_04 |
| 06 | Integrate `LeagueWelcomeModal` into league detail page | completed | low | task_03, task_05 |
