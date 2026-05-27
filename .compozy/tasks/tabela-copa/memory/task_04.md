# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `app/ligas/[id]/tabela/page.tsx` — async React Server Component (Next.js 15 async params pattern) with server-side membership guard, group-matches query, `computeStandings()` call, and `StandingsGrid` render. Write `tests/integration/tabela-page.test.tsx` with 8 passing integration tests.

## Important Decisions

- Used `redirect('/ligas')` for unauthenticated, league-not-found, and non-member cases (mirrors route.ts pattern).
- In tests, mocked `next/navigation` `redirect` to throw `Error('NEXT_REDIRECT')` so guard tests can assert the throw + call target without the component continuing with null user.
- Used `makeChainableQuery` thenable builder pattern (same as `tests/unit/league-matches-api.test.ts`) for the matches query; separate chained objects for leagues + league_members (`.single()` path).

## Learnings

- `params: Promise<{ id: string }>` is the correct Next.js 15 page signature — `await params` before using `id`.
- `redirect()` from `next/navigation` is typed `never`, so TypeScript correctly narrows `user` to non-null after the auth guard block — no explicit `return` needed after `redirect()` calls.
- GP/GC use `hidden sm:inline-block`; SG has no `hidden` class. Tests can assert class names directly in jsdom (no CSS rendering needed).

## Files / Surfaces

- Created: `app/ligas/[id]/tabela/page.tsx`
- Created: `tests/integration/tabela-page.test.tsx` (8 tests, all passing)
- Not changed: `StandingsGrid`, `GroupCard`, `StandingsRow`, `lib/standings.ts`, `lib/supabase/client.ts`

## Errors / Corrections

None — tests passed on first run.

## Ready for Next Run

Task 04 is complete. Task 05 (`PainelSidebar`/`BottomTabBar` nav activation) can proceed — the `/ligas/[id]/tabela` route now exists.
