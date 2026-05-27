---
status: completed
title: GroupChips mobile A–L chip selector client island
type: frontend
complexity: low
dependencies: []
---

# Task 02: GroupChips mobile A–L chip selector client island

## Overview
Build `GroupChips`, the single client-interactive island on the Tabela screen: a horizontal, mobile-only chip row (A … L) that scrolls the page to the tapped group's card and highlights the active chip. Keeping interactivity confined to this one component is what lets the rest of the page stay a Server Component (ADR-002).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST be a Client Component (`'use client'`) that accepts the list of group letters to render (e.g. `groups: string[]`).
- MUST render one chip per group letter in a single horizontally scrollable row, visible only on mobile breakpoints (hidden on desktop).
- MUST scroll to the corresponding group card on tap by targeting the anchor id `grupo-{letter}` (lowercase), the shared contract with `GroupCard` in Task 03.
- MUST visually highlight the active/selected chip and keep that state in sync with the user's selection.
- MUST NOT introduce horizontal page overflow at 320/375/390/414px; the chip row scrolls within its own track.
- SHOULD degrade safely if a target anchor is not yet present (no crash if `scrollIntoView` target is missing).
</requirements>

## Subtasks
- [x] 2.1 Create the `GroupChips` client component accepting the group-letter list.
- [x] 2.2 Render a horizontally scrollable chip row hidden on desktop breakpoints.
- [x] 2.3 On tap, locate `#grupo-{letter}` and smooth-scroll it into view.
- [x] 2.4 Track and visually mark the active chip.
- [x] 2.5 Write a component test verifying the scroll target id and active-chip marking.

## Implementation Details
Create the component under `app/ligas/[id]/components/` (alongside `PainelSidebar.tsx`, `UpcomingMatchesCard.tsx`). It is rendered by `StandingsGrid` (Task 03), which passes the group letters and renders `GroupCard`s carrying the matching `id="grupo-{letter}"` anchors. The anchor-id format `grupo-{letter}` (lowercase a–l) is the contract between this task and Task 03 — both must use it verbatim.

Use Tailwind responsive utilities to hide the row on desktop (the desktop reference shows no chip row). For the scroll behavior, resolve the element by id and call `scrollIntoView`; in tests this is mocked. See TechSpec "Component Overview" (`GroupChips` row) and the PRD F2/F3 sections.

### Relevant Files
- `app/ligas/[id]/components/PainelSidebar.tsx` — example of an existing `'use client'` component in this folder and its Tailwind/active-state conventions.
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` — co-located client component reference for styling patterns.
- `tests/integration/palpites-page.test.tsx` — reference for jsdom component test setup and `next/*` mocks.

### Dependent Files
- `app/ligas/[id]/components/StandingsGrid.tsx` (Task 03) — renders `GroupChips` and the matching `grupo-{letter}` anchors.

### Related ADRs
- [ADR-002: Server Component Rendering for the Tabela Page](adrs/adr-002.md) — interactivity is deliberately confined to this single client island.

## Deliverables
- `app/ligas/[id]/components/GroupChips.tsx` client component.
- Component test (jsdom) for scroll-target and active-chip behavior.
- Unit/component tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Renders exactly one chip per provided group letter (12 chips for A–L).
  - [x] Tapping chip "C" resolves and scrolls element `#grupo-c` into view (mock `scrollIntoView`/`getElementById`, assert correct id).
  - [x] The tapped chip becomes the active/highlighted chip; previously active chip is no longer marked active.
  - [x] Tapping a chip whose anchor is absent does not throw.
- Integration tests:
  - [ ] Covered via the Tabela page integration test in Task 04 (chip row present on mobile, hidden on desktop).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Chip row is hidden on desktop and scrollable on mobile with no horizontal page overflow at 375px.
- Scroll targets use the `grupo-{letter}` anchor contract shared with `GroupCard`.
