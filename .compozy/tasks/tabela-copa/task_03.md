---
status: completed
title: Presentational standings components
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_02
---

# Task 03: Presentational standings components

## Overview
Build the read-only presentation layer that turns `GroupStanding[]` into the approved Tabela UI: `StandingsRow` (one team line), `GroupCard` (one group), and `StandingsGrid` (the A→L grid that also renders the `GroupChips` island). These are Server Components rendered inside the initial HTML, with qualification highlighting and mobile column hiding matching official standings sources.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `StandingsRow` MUST render position number, flag, team name, and columns Pts/J/V/E/D/GP/GC/SG in the Brazilian standard order, consuming a `TeamStanding`.
- `StandingsRow` MUST visually distinguish qualification positions 1–2 from elimination positions 3–4 using a non-color-only signal (position number + border/tint), per PRD F4 and accessibility notes.
- `StandingsRow` MUST hide GP and GC on mobile while keeping SG visible (ESPN/Sofascore narrow-viewport pattern), with no horizontal overflow at 320/375/390/414px.
- Flag rendering MUST be Server-Component-safe — it MUST NOT rely on client `useState`/`onError` like the existing inline `TeamFlag`; render the flagcdn image with a placeholder for a `null`/missing code.
- `GroupCard` MUST render a dark header (`#1C3A45`) showing `GRUPO {LETTER}` and a `4 SELEÇÕES` badge in yellow (`#FFB800`), a column-label row, and its four rows; and MUST carry anchor `id="grupo-{letter}"` (lowercase) matching Task 02.
- `StandingsGrid` MUST render the `GroupChips` island plus all 12 `GroupCard`s in fixed A→L order in a responsive grid (3-column desktop, single column mobile).
- Components MUST be Server Components (no `'use client'`) except for the imported `GroupChips` island.
</requirements>

## Subtasks
- [x] 3.1 Implement `StandingsRow` with the full column set, qualification highlight, and mobile GP/GC hiding.
- [x] 3.2 Implement a server-safe flag rendering approach (no client error-state hook) with a placeholder for missing codes.
- [x] 3.3 Implement `GroupCard` with the dark header, team-count badge, column labels, and `id="grupo-{letter}"` anchor.
- [x] 3.4 Implement `StandingsGrid` rendering `GroupChips` + 12 `GroupCard`s in A→L order in a responsive grid.
- [x] 3.5 Write component tests for qualification highlight, mobile column visibility, A→L ordering, and anchor ids.

## Implementation Details
Create the components under `app/ligas/[id]/components/` next to `PainelSidebar.tsx` and `UpcomingMatchesCard.tsx`. Consume `TeamStanding`/`GroupStanding` from `lib/standings.ts` (Task 01) and import `GroupChips` from Task 02.

Flag handling is the key deviation to watch: the existing `TeamFlag` in `app/ligas/[id]/palpites/components/MatchRow.tsx:18` and `UpcomingMatchesCard.tsx:12` is a client component using `useState`/`onError`. Because `StandingsRow` is a Server Component, replicate the visual pattern (`https://flagcdn.com/w80/{code}.png`, ~4:3 ratio, grey placeholder when code is null) without the client error hook — render the image directly and show the placeholder div when `flag` is null. Reuse the existing colors/spacing language; do not refactor the existing `TeamFlag` instances. See TechSpec "Component Overview", PRD F1/F3/F4, and the Desktop/Mobile flow sections for exact column order, header colors, and badge text.

### Relevant Files
- `lib/standings.ts` (Task 01) — `TeamStanding`/`GroupStanding` types consumed here.
- `app/ligas/[id]/components/GroupChips.tsx` (Task 02) — rendered by `StandingsGrid`.
- `app/ligas/[id]/palpites/components/MatchRow.tsx` — existing `TeamFlag` pattern to replicate server-safely (`MatchRow.tsx:18`).
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` — flag/styling reference (`UpcomingMatchesCard.tsx:12`).
- `tests/integration/palpites-page.test.tsx` — jsdom test setup with mocked `next/image` and `next/link`.

### Dependent Files
- `app/ligas/[id]/tabela/page.tsx` (Task 04) — renders `StandingsGrid` with computed standings.

### Related ADRs
- [ADR-002: Server Component Rendering for the Tabela Page](adrs/adr-002.md) — these are server components under a client layout; client surface limited to `GroupChips`.

## Deliverables
- `StandingsRow`, `GroupCard`, and `StandingsGrid` components under `app/ligas/[id]/components/`.
- Server-safe flag rendering used by `StandingsRow`.
- Component tests (jsdom) for highlight, mobile column hiding, ordering, and anchors.
- Unit/component tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `StandingsRow` for a position-1 team renders the qualification highlight; a position-3 team does not.
  - [x] `StandingsRow` renders the full column set (Pts/J/V/E/D/GP/GC/SG) with values from the `TeamStanding`.
  - [x] GP and GC carry the mobile-hidden styling while SG remains visible (assert the hiding class/markup at the mobile breakpoint).
  - [x] Flag renders the flagcdn image for a valid code and the grey placeholder when `flag` is null, without using a client error hook.
  - [x] `GroupCard` renders `GRUPO {LETTER}`, the `4 SELEÇÕES` badge, and `id="grupo-{letter}"`.
- Integration tests:
  - [x] `StandingsGrid` renders all 12 cards in A→L order and includes the `GroupChips` row (full-page assertions also covered by Task 04).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Desktop renders a 3-column A→L grid; mobile stacks single-column with GP/GC hidden, SG shown, and no horizontal overflow at 375px.
- Qualification highlight distinguishes positions 1–2 from 3–4 with a non-color-only signal.
- `GroupCard` anchor ids match the `grupo-{letter}` contract used by `GroupChips`.
