# Task Memory: task_03.md

## Objective Snapshot

Implement `StandingsRow`, `GroupCard`, and `StandingsGrid` as Server Components under
`app/ligas/[id]/components/`. Write unit and integration tests. All done.

## Important Decisions

- **Mobile column hiding:** V/E/D are hidden on mobile alongside GP/GC (matching PRD mobile
  flow "Pos · Seleção · Pts · J · SG"). Only GP/GC hiding is tested explicitly per spec, but
  hiding V/E/D prevents overflow and is consistent with the PRD.
- **Server-safe flag:** `flag !== null` → `<Image>` without `onError`; `flag === null` →
  grey `<div data-testid="flag-placeholder">`. No `useState`. Acceptable per spec.
- **Qualification highlight:** teal left border (`border-[#0097A9]`) + subtle bg tint
  (`bg-[#0097A9]/5`) for positions 1–2. `border-transparent` for 3–4. `data-qualifying`
  attribute enables test assertions.
- **StandingsGrid sorting:** sorts standings A→L internally via `.localeCompare()` to
  guarantee order regardless of prop input order.
- **Export style:** `StandingsRow` and `GroupCard` are named exports; `StandingsGrid` is the
  default export (consistent with GroupChips).

## Learnings

- `data-*` attributes with boolean values render as "true"/"false" strings in jsdom — works
  for `toHaveAttribute('data-qualifying', 'true')` assertions.
- `hidden sm:inline-block` class name contains the string `hidden` — direct `className`
  substring assertion works in jsdom without CSS processing.
- `querySelectorAll('[data-testid^="group-card-"]')` returns elements in DOM order, which
  reflects render order in the grid — reliable for A→L ordering assertions.

## Files / Surfaces

- `app/ligas/[id]/components/StandingsRow.tsx` — created (named export)
- `app/ligas/[id]/components/GroupCard.tsx` — created (named export)
- `app/ligas/[id]/components/StandingsGrid.tsx` — created (default export)
- `tests/unit/StandingsRow.test.tsx` — created (11 tests, all pass)
- `tests/unit/GroupCard.test.tsx` — created (8 tests, all pass)
- `tests/integration/StandingsGrid.test.tsx` — created (6 tests, all pass)

## Errors / Corrections

None.

## Ready for Next Run

Task 04 can import `StandingsGrid` as:
```ts
import StandingsGrid from '@/app/ligas/[id]/components/StandingsGrid'
```
Pass `standings: GroupStanding[]` from `computeStandings(matches)`. The grid handles
sorting and GroupChips internally.
