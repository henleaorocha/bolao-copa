---
status: completed
title: RankingTable full classification component
type: frontend
complexity: low
dependencies:
  - task_01
---

# Task 05: RankingTable full classification component

## Overview
Build the presentational `RankingTable` component that lists every league member in ranked order with responsive columns, position badges, the logged-in user's row highlighted, and a "Você" badge for self-identification. It renders compact (3-column) on mobile and full (5-column) on desktop.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render ALL provided members in ranked order (no truncation).
- MUST show desktop columns: Position badge, Player (avatar + name + "Você" badge for self), Exatos (exact_scores), Acertos (correct_outcomes), Pontos.
- MUST show mobile columns: Position badge, Player (avatar + name + "Você" badge, with exact/outcome counts as sub-text), Pontos — using responsive (`lg:`) classes, not a separate component.
- MUST color the position badge gold for 1st, silver for 2nd, bronze for 3rd, neutral for 4th+.
- MUST highlight the logged-in user's row with a tinted background (`bg-yellow-50`) and render the "Você" badge on that row.
- MUST type its props against `RankingFullEntry` and accept the current user id; stay presentational (no fetching).
- MUST NOT cause horizontal overflow at 375px / 390px (no horizontally scrolling table).
</requirements>

## Subtasks
- [x] 05.1 Create `RankingTable.tsx` rendering the full ordered list with position badges.
- [x] 05.2 Implement responsive columns: hide Exatos/Acertos on mobile, surface counts as player sub-text.
- [x] 05.3 Apply gold/silver/bronze/neutral badge colors by position.
- [x] 05.4 Highlight the self row (`bg-yellow-50`) and render the "Você" badge.
- [x] 05.5 Write component tests for self-highlight, responsive columns, and badge colors.

## Implementation Details
Create `app/ligas/[id]/ranking/RankingTable.tsx` as a presentational client component taking `ranking: RankingFullEntry[]` and the current user id. Reuse the badge color conventions and self-highlight (`bg-yellow-50`) already established in `app/ligas/[id]/components/RankingCard.tsx` (badge styles 16-20, highlight line 55). Use Tailwind `lg:` responsive utilities to toggle the Exatos/Acertos columns vs. mobile sub-text — one component, not two. Colors are inline hex / Tailwind classes (no central palette object). See TechSpec "Component Overview" and PRD "Core Feature 4: Full Classification Table".

### Relevant Files
- `app/ligas/[id]/ranking/RankingTable.tsx` — new component to create.
- `app/ligas/[id]/components/RankingCard.tsx` — badge color + self-highlight conventions (16-20, 55) to reuse.
- `designReferences/screens-extras.jsx` — table column layout reference (200-207).
- `lib/api/types.ts` — `RankingFullEntry` props type (task_01).
- `app/ligas/[id]/layout.tsx` — `overflow-x-hidden` rule (line 65) the table must respect.

### Dependent Files
- `app/ligas/[id]/ranking/page.tsx` — composes `RankingTable` into the screen (task_06).

### Related ADRs
- [ADR-001: Dedicated Ranking Page as a Separate Route](../adrs/adr-001.md) — the design-reference table this component implements.

## Deliverables
- `app/ligas/[id]/ranking/RankingTable.tsx` presentational component.
- Component tests with 80%+ coverage **(REQUIRED)**
- Integration coverage of the table within the full page is delivered in task_06 **(REQUIRED)**

## Tests
- Unit tests (`@testing-library/react`):
  - [x] Renders one row per provided member, in the given order (e.g. 8 members → 8 rows).
  - [x] The row whose `user_id` matches the current user has the `bg-yellow-50` highlight and a "Você" badge; other rows do not.
  - [x] Position badge classes are gold/silver/bronze for positions 1/2/3 and neutral for position 4.
  - [x] Desktop layout exposes Exatos and Acertos values; mobile sub-text carries the exact/outcome counts.
- Integration tests:
  - [ ] Covered through the composed page in task_06.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Every member is listed; self row is highlighted and badged; columns adapt across breakpoints.
- No horizontal overflow at 375px / 390px.
