---
status: completed
title: Data-driven components (`StatsRow`, `PrizesStrip`, `RankingCard`)
type: frontend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 8: Data-driven components (`StatsRow`, `PrizesStrip`, `RankingCard`)

## Overview

Three Painel sections consume the new API fields introduced in task_03. `StatsRow` renders the user's four stats (position, points, guesses, exact scores) in a 4-column desktop row or 2×2 mobile grid. `PrizesStrip` displays the league's prize text from `prizes`. `RankingCard` renders the top-5 members from `ranking` with position badges and highlights the current user's row. All three handle zero/null values correctly since stats are stub zeros in the pre-Copa state.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `StatsRow` MUST render four stat cards: "Sua Posição", "Pontos", "Palpites" (as `{guesses_made}/{guesses_total}`), and "Acertos Exatos".
2. `StatsRow` MUST use a 4-column grid on desktop (`lg:grid-cols-4`) and 2×2 on mobile (`grid-cols-2`).
3. `StatsRow` MUST display `0` for all stats when `user_stats` has all-zero values (pre-Copa state) without visual errors.
4. `PrizesStrip` MUST not render when `prizes` is `null` or an empty string.
5. `PrizesStrip` MUST display the prizes text inline (no expand/modal/accordion).
6. `RankingCard` MUST render each `RankingEntry` with: position badge (gold for 1st, silver for 2nd, bronze for 3rd, plain for 4th/5th), avatar (initials + `avatar_color`), full name, and points.
7. `RankingCard` MUST highlight the row where `entry.user_id === currentUserId`.
8. `RankingCard` MUST render a "Ver tudo →" link element that is `aria-disabled="true"` and non-functional in this phase.
</requirements>

## Subtasks

- [x] 8.1 Create `StatsRow.tsx` with four stat cards, responsive grid layout, and zero-value handling.
- [x] 8.2 Create `PrizesStrip.tsx` with conditional rendering (hidden when `prizes` is null/empty) and inline prizes text.
- [x] 8.3 Create `RankingCard.tsx` with position badges, avatar initials, current-user row highlight, and inert "Ver tudo" link.
- [x] 8.4 Write unit tests for all three components covering zero states, null data, and current-user highlighting.

## Implementation Details

See TechSpec "Core Interfaces" for the `UserStats` and `RankingEntry` type shapes, and PRD "Core Features — 7, 6, 10" for visual requirements.

Avatar initials follow the same pattern as the existing `InitialAvatar` used in the current `page.tsx` (first letter of `full_name`, uppercase, background `avatar_color`). Reuse or reference that pattern rather than inventing a new one.

Props:
- `StatsRow`: `{ user_stats: UserStats }`
- `PrizesStrip`: `{ prizes: string | null }`
- `RankingCard`: `{ ranking: RankingEntry[], currentUserId: string }`

### Relevant Files

- `lib/api/types.ts` — `UserStats`, `RankingEntry` (added in task_02)
- `app/ligas/[id]/page.tsx` — existing page references `InitialAvatar` pattern for avatar rendering (reference only, not imported directly)

### Dependent Files

- `app/ligas/[id]/page.tsx` — task_09 imports all three components and passes `user_stats`, `prizes`, and `ranking` as props

### Related ADRs

- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Defines why all-zero `user_stats` is the expected pre-Copa state; components must not treat zero as an error

## Deliverables

- `app/ligas/[id]/components/StatsRow.tsx`
- `app/ligas/[id]/components/PrizesStrip.tsx`
- `app/ligas/[id]/components/RankingCard.tsx`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for data rendering **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] `StatsRow` with all-zero `user_stats` renders four cards without throwing.
  - [x] `StatsRow` "Palpites" card displays "5/10" when `guesses_made=5` and `guesses_total=10`.
  - [x] `PrizesStrip` renders nothing when `prizes=null`.
  - [x] `PrizesStrip` renders nothing when `prizes=''`.
  - [x] `PrizesStrip` renders the text "R$ 500 pro 1º" when `prizes='R$ 500 pro 1º'`.
  - [x] `RankingCard` with a 5-entry `ranking` renders 5 rows.
  - [x] `RankingCard` row where `user_id` matches `currentUserId` has a highlight CSS class distinct from other rows.
  - [x] `RankingCard` first-place row contains the gold badge element (test by aria-label or data-testid).
  - [x] `RankingCard` "Ver tudo" link has `aria-disabled="true"`.
- Integration tests:
  - [x] Page renders correctly when `prizes=null` (PrizesStrip absent from DOM).
  - [x] Page renders correctly when `ranking` has only 2 entries (fewer than 5 members in league).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `PrizesStrip` absent from DOM when `prizes` is null or empty
- `RankingCard` current-user row visually distinct
- `StatsRow` renders cleanly with all-zero values
