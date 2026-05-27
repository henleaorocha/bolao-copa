# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Completed. `POST /api/admin/sync-matches` route handler + unit + integration tests. All 13 tests pass, tsc clean, 93.1% line coverage.

## Important Decisions

- Used `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` directly in the route (not `getSupabaseServerClient`) — the latter uses anon key via cookies and is unsuitable for admin writes.
- Used `revalidateTag('fixtures', { expire: 0 })` (not the single-arg form) — this Next.js version requires a `profile` second argument; single-arg form is deprecated and causes a TS error.
- Integration tests import the route handler directly (not HTTP fetch) and mock only `fetchWorldCupFixtures` + `next/cache`, letting real Supabase handle DB operations. This avoids the problem of mocking server-side modules in a running process.

## Learnings

- `revalidateTag` in this Next.js version requires 2 arguments: `revalidateTag(tag, profile)`. Use `{ expire: 0 }` for immediate invalidation in Route Handlers. Single-arg form causes `TS2554: Expected 2 arguments, but got 1`.
- Supabase JS `.delete().is('external_id', null)` correctly maps to `WHERE external_id IS NULL`.
- The `ApiFootballFixture` interface has no `status` field; route defaults inserted rows to `status: 'scheduled'`.

## Files / Surfaces

- Created: `app/api/admin/sync-matches/route.ts`
- Created: `tests/unit/sync-matches-api.test.ts` (10 tests)
- Created: `tests/integration/sync-matches.test.ts` (3 tests)

## Errors / Corrections

- Initial `revalidateTag('fixtures')` call caused `TS2554` — fixed by adding `{ expire: 0 }` second arg.
- Integration test had unused `externalId` parameter in `makeFixture` — fixed by removing it.

## Ready for Next Run

task_04 complete. task_05 (GET /api/leagues/[id]/matches) is next.
