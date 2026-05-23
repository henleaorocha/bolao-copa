---
status: completed
title: Leagues Hub Page Rewrite
type: frontend
complexity: high
dependencies:
  - task_01
  - task_03
  - task_05
---

# Task 6: Leagues Hub Page Rewrite

## Overview

Replace `app/ligas/page.tsx` entirely: the current Client Component with two tabs, modals, and `useEffect` fetching is removed and replaced with an `async` Server Component that receives data at render time. The page renders: a branded header with logout, a dark-background hero with a personalized greeting, a `LeagueCard` grid, a visual "Criar nova liga" card, and a `CountdownBanner` — all populated server-side without a loading spinner.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST be an `async` Server Component with `export const dynamic = 'force-dynamic'` to prevent stale cached renders.
2. MUST call `getLeaguesHub(supabase, userId)` and `getDaysUntilCopa()` directly (no HTTP self-calls) and render the result synchronously.
3. MUST render a branded header bar: logo/wordmark on the left, `LogoutButton` on the right.
4. MUST render the dark hero section with `session.user.user_metadata.full_name` (first name only) in the greeting.
5. MUST render one `<LeagueCard>` per `LeagueHubItem` in the returned array, in the order returned by `getLeaguesHub()`.
6. MUST render the visual "Criar nova liga" dashed-border card after all league cards; it MUST have no click handler in this phase.
7. MUST render the countdown banner using the `CopaCountdown` returned by `getDaysUntilCopa()`, showing the "A Copa começa em X dias" variant before June 11 2026 and the "A Copa está acontecendo." variant on or after.
8. MUST implement the card-grid/hero overlap effect as described in TechSpec "UI Layout Notes" — `padding-bottom` on the hero, negative `margin-top` on the card grid; MUST NOT use `overflow: hidden` on the hero.
9. The page MUST redirect to `/login` when the session is absent (middleware already handles this, but the Server Component MUST also guard with `redirect('/login')` if `getUser()` returns null).
10. MUST NOT import or use `useState`, `useEffect`, or any other React hooks in this file — interactive children are Client Components.
11. Card grid MUST be 3 columns on desktop and 1 column on mobile (responsive CSS).
</requirements>

## Subtasks

- [x] 6.1 Delete all existing code in `app/ligas/page.tsx` and scaffold the new `async` Server Component with `force-dynamic`.
- [x] 6.2 Implement the branded header (logo + `LogoutButton`) and dark hero section with personalized greeting.
- [x] 6.3 Render the `LeagueCard` grid with responsive layout and the visual "Criar nova liga" card.
- [x] 6.4 Implement the inline `CountdownBanner` component (or import from `components/CountdownBanner.tsx` if extracted) using `getDaysUntilCopa()`.
- [x] 6.5 Apply the hero/card overlap CSS effect as specified in TechSpec.
- [x] 6.6 Write integration tests verifying the rendered HTML includes league cards, the greeting, and the countdown banner.

## Implementation Details

See TechSpec "System Architecture" → Component Overview and "UI Layout Notes" for the full component tree, data flow, and the overlap CSS technique.

See TechSpec "Technical Considerations" → Known Risks for the `force-dynamic` requirement.

Pattern references:
- `app/dashboard/page.tsx` — existing `async` Server Component using `getSupabaseServerClient()` and `redirect()`.
- Design reference: `designReferences/screenshots/tela-ligas.png` — dark petrol-blue (`#244C5A`) hero, white card area, warm cream countdown banner.

Color palette for shield icons (already handled inside `LeagueCard`): `['#FFC72C', '#0097A9', '#244C5A', '#7E4FE3', '#16A34A', '#FB923C']`.

### Relevant Files

- `app/ligas/page.tsx` — file to replace entirely
- `app/dashboard/page.tsx` — Server Component pattern reference
- `lib/leagues/get-leagues-hub.ts` — called by this page (Task 03)
- `lib/leagues/get-days-until-copa.ts` — called by this page (Task 01)
- `components/LeagueCard.tsx` — rendered per league (Task 05)
- `components/LogoutButton.tsx` — reused as-is in the header
- `lib/supabase/client.ts` — `getSupabaseServerClient()`
- `lib/api/types.ts` — `LeagueHubItem`, `CopaCountdown` (Task 02)
- `designReferences/screenshots/tela-ligas.png` — visual reference
- `tests/integration/` — Vitest integration test directory

### Dependent Files

- `app/ligas/[id]/page.tsx` — no change, but depends on `/ligas` being a valid route (unaffected)

### Related ADRs

- [ADR-001: League Hub as Full /ligas Page Redesign](adrs/adr-001.md) — mandates replacing the two-tab layout at the existing `/ligas` route; alternative routes were rejected.
- [ADR-002: Server Component with Shared Data Layer](adrs/adr-002.md) — mandates the `async` Server Component pattern and forbids Client Component hooks in this file.

## Deliverables

- `app/ligas/page.tsx` — fully rewritten Server Component
- `tests/integration/ligas-page.test.tsx` — integration test suite
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the full page render **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Page redirects to `/login` when `getUser()` returns null (session absent).
  - [x] Page renders the greeting "E aí, [first_name]" with the first name extracted from `full_name`.
  - [x] Page renders one `LeagueCard` per item returned by a mocked `getLeaguesHub()`.
  - [x] Page renders the "Criar nova liga" card with no click handler wired.
  - [x] CountdownBanner shows "A Copa começa em X dias" when `isUnderway: false`.
  - [x] CountdownBanner shows "A Copa está acontecendo." when `isUnderway: true`.
- Integration tests:
  - [x] `GET /ligas` with a valid authenticated session returns HTML containing league card names in the expected order (main league first).
  - [x] `GET /ligas` without a session redirects to `/login`.
  - [x] Rendered HTML includes `export const dynamic = 'force-dynamic'` effect: no stale cache on second request with different data.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Page renders visually matching `designReferences/screenshots/tela-ligas.png`: dark hero, card grid with overlap, warm countdown banner.
- No `useState`, `useEffect`, or `'use client'` directive in `app/ligas/page.tsx`.
- `export const dynamic = 'force-dynamic'` is present at the top of the file.
- The page loads with data already populated — no loading spinner visible on navigation.
