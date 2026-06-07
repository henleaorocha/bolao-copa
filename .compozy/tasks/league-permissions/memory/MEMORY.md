# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State
- task_01 DONE: migration `20260601000025_users_can_create_league.sql` adds
  `public.users.can_create_league BOOLEAN NOT NULL DEFAULT false` + idempotent grant to the
  two operator e-mails. Applied to local Supabase. Diff uncommitted (auto-commit disabled).
- task_02 DONE: migration `20260601000026_league_permissions_policies.sql` (DB now at 26).
  `leagues_insert` gated on `can_create_league=true`; `leagues_select_open` hides test league
  `…0001` from the open branch (member branch preserved); `handle_new_user()` keeps the users
  upsert (SECURITY DEFINER) and NO LONGER auto-enrolls into the test league. Applied via
  `db reset`. Diff uncommitted.
- task_03 DONE: `lib/leagues/can-create-league.ts` exports
  `canCreateLeague(supabase, userId): Promise<boolean>` (reads `users.can_create_league`,
  `true` only when exactly true, `false` on missing row/error, no throw). Unit+integration
  tests pass. task_04/task_05 import from `@/lib/leagues/can-create-league`. Diff uncommitted.
- task_04 DONE: `POST /api/leagues` (`app/api/leagues/route.ts`) calls `canCreateLeague()` right
  after auth (before body parse/insert); on `false` emits `console.warn` JSON log with
  `reason: 'cannot_create_league'` + `user_id` + `status_code:403` and returns
  `formatError('FORBIDDEN','Você não tem permissão para criar ligas',403)` — no insert. Success
  path unchanged. New-branch coverage 100%. Diff uncommitted.
- task_06 DONE: `GET /api/auth/me` (`app/api/auth/me/route.ts`) now selects `can_create_league`
  from `public.users`, returns it in `user` payload, and returns `200 + league: null` for
  no-league users (was 500). `lib/api/types.ts`: `AuthUser.can_create_league: boolean` (required);
  `AuthMeResponse.league: LeagueSummary | null`. PATCH also selects the flag for contract parity.
  GET consumers handle null (`league-panel-context` reads `.user` only; `LeagueSwitcher`/
  `LeagueCard` are PATCH-only + guard `league`). Typed `AuthUser` fixtures fixed:
  `tests/unit/ranking-page.test.tsx`, `tests/integration/league-detail-page.test.tsx`. New tests:
  `tests/unit/auth-me-api.test.ts` (13 GET+PATCH cases), `tests/integration/auth-me-no-league.test.ts`.
  GET handler 100% covered; file 80%. Diff uncommitted.
- task_07 DONE: `app/dashboard/page.tsx` replaced the no-active-league `throw` with
  `redirect('/ligas')` (ADR-005); `/login` redirect + active-league render unchanged.
  New tests: `tests/unit/dashboard-page.test.tsx` (4 cases), integration render test
  `tests/integration/dashboard-no-league-redirect.test.tsx` (fresh league-less user, real RLS).
  File 82.35% stmts/lines (uncovered = pre-existing query-error branch). Diff uncommitted.
  NOTE: old `tests/integration/dashboard.test.ts` is the HTTP `:3000` suite, left untouched.
- task_08 DONE: factory/fixture ripple for no-auto-enroll. `tests/fixtures/factories.ts` gains
  `addDefaultLeagueMember(userId, role='member')` (wraps `addTestLeagueMember(DEFAULT_LEAGUE_ID, …)`;
  `DEFAULT_LEAGUE_ID` still referenced per PRD). Only two suites actually relied on implicit
  test-league membership: `auth.test.ts` (repurposed the "auto-enrolled" assertion + beforeAll now
  adds membership) and `league-context.test.ts` (beforeAll now adds membership for its `:3000`
  layout test). `rls.test.ts`/`database.test.ts` and the rest are membership-agnostic
  (predictions/champion_bets SELECT is user_id-based, not league-membership-based). New
  `tests/integration/factories-membership.test.ts` pins the default (fresh user = 0 memberships).
  Verified WITH local service key: 5/5 membership tests green; baseline unchanged (50 failed w/o
  service key — pre-existing :3000 + seed/migration). Diff uncommitted.
