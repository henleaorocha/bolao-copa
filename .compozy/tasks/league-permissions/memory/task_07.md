# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. `app/dashboard/page.tsx`: replaced the no-active-league `throw new Error('Usuário não
tem nenhuma liga')` (was ~L26-28) with `redirect('/ligas')` (ADR-005). `/login` redirect and
the active-league render path are untouched. `redirect` was already imported from
`next/navigation`; App Router `redirect(path)` confirmed in
`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`.

## Important Decisions
- Reused `redirect` from `next/navigation` (already imported, used for `/login`) — no new dep.
- No `return` after `redirect` needed: `redirect()` throws to halt rendering (Next.js contract).

## Learnings
- `tests/integration/dashboard.test.ts` is the OLD HTTP (`:3000`) suite (active_league_id
  fallbacks). My new no-league redirect test is an in-process render test, NOT HTTP.
- vi.mock factories can only reference vars created via `vi.hoisted` (hoisting). The integration
  file's `mockRedirect` had to move to `vi.hoisted` (unit file already used hoisted mocks).
- Dashboard unit-mock needs a `from(table)` builder whose `.eq()` returns `this` (queries chain
  1 OR 2 `.eq()` calls) and `.single()` resolves per-table for the 3-query `Promise.all`.

## Files / Surfaces
- `app/dashboard/page.tsx` — throw → `redirect('/ligas')`.
- `tests/unit/dashboard-page.test.tsx` (new) — 4 cases: /login, no-league→/ligas (no throw),
  render-with-league, no resolveActiveLeague when unauth.
- `tests/integration/dashboard-no-league-redirect.test.tsx` (new) — fresh league-less user
  (real RLS, authedClient) → redirect('/ligas'); `@vitest-environment jsdom`.

## Errors / Corrections
- First integration run failed: `Cannot access 'mockRedirect' before initialization` →
  wrapped it in `vi.hoisted`. Re-ran: pass.

## Ready for Next Run
Verified: tsc clean, eslint exit 0, 5/5 tests pass, `app/dashboard/page.tsx` 82.35% stmts/lines
(uncovered 52-58 = pre-existing query-error branch, out of scope). Diff uncommitted
(auto-commit disabled).
