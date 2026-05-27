---
status: completed
title: "Palpites list page (`/ligas/[id]/palpites`)"
type: frontend
complexity: high
dependencies:
  - task_05
  - task_07
---

# Task 09: Palpites list page (`/ligas/[id]/palpites`)

## Overview

Creates the full Palpites page at `app/ligas/[id]/palpites/page.tsx` along with its child components (`PalpitesFilters`, `MatchRow`). The page lists all 72 group-stage matches grouped by date, with date-tab and group-chip filters, inline score input fields for open matches, and a "Salvar todos" CTA that batch-saves all unsaved predictions via PUT. This is the primary surface for bulk-betting (Batch Bettor persona).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `app/ligas/[id]/palpites/page.tsx` as a client component
- MUST fetch `GET /api/leagues/[id]/matches?phase=group` on mount and support date + group filter re-fetches
- MUST render date-tab pills: "Todos", "Hoje", "Amanhã", each showing a count of matches for that filter
- MUST render a scrollable horizontal group-chip row: "TODOS", "GRUPO A" … "GRUPO L"
- MUST group matches in the list by date, with a section header showing the formatted date and match count
- MUST render each match row with: group badge, date/time, home team (flag + name + code), score input pair, away team (code + name + flag), status badge, "Detalhes →" link
- MUST show "PALPITADO" badge (with checkmark) for saved predictions, "ABERTO" for open, "FECHADO" for past-deadline
- MUST disable score inputs and hide save affordances for `is_deadline_passed: true` matches
- MUST show "Salvar todos" button (enabled only when unsaved score inputs exist); on click, call `PUT /api/leagues/[id]/predictions/[matchId]` for each unsaved row sequentially or in parallel
- Score inputs MUST accept only non-negative integers; `type="number" min="0" step="1"` with a numeric keyboard hint
- MUST show a "Detalhes →" link per row navigating to `/ligas/[id]/palpites/[matchId]`
- SHOULD show optimistic UI: after a successful PUT, transition the row badge from "ABERTO" to "PALPITADO"
</requirements>

## Subtasks

- [x] 9.1 Create `app/ligas/[id]/palpites/page.tsx` with fetch, filter state, and match list rendering
- [x] 9.2 Implement `PalpitesFilters` component (date tabs + group chips) with active-state styling
- [x] 9.3 Implement `MatchRow` component with score inputs, badge logic, and "Detalhes →" link
- [x] 9.4 Implement "Salvar todos" CTA: collect unsaved rows, batch PUT, update local state
- [x] 9.5 Write integration tests rendering the page with mocked API responses and user interactions

## Implementation Details

See TechSpec "Impact Analysis" rows for `app/ligas/[id]/palpites/page.tsx` and PRD "Core Features — 4. Full Palpites Page" for the exact UX specification. See ADR-001 for the relationship between this page and the bet detail screen.

Filter state: maintain `activeDate: 'all' | 'today' | 'tomorrow'` and `activeGroup: 'all' | 'A' | … | 'L'` in component state. When a filter changes, re-fetch the endpoint with the corresponding query params (`?phase=group&date=today`, `?phase=group&group=A`, etc.) or filter client-side from a single cached fetch — choose the approach that stays under 3s first-paint.

"Unsaved" state: a match row is "unsaved" when the current score input values differ from the saved `prediction` field. Track input values in a `Record<matchId, { home: string; away: string }>` state object.

### Relevant Files

- `app/ligas/[id]/palpites/` — directory to create
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` (task_08) — styling reference for match display
- `lib/api/types.ts` (task_02) — `MatchWithPrediction` consumed here
- `lib/copa-teams.ts` — `ALL_COPA_TEAMS` for flag code resolution in match rows
- `next.config.ts` — `flagcdn.com` whitelisted for flag images

### Dependent Files

- `app/ligas/[id]/palpites/[matchId]/page.tsx` (task_10) — "Detalhes →" links navigate here
- `tests/fixtures/factories.ts` — `createTestMatch`, `createTestPrediction` used in integration tests

### Related ADRs

- [ADR-001: Dedicated Bet Screen + Full Palpites Page as Primary Betting Experience](../adrs/adr-001.md) — establishes this page as the batch-betting surface; each row links to the bet detail screen for the focused single-match experience

## Deliverables

- `app/ligas/[id]/palpites/page.tsx`
- `app/ligas/[id]/palpites/components/PalpitesFilters.tsx` (or co-located in `palpites/`)
- `app/ligas/[id]/palpites/components/MatchRow.tsx` (or co-located)
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for filter interactions and "Salvar todos" flow **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Page renders a date-tab pill for "Todos", "Hoje", "Amanhã" with correct counts from mocked API
  - [x] Clicking "Hoje" tab filters displayed list to today's matches (client-side; no re-fetch)
  - [x] Clicking "GRUPO A" chip filters displayed list to group-A matches (client-side)
  - [x] Matches are grouped by date with a section header showing the formatted date
  - [x] A `MatchRow` with `is_deadline_passed: false` and `prediction: null` shows "ABERTO" badge and enabled score inputs
  - [x] A `MatchRow` with `is_deadline_passed: false` and `prediction: { predicted_home_score: 2, predicted_away_score: 0 }` shows "PALPITADO" badge and pre-filled inputs
  - [x] A `MatchRow` with `is_deadline_passed: true` shows "FECHADO" badge and disabled score inputs
  - [x] "Salvar todos" button is disabled when no inputs have been modified
  - [x] "Salvar todos" is enabled after the user enters scores in one row that differ from saved prediction
  - [x] "Salvar todos" click triggers PUT for each row with unsaved changes; rows transition to "PALPITADO" on success
  - [x] Score input rejects non-numeric input (min=0, type=number enforced)
  - [x] "Detalhes →" link href for a match is `/ligas/{leagueId}/palpites/{matchId}`
- Integration tests:
  - [x] Page renders correctly with mocked fetch returning 8 group-stage matches across 2 dates
  - [x] "Todos" tab shows all 8 matches; "Hoje" tab shows only today's matches
  - [x] Group chip "GRUPO B" shows only group-B matches after click
  - [x] "Salvar todos" calls PUT for each row with unsaved input; rows update to "PALPITADO" after all calls succeed
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Page renders all 72 group-stage matches (when no filter applied) within 3 seconds on mobile
- Filter tabs and group chips update the displayed list without a full page reload
- "Salvar todos" correctly batches PUT calls and updates row states optimistically
- Past-deadline matches are visually locked (disabled inputs, "FECHADO" badge)
