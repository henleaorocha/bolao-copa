# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add nullable `prizes TEXT` column to `leagues` table via Supabase migration. Gate task for task_03 (API) and task_08 (PrizesStrip).

## Important Decisions

- `prizes` column confirmed ABSENT from `leagues` table before migration (only `prize_pool TEXT` exists — different column).
- Migration file timestamp: `20260525000017` (follows sequence after `20260523000016_add_league_members_onboarded_at.sql`).
- Column is nullable with no default — existing rows get `prizes = NULL` automatically, no UPDATE needed.

## Learnings

- `psql` is not available in this environment; use `npx supabase db query` for DB inspection.
- `leagues` table has `prize_pool TEXT` (different from `prizes TEXT`). Both can coexist.

## Files / Surfaces

- `supabase/migrations/20260525000017_add_leagues_prizes.sql` — created

## Errors / Corrections

- `information_schema.columns` is NOT accessible via Supabase PostgREST client (only public schema exposed). Use `npx supabase db query` for schema inspection; use behavioral SELECT/INSERT tests for column verification.

## Ready for Next Run

- **Status: COMPLETE.** `leagues.prizes TEXT` nullable column confirmed present; migration applied.
- Integration tests in `tests/integration/leagues-prizes-migration.test.ts` — 4/4 pass.
- `prize_pool` and `prizes` are distinct columns — task_03 must SELECT `prizes`, not `prize_pool`, from `leagues`.
- Full test suite has ~90 pre-existing failures unrelated to this task; do not treat as regressions.
