---
status: completed
title: LeagueCard Client Component
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 5: LeagueCard Client Component

## Overview

Create `components/LeagueCard.tsx`, a Client Component responsible for rendering a single league entry in the Leagues Hub grid. It displays the shield icon (color derived from the league name), league name, member count, and an "ENTRAR →" button. When the user clicks ENTRAR, it calls `PATCH /api/auth/me` to set the active league and then navigates to `/ligas/[id]`. The PRINCIPAL badge is rendered when `league.is_main === true`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST be a Client Component (`'use client'` directive at the top of the file).
2. MUST accept `LeagueCardProps` as defined in TechSpec "Core Interfaces" — a single `league: LeagueHubItem` prop.
3. MUST render the shield icon with a background color derived from the first character of `league.name` using the PRD's six-color palette: `['#FFC72C', '#0097A9', '#244C5A', '#7E4FE3', '#16A34A', '#FB923C']`.
4. MUST display a "PRINCIPAL" badge when `league.is_main === true`; the badge MUST include a visible text label (not color alone) for accessibility.
5. MUST display member count as `"{member_count} participantes"`.
6. MUST call `PATCH /api/auth/me` with `{ active_league_id: league.id }` before navigating when ENTRAR is clicked; navigation to `/ligas/[id]` MUST only happen after a successful PATCH response.
7. MUST show a disabled/loading state on the ENTRAR button while the PATCH request is in flight.
8. MUST handle PATCH failure gracefully — show an error state or re-enable the button; MUST NOT navigate on failure.
9. "ENTRAR →" button MUST be keyboard-navigable (focusable, activatable via Enter/Space).
</requirements>

## Subtasks

- [x] 5.1 Create `components/LeagueCard.tsx` with the `'use client'` directive and `LeagueCardProps` type.
- [x] 5.2 Implement the shield color derivation logic using the six-color palette.
- [x] 5.3 Implement the ENTRAR click handler: PATCH call, loading state, navigation, and error handling.
- [x] 5.4 Add the PRINCIPAL badge (rendered conditionally on `is_main`).
- [x] 5.5 Write unit tests for color derivation, badge visibility, and ENTRAR handler states.

## Implementation Details

See TechSpec "Core Interfaces" for `LeagueCardProps` and "UI Layout Notes" for the card-to-hero overlap positioning context (the card itself is not responsible for the overlap — that is handled by the page layout in Task 06).

See PRD "Core Features" → "4. Unified league card grid" for the full list of required card elements and the color palette.

Pattern references:
- `components/LogoutButton.tsx` — Client Component with loading/disabled state pattern.
- `app/api/leagues/route.ts` — existing `PATCH /api/auth/me` is already implemented; check its expected request body.

### Relevant Files

- `components/LeagueCard.tsx` — new file to create
- `components/LogoutButton.tsx` — Client Component with loading state pattern
- `lib/api/types.ts` — `LeagueHubItem` (Task 02)
- `app/api/auth/me/route.ts` — existing PATCH endpoint being called (no changes needed)
- `tests/unit/` — Vitest unit tests with `@vitest-environment jsdom`

### Dependent Files

- `app/ligas/page.tsx` — renders `<LeagueCard>` for each league in the hub grid (Task 06)

## Deliverables

- `components/LeagueCard.tsx` — Client Component
- `tests/unit/LeagueCard.test.tsx` — unit test suite
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for ENTRAR interaction flow **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Card renders league name, member count as "{N} participantes", and "ENTRAR" text.
  - [x] Shield background color for a league whose name starts with "T" (maps to index 3 → `#7E4FE3`) is applied correctly.
  - [x] "PRINCIPAL" badge is visible when `league.is_main === true` and absent when `league.is_main === false`.
  - [x] ENTRAR button becomes disabled while the PATCH request is pending (simulated with a delayed mock).
  - [x] ENTRAR button re-enables and does NOT navigate when `PATCH /api/auth/me` returns a non-2xx status.
  - [x] ENTRAR button navigates to `/ligas/{league.id}` after a successful PATCH response.
- Integration tests:
  - [x] Full ENTRAR flow: mock `PATCH /api/auth/me` returns 200, `useRouter().push` is called with `/ligas/${league.id}`.
  - [x] Full ENTRAR flow failure: mock `PATCH /api/auth/me` returns 403, `useRouter().push` is NOT called.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- ENTRAR button calls `PATCH /api/auth/me` before navigating — confirmed by test assertions, not just visual inspection.
- PRINCIPAL badge is accessible: text label present, not color-only.
- Keyboard navigation works: ENTRAR activatable via Tab + Enter.
