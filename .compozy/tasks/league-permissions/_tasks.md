# League Permissions & Test-League Hiding — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Migration: add `users.can_create_league` column + grant operator e-mails | completed | low | — |
| 02 | Migration: gate `leagues_insert`, hide test league in `leagues_select_open`, stop auto-enroll in `handle_new_user()` | completed | medium | task_01 |
| 03 | `canCreateLeague()` server helper | completed | low | task_01 |
| 04 | `POST /api/leagues` 403 permission guard + structured log | completed | low | task_03 |
| 05 | `app/ligas/page.tsx`: conditional create card + no-league empty state | completed | medium | task_03 |
| 06 | `GET /api/auth/me` + `AuthUser` type: expose flag, return `league: null` | completed | medium | task_01 |
| 07 | `app/dashboard/page.tsx`: redirect to `/ligas` on no active league | completed | low | task_02 |
| 08 | Update test fixtures/factories for explicit membership | completed | medium | task_02 |
