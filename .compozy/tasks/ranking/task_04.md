---
status: completed
title: Podium top-3 component
type: frontend
complexity: low
dependencies:
  - task_01
---

# Task 04: Podium top-3 component

## Overview
Build the presentational `Podium` component that renders the top-3 ranked members in the design-reference 2nd | 1st | 3rd layout, with gold/silver/bronze treatment and a crown on first place. It gracefully handles leagues with fewer than 3 members and shows the pre-tournament empty state when no member has scored.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render the top 3 entries in visual order 2nd | 1st | 3rd, with 1st tallest, 2nd medium, 3rd shortest, per the design reference.
- MUST apply colors: 1st gold (`#FFC72C`), 2nd silver (`#CBD5E1`), 3rd bronze (`#FB923C`); 1st place displays a crown icon above its avatar.
- MUST show, per entry, the colored avatar with initial, first name, family name, rank number, and total points.
- MUST render only the available positions when the league has 1 or 2 members (no broken/empty podium slots).
- MUST render the empty-state message "A pontuação começa quando os jogos rolarem" instead of the podium when every member has 0 points.
- MUST type its props against `RankingFullEntry` from `lib/api/types.ts` and stay presentational (no data fetching).
- MUST NOT cause horizontal overflow at 375px / 390px widths.
</requirements>

## Subtasks
- [x] 04.1 Create `Podium.tsx` accepting the ordered top entries and rendering the 2nd|1st|3rd column layout.
- [x] 04.2 Apply gold/silver/bronze styling, varying column heights, and the crown on 1st place.
- [x] 04.3 Handle 1–2 member leagues by rendering only available positions.
- [x] 04.4 Render the all-zero empty-state message in place of the podium.
- [x] 04.5 Write component tests for layout order, crown, partial leagues, and empty state.

## Implementation Details
Create `app/ligas/[id]/ranking/Podium.tsx` as a presentational client component. Model the layout and colors on `designReferences/screens-extras.jsx` `Podium` (lines 263-307) and `RankingScreen` (145-259), where `colors = { 1: '#FFC72C', 2: '#CBD5E1', 3: '#FB923C' }`. Colors are inline hex (no central palette object exists in code). The empty-state decision (all members 0 points) may be computed by the parent and passed in, or derived from the entries — keep the component presentational. See TechSpec "Component Overview" and PRD "Core Feature 1: Top-3 Podium".

### Relevant Files
- `app/ligas/[id]/ranking/Podium.tsx` — new component to create.
- `designReferences/screens-extras.jsx` — `Podium` (263-307) and `RankingScreen` (145-259) layout/colors reference.
- `lib/api/types.ts` — `RankingFullEntry` props type (task_01).
- `app/ligas/[id]/components/RankingCard.tsx` — existing badge color conventions (gold/silver/bronze, lines 16-20) for visual consistency.

### Dependent Files
- `app/ligas/[id]/ranking/page.tsx` — composes `Podium` into the screen (task_06).

### Related ADRs
- [ADR-001: Dedicated Ranking Page as a Separate Route](../adrs/adr-001.md) — the design-reference layout this component implements.

## Deliverables
- `app/ligas/[id]/ranking/Podium.tsx` presentational component.
- Component tests with 80%+ coverage **(REQUIRED)**
- Integration coverage of the podium within the full page is delivered in task_06 **(REQUIRED)**

## Tests
- Unit tests (`@testing-library/react`):
  - [x] Renders three entries in DOM order 2nd, 1st, 3rd (not 1,2,3).
  - [x] First-place entry shows the crown icon; 2nd and 3rd do not.
  - [x] Each entry shows avatar initial, first/family name, rank number, and points.
  - [x] League with 2 members renders only 1st and 2nd (no empty 3rd slot).
  - [x] All-zero entries render the "A pontuação começa quando os jogos rolarem" message instead of the podium.
- Integration tests:
  - [ ] Covered through the composed page in task_06.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Podium matches the design reference (order, colors, crown) and degrades gracefully for 1–2 members and all-zero leagues.
- No horizontal overflow at 375px / 390px.
