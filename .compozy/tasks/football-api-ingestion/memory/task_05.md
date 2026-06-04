# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Add `is_manual boolean NOT NULL DEFAULT false` + `manual_updated_at timestamptz` to `public.matches` via a new idempotent migration. No app code changes; consumed by task_06 (sync exclusion) and task_07 (operator endpoint).

## Important Decisions
- Migration filename `20260601000023_add_matches_manual_flags.sql` (next seq after `...022`; today is 2026-06-01).
- Single `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for both columns (mirrors `...018` matches ALTER pattern). No DO-block needed — no constraints/indexes added by this task.

## Learnings
- Migration tests in this repo are SQL **file-content** assertions (no live DB); see `tests/unit/migration-matches-external-id.test.ts`. The "existing rows = false" integration item is asserted structurally via `NOT NULL DEFAULT false` (Postgres backfills on add).
- vitest coverage scope = `lib/**` + `app/api/**`; SQL migrations and `*.test.ts` are out of coverage instrumentation. 80% target N/A to a SQL-only deliverable; file-content test fully exercises the migration.

## Files / Surfaces
- NEW `supabase/migrations/20260601000023_add_matches_manual_flags.sql`
- NEW `tests/unit/migration-matches-manual-flags.test.ts` (9 tests, all pass)

## Errors / Corrections
None.

## Ready for Next Run
- task_06 sync route can read `external_id`s where `is_manual = true` and exclude from upsert; report `skipped`/`skipped_manual`.
- task_07 operator endpoint writes `is_manual`/`manual_updated_at = now()`; release flag sets `is_manual = false`.