- task_05 DONE: `app/ligas/page.tsx` reads `canCreateLeague()` (added to its `Promise.all`) and
  renders `<CreateLeagueModal/>` ONLY when true (hidden, not disabled — ADR-001). Adds a
  no-league empty state (`data-testid="no-league-empty-state"`, invite-link copy — ADR-005),
  shown when `leagues.length===0 && !canCreate`; capable users with zero leagues keep their
  create card (no bare empty state). Page coverage 100% stmts/lines, 94% branch. Diff uncommitted.

## Shared Decisions
- The per-user gate column is `public.users.can_create_league` (default false). Operator grant
  is a data-only `UPDATE ... WHERE email IN (...)` in migration 25 (ADR-004 "UPDATE now").
  Later tasks READ this column; do not re-declare it.

## Shared Learnings
- Run DB integration tests against LOCAL Supabase by exporting the local keys from
  `supabase status -o env` (NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 +
  SERVICE_ROLE_KEY). Apply migrations locally with `supabase migration up --local` — NEVER
  `npm run db:push` (targets the linked PROD project; `.env.local` also points to PROD).
  To re-apply an ALREADY-recorded migration (e.g. after editing it), `supabase db reset
  --local` (re-runs the whole chain; warns about missing `supabase/seed.sql` — harmless).
- Inspect live DB objects via `docker exec supabase_db_bolao-copa psql -U postgres -d
  postgres -tAc "..."` (no host `psql`; beware `grep db` also matches `supabase_db_AppFinancas`).
- RLS policy subqueries: an UNQUALIFIED outer column (e.g. `id`) resolves to the INNER
  table if that table has a same-named column → silent wrong policy. Always qualify the
  outer table (`leagues.id`). Bit migration 13 AND task_02.
- Integration tests skip unless `SUPABASE_SERVICE_ROLE_KEY` is set (`describe.skipIf`).
- Auto-enroll removed: tests asserting a new user lands in the test league now fail.
  task_02 already fixed `database.test.ts` + `league-context.test.ts`. task_08 owns the
  broader factory/fixture ripple. Pre-existing failures unrelated to this feature live in
  route/layout HTTP tests needing a running dev server (:3000).
- `public.users` has NO ON DELETE CASCADE from `auth.users`, so `deleteTestUser()` leaves an
  orphan `public.users` row. Tests using FIXED emails must pre-clean + delete `public.users`
  rows explicitly; random-email tests are unaffected.
- Baseline: repo-wide `npm test` currently has ~50 PRE-EXISTING failures (component .tsx tests
  + sync-matches-api), unrelated to this feature. Verify changes per-file, not by full-suite green.
- Integration testing a Next.js route handler WITHOUT a dev server: `vi.mock('@/lib/supabase/client')`
  and resolve `getSupabaseServerClient` to `authedClient(token)` per case — exercises the API guard
  AND real RLS. Cleaner than `BASE_URL` fetch (which needs `:3000`).
- Same trick for an async SERVER-COMPONENT PAGE (e.g. `app/ligas/page.tsx`, reusable for task_07
  dashboard): `@vitest-environment jsdom`, render the page fn's returned JSX, `vi.mock` supabase
  client → `authedClient(token)`, `vi.mock('next/navigation')`, and STUB leaf client components
  (jsdom has no App Router ctx). Real RLS + real `canCreateLeague`/`getLeaguesHub` + page wiring.
- PARALLEL-FILE COLLISION: vitest runs test FILES in parallel. Two integration files using the SAME
  fixed e-mail (e.g. the operator e-mail) clobber each other (createUser "already registered" +
  grant lost). New suites must use RANDOM e-mails and grant the flag by user id
  (`update(...).eq('id', id)`), not by the fixed operator e-mail.

## Open Risks
- The two enforcement points (RLS `leagues_insert` in task_02 + API 403 in task_04) must stay
  aligned on the same `can_create_league` column.

## Handoffs
- task_06 (auth/me flag) can read `can_create_league`.
- task_07 (dashboard no-league redirect) and task_08 (factories explicit membership) can rely
  on the no-auto-enroll trigger now being live. task_04 API 403 must align with the live RLS
  `leagues_insert` gate (same `can_create_league` column).
- task_08 FOLLOW-UP RESOLVED: `tests/integration/leagues.test.ts` beforeAll now grants `user1`
  `can_create_league=true` (by id; random e-mail) so its POST /api/leagues cases stay 201 under
  task_04's gate. :3000 suite so the POST 201 path is unverifiable without a dev server, but
  beforeAll runs clean and adds no new failures. NOTE one pre-existing non-:3000 flake remains in
  that file: a timestamp-format assertion (`…994Z` vs `…994+00:00`), unrelated to this feature.
