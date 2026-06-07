# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. `app/ligas/page.tsx` now gates the create entry point on `canCreateLeague()` and adds a
no-league empty state (ADR-001 hide-not-disable; ADR-005 invite-link guidance).

## Important Decisions
- Two ORTHOGONAL conditions in the page:
  - `canCreate` (= `canCreateLeague(supabase, user.id)`) gates `<CreateLeagueModal/>` — hidden
    entirely (no disabled/hinted fallback) when false.
  - `showEmptyState = leagues.length === 0 && !canCreate` — empty state is ONLY for league-less
    users who CANNOT create. A capable user with zero leagues keeps the hub layout (their create
    card), per the "preserve … and/or the capability" requirement. This resolves the tension
    between "show empty state when list is empty" and "preserve layout for capable users".
- Grid wrapper renders when `hasLeagues || canCreate`; avoids an empty grid div for the
  league-less non-capable user (who only sees the empty state).
- Empty-state test hook: `data-testid="no-league-empty-state"`; copy mentions "link de convite".

## Learnings
- Integration test for the page WITHOUT a dev server: `@vitest-environment jsdom` + render the
  async Server Component directly. `vi.mock('@/lib/supabase/client')` → `authedClient(token)`
  (anon+RLS, real DB), `vi.mock('next/navigation')`, and STUB leaf client components
  (CreateLeagueModal/LeagueCard/LogoutButton) since jsdom has no App Router context. This
  exercises real RLS + real `canCreateLeague` + real `getLeaguesHub` + page composition.
- `canCreateLeague` works through the user's own authed (RLS) client — users can read their own
  `users.can_create_league` row.
- Existing unit test "Criar nova liga card is always rendered regardless of league count" was the
  pre-change signal; it was obsolete and got replaced by capability-gated tests.

## Files / Surfaces
- `app/ligas/page.tsx` — added `canCreateLeague` import; added it to the `Promise.all`; gate the
  modal; empty-state branch.
- `tests/unit/ligas-page.test.tsx` — added `canCreateLeague` mock (default false); replaced the
  two "always rendered" tests with capability + empty-state cases (20 tests).
- `tests/integration/ligas-page-permission-gate.test.tsx` — NEW; 3 scenarios (default/operator/
  league-less) against local Supabase.

## Errors / Corrections
- Unused `deleteTestLeague` import in the integration test → removed (cleanup uses admin delete).

## Ready for Next Run
- Coverage on `app/ligas/page.tsx`: 100% stmts/lines/funcs, 94.44% branches. 23/23 tests pass.
- Diff uncommitted (auto-commit disabled).
