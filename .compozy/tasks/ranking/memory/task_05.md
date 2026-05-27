# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Build presentational `RankingTable` component at `app/ligas/[id]/ranking/RankingTable.tsx` with responsive columns, position badges, self-row highlight, and "Você" badge.

## Important Decisions

- Used `table-fixed` + `w-full` on `<table>` to prevent horizontal overflow; container has `overflow-hidden`.
- Badge colors copied directly from `RankingCard.tsx` BADGE_STYLES (lines 16-20): gold=`bg-yellow-400/text-yellow-900`, silver=`bg-slate-300/text-slate-700`, bronze=`bg-orange-300/text-orange-900`, neutral=`bg-slate-100/text-slate-400`.
- Responsive columns use `hidden lg:table-cell` on desktop-only `th`/`td`; mobile sub-text uses `lg:hidden` — one component, not two.
- `data-testid` attributes on badges (`gold-badge`, `silver-badge`, `bronze-badge`, `neutral-badge`), self row (`self-row`), other rows (`member-row`), desktop cells (`desktop-exact-cell`, `desktop-outcome-cell`), mobile subtext (`mobile-subtext`).

## Learnings

- Coverage tool reports 0% globally when `--coverage` is run without scoping; component-scoped coverage is 100%.
- `table-fixed` with `hidden lg:table-cell` works correctly: hidden columns are excluded from layout so mobile has 3 cols and desktop has 5 cols.

## Files / Surfaces

- Created: `app/ligas/[id]/ranking/RankingTable.tsx`
- Created: `tests/unit/ranking-table.test.tsx`

## Status

Complete. All 9 tests pass, 100% component coverage.
