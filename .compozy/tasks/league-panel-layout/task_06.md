---
status: completed
title: "`YourBetCard` component"
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 6: `YourBetCard` component

## Overview

`YourBetCard` displays the user's champion and vice champion picks as a card with country flags, team names, and role icons (crown for champion, runner-up icon for vice). It is only rendered when the user has placed a champion bet (`has_champion_bet` is true). When the deadline has not passed, it also shows an "Alterar aposta · X dias restantes" button that opens `PreCopaBetModal` for revision.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST return `null` (not render) when `has_champion_bet` prop is `false`.
2. MUST display the champion team name and flag image using the `flagcdn.com` CDN pattern already configured in `next.config.ts`.
3. MUST display the vice champion team name and flag image.
4. MUST show a "+50 PTS" badge on the card.
5. MUST show an "Alterar aposta · X dias restantes" button only when `new Date() < BET_DEADLINE`; this button MUST open `PreCopaBetModal`.
6. MUST call the `onBetComplete` callback after a successful bet revision so the parent can refresh data.
7. MUST NOT modify `PreCopaBetModal`.
</requirements>

## Subtasks

- [x] 6.1 Create `app/ligas/[id]/components/YourBetCard.tsx` returning `null` when `has_champion_bet` is false.
- [x] 6.2 Render champion and vice champion rows with flag images (`flagcdn.com/w80/{code}.png`) and team names.
- [x] 6.3 Render the "+50 PTS" badge.
- [x] 6.4 Conditionally render the "Alterar aposta" button only when before `BET_DEADLINE`; wire it to `PreCopaBetModal`.
- [x] 6.5 Write unit tests covering the hidden state, displayed state, and deadline-gated button.

## Implementation Details

See PRD "Core Features — 8 (Your Bet Card)" and TechSpec "Integration Points — PreCopaBetModal" sections.

The `champion_bet` object shape is `ChampionBet` from `lib/api/types.ts` (`champion_team`, `runner_up_team`). Use `lib/copa-teams.ts` `ALL_COPA_TEAMS` to look up the team's `code` field for the flag URL.

Props interface:
```
has_champion_bet: boolean
champion_bet: ChampionBet | null
leagueId: string
onBetComplete: () => void
```

### Relevant Files

- `lib/api/types.ts` — `ChampionBet` type (`champion_team`, `runner_up_team`)
- `lib/copa-teams.ts` — `ALL_COPA_TEAMS` for team code lookup; `BET_DEADLINE` for deadline guard
- `components/PreCopaBetModal.tsx` — reused as-is for bet revision
- `next.config.ts` — confirms `flagcdn.com` is in `remotePatterns`

### Dependent Files

- `app/ligas/[id]/page.tsx` — task_09 passes `champion_bet` and `has_champion_bet` as props; renders `YourBetCard` in layout

### Related ADRs

- [ADR-001: League Panel Layout Approach](adrs/adr-001.md) — `YourBetCard` appears in the left column of the 3-column desktop lower row

## Deliverables

- `app/ligas/[id]/components/YourBetCard.tsx`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for card visibility and modal integration **(REQUIRED)**

## Tests

- Unit tests (`@vitest-environment jsdom`):
  - [x] When `has_champion_bet=false`, `YourBetCard` renders nothing (returns null).
  - [x] When `has_champion_bet=true` and `champion_bet` has `champion_team: 'Brasil'`, the text "Brasil" appears in the rendered output.
  - [x] The "+50 PTS" badge text is present when `has_champion_bet=true`.
  - [x] When current date is before `BET_DEADLINE`, a button with text containing "Alterar aposta" is rendered.
  - [x] When mocked `Date.now()` is after `BET_DEADLINE`, the "Alterar aposta" button is not rendered.
  - [x] Clicking "Alterar aposta" opens `PreCopaBetModal` (mock the modal and verify it is called/rendered).
- Integration tests:
  - [x] Page renders without error when `has_champion_bet=false` (card absent from DOM).
  - [x] Page renders without error when `has_champion_bet=true` with valid `champion_bet` data.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Card is hidden when `has_champion_bet=false`
- Flag images use the correct `flagcdn.com` URL pattern
- "Alterar aposta" button respects `BET_DEADLINE` gate
