# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Add `public.users.can_create_league BOOLEAN NOT NULL DEFAULT false` + idempotent grant
to the two operator e-mails, in a single new migration. Foundation for tasks 02–08.

## Important Decisions
- New migration filename: `20260601000025_users_can_create_league.sql` (next after 24).
- Column added with `ADD COLUMN IF NOT EXISTS` (repo convention, e.g. migration 18).
- Grant via one idempotent `UPDATE ... WHERE email IN (...)` (ADR-004 "UPDATE now"); zero
  rows when accounts absent — does not error.
- Scope limited to the column + grant. RLS/trigger changes belong to task_02.

## Learnings
- Local Supabase running; DB at migration 24. Apply locally with `supabase migration up`
  (NOT `db push` — that targets the linked PROD project; .env.local also points to PROD).
- Local keys via `supabase status -o env`. Service role key is the demo key.
- Pre-change signal: REST select of `can_create_league` returns code 42703 (column absent).
- Integration tests live in `tests/integration/`, gated by `describe.skipIf(!HAS_SERVICE_KEY)`
  using `adminClient()`/`createTestUser()` from `tests/fixtures/factories.ts`.
- File-content "migration" unit tests live in `tests/unit/` (pattern: read SQL, regex-assert).
- vitest setup defaults SUPABASE_URL to localhost when env unset; integration tests need
  SUPABASE_SERVICE_ROLE_KEY + local URL exported to actually run (else they skip).

## Files / Surfaces
- NEW: `supabase/migrations/20260601000025_users_can_create_league.sql`
- NEW: `tests/unit/migration-users-can-create-league.test.ts` (file-content)
- NEW: `tests/integration/migration-users-can-create-league.test.ts` (DB-backed)

## Errors / Corrections
- First integration-test design renamed a throwaway user's email to the operator address;
  this collided on re-run because `public.users` has NO ON DELETE CASCADE from `auth.users`
  (see `20260522000001_create_users.sql` — `id` is a bare PK), so `deleteTestUser` leaves an
  orphan `public.users` row. Fixed: integration test now pre-cleans operator e-mails in
  `beforeAll`, uses direct controlled `public.users` inserts (service role bypasses RLS) with
  random UUIDs, and deletes both `auth.users` and `public.users` rows in `afterAll`.
  Default-value case still uses `createTestUser()` per the task requirement.

## Verification Evidence (task_01, PASS)
- `supabase migration up --local` applied 25; column selectable; DEFAULT false confirmed
  (insert w/o flag → false); NOT NULL confirmed (insert null → 23502).
- New tests: unit 6 + integration 4 = 10 passed; stable across 3 runs; +leagues-migrations 11.
- Repo-wide `npm test` has 50 PRE-EXISTING failures (component .tsx + sync-matches-api),
  unrelated — git shows only new files added, none of the failing files touched by me.

## Ready for Next Run
- task_02 builds the RLS `leagues_insert` gate that READS this column. Grant here is data-only;
  if an operator e-mail signs up after this migration, re-run the grant UPDATE manually.
