# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- task_01 complete: migration 20260525000018 applied to remote DB.
- task_02 complete: 5 interfaces added to `lib/api/types.ts`; 20 unit tests pass; `tsc --noEmit` clean.
- task_03 complete: `lib/football-api.ts` created; 5 unit tests pass; 100% coverage; `tsc --noEmit` clean.
- task_04 complete: `app/api/admin/sync-matches/route.ts` created; 10 unit + 3 integration tests pass; 93.1% line coverage; `tsc --noEmit` clean.
- task_05 complete: `app/api/leagues/[id]/matches/route.ts` created; 12 unit + 3 integration tests pass; 90.9% stmt coverage; `tsc --noEmit` clean.
- task_06 complete: `app/api/leagues/[id]/matches/[matchId]/route.ts` created; 12 unit + 5 integration tests pass; 92.68% stmt coverage; `tsc --noEmit` clean.
- task_07 complete: `app/api/leagues/[id]/predictions/[matchId]/route.ts` created; 15 unit + 3 integration tests pass; 89.18% stmt coverage; `tsc --noEmit` clean.
- task_08 complete: `UpcomingMatchesCard.tsx` created; `UpcomingGamesStub.tsx` deleted; `page.tsx` wired; 12 unit tests pass; `tsc --noEmit` clean.
- task_09 complete: `app/ligas/[id]/palpites/page.tsx` + `PalpitesFilters` + `MatchRow` created; 24 unit + 6 integration tests pass; 91.66% stmt coverage; `tsc --noEmit` clean.
- task_10 complete: `app/ligas/[id]/palpites/[matchId]/page.tsx` + BetHero/ScoringCard/DistributionCard/UnsavedModal in `components/` subfolder; 20 tests pass (16 unit + 4 integration); 89.88% stmt coverage; `tsc --noEmit` clean.

## Shared Decisions

- `pg_catalog.pg_indexes` is not accessible via the Supabase JS client (PostgREST only exposes `public` schema per `supabase/config.toml`). Do not write integration tests that query `pg_indexes` via the Supabase JS client — use functional tests instead.
- For admin/service-role DB writes in Route Handlers, use `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` directly — not `getSupabaseServerClient()`, which uses the anon key via cookies.

## Shared Learnings

- `vi.mock('next/link')` mock must spread `...rest` props into the `<a>` element to forward `data-testid` attributes used by test selectors. Without `...rest`, `getByTestId()` fails on Link children.

- Integration tests require `export $(grep -v '^#' .env.local | xargs)` before `npx vitest run` to load `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase db push` (without `--local`) pushes to the remote project. Use `supabase db push --local` to target the local instance only.
- 119 pre-existing test failures exist in the suite as of task_01 execution; they are unrelated to the match-bets PRD.
- When verifying coverage for a single task file, use `--coverage.include="<file>"` to scope vitest coverage; the global 80% threshold fails when only one file is tested against the full `lib/**` + `app/api/**` scope.
- `revalidateTag` in this Next.js version requires 2 args: `revalidateTag(tag, profile)`. Use `{ expire: 0 }` for immediate invalidation in Route Handlers; single-arg form causes `TS2554`.
- Integration tests for endpoints that call external APIs: import the route handler directly and mock only the external API module (not Supabase). This tests real DB behavior without external API quota usage.

## Open Risks

- `supabase db push` was run against the remote database during task_01. Future tasks with migrations should be aware the schema is already extended.

## Handoffs

- Integration test pattern for auth-protected endpoints: mock `getSupabaseServerClient` to return a hybrid client — `auth.getUser()` mocked for identity, `from()` delegated to real service-role adminClient. Avoids cookie complexity while testing real DB behavior.
- task_10 (Bet detail screen): needs `GET /api/leagues/[id]/matches/[matchId]` + `PUT /api/leagues/[id]/predictions/[matchId]`. "Detalhes →" links on Palpites page route to `/ligas/[id]/palpites/[matchId]`.
- task_10 (Bet detail screen): needs `GET /api/leagues/[id]/matches/[matchId]` + `PUT /api/leagues/[id]/predictions/[matchId]`.
