---
status: completed
title: Knockout activePhase server pure fn + page seeds initial phase
type: backend
complexity: medium
dependencies:
  - task_06
---

# Task 7: Knockout activePhase server pure fn + page seeds initial phase

## Overview
Compute the knockout "active phase" — the earliest phase still in play — as a pure
field on the bracket response, and have the Mata-mata page open on it. This makes the
screen "follow the tournament," landing where the action is and cutting taps for the
common mid-tournament visit, without ever overriding the user's own tab navigation.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `activePhase: KnockoutPhase` to `BracketResponse` and compute it inside `buildBracketResponse` (pure, no I/O), leaving `newlyUnlockedPhase` untouched.
- The rule MUST be: the first phase in `PHASE_ORDER` whose slots include any slot with `state !== 'finished'`; if every phase is fully finished, return the last phase (`final`). `activePhase` MUST always be non-null.
- The Mata-mata page MUST seed `selectedPhase` from `activePhase` once on first successful load and MUST NOT override the user's tab selection on subsequent re-renders.
- MUST inject/respect the existing `nowMs` parameter so the rule is unit-testable.
- MUST NOT change `phases`, slot states, multipliers, or any other bracket field.
</requirements>

## Subtasks
- [x] 7.1 Compute `activePhase` inside `buildBracketResponse` per the cascade rule.
- [x] 7.2 Add `activePhase` to the `BracketResponse` interface.
- [x] 7.3 Seed the page's initial `selectedPhase` from `activePhase` on first load only.
- [x] 7.4 Guard the seed so user navigation is never overridden on re-render.
- [x] 7.5 Add unit tests for the four lifecycle cases and an integration check for the landing phase.

## Implementation Details
`buildBracketResponse` (`lib/bracket.ts:74-78`) already computes `newlyUnlockedPhase`
(~line 171) and accepts `nowMs`; `BracketResponse` is at ~lines 36-39 and `PHASE_ORDER` /
`KnockoutPhase` come from `lib/bracket-skeleton.ts`. The page hardcodes
`useState<KnockoutPhase>('32nd')` (`app/ligas/[id]/mata-mata/page.tsx:40`) and reads the
response in the fetch effect (~lines 44-81) — seed `selectedPhase` from `activePhase` there,
once. See ADR-004 for the rule and the initial-vs-navigation guard, and TechSpec "Data
Models".

### Relevant Files
- `lib/bracket.ts` — `buildBracketResponse` and `BracketResponse` (add `activePhase`).
- `lib/bracket-skeleton.ts` — `PHASE_ORDER` and `KnockoutPhase` used by the rule.
- `app/ligas/[id]/mata-mata/page.tsx` — initial `selectedPhase` state and the bracket fetch effect.
- `app/api/leagues/[id]/bracket/route.ts` — returns the `buildBracketResponse` payload (carries the new field; no request change).

### Dependent Files
- `tests/unit/bracket-helper.test.ts` / `tests/unit/league-bracket-api.test.ts` — bracket unit coverage to extend for `activePhase`.
- `tests/e2e/validation-run.spec.ts` — lifecycle E2E that can assert the landing phase via the time-machine seed.

### Related ADRs
- [ADR-004: Compute knockout active phase server-side as a pure function](../adrs/adr-004.md) — defines the rule, the `final` fallback, and the seed-once guard.

## Deliverables
- `activePhase` computed in `buildBracketResponse` and exposed on `BracketResponse`.
- Mata-mata page seeds `selectedPhase` from `activePhase` once, without overriding navigation.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration test for the landing phase across lifecycle states **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Pre-start (all open/placeholder) → `activePhase` is `32nd`.
  - [x] Round of 32 fully finished, rest open → `activePhase` is `16th`.
  - [x] Mixed phases → earliest phase with any non-finished slot.
  - [x] Entire knockout finished → `activePhase` is `final`.
  - [x] `newlyUnlockedPhase` output is unchanged by the addition (regression guard).
- Integration tests:
  - [x] `GET /api/leagues/[id]/bracket` response includes `activePhase`.
  - [x] Mata-mata lands on the correct phase for a seeded mid-knockout state, and a subsequent user tab switch is not overridden on re-render.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The bracket response carries a correct, non-null `activePhase` for every lifecycle state.
- Mata-mata opens on the active phase on first load and respects user navigation thereafter.
