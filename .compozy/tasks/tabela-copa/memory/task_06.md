# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `supabase/migrations/20260526000021_schedule_hourly_sync.sql` enabling `pg_cron`/`pg_net`
and registering hourly sync job `sync-matches-hourly` at `0 * * * *`. Add integration tests.
Status: **complete**.

## Important Decisions

- Added two `SECURITY DEFINER` admin helper functions to the migration:
  `public.admin_get_cron_job(text)` and `public.admin_get_installed_extensions(text[])`.
  Justified by: `cron.job` and `pg_catalog.pg_extension` are not accessible via PostgREST (only
  the `public` schema is exposed). REVOKE/GRANT scoped to `service_role` only.
- Tests split into two describe blocks: always-on SQL content checks (no DB) and DB-gated checks
  with `describe.skipIf(!HAS_SERVICE_KEY)`. This matches the existing migration test convention.
- `current_setting('app.settings.site_url', true)` and
  `current_setting('app.settings.service_role_key', true)` are used in the cron command body so
  no secrets are stored in the migration; values resolve at job run time.

## Learnings

- `cron.job` and `pg_catalog` tables are not reachable via PostgREST. Use `SECURITY DEFINER`
  public functions + `rpc()` to expose system-schema data for tests or admin tooling.

## Files / Surfaces

- `supabase/migrations/20260526000021_schedule_hourly_sync.sql` — new
- `tests/integration/sync-cron.test.ts` — new (9 passing, 5 skipped)

## Errors / Corrections

None.

## Ready for Next Run

Task 06 is complete. All tabela-copa tasks (01–06) are done.
