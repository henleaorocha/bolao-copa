---
status: completed
title: Wire modal into /ligas page and update existing tests
type: frontend
complexity: low
dependencies:
  - task_02
---

# Task 3: Wire modal into /ligas page and update existing tests

## Overview

This task connects the completed `CreateLeagueModal` component into the `/ligas` server page by replacing the current static card JSX. It also updates the existing `tests/unit/ligas-page.test.tsx` to accommodate the card being rendered by the new client component instead of inline server JSX.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace the static `<div data-testid="create-league-card" ...>` block (lines 100–110 of `app/ligas/page.tsx`) with a single `<CreateLeagueModal />` element.
- MUST add the import for `CreateLeagueModal` at the top of `app/ligas/page.tsx`.
- MUST NOT modify any server-side data fetching, layout, or other component rendering in the page.
- MUST update `tests/unit/ligas-page.test.tsx` so all tests pass after the card moves to the client component.
- MUST NOT remove the `data-testid="create-league-card"` assertion from the page tests — the client component preserves this attribute (see task_02).
</requirements>

## Subtasks

- [x] 3.1 Import `CreateLeagueModal` in `app/ligas/page.tsx` (add import statement at the top of the file).
- [x] 3.2 Replace the static 10-line card block (lines 100–110) with `<CreateLeagueModal />`.
- [x] 3.3 Review `tests/unit/ligas-page.test.tsx` for any assertions that reference the static card's internal DOM structure (e.g., the `onclick = null` check on line 182) and update them to match the new client component rendering.
- [x] 3.4 Verify all existing page tests pass without modification where possible; update only the tests that directly test the replaced static card markup.

## Implementation Details

See TechSpec "Impact Analysis" table — the `app/ligas/page.tsx` change is described as "Low risk — surgical 10-line swap."

The block to replace in `app/ligas/page.tsx` is:

```tsx
{/* "Criar nova liga" — visual-only dashed card, no click handler this phase */}
<div
  data-testid="create-league-card"
  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0097A9]/40 bg-white/80 p-8 text-center"
>
  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0097A9] text-2xl font-bold text-white">
    +
  </div>
  <p className="font-bold text-gray-800">Criar nova liga</p>
  <p className="mt-1 text-sm text-gray-500">Convide amigos de fora também</p>
</div>
```

Replace it entirely with: `<CreateLeagueModal />`

### Relevant Files

- `app/ligas/page.tsx` — server page to modify; static card block is at lines 100–110.
- `tests/unit/ligas-page.test.tsx` — existing unit tests; line 182 checks `onclick = null` on the static card (may need removal or adjustment).

### Dependent Files

- None — this is the final wiring step; no downstream tasks depend on it.

### Related ADRs

- [ADR-002: Self-Contained Client Component for Modal Trigger and State](../adrs/adr-002.md) — This task is the direct application of that boundary decision to the server page.

## Deliverables

- Modified `app/ligas/page.tsx` with `<CreateLeagueModal />` replacing the static card block.
- Updated `tests/unit/ligas-page.test.tsx` with passing tests for the new card rendering.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `app/ligas/page.tsx` renders `<CreateLeagueModal />` in the league card grid area.
  - [x] The `data-testid="create-league-card"` element is still present in the page DOM (rendered by the client component).
  - [x] No test references the old static card's internal HTML (`+` text, static `<div>` with no handler) after this change.
  - [x] All previously passing tests in `ligas-page.test.tsx` (redirect guard, greeting, league grid, countdown banner) continue to pass without modification.
- Integration tests:
  - [x] Page renders without errors when `leagues` array is empty.
  - [x] Page renders without errors when `leagues` has multiple items.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `/ligas` page renders correctly with `<CreateLeagueModal />` in the grid.
- No regressions in the other sections of the page (header, league cards, countdown banner).
- `data-testid="create-league-card"` remains queryable in the rendered page.
