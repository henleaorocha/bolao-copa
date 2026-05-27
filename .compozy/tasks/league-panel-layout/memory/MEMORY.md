# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- task_01 COMPLETE: `leagues.prizes TEXT` nullable column confirmed; migration `20260525000017_add_leagues_prizes.sql` applied. Gate unblocked for task_03 and task_08.
- task_02 COMPLETE: `UserStats`, `RankingEntry` exported from `lib/api/types.ts`; `LeagueDetail` extended with `prizes: string | null`, `user_stats: UserStats`, `ranking: RankingEntry[]`. tsc clean, 27 unit tests pass. Gate unblocked for task_03 and tasks 04–09.
- task_03 COMPLETE: `GET /api/leagues/[id]` returns `prizes` (from DB SELECT), `user_stats` (stub zeros), `ranking` (top-5 by joined_at, points: 0). 41 unit tests pass, tsc clean. Gate unblocked for task_08 (data-driven components).
- task_04 COMPLETE: `app/ligas/[id]/components/` created. `ScoringSchemeCard.tsx`, `UpcomingGamesStub.tsx`, `BottomTabBar.tsx` implemented. 14 tests pass (11 unit + 3 integration smoke), tsc clean. Gate unblocked for task_09.
- task_05 COMPLETE: `ChampionBanner.tsx` implemented in `app/ligas/[id]/components/`. 12 tests pass (9 unit + 3 integration), tsc clean. Gate unblocked for task_09.
- task_06 COMPLETE: `YourBetCard.tsx` implemented in `app/ligas/[id]/components/`. 12 tests pass (10 unit + 2 integration), tsc clean. Gate unblocked for task_09.
- task_07 COMPLETE: `InviteShareButton.tsx`, `PainelSidebar.tsx`, `PainelTopBar.tsx` implemented. 20 tests pass (16 unit + 4 integration), tsc clean. Gate unblocked for task_09.
- task_08 COMPLETE: `StatsRow.tsx`, `PrizesStrip.tsx`, `RankingCard.tsx` implemented. 26 tests pass (21 unit + 5 integration), tsc clean. Gate unblocked for task_09.
- task_09 COMPLETE: `app/ligas/[id]/page.tsx` orchestrator verified; TS errors in test files fixed; integration test file created. 32 tests pass, tsc clean, branch coverage 90.47%. All PRD tasks done.

## Shared Decisions

- `BottomTabBar` pattern: `flex lg:hidden` on the containing element (NOT `hidden lg:flex`). TechSpec is explicit — the inverted form hides on mobile, not desktop.
- `aria-disabled={tab.active ? undefined : 'true'}` — setting undefined means the attribute is absent; string `'true'` means the attribute is present. This correctly implements "PAINEL does not have aria-disabled, others do."
- Static-component integration tests can be jsdom renders in `tests/integration/` (no live server/DB needed) — use `@vitest-environment jsdom` annotation.
- `BET_DEADLINE` (21:00 UTC Jun 11) ≠ `COPA_START` (00:00 UTC Jun 11). Components that gate on the bet deadline (ChampionBanner, YourBetCard) must use `BET_DEADLINE`, not `getDaysUntilCopa().isUnderway` (which is based on `COPA_START`).
- Deadline-based tests mock time with `vi.spyOn(Date, 'now')` and restore with `vi.restoreAllMocks()` in `afterEach`. This pattern works for any component that computes `deadline.getTime() - Date.now()`.
- `navigator.clipboard` mocking in jsdom: use a stable object defined once (`const mockClipboard = { writeText: vi.fn() }`) in `beforeAll`, then replace only `mockClipboard.writeText` in `beforeEach`. Recreating the clipboard object each `beforeEach` leaves the component pointing to a stale reference.
- `next/link` and `next/image` must be mocked in all jsdom component tests that import them. Standard mock: `vi.mock('next/link', () => ({ default: ({ href, children, className }) => <a href={href} className={className}>{children}</a> }))`.
- `document.execCommand` fallback for clipboard copy is not reliably testable via direct spy in jsdom (operations before `execCommand` such as `ta.select()` may throw silently). Test the observable side-effect (success feedback visible) instead.
- Async `onClick` handlers in component tests: use `fireEvent.click` + `await act(async () => {...})` rather than `userEvent.click` for reliable async event handling.

## Shared Learnings

- `psql` is not available in this environment. Use `npx supabase db query "..."` for all direct DB inspection.
- Supabase PostgREST client does NOT expose `information_schema`; use behavioral SELECT/INSERT tests to verify schema changes.
- Integration tests must use local Supabase env vars, not `.env.local` (which points to remote). Set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the keys from `npx supabase status --output json`.
- The full test suite has ~90 pre-existing failures (unrelated to this PRD). Do not treat them as regressions when implementing subsequent tasks.
- `tests/unit/api-responses.test.ts` contains `leagueDetailFixture satisfies LeagueDetail`. Any task that adds required fields to `LeagueDetail` must update this fixture or tsc will fail.

## Open Risks

- `leagues` table has both `prize_pool TEXT` and `prizes TEXT` columns — different fields. Confirmed `prizes` (not `prize_pool`) is correctly selected in the GET handler (task_03 resolved).

## Handoffs

- All 9 tasks COMPLETE. The League Painel PRD is fully implemented.
- `app/ligas/[id]/page.tsx` is the thin orchestrator; all 11 section components are in `app/ligas/[id]/components/`.
- Final test suite: 32 unit+integration tests pass, 2 HTTP-level tests skipped (no service key), tsc clean, coverage Stmts/Lines 100%, Branches 90.47%.
- No auto-commit was created; diff is ready for manual review and commit.
