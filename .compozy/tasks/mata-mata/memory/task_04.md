# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Enable Mata-mata navigation: activate PainelSidebar item + reorder BottomTabBar (Perfil → Mata-mata, new order: Mata-mata · Tabela · Painel · Palpites · Ranking).

## Important Decisions

- Fixed pre-existing broken test `'inert nav items have pointer-events-none'` in navigation-shell.test.tsx: was querying `getByText('Tabela').closest('[role="button"]')` but Tabela has always had href (enabled), so closest returned null. Changed to `getByText('Ranking')` which IS disabled.
- Fixed pre-existing broken test `'unimplemented tabs (Tabela, Ranking, Perfil) have aria-disabled="true"'` in static-panel-components.test.tsx: expected 3 disabled but Tabela was already enabled since d704411. After removing Perfil, updated to assert only Ranking (1 disabled tab).
- BottomTabBar tests in navigation-shell.test.tsx use `getByRole('link', ...)` for link-based tabs (MATA-MATA, TABELA, PAINEL, PALPITES) because the Link mock in that file does NOT pass through role/aria-selected. Uses `nav.children` array for order assertions.
- static-panel-components.test.tsx has a proper Link mock that passes role/aria-selected; getAllByRole('tab') returns all 5 tabs there.

## Learnings

- Two test files test BottomTabBar with DIFFERENT Link mocks: static-panel-components.test.tsx passes role/aria-selected through; navigation-shell.test.tsx does not. Must query accordingly.
- Zap icon already imported in PainelSidebar.tsx (no import change needed there).

## Files / Surfaces

- `app/ligas/[id]/components/PainelSidebar.tsx` — changed `href: null` to real href for Mata-mata
- `app/ligas/[id]/components/BottomTabBar.tsx` — replaced User import with Zap, replaced PERFIL tab with MATA-MATA, reordered to Mata-mata · Tabela · Painel · Palpites · Ranking
- `tests/unit/navigation-shell.test.tsx` — added BottomTabBar import + 3 PainelSidebar tests + 8 BottomTabBar tests; fixed pre-existing 'inert nav items' test
- `tests/unit/static-panel-components.test.tsx` — updated 'unimplemented tabs' test name + count

## Errors / Corrections

None during implementation.

## Ready for Next Run

task_05 (predictions guard) and task_06 (unlock indicator) can now proceed. task_06 depends on task_04 (this task) — nav surfaces are ready for the unlock dot.
