# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Activate "Tabela" nav in `PainelSidebar.tsx` and `BottomTabBar.tsx` by flipping `href: null` → `` `/ligas/${leagueId}/tabela` ``. Write tests for enabled link and active state.

## Important Decisions

- Used `getByRole('tab', ...)` for BottomTabBar assertions (not `getByRole('link')`). The `Link` mock propagates `role="tab"` from the component, so the rendered `<a>` has `role="tab"`, not the implicit link role.

## Learnings

- BottomTabBar passes `role="tab"` explicitly to each `Link`; the mock must forward it, and test queries must use `getByRole('tab', ...)`.
- The `aria-selected` prop on the mock `<a>` requires type `boolean` (not `string | boolean`) to satisfy TypeScript's `AnchorHTMLAttributes`.

## Files / Surfaces

- `app/ligas/[id]/components/PainelSidebar.tsx` line 31 — "Tabela" href flipped.
- `app/ligas/[id]/components/BottomTabBar.tsx` line 17 — "TABELA" href flipped.
- `tests/integration/tabela-nav.test.tsx` — new, 10 tests all passing.

## Errors / Corrections

- First test run: `getByRole('link', { name: /tabela/i })` failed for BottomTabBar because the element has `role="tab"`. Fixed by switching to `getByRole('tab', ...)`.
- TSC error on `aria-selected` type: changed from `boolean | string` to `boolean` in mock interface.

## Ready for Next Run

Task 05 complete. Task 06 is next (pg_cron migration).
