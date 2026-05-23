# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Rewrote `app/ligas/page.tsx` from a Client Component (two tabs, useEffect fetching) to an async Server Component with force-dynamic. Status: **completed**.

## Important Decisions

- Deleted `tests/integration/ligas.test.tsx` — it tested the old Client Component (tabs, modals, LeagueProvider); all those behaviors are gone. Replaced by `tests/unit/ligas-page.test.tsx` and `tests/integration/ligas-page.test.tsx`.
- Used `vi.hoisted()` for mock variables so they are accessible inside `vi.mock()` factory functions (Vitest hoists `vi.mock()` calls before variable declarations).
- `redirect()` mock is configured to throw `NEXT_REDIRECT` in all tests — matches real Next.js behavior and prevents the page from continuing to execute when user is null.
- Mocked `LeagueCard` and `LogoutButton` in unit tests to avoid Client Component hook dependencies (`useRouter`, `useState`).
- `CountdownBanner` is inline in the page file (not extracted to `components/`) — task did not require extraction and the inline placement keeps the test surface simple.

## Learnings

- `vi.hoisted(() => vi.fn())` is the correct pattern when a mock variable must be referenced inside a `vi.mock()` factory in Vitest — plain `const mockFn = vi.fn()` before `vi.mock()` is NOT hoisted and will be undefined at factory call time.
- Async Server Components can be tested in Vitest + jsdom by awaiting the function call (`const ui = await LigasPage()`) and then rendering the returned JSX with RTL.
- `export const dynamic` is a module-level export — it can be verified in tests by importing the module and checking `mod.dynamic`.

## Files / Surfaces

- `app/ligas/page.tsx` — fully rewritten (async Server Component)
- `tests/unit/ligas-page.test.tsx` — new (14 unit tests, all passing)
- `tests/integration/ligas-page.test.tsx` — new (7 integration tests, skip without SUPABASE_SERVICE_ROLE_KEY)
- `tests/integration/ligas.test.tsx` — deleted (tested old Client Component)

## Errors / Corrections

None — TypeScript clean, all 164 unit tests pass, ESLint clean.

## Ready for Next Run

Task 06 is complete. Task 07 (Auth Callback Redirect Update) is next — change fallback from `/dashboard` to `/ligas` in `app/auth/callback-redirect/page.tsx`.
