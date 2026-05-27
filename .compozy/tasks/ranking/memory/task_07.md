# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Activate Ranking nav slots in `BottomTabBar` and `PainelSidebar`, and activate the "Ver tudo →" link in `RankingCard`. All subtasks complete.

## Important Decisions

- **`RankingCard` needs `leagueId` prop**: the "Ver tudo" link requires the league id to build its href. Added `leagueId: string` to `RankingCardProps` and updated the one caller in `page.tsx`. Also updated all callers in test files.
- **`tabela-nav.test.tsx` had two stale disabled-nav assertions**: the Mata-mata disabled test was already pre-existing (enabled by a prior task); the RANKING disabled test was new (my change broke it). Both were updated to assert enabled links instead.

## Learnings

- The full suite pre-existing failure count improved from 13 → 12 failing files after this task. The `tabela-nav.test.tsx` was already failing (Mata-mata test) before task_07, so fixing both tests in that file resolved the file-level failure.
- The simple `next/link` mock in `navigation-shell.test.tsx` does NOT forward `role` or `aria-selected`, so RANKING (now a Link) is only accessible there by `role="link"`, not `role="tab"`. The richer mock in `static-panel-components.test.tsx` and `tabela-nav.test.tsx` does forward those props.

## Files / Surfaces

- `app/ligas/[id]/components/BottomTabBar.tsx` — `href: null` → `/ligas/${leagueId}/ranking` for RANKING tab.
- `app/ligas/[id]/components/PainelSidebar.tsx` — `href: null` → `/ligas/${leagueId}/ranking` for Ranking nav item.
- `app/ligas/[id]/components/RankingCard.tsx` — added `leagueId` prop and `Link` import; replaced disabled `<a>` with active `<Link>`.
- `app/ligas/[id]/page.tsx` — passes `leagueId={leagueId}` to `<RankingCard>`.
- `tests/unit/RankingCard.test.tsx` — added `vi.mock('next/link')`, passes `leagueId` everywhere, flipped disabled assertion.
- `tests/integration/data-driven-components.test.tsx` — added `vi.mock('next/link')`, passes `leagueId` to `RankingCard`.
- `tests/unit/navigation-shell.test.tsx` — replaced "inert nav items have pointer-events-none" and "Ranking tab is disabled" with enabled-link assertions.
- `tests/unit/static-panel-components.test.tsx` — replaced "only Ranking tab is disabled" with "Ranking tab is enabled with href to ranking route".
- `tests/integration/tabela-nav.test.tsx` — replaced both stale disabled-nav assertions (Mata-mata + RANKING) with enabled-link assertions.

## Errors / Corrections

- Discovered `tabela-nav.test.tsx` had a second RANKING disabled assertion that would have been missed by running only the 4 target test files. The full suite run caught it.

## Ready for Next Run

Task complete. All 5 target test files pass (69/69 tests). Full suite: 12 failed / 55 passed (all failures pre-existing, unrelated). tsc clean.
