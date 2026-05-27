---
status: completed
title: Page orchestrator rewrite (`app/ligas/[id]/page.tsx`)
type: frontend
complexity: high
dependencies:
  - task_03
  - task_04
  - task_05
  - task_06
  - task_07
  - task_08
---

# Task 9: Page orchestrator rewrite (`app/ligas/[id]/page.tsx`)

## Overview

The final task replaces the existing 680-line `'use client'` monolith at `app/ligas/[id]/page.tsx` with a thin orchestrator that fetches `LeagueDetail` and `AuthUser`, then composes all section components into the responsive Painel layout. The orchestrator manages the `onBetComplete` data refresh callback, the `lg:` breakpoint layout switch (sidebar vs. top bar + bottom tab bar), and the two-column / three-column desktop grid sections. Admin features (configure, remove, delete) are explicitly removed in this phase.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST remove all admin UI (configure league, remove members, delete league) from the page; document removal in a code comment pointing to the future admin settings tab PRD.
2. MUST fetch `GET /api/auth/me` and `GET /api/leagues/[id]` on mount (useEffect pattern consistent with the existing page).
3. MUST render `PainelSidebar` inside a `hidden lg:flex` container and `PainelTopBar` + `BottomTabBar` inside a `flex lg:hidden` container.
4. MUST render `ChampionBanner`, `PrizesStrip`, `StatsRow`, `YourBetCard`, `UpcomingGamesStub`, `RankingCard`, and `ScoringSchemeCard` in the scrollable content area.
5. `onBetComplete` MUST trigger a re-fetch of `GET /api/leagues/[id]` to update `has_champion_bet` and cause `YourBetCard` to appear without a full page reload.
6. MUST render a loading state ("Carregando...") while data is being fetched.
7. MUST render an error state with a "Voltar para Ligas" link to `/ligas` on fetch failure.
8. MUST hide the global `Topbar` (verify `LayoutWrapper` already excludes `/ligas/[id]` from the topbar route list).
9. Desktop layout MUST follow the column structure from the TechSpec "System Architecture — Component Overview": greeting + banner + prizes strip + stats row spanning full width; lower sections in a 3-column row (`YourBetCard` left, `UpcomingGamesStub` right 2 cols); then a 2-column row (`RankingCard` left, `ScoringSchemeCard` right).
</requirements>

## Subtasks

- [x] 9.1 Remove the old page body (members list, admin controls, old modals) and retain only the data-fetching scaffold.
- [x] 9.2 Implement the responsive layout shell: sidebar column (desktop) and top bar + bottom tab bar (mobile).
- [x] 9.3 Compose all section components in the scrollable content area with correct desktop column grid.
- [x] 9.4 Implement `onBetComplete` callback that re-fetches `LeagueDetail` and updates local state.
- [x] 9.5 Add loading and error states.
- [x] 9.6 Write unit tests covering both desktop and mobile layout structures, and the `onBetComplete` re-fetch.

## Implementation Details

See TechSpec "System Architecture — Component Overview" for the data flow diagram and TechSpec "Technical Considerations — Responsive Layout Breakpoint" for the `lg:` breakpoint specification.

The page must remain `'use client'` — data is fetched client-side via `useEffect` (consistent with existing pattern). Use `useState` for `league`, `currentUser`, `isLoading`, and `error`.

The `onBetComplete` callback:
```
const handleBetComplete = async () => {
  const res = await fetch(`/api/leagues/${params.id}`)
  const data = await res.json()
  setLeague(data.data)
}
```

Desktop grid layout uses Tailwind `lg:grid lg:grid-cols-3 gap-6` for the 3-column row and `lg:grid lg:grid-cols-2 gap-6` for the 2-column row.

### Relevant Files

- `app/ligas/[id]/page.tsx` — file to be fully rewritten
- `app/ligas/[id]/components/` — all 11 section components imported here (created in tasks 04–08)
- `components/topbar/LayoutWrapper.tsx` — verify `/ligas` prefix is in the topbar hide-list
- `lib/api/types.ts` — `LeagueDetail`, `AuthUser`

### Dependent Files

- `tests/unit/league-detail.test.tsx` — existing tests for the old page; most will need updating to match the new structure
- `tests/integration/leagues-detail.test.ts` — integration tests for the page/API combination
- `tests/unit/league-page-bet-modal.test.tsx` — modal integration tests; must be updated or replaced

### Related ADRs

- [ADR-002: Page Component Decomposition Strategy](adrs/adr-002.md) — Justifies the full rewrite approach and the removal of admin features
- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Explains why zero-value stats are the expected pre-Copa state

## Deliverables

- Rewritten `app/ligas/[id]/page.tsx`
- Updated `tests/unit/league-detail.test.tsx` (replace tests for removed features; add tests for new sections)
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for full page render **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] Page renders "Carregando..." while fetch is pending.
  - [x] Page renders "Voltar para Ligas" link when `GET /api/leagues/[id]` returns a non-OK response.
  - [x] Page renders `ChampionBanner` when fetched `LeagueDetail` has `has_champion_bet=false` and date is before deadline.
  - [x] Page renders `YourBetCard` when fetched `LeagueDetail` has `has_champion_bet=true`.
  - [x] Page does NOT render `YourBetCard` when `has_champion_bet=false`.
  - [x] After `onBetComplete` fires, `GET /api/leagues/[id]` is called a second time.
  - [x] `PainelSidebar` container has class `hidden lg:flex` (or equivalent hidden-on-mobile class).
  - [x] `BottomTabBar` container has class `flex lg:hidden` (or equivalent hidden-on-desktop class).
  - [x] Admin buttons ("Configurar", "Remover membro", "Excluir liga") are absent from the rendered output.
- Integration tests:
  - [x] Authenticated member visiting `/ligas/{id}` receives a 200 response with the Painel content.
  - [x] Unauthenticated user visiting `/ligas/{id}` is redirected to `/login` or receives a non-200 response.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Full Painel renders correctly in pre-bet state (banner shows "Apostar Agora", YourBetCard hidden)
- Full Painel renders correctly in post-bet state (banner shows "Revisar Aposta", YourBetCard visible)
- Sidebar visible on desktop; top bar + bottom tab bar visible on mobile
- `onBetComplete` triggers data refresh without full page reload
- Admin UI absent from the rendered page
