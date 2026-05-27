---
status: completed
title: "Bet detail screen (`/ligas/[id]/palpites/[matchId]`)"
type: frontend
complexity: high
dependencies:
  - task_06
  - task_07
---

# Task 10: Bet detail screen (`/ligas/[id]/palpites/[matchId]`)

## Overview

Creates the full-screen bet detail page at `app/ligas/[id]/palpites/[matchId]/page.tsx` along with its child components (`BetHero`, `ScoringCard`, `DistributionCard`, `UnsavedModal`). The page lets users place or update a single match prediction in a focused view, see scoring rules, and — after the betting deadline — view the league's aggregate outcome distribution. This is the primary entry point for the Daily Bettor persona.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `app/ligas/[id]/palpites/[matchId]/page.tsx` as a client component
- MUST fetch `GET /api/leagues/[id]/matches/[matchId]` on mount to load `MatchDetail`
- MUST render `BetHero` with: dark gradient background, home/away flags and team names, "SEU PALPITE" label, two numeric score inputs separated by "×", "Salvar palpite" button, match date/time/venue/city, deadline reminder, phase badge, status badge
- "Salvar palpite" MUST be disabled until both score fields are filled with a value ≥ 0; MUST call `PUT /api/leagues/[id]/predictions/[matchId]` on click
- After a successful save, the button MUST show a "Salvo!" confirmation state
- Score inputs MUST be pre-filled with `prediction.predicted_home_score` / `predicted_away_score` if a prediction exists
- MUST render `ScoringCard` ("Quanto vale acertar") with fixed scoring rules: exact score +10 pts, correct outcome +5 pts, group-stage 1× multiplier
- MUST render `DistributionCard` ("Palpites da liga"): hidden with locked placeholder message before deadline; visible with outcome bar chart after deadline
- MUST implement `UnsavedModal` ("Sair sem salvar?"): appears when pressing "Voltar" with unsaved score changes; two CTAs — "Salvar e sair" (PUT then navigate) and "Sair sem salvar" (navigate without PUT); dismiss by tapping outside or "×"
- MUST use `useRouter` for back navigation; track "dirty" state as: current input values differ from last saved prediction
- Score inputs MUST be disabled and show "FECHADO" visual when `is_deadline_passed: true`
- `DistributionCard` distribution bar MUST show home win %, draw %, away win % from `MatchDetail.distribution`
</requirements>

## Subtasks

- [x] 10.1 Create `app/ligas/[id]/palpites/[matchId]/page.tsx` with fetch, loading, and error states
- [x] 10.2 Implement `BetHero` component with score inputs, "Salvar palpite" button, and post-save confirmation
- [x] 10.3 Implement `ScoringCard` (static scoring rules panel)
- [x] 10.4 Implement `DistributionCard` with pre-deadline locked state and post-deadline distribution bar
- [x] 10.5 Implement `UnsavedModal` with dirty-state tracking, "Salvar e sair" and "Sair sem salvar" CTAs
- [x] 10.6 Write integration tests covering save flow, dirty navigation, and distribution visibility

## Implementation Details

See TechSpec "Impact Analysis" rows for `app/ligas/[id]/palpites/[matchId]/page.tsx` and PRD "Core Features — 2. Match Bet Screen", "3. Unsaved-Changes Modal", and "6. League Bets Distribution" sections.

Dirty state: maintain `inputHome: string`, `inputAway: string`, and `savedHome: number | null`, `savedAway: number | null`. State is dirty when `inputHome !== String(savedHome)` OR `inputAway !== String(savedAway)`. On mount, initialize inputs from `prediction` if it exists.

"Voltar" button: intercept with `router.back()` only after dirty check. If dirty, show `UnsavedModal`; if clean, call `router.back()` directly. "Salvar e sair": `await PUT(...)` then `router.back()`. "Sair sem salvar": `router.back()` immediately.

See `designReferences/screens-matches.jsx` (ADR-001 reference) for visual design details. The `DistributionCard` bar chart can be a simple CSS gradient/flex bar — no chart library needed.

