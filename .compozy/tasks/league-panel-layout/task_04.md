---
status: completed
title: Static section components (`ScoringSchemeCard`, `UpcomingGamesStub`, `BottomTabBar`)
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 4: Static section components (`ScoringSchemeCard`, `UpcomingGamesStub`, `BottomTabBar`)

## Overview

Three Painel sections require no runtime data and can be implemented as purely static components. `ScoringSchemeCard` renders the amber scoring table. `UpcomingGamesStub` renders skeleton rows with an "Em breve" badge. `BottomTabBar` renders the fixed mobile bottom navigation with PAINEL as the active tab. All three must follow the `lg:` breakpoint established in the TechSpec and match the approved design reference.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST create all three components as `'use client'` files in `app/ligas/[id]/components/`.
2. `ScoringSchemeCard` MUST render all seven scoring rows from the PRD (Palpite de Campeão, Palpite de Vice-Campeão, Placar Exato, Vencedor/Empate, and the three multiplier rows) plus the footer note.
3. `UpcomingGamesStub` MUST render exactly three skeleton rows (animated gray bars) and an "Em breve" badge in the card header area.
4. `BottomTabBar` MUST render five tabs (PAINEL, PALPITES, TABELA, RANKING, PERFIL); PAINEL MUST be visually active; all other tabs MUST be `aria-disabled="true"` with `opacity-50 cursor-not-allowed pointer-events-none`.
5. `BottomTabBar` MUST be hidden on `≥lg` screens (`hidden lg:flex` is inverted — use `flex lg:hidden`).
6. MUST meet WCAG AA color contrast for all text and interactive elements.
</requirements>

## Subtasks

- [x] 4.1 Create `ScoringSchemeCard.tsx` with the amber/yellow gradient card and all scoring rows from the PRD "Scoring Scheme Card" feature.
- [x] 4.2 Create `UpcomingGamesStub.tsx` with the card shell, three animated skeleton rows, and "Em breve" badge.
- [x] 4.3 Create `BottomTabBar.tsx` with five tabs, PAINEL active, all others disabled, hidden on `lg:`.
- [x] 4.4 Write unit tests for each component covering rendering and accessibility attributes.

## Implementation Details

See TechSpec "System Architecture — Component Overview" and PRD "Core Features — 9, 10, 11" sections for content requirements.

Components are co-located in `app/ligas/[id]/components/` per ADR-002. No props are needed for `ScoringSchemeCard` or `UpcomingGamesStub`. `BottomTabBar` needs no props in this phase (all tabs are static).

Skeleton animation: use Tailwind `animate-pulse bg-gray-200 rounded` on each skeleton bar.

### Relevant Files

- `app/ligas/[id]/components/` — target directory for all three new files (does not exist yet; create it)
- `lib/copa-teams.ts` — reference for the Copa scoring context (points per phase), read-only
- `components/topbar/LayoutWrapper.tsx` — reference for `hidden`/`flex` responsive pattern

### Dependent Files

- `app/ligas/[id]/page.tsx` — task_09 imports and renders all three components

### Related ADRs

- [ADR-001: League Panel Layout Approach](adrs/adr-001.md) — Single-scroll layout; all sections visible without interaction
- [ADR-002: Page Component Decomposition Strategy](adrs/adr-002.md) — Co-located components in `app/ligas/[id]/components/`

## Deliverables

- `app/ligas/[id]/components/ScoringSchemeCard.tsx`
- `app/ligas/[id]/components/UpcomingGamesStub.tsx`
- `app/ligas/[id]/components/BottomTabBar.tsx`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for rendered output **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] `ScoringSchemeCard` renders the text "Palpite de Campeão" and "+50 pts" (or equivalent).
  - [x] `ScoringSchemeCard` renders the footer note about elimination phase multipliers.
  - [x] `UpcomingGamesStub` renders exactly three skeleton bar elements with `animate-pulse`.
  - [x] `UpcomingGamesStub` renders an element containing the text "Em breve".
  - [x] `BottomTabBar` renders five tab items.
  - [x] `BottomTabBar` tab item labeled "PAINEL" does not have `aria-disabled="true"`.
  - [x] `BottomTabBar` tab item labeled "PALPITES" has `aria-disabled="true"`.
  - [x] `BottomTabBar` renders with class containing `lg:hidden` (hidden on desktop).
- Integration tests:
  - [x] All three components render without throwing in a Next.js page context (no SSR errors).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- All three components render without errors in isolation
- `BottomTabBar` inert tabs have correct accessibility attributes
