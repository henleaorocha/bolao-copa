---
status: completed
title: "`ChampionBanner` component"
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 5: `ChampionBanner` component

## Overview

`ChampionBanner` is the highest-priority Painel element: a full-width dark banner that counts down to the Copa bet deadline and drives champion bet completion. It renders a live countdown (days + hours), the first match date/time, and a dynamic CTA button that opens `PreCopaBetModal`. The banner must disappear entirely once `BET_DEADLINE` has passed, using `lib/copa-teams.ts` as the single source of truth.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST be hidden (not rendered) when `new Date() >= BET_DEADLINE` from `lib/copa-teams.ts`.
2. MUST render CTA label "Apostar Agora" when `has_champion_bet` prop is `false`.
3. MUST render CTA label "Revisar Aposta" when `has_champion_bet` prop is `true`.
4. MUST display a countdown showing days and hours remaining until `BET_DEADLINE`.
5. CTA button MUST open `PreCopaBetModal` (imported from `components/PreCopaBetModal.tsx`) without modification.
6. MUST call the `onBetComplete` callback (received as prop) after `PreCopaBetModal` closes with a successful bet, so the parent page can refresh data.
7. MUST render the first match label: "México × África do Sul · 11/6 · 16:00".
8. Countdown MUST update without a full page refresh (client-side interval or computed on render — single render on load is acceptable, no real-time requirement).
</requirements>

## Subtasks

- [x] 5.1 Create `app/ligas/[id]/components/ChampionBanner.tsx` with deadline guard (return `null` when past deadline).
- [x] 5.2 Implement countdown display (days and hours until `BET_DEADLINE`).
- [x] 5.3 Render dynamic CTA button with "Apostar Agora" / "Revisar Aposta" label based on `has_champion_bet` prop.
- [x] 5.4 Integrate `PreCopaBetModal` with `leagueId` prop and `onComplete` wired to the `onBetComplete` callback.
- [x] 5.5 Write unit tests covering all rendering states (pre-deadline/post-deadline, with/without bet).

## Implementation Details

See TechSpec "Integration Points — PreCopaBetModal" and PRD "Core Features — 5 (Champion Bet Deadline Banner)" sections.

Props interface:
```
has_champion_bet: boolean
leagueId: string
onBetComplete: () => void
```

`BET_DEADLINE` is imported from `lib/copa-teams.ts`. `getDaysUntilCopa()` from `lib/leagues/get-days-until-copa.ts` can be used for the countdown, but also returns `isUnderway` which can replace the `new Date() >= BET_DEADLINE` check.

### Relevant Files

- `lib/copa-teams.ts` — exports `BET_DEADLINE`
- `lib/leagues/get-days-until-copa.ts` — exports `getDaysUntilCopa()` returning `{ days, isUnderway }`
- `components/PreCopaBetModal.tsx` — reused as-is; props: `{ leagueId: string, onComplete: () => void }`
- `tests/unit/league-page-bet-modal-deadline.test.tsx` — reference for how to mock `BET_DEADLINE` in tests

### Dependent Files

- `app/ligas/[id]/page.tsx` — task_09 imports and renders `ChampionBanner` with `has_champion_bet` and `onBetComplete` props

### Related ADRs

- [ADR-001: League Panel Layout Approach](adrs/adr-001.md) — Banner is the first content element above the fold in the single-scroll layout

## Deliverables

- `app/ligas/[id]/components/ChampionBanner.tsx`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for banner state transitions **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] When `has_champion_bet=false` and current date is before `BET_DEADLINE`, renders a button with text "Apostar Agora".
  - [x] When `has_champion_bet=true` and current date is before `BET_DEADLINE`, renders a button with text "Revisar Aposta".
  - [x] When mocked `Date.now()` is after `BET_DEADLINE`, `ChampionBanner` returns null (nothing rendered to DOM).
  - [x] Clicking the CTA button renders `PreCopaBetModal` (or opens it, depending on modal pattern).
  - [x] The text "ATENÇÃO" and "PALPITE DE CAMPEÃO FECHA EM" are present in the banner.
  - [x] The text "México × África do Sul" is present in the banner.
- Integration tests:
  - [x] Banner is not present in the rendered page when the server date is past `BET_DEADLINE`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Banner absent from DOM when `isUnderway` is `true`
- CTA label switches correctly based on `has_champion_bet`
- `PreCopaBetModal` opens on CTA click without errors
