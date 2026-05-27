---
status: completed
title: "`UpcomingMatchesCard` component + panel wiring"
type: frontend
complexity: medium
dependencies:
  - task_05
---

# Task 08: `UpcomingMatchesCard` component + panel wiring

## Overview

Creates the `UpcomingMatchesCard` client component that fetches the next 4 scheduled matches from `GET /api/leagues/[id]/matches?next=4` and renders them on the league panel. Also replaces the existing `UpcomingGamesStub` import in `app/ligas/[id]/page.tsx` with the new real component. This makes the league panel surface genuine Copa 2026 fixture data instead of placeholder content.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `app/ligas/[id]/components/UpcomingMatchesCard.tsx` as a client component (`'use client'`)
- MUST accept `leagueId: string` prop and fetch `GET /api/leagues/[leagueId]/matches?next=4` on mount
- MUST display up to 4 match cards, each showing: home/away team names and flag images, match date/time (user's local timezone), group label, user's prediction or "–" if none
- MUST show "ABERTO" badge for open matches and a "FECHADO" visual for deadline-passed matches
- MUST render a "Ver Todos" link in the card header pointing to `/ligas/[leagueId]/palpites`
- MUST show a loading skeleton while fetching and an error state if the fetch fails
- MUST remove (delete) `app/ligas/[id]/components/UpcomingGamesStub.tsx` after the new component is wired in
- MUST replace the `<UpcomingGamesStub />` usage in `app/ligas/[id]/page.tsx` with `<UpcomingMatchesCard leagueId={leagueId} />`
- Flag images MUST use the `flagcdn.com/w80/{code}.png` URL pattern (already whitelisted in `next.config.ts`)
- `is_deadline_passed` field from the API response MUST drive the "FECHADO" visual — do not recompute client-side
</requirements>

## Subtasks

- [x] 8.1 Create `UpcomingMatchesCard.tsx` with the fetch call and loading/error states
- [x] 8.2 Implement individual match card UI: flags, team names, date/time, group badge, prediction display
- [x] 8.3 Add "ABERTO" / "FECHADO" status badges driven by `is_deadline_passed`
- [x] 8.4 Add "Ver Todos" link and wire the card into `app/ligas/[id]/page.tsx`
- [x] 8.5 Delete `UpcomingGamesStub.tsx` and remove its import
- [x] 8.6 Write unit/integration tests rendering the component with mocked API responses

## Implementation Details

See TechSpec "Impact Analysis" row for `UpcomingMatchesCard` and the TechSpec "Component Overview" diagram. See PRD "Core Features — 1. Upcoming Matches Widget" for the exact UX requirements. See ADR-001 for why this is a widget (not inline betting).

Follow the component and styling conventions visible in `app/ligas/[id]/components/ChampionBanner.tsx` and `YourBetCard.tsx` — they are the closest analogues in the existing panel. Use the Next.js `<Image>` component for flag images with width=32 height=24 (or similar proportional size).

### Relevant Files

- `app/ligas/[id]/page.tsx` — replace `UpcomingGamesStub` import and JSX usage
- `app/ligas/[id]/components/UpcomingGamesStub.tsx` — to be deleted after wiring
- `app/ligas/[id]/components/ChampionBanner.tsx` — panel card style reference
- `app/ligas/[id]/components/YourBetCard.tsx` — panel card style reference
- `lib/api/types.ts` (task_02) — `MatchWithPrediction` consumed here
- `next.config.ts` — confirm `flagcdn.com` is already whitelisted (no change needed)

### Dependent Files

- `app/ligas/[id]/page.tsx` — one import line changes; no other logic touched
- `tests/unit/` — any snapshot tests for the league panel page may need updating after stub removal

### Related ADRs

- [ADR-001: Dedicated Bet Screen + Full Palpites Page as Primary Betting Experience](../adrs/adr-001.md) — establishes that this widget shows match info + "Ver Todos" link only; no inline betting inputs

## Deliverables

- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` (new file)
- Updated `app/ligas/[id]/page.tsx` (swap import)
- `app/ligas/[id]/components/UpcomingGamesStub.tsx` deleted
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests rendering the component with mocked matches **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Component in loading state renders a skeleton (no match cards visible)
  - [x] Component with mocked API returning 4 matches renders 4 match card elements
  - [x] Each match card shows the home team name, away team name, and formatted date
  - [x] A match with `prediction: { predicted_home_score: 2, predicted_away_score: 1 }` shows "2 × 1" in the card
  - [x] A match with `prediction: null` shows "–" placeholder in the prediction area
  - [x] A match with `is_deadline_passed: true` shows "FECHADO" badge; `is_deadline_passed: false` shows "ABERTO"
  - [x] "Ver Todos" link points to `/ligas/{leagueId}/palpites`
  - [x] When fetch returns an error, an error state is rendered (no crash)
- Integration tests:
  - [x] `app/ligas/[id]/page.tsx` renders `UpcomingMatchesCard` (not `UpcomingGamesStub`) when loaded
  - [x] `UpcomingGamesStub.tsx` file no longer exists in the codebase
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- League panel renders real match data for the next 4 upcoming fixtures
- `UpcomingGamesStub.tsx` is fully removed from the codebase
- Flag images load without `next.config.ts` changes (already whitelisted)
- No TypeScript errors introduced in `page.tsx` after the import swap
