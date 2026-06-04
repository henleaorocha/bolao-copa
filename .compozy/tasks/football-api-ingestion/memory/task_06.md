# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Sync route excludes `is_manual=true` matches from upsert so operator corrections survive hourly runs. Response `{ upserted, skipped }` now reports real counts; logs add `skipped_manual`; error event already `ingestion_error` (renamed in task_03). DONE — awaiting manual review (auto-commit off).

## Important Decisions
- Exclusion read placed AFTER `createClient`, BEFORE upsert: `select('external_id').eq('is_manual', true)`. Build a `Set` of non-null ids; `rows.filter(r => !manualIds.has(r.external_id))`. `skipped = rows.length - rowsToUpsert.length`.
- `finished_count`/`scored_matches` now computed over `rowsToUpsert` (not full `rows`) — reflects what was actually ingested. Existing log test unaffected (its inputs are non-manual).
- Added `skipped_manual` to BOTH `sync_result_ingested` and `sync_complete` logs; techspec only required the ingestion log but sync_complete already carries `upserted`, so keeping them symmetric.
- Manual-read DB error → throw → caught → `ingestion_error` (covered by test); upsert is NOT attempted in that case.

## Learnings
- Unit test supabase mock needed a new `select(){eq()}` chain returning `{ data: [{external_id}], error }`. `makeSupabase` extended with `manualExternalIds`/`manualError` opts.
- `revalidateTag` assert uses imported mocked `next/cache` symbol with `('fixtures', { expire: 0 })`.

## Files / Surfaces
- `app/api/admin/sync-matches/route.ts` — exclusion query + filter + counts + log fields.
- `tests/unit/sync-result-ingestion.test.ts` — 8 new cases (16 total); mock extended.
- `tests/integration/sync-matches.test.ts` — new case: seeded manual row (5-0) untouched while other row upserted; skipped=1/upserted=1.

## Errors / Corrections
- None.

## Ready for Next Run
- Verify: unit 16/16 pass, tsc 0, eslint 0, route coverage 97.22% stmts (only pre-existing deleteError branch line 73 uncovered). Integration tests skip without SUPABASE_SERVICE_ROLE_KEY.