### Relevant Files

- `app/ligas/[id]/palpites/page.tsx` (task_09) — entry point that links here via "Detalhes →"
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` (task_08) — links here via match tap
- `lib/api/types.ts` (task_02) — `MatchDetail`, `OutcomeDistribution`
- `lib/copa-teams.ts` — flag code for team flag images
- `designReferences/screens-matches.jsx` — visual reference for `BetHero` and `DistributionCard`
- `designReferences/screens-dashboard.jsx` — panel context reference
- `next.config.ts` — `flagcdn.com` whitelisted for flag images

### Dependent Files

- (No downstream tasks — this is the final leaf in the dependency tree)
- `tests/fixtures/factories.ts` — `createTestMatch`, `createTestPrediction` for integration tests

### Related ADRs

- [ADR-001: Dedicated Bet Screen + Full Palpites Page as Primary Betting Experience](../adrs/adr-001.md) — establishes this full-screen page as the primary single-match betting surface; drives the component structure (hero + two info panels)
- [ADR-004: PUT Upsert for Prediction Save/Update API](../adrs/adr-004.md) — mandates that "Salvar palpite" always calls PUT regardless of whether a prediction already exists

## Deliverables

- `app/ligas/[id]/palpites/[matchId]/page.tsx`
- `BetHero`, `ScoringCard`, `DistributionCard`, `UnsavedModal` (co-located or in a `components/` subfolder)
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for save flow, dirty navigation, and distribution toggle **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Page in loading state renders a skeleton; no score inputs visible
  - [x] Page with mocked `MatchDetail` (no existing prediction, deadline open) renders empty score inputs and disabled "Salvar palpite" button
  - [x] Page with mocked `MatchDetail` (existing prediction `2 × 1`) pre-fills score inputs with "2" and "1" and enables "Salvar palpite"
  - [x] Entering "3" in home input and "0" in away input enables "Salvar palpite" even when prediction was null
  - [x] Clicking "Salvar palpite" with valid inputs calls `PUT /api/leagues/[id]/predictions/[matchId]` with `{ home_score: N, away_score: M }`
  - [x] After successful PUT, button shows "Salvo!" confirmation text
  - [x] Pressing "Voltar" with inputs matching saved prediction (clean state) navigates without showing modal
  - [x] Pressing "Voltar" after changing inputs (dirty state) shows `UnsavedModal`
  - [x] Clicking "Sair sem salvar" in modal navigates without calling PUT
  - [x] Clicking "Salvar e sair" in modal calls PUT then navigates
  - [x] Dismissing modal by clicking outside returns to the bet screen without navigation
  - [x] Page with `is_deadline_passed: true` renders disabled score inputs and "FECHADO" visual
  - [x] `DistributionCard` with `distribution: null` renders locked placeholder text (not the bar chart)
  - [x] `DistributionCard` with `distribution: { home_win: 50, draw: 30, away_win: 20, total_predictions: 10 }` renders the bar chart visible
  - [x] `ScoringCard` shows "+10 pts — Placar exato" and "+5 pts — Apenas vencedor/empate" static text
- Integration tests:
  - [x] Full save flow: user enters scores → clicks "Salvar palpite" → PUT called → button shows "Salvo!" → "Voltar" navigates without modal
  - [x] Dirty navigation: user enters scores → clicks "Voltar" → modal appears → "Salvar e sair" → PUT called → navigation occurs
  - [x] Distribution panel visible after deadline with mocked `is_deadline_passed: true` and non-null `distribution`
  - [x] Distribution panel hidden with locked state when `is_deadline_passed: false`
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- "Salvar palpite" is reliably enabled only with valid (non-negative integer) scores in both fields
- Unsaved-changes modal reliably appears on back navigation when inputs are dirty
- Distribution panel toggles correctly based on `is_deadline_passed` from the API response
- Past-deadline score inputs are disabled and non-interactive
- No TypeScript errors; `tsc --noEmit` exits 0
