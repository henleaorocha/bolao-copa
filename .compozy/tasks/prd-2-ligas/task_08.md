---
status: completed
title: TopBar LeagueSwitcher Component
type: frontend
complexity: medium
dependencies:
    - task_02
    - task_03
    - task_04
---

# Task 8: TopBar LeagueSwitcher Component

## Overview
A persistent `Topbar` component is added to the root layout, containing a `LeagueSwitcher` dropdown that shows the active league name and role and lets the user switch leagues without leaving the current page. On selection it calls `PATCH /api/auth/me` and updates the `LeagueProvider` context, making all screens reflect the new active league instantly.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `components/topbar/LeagueSwitcher.tsx` MUST be a 'use client' component that reads the active league via `useLeague()` and lists all of the user's leagues fetched from `GET /api/leagues`.
2. On selecting a different league, it MUST call `PATCH /api/auth/me` with `{ active_league_id }`, then call `setLeague()` from `useLeague()` for an instant UI update without a page reload.
3. `components/topbar/Topbar.tsx` MUST be added to `app/layout.tsx` (inside the `LeagueProvider`) and display: active league name, user role badge, and the LeagueSwitcher trigger.
4. The Topbar MUST be visible on all authenticated screens (dashboard, predictions, ranking, ligas) via the root layout; it MUST NOT render on the `/login` page.
5. The switcher MUST show a loading/disabled state while the `PATCH /api/auth/me` request is in flight.
6. ALL UI text in the component MUST be in PT-BR.
7. Visual design MUST match `designReferences/shell.jsx` (`Topbar` component) — colors, typography, border radii, and shadow levels from the design system.
8. The switcher MUST be accessible within one tap from any screen in the app.
</requirements>

## Subtasks
- [ ] 8.1 Create `components/topbar/LeagueSwitcher.tsx` — dropdown with league list, selection handler, loading state
- [ ] 8.2 Create `components/topbar/Topbar.tsx` — wrapper showing active league name + role + switcher trigger
- [ ] 8.3 Update `app/layout.tsx` to render `<Topbar>` inside `LeagueProvider` for authenticated routes
- [ ] 8.4 Conditionally suppress the Topbar on `/login` and other public routes
- [ ] 8.5 Write unit tests for switcher behavior (selection, loading state, context update)

## Implementation Details
`LeagueSwitcher` is a client component that needs two pieces of data: the current league from `useLeague()` and the full list of the user's leagues from `GET /api/leagues`. Fetch the list on mount (client-side fetch or SWR).

The switcher UI can be a dropdown (desktop) or a bottom sheet (mobile) — follow whatever pattern is shown in `designReferences/shell.jsx`. The key behavior: selecting a league triggers PATCH → setLeague() in that order; the UI updates immediately.

For route-conditional rendering: in Next.js App Router the layout renders for all routes. The simplest approach is to pass a `pathname`-based condition using `usePathname()` to suppress the Topbar on `/login`.

See TechSpec "System Architecture — LeagueSwitcher" for the exact call sequence.

### Relevant Files
- `designReferences/shell.jsx` — `Topbar` reference component with exact visual design
- `designReferences/README.md` — design system palette and typography
- `app/layout.tsx` — root layout to update (wraps all routes)
- `lib/league-context.tsx` — `useLeague()` and `setLeague()` (task_03)
- `app/api/auth/me/route.ts` — `PATCH` endpoint called on league switch (task_02)
- `app/api/leagues/route.ts` — `GET` endpoint for the league list (task_04)

### Dependent Files
- `app/ligas/page.tsx` — Topbar sits above it; switching leagues here should update the hub (task_07)
- `app/dashboard/page.tsx` — Topbar sits above dashboard; context switch affects displayed data (task_11)

### Related ADRs
- [ADR-001: Liga as Central Context Hub with Dedicated Screen](adrs/adr-001.md) — Topbar switcher is one of two required access points for league management
- [ADR-004: React Context for Active League Client State](adrs/adr-004.md) — `setLeague()` pattern after PATCH

## Deliverables
- `components/topbar/LeagueSwitcher.tsx` (new)
- `components/topbar/Topbar.tsx` (new)
- Updated `app/layout.tsx`
- Unit tests for LeagueSwitcher behavior **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `LeagueSwitcher` renders the active league name and role badge from `useLeague()` context
  - [ ] Clicking a different league in the picker triggers `PATCH /api/auth/me` with the correct `active_league_id`
  - [ ] While `PATCH /api/auth/me` is in flight, the switcher is in a loading/disabled state
  - [ ] After `PATCH /api/auth/me` resolves successfully, `setLeague()` is called with the selected league and the displayed name updates
  - [ ] `Topbar` does not render on the `/login` route
  - [ ] `Topbar` renders on the `/dashboard` route
- Integration tests:
  - [ ] Selecting a new league in the switcher persists across a page reload: `GET /api/auth/me` returns the newly selected league after the PATCH
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- League switcher is visible and accessible within one tap from the dashboard, predictions, and ranking screens
- Switching leagues updates the Topbar label and role badge immediately without a full page reload
- Visual output matches the `Topbar` component in `designReferences/shell.jsx`
- Topbar is absent on the `/login` page
