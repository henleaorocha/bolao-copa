---
status: completed
title: Wire bet modal into league detail page
type: frontend
complexity: medium
dependencies:
  - task_02
  - task_04
---

# Task 05: Wire bet modal into league detail page

## Overview

Modifies `app/ligas/[id]/page.tsx` to incorporate the `PreCopaBetModal` into the existing modal flow. On league load, the page now reads `has_champion_bet` from the league response (available after task_02) and decides whether and when to show the bet modal relative to the welcome modal. The bet modal appears immediately after the welcome modal completes (first-time user) or directly on entry for returning users who haven't bet yet — and is suppressed once a bet is confirmed or after the Copa deadline.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a `showBetModal` state variable (`useState<boolean>`, initial `false`) to `app/ligas/[id]/page.tsx`.
- MUST import `BET_DEADLINE` from `lib/copa-teams.ts` and compute `isBetDeadlinePassed` as `new Date() > BET_DEADLINE`.
- MUST set `showBetModal = true` in the data-fetch `useEffect` only when: `user_onboarded_at !== null` AND `has_champion_bet === false` AND `!isBetDeadlinePassed`.
- MUST update the existing `LeagueWelcomeModal` `onComplete` callback to set `showBetModal = true` after closing the welcome modal, when: `has_champion_bet === false` AND `!isBetDeadlinePassed`.
- MUST render `<PreCopaBetModal leagueId={leagueId} onComplete={() => setShowBetModal(false)} />` conditionally when `showBetModal` is true and the `league` is loaded.
- MUST NOT show the bet modal while the welcome modal is visible (the two modals must never overlap).
- MUST NOT render `<PreCopaBetModal>` when `has_champion_bet` is true or when `isBetDeadlinePassed` is true.
- MUST NOT break any existing page behavior (configure modal, remove member confirm, delete confirm, toast, league admin controls).
</requirements>

## Subtasks

- [x] 5.1 Add `showBetModal` state and `isBetDeadlinePassed` helper to `app/ligas/[id]/page.tsx`
- [x] 5.2 Update the `useEffect` data-fetch to set `showBetModal` when appropriate (returning user without bet, deadline not passed)
- [x] 5.3 Update the `LeagueWelcomeModal` `onComplete` callback to set `showBetModal` when appropriate
- [x] 5.4 Render `<PreCopaBetModal>` conditionally with the correct props and `onComplete` handler
- [x] 5.5 Verify no regressions in existing modal states (configure, remove, delete, toast)
- [x] 5.6 Write unit and integration tests for the modal trigger logic

## Implementation Details

See TechSpec "System Architecture → Data flow on league page load" (steps 2-5) for the exact trigger logic and sequencing.

The existing `onComplete` in the page currently runs:
```typescript
onComplete={() => {
  fetch(`/api/leagues/${leagueId}/me`, { method: 'PATCH' }).catch(() => {})
  setShowWelcomeModal(false)
}}
```

After this task, it should also call `setShowBetModal(true)` when `!league.has_champion_bet && !isBetDeadlinePassed`.

The two modal renders are siblings in JSX — they must be guarded by mutually exclusive conditions: `{showWelcomeModal && <LeagueWelcomeModal ...>}` and `{showBetModal && <PreCopaBetModal ...>}`.

### Relevant Files

- `app/ligas/[id]/page.tsx` — primary file to modify
- `components/PreCopaBetModal.tsx` — component to import and render (from task_04)
- `lib/copa-teams.ts` — import `BET_DEADLINE` (from task_01)
- `lib/api/types.ts` — `LeagueDetail` now has `has_champion_bet` (from task_01)
- `components/LeagueWelcomeModal.tsx` — existing modal whose `onComplete` is updated

### Dependent Files

- (none — this is the leaf task that consumes all prior tasks)

### Related ADRs

- [ADR-001: 3-Step Fullscreen Modal Flow](adrs/adr-001.md) — sequential trigger: welcome modal completes → bet modal appears
- [ADR-002: Bet Status via Extended LeagueDetail Response](adrs/adr-002.md) — `has_champion_bet` comes from the league detail response, not a separate call

## Deliverables

- Modified `app/ligas/[id]/page.tsx` with `showBetModal` state and sequential trigger logic
- Unit tests for modal trigger conditions with 80%+ coverage **(REQUIRED)**
- Integration tests for the complete first-visit and return-visit flows **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] On page load: when `user_onboarded_at === null` and `has_champion_bet === false`, `showWelcomeModal` is `true` and `showBetModal` is `false`
  - [ ] On page load: when `user_onboarded_at !== null` and `has_champion_bet === false` and deadline not passed, `showBetModal` is `true` and `showWelcomeModal` is `false`
  - [ ] On page load: when `has_champion_bet === true`, `showBetModal` is `false`
  - [ ] On page load: when `isBetDeadlinePassed` is `true`, `showBetModal` is `false` even if `has_champion_bet === false`
  - [ ] Calling `LeagueWelcomeModal` `onComplete` sets `showWelcomeModal` to `false` and `showBetModal` to `true` when `has_champion_bet === false` and deadline not passed
  - [ ] Calling `LeagueWelcomeModal` `onComplete` does NOT set `showBetModal` to `true` when `has_champion_bet === true`
  - [ ] Calling `LeagueWelcomeModal` `onComplete` does NOT set `showBetModal` to `true` when `isBetDeadlinePassed === true`
  - [ ] Calling `PreCopaBetModal` `onComplete` sets `showBetModal` to `false`
  - [ ] `<PreCopaBetModal>` and `<LeagueWelcomeModal>` are never both visible at the same time
- Integration tests:
  - [ ] First-visit flow: fetch returns `user_onboarded_at: null`, `has_champion_bet: false` → welcome modal visible → completing welcome modal → bet modal visible → confirming bet → no modal visible
  - [ ] Return-visit flow: fetch returns `user_onboarded_at: <date>`, `has_champion_bet: false` → bet modal visible immediately → confirming bet → no modal visible
  - [ ] Existing user with bet: fetch returns `has_champion_bet: true` → no modal visible, league page renders normally
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Welcome modal and bet modal are never simultaneously visible
- Bet modal appears automatically after welcome modal completes (first-visit flow)
- Bet modal appears directly on load for returning users without a bet (return-visit flow)
- No modal appears for users who have already placed a bet
- No modal appears after the Copa deadline
- All existing page functionality (configure, remove member, delete league, toast) continues to work without regression
