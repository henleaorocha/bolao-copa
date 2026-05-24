# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add `onboarded_at TIMESTAMPTZ DEFAULT NULL` to `league_members` and create RLS UPDATE policy `"league_members_update_own_onboarded_at"`. This is the foundational migration all other tasks depend on.

## Important Decisions

- Used exact SQL from techspec Data Models section — no deviation.
- No `BEGIN/COMMIT` wrapper (DDL-only migration, matches project pattern in migration 15).
- Regression test written as admin-client Supabase test (not HTTP fetch) because the existing HTTP auth cookie format in integration tests is broken (pre-existing issue, `sb-access-token` cookie name is wrong for `@supabase/ssr` v0.5+).

## Learnings

- **Pre-existing HTTP auth failure**: all cookie-based HTTP tests in `tests/integration/leagues.test.ts` return 401. The cookie name `sb-access-token` does not match what `@supabase/ssr` expects (`sb-{project-ref}-auth-token`). This is a pre-existing issue, not introduced here. 17 out of 20 authenticated HTTP tests were already failing.
- **Pre-existing unit test failures**: 3 tests in `tests/unit/get-leagues-hub.test.ts` fail due to pre-existing modifications in `lib/leagues/get-leagues-hub.ts` (visible in git status before task started). Confirmed by stash experiment.
- The project uses a **remote** Supabase instance (`mpythoirxidkauerttak.supabase.co`), not local. `supabase db push` pushes to remote. Local supabase docker is also running but the env points to remote.
- `authedClient(accessToken)` from fixtures/factories uses Bearer header auth — works with Supabase JS client for RLS testing.

## Files / Surfaces

- `supabase/migrations/20260523000016_add_league_members_onboarded_at.sql` — new migration (created)
- `tests/integration/leagues.test.ts` — added 3 tests in new `league_members.onboarded_at migration (task_01)` describe block; also added `authedClient` to imports

## Errors / Corrections

- Initial TypeScript error: unused `count` variable in test destructure → removed `count` from `const { error, count }`.

## Ready for Next Run

- Migration is applied to remote DB. Column `onboarded_at` confirmed present via REST API.
- RLS UPDATE policy `"league_members_update_own_onboarded_at"` is active and tested.
- Task_02 (extend TypeScript types) can proceed — no blockers.
- Follow-up note: the HTTP auth cookie issue in integration tests should be fixed before task_03/task_04 integration tests (which will need authenticated HTTP calls). Cookie name should be `sb-mpythoirxidkauerttak-auth-token`.
