# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add 5 columns (`external_id TEXT UNIQUE`, `venue TEXT`, `city TEXT`, `home_flag TEXT`, `away_flag TEXT`) and 2 indexes (`idx_matches_external_id`, `idx_matches_phase_status`) to the `matches` table via migration `20260525000018_add_matches_external_id.sql`.

## Status

**COMPLETE** — migration applied to remote DB, all tests passing.

## Important Decisions

- Used idempotent `ADD COLUMN IF NOT EXISTS` for all 5 columns, matching the pattern in migration `20260525000017`.
- UNIQUE constraint on `external_id` handled via a `DO $$ BEGIN ... IF NOT EXISTS ... END $$` block (not inline on `ADD COLUMN`) to ensure idempotency on re-run.
- `CREATE INDEX IF NOT EXISTS` for both indexes.
- `pg_catalog.pg_indexes` is not accessible via the Supabase JS client (PostgREST only exposes `public` schema per `supabase/config.toml`). Index existence verified functionally: `supabase db push` exit 0 + unique constraint violation test (23505) + phase+status filter query.

## Learnings

- `supabase db push` without `--local` flag pushes to the **remote** Supabase project (not local). Both remote and local schemas are now up to date.
- Running integration tests requires `export $(grep -v '^#' .env.local | xargs)` to load `SUPABASE_SERVICE_ROLE_KEY` into the shell before `npx vitest run`.
- 119 pre-existing test failures exist across the suite; none are related to this migration.

## Files / Surfaces

- `supabase/migrations/20260525000018_add_matches_external_id.sql` — created
- `tests/unit/migration-matches-external-id.test.ts` — created (11 tests, no DB)
- `tests/integration/migration-matches-external-id.test.ts` — created (7 tests, requires SUPABASE_SERVICE_ROLE_KEY)

## Errors / Corrections

None.

## Ready for Next Run

task_02 (TypeScript types) can proceed. The 5 new column names are finalized in the migration and can be referenced directly.
