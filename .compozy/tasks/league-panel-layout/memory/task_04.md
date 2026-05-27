# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Implement three static panel components (`ScoringSchemeCard`, `UpcomingGamesStub`, `BottomTabBar`) in `app/ligas/[id]/components/`. All three are `'use client'`, prop-free, and require no runtime data. Also write unit + integration tests.

## Important Decisions

- `BottomTabBar` uses `flex lg:hidden` on the containing `<nav>` (NOT `hidden lg:flex`) per task spec REQ 5.
- `aria-disabled={tab.active ? undefined : 'true'}` — undefined on PAINEL means no attribute at all, satisfying "does not have aria-disabled='true'".
- `role="tab"` + `role="tablist"` for accessibility; `aria-selected` on all tabs for completeness.
- `ScoringSchemeCard` 3 multiplier rows: Oitavas 2x, Quartas 2.5x, Semi e Final 3x/4x (PRD lists Oitavas/Quartas/Semi/Final in footer, task spec calls for 3 multiplier rows).
- Skeleton rows implemented as 3 explicit `<div className="animate-pulse bg-gray-200 rounded h-10" />` elements (not mapped from array) so the test `.querySelectorAll('.animate-pulse')` reliably finds exactly 3.

## Learnings

- `@vitest-environment jsdom` on each test file override works; no config change needed.
- Integration tests for static components work as jsdom renders (no live server required); placed in `tests/integration/` with `@vitest-environment jsdom`.
- 6 pre-existing test failures (PreCopaBetModal, get-leagues-hub, league-detail) — unchanged, not regressions.
- The `app/ligas/[id]/components/` directory did not exist before this task; created implicitly by writing the first file.

## Files / Surfaces

- Created: `app/ligas/[id]/components/ScoringSchemeCard.tsx`
- Created: `app/ligas/[id]/components/UpcomingGamesStub.tsx`
- Created: `app/ligas/[id]/components/BottomTabBar.tsx`
- Created: `tests/unit/static-panel-components.test.tsx` (11 unit tests)
- Created: `tests/integration/static-panel-components.test.tsx` (3 integration smoke tests)

## Errors / Corrections

None. All 14 tests passed on first run.

## Ready for Next Run

task_04 is COMPLETE. The `app/ligas/[id]/components/` directory now exists with all three static components. Tasks 05–09 can import from this directory.
