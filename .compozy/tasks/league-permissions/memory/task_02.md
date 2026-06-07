# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. Migration `20260601000026_league_permissions_policies.sql` ships the three
security objects: (1) `leagues_insert` gated on `users.can_create_league = true`,
(2) `leagues_select_open` excluding the test UUID from the open branch while keeping
the member branch, (3) `handle_new_user()` with the users upsert kept (SECURITY
DEFINER) and the test-league auto-enroll INSERT removed. Applied via `db reset`.

## Important Decisions
- Membership branch in `leagues_select_open` MUST use fully qualified `leagues.id`.
  The ADR-003/TechSpec snippet uses unqualified `id`, but `league_members` has an
  `id` column so inner scope wins → compiles to `lm.league_id = lm.id`, hiding
  leagues from their own members. Migration 13 already fixed this exact bug; I
  re-qualified to `leagues.id` (verified via `pg_get_expr`).
- Fixed two existing tests that asserted the OLD auto-enroll contract (they directly
  test the trigger this task changes, so in-scope here, NOT task_08):
  - `tests/integration/database.test.ts` — flipped "auto-enrolled" → "NOT auto-enrolled" (0 rows).
  - `tests/integration/league-context.test.ts` — same flip + explicit public.users cleanup.
- Granted `can_create_league=true` to the creator in `leagues-rls.test.ts` beforeAll
  so its INSERT-path test reflects the new gate (1-line setup, scoped to the changed contract).

## Learnings
- Rigorous regression check: move new migration out → `db reset` → capture failing
  test names → restore → `db reset` → diff with `comm -13`. Proved migration 26
  introduced EXACTLY 2 failures (both auto-enroll asserts), now resolved.
- Local DB container is `supabase_db_bolao-copa`; query via
  `docker exec supabase_db_bolao-copa psql -U postgres -d postgres -tAc "..."`
  (no host `psql`; `grep db` also matches `supabase_db_AppFinancas`).
- `db reset` warns `no files matched pattern: supabase/seed.sql` (config points at a
  non-existent seed; harmless — seeds live in supabase/seeds/state-*.sql).
- Pre-existing failures in touched suites (NOT mine): `league-context.test.ts`
  route/layout + multi-league HTTP tests, `dashboard.test.ts` — all need a running
  Next dev server (:3000) or fail on layout import. Baseline = 10 across the 4 suites.

## Files / Surfaces
- NEW `supabase/migrations/20260601000026_league_permissions_policies.sql`
- NEW `tests/unit/migration-league-permissions-policies.test.ts` (SQL file-content, 8 tests)
- NEW `tests/integration/migration-league-permissions-policies.test.ts` (RLS/trigger, 8 tests)
- EDIT `tests/integration/leagues-rls.test.ts` (grant flag in beforeAll)
- EDIT `tests/integration/database.test.ts` (no-auto-enroll assertion)
- EDIT `tests/integration/league-context.test.ts` (no-auto-enroll assertion)

## Errors / Corrections
- Initial migration used unqualified `id` in the member branch (copied from ADR) →
  compiled to `lm.id` → corrected to `leagues.id` before any test claim.
- Initial integration test imported unused `beforeAll` → tsc TS6133 → removed.

## Ready for Next Run
- Verified: tsc 0 errors, eslint 0, new suites 16/16, leagues-rls 13/13, zero new
  regressions vs baseline. Coverage is behavioral (SQL migration, no TS lines):
  all 3 objects + both select branches exercised.
- Diff left uncommitted (auto-commit disabled). Tracking files updated.
- task_07 (dashboard no-league redirect) and task_08 (factories explicit membership)
  depend on this no-auto-enroll behavior now in place.
