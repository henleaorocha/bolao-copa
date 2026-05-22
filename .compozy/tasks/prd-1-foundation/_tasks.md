# Foundation — Task List

## Tasks

| # | Title | Status | Complexity | Dependencies |
|---|-------|--------|------------|--------------|
| 01 | Initialize Next.js 13+ project with TypeScript, Tailwind CSS, and Supabase client | completed | low | — |
| 02 | Configure Supabase project with Google OAuth, connection pooling, and RLS | completed | medium | task_01 |
| 03 | Create database migrations for all 7 tables (users, leagues, league_members, matches, predictions, champion_bets, scores) | completed | medium | task_02 |
| 04 | Implement middleware.ts with Supabase Auth Helpers for session validation and JWT refresh | completed | medium | task_01, task_02 |
| 05 | Create API routes: `/api/auth/me`, `/api/auth/logout`, `/api/health` | completed | medium | task_03, task_04 |
| 06 | Create frontend pages: `/login` and `/dashboard` with auth flow integration | completed | medium | task_05 |
| 07 | Write integration and unit tests covering happy path, error cases, and RLS enforcement | completed | high | task_03, task_05, task_06 |
| 08 | Write documentation and set up GitHub Actions CI/CD pipeline for automated testing and Vercel deployment | completed | medium | task_05, task_06 |
