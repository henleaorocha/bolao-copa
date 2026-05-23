---
status: completed
title: League Hub Screen (My Leagues + Discover)
type: frontend
complexity: high
dependencies:
  - task_03
  - task_04
  - task_06
---

# Task 7: League Hub Screen (My Leagues + Discover)

## Overview
The League Hub is a new `/ligas` page accessible from the bottom navigation. It shows two tabs — "Minhas Ligas" (user's leagues) and "Descobrir" (open leagues) — and hosts the "Criar Liga" modal for league creation. This is the central hub for all league-related actions as defined in ADR-001.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. The page MUST be accessible at `/ligas` via the bottom navigation tab (reference `designReferences/shell.jsx` `NAV_ITEMS`).
2. "Minhas Ligas" tab MUST display a card for each league the user belongs to, showing: league name, logo/avatar (initial-letter avatar if no logo), member count, and role badge ("Admin" / "Membro"). Tapping a card navigates to `/ligas/[id]`.
3. "Descobrir" tab MUST display open leagues the user has not joined; each card shows: name, avatar, description (if any), member count. Tapping a card shows a confirmation dialog before calling `POST /api/leagues/[id]/join`.
4. A "+ Criar Liga" button on the "Minhas Ligas" tab MUST open a modal (inline or separate component) with fields: name (required, 2–50 chars), access type toggle (Aberta / Privada), description (optional, max 200 chars). On submit it calls `POST /api/leagues` and refreshes the list.
5. The empty state for "Minhas Ligas" (user has no leagues) MUST show a PT-BR message and a prominent "Criar sua primeira liga" CTA.
6. After joining a league from the "Descobrir" tab, `setLeague()` from `useLeague()` MUST be called with the new league so the topbar updates immediately without a page reload.
7. ALL UI text MUST be in Brazilian Portuguese (PT-BR) — no English strings visible to users.
8. The page MUST be responsive and fully usable on a 375px viewport without horizontal scroll.
9. All colors, typography, border radii, and shadow levels MUST match `designReferences/screens-onboarding.jsx` (`LeaguesScreen`, `CreateLeagueModal`) and the design system palette (`#FFC72C`, `#0097A9`, `#244C5A`, Montserrat).
10. Initial-letter avatar MUST use a color drawn from the design system palette based on the first character of the league name.
</requirements>

## Subtasks
- [x] 7.1 Create `app/ligas/page.tsx` with tab structure ("Minhas Ligas" / "Descobrir")
- [x] 7.2 Implement "Minhas Ligas" tab: league cards with avatar, name, role badge, member count
- [x] 7.3 Implement "Descobrir" tab: open league cards with join confirmation dialog
- [x] 7.4 Implement "Criar Liga" modal: form fields, validation, POST submission, list refresh
- [x] 7.5 Add empty state for "Minhas Ligas" tab
- [x] 7.6 Wire bottom nav "Ligas" item to `/ligas` (Next.js file-based routing; NAV_ITEMS handled by shell)
- [x] 7.7 Write unit tests for card rendering and modal form validation

## Implementation Details
`app/ligas/page.tsx` is a Client Component (`'use client'`) that fetches data from `GET /api/leagues` and `GET /api/leagues/discover` on mount (or using SWR/fetch — follow the pattern used in the dashboard). Tab state is local React state.

The "Criar Liga" modal can be an inline component in the same file or a separate `components/leagues/CreateLeagueModal.tsx`. Keep it simple — no logo upload in MVP (see TechSpec "Technical Considerations — No logo upload in MVP").

For the initial-letter avatar: generate a deterministic background color from the league name's first character using the design system palette. This same pattern is used for user avatars already in the dashboard — check how user avatars are currently rendered.

See TechSpec "System Architecture — Component Overview" for the page's position in the component tree and "Impact Analysis" for risk notes.

Reference `designReferences/screens-onboarding.jsx` (`LeaguesScreen`, `CreateLeagueModal`) for layout, component structure, and visual fidelity.

### Relevant Files
- `designReferences/screens-onboarding.jsx` — `LeaguesScreen`, `CreateLeagueModal` reference components
- `designReferences/shell.jsx` — `NAV_ITEMS`, `Topbar`, `AppFrame` — bottom nav wiring
- `designReferences/README.md` — design system palette, typography, spacing
- `app/dashboard/page.tsx` — reference for data fetching pattern in pages
- `lib/league-context.tsx` — `useLeague()` for post-join context update (task_03)
- `app/api/leagues/route.ts` — `GET` and `POST` endpoints consumed here (task_04)
- `app/api/leagues/discover/route.ts` — `GET` endpoint consumed here (task_04)
- `app/api/leagues/[id]/join/route.ts` — `POST` endpoint called on Discover tab join (task_06)

### Dependent Files
- `app/ligas/[id]/page.tsx` — league card tap navigates here (task_09)
- `components/topbar/LeagueSwitcher.tsx` — topbar must update when user joins from Discover (task_08)

### Related ADRs
- [ADR-001: Liga as Central Context Hub with Dedicated Screen](adrs/adr-001.md) — This task IS the hub screen; all design decisions reference this ADR

## Deliverables
- `app/ligas/page.tsx` (new)
- `components/leagues/CreateLeagueModal.tsx` (new, or inline in the page)
- Unit tests for card rendering and form validation **(REQUIRED)**
- Integration test for create-and-appear-in-list flow **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] "Minhas Ligas" tab renders a card for each league in the mock API response
  - [ ] League card displays: name, member count, and correct role badge ("Admin" vs "Membro")
  - [ ] Empty state renders when the leagues array is empty, showing the "Criar sua primeira liga" CTA
  - [ ] "Criar Liga" modal form shows validation error when `name` is shorter than 2 characters
  - [ ] "Criar Liga" modal form shows validation error when `name` exceeds 50 characters
  - [ ] "Descobrir" tab renders open league cards from the mock discover endpoint response
  - [ ] Join confirmation dialog appears when a Discover card is tapped
  - [ ] Declining the join confirmation closes the dialog without making any API call
- Integration tests:
  - [ ] Submitting "Criar Liga" with valid data calls `POST /api/leagues`, and the new league card appears in "Minhas Ligas" without a full page reload
  - [ ] Confirming join on a Discover card calls `POST /api/leagues/[id]/join` and moves the league from the Discover list to the Minhas Ligas list
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- All user-visible text is in PT-BR
- Page is fully usable on a 375px wide viewport with no horizontal scroll
- Visual output matches `LeaguesScreen` and `CreateLeagueModal` in `designReferences/screens-onboarding.jsx`
- After joining a league from Discover, the topbar context switcher reflects the newly active league without a page reload
