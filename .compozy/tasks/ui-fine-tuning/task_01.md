---
status: completed
title: Add TOTAL_MATCH_COUNT constant and matches_played league-detail field
type: backend
complexity: low
dependencies: []
---

# Task 1: Add TOTAL_MATCH_COUNT constant and matches_played league-detail field

## Overview
Lay the additive foundation for the Painel progress card by introducing the
tournament-wide match-count constant and the new league-detail response field. This task
is purely additive (no removals), so the build stays green and other tasks can consume
the constant and the type without coordination.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `export const TOTAL_MATCH_COUNT = 104` to `lib/copa-teams.ts` (72 group + 32 knockout).
- MUST keep the existing `GROUP_STAGE_MATCH_COUNT = 72` untouched and guarantee `TOTAL_MATCH_COUNT === GROUP_STAGE_MATCH_COUNT + 32`.
- MUST add `matches_played: number` to the `LeagueDetail` interface in `lib/api/types.ts`.
- MUST NOT remove `guesses_made` / `guesses_total` from `UserStats` in this task (that removal is atomic with the Painel card work in task_04 to keep the build green).
- MUST keep this change additive so the repo compiles with no other edits.
</requirements>

## Subtasks
- [x] 1.1 Add the `TOTAL_MATCH_COUNT` constant to the copa-teams constants module.
- [x] 1.2 Add the `matches_played` field to the `LeagueDetail` response type.
- [x] 1.3 Add a unit test asserting the constant equals 104 and stays consistent with `GROUP_STAGE_MATCH_COUNT`.
- [x] 1.4 Confirm typecheck/build passes with only additive changes.

## Implementation Details
Add the constant next to `GROUP_STAGE_MATCH_COUNT` (currently `lib/copa-teams.ts:70`) and
the field to `LeagueDetail` (currently `lib/api/types.ts:92-104`). See TechSpec "Data
Models" for the exact shape: `TOTAL_MATCH_COUNT = 104` and `LeagueDetail.matches_played:
number`. Do not yet populate the field in the API handler — task_04 computes and returns it.

### Relevant Files
- `lib/copa-teams.ts` — holds `GROUP_STAGE_MATCH_COUNT = 72`; new constant lives here.
- `lib/api/types.ts` — holds `LeagueDetail` (lines ~92-104) and `UserStats` (lines ~66-72).

### Dependent Files
- `app/api/leagues/[id]/route.ts` — will populate `matches_played` in task_04 (no change here).
- `app/ligas/[id]/components/StatsRow.tsx` — will consume the constant/field in task_04 (no change here).

### Related ADRs
- [ADR-001: Single-batch delivery with a unified match-card pattern](../adrs/adr-001.md) — the repurposed Painel card uses the 104 denominator established here.

## Deliverables
- `TOTAL_MATCH_COUNT = 104` exported from `lib/copa-teams.ts`.
- `matches_played: number` added to `LeagueDetail`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration coverage via the type being consumed downstream (task_04) **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `TOTAL_MATCH_COUNT` equals `104`.
  - [x] `TOTAL_MATCH_COUNT === GROUP_STAGE_MATCH_COUNT + 32` (consistency guard).
  - [x] `GROUP_STAGE_MATCH_COUNT` is still `72` (regression guard).
- Integration tests:
  - [x] Project typecheck (`tsc`/build) passes with only these additive edits (plus the mechanically-required `matches_played` fixture updates in 3 existing test files; no production file beyond the two specified).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `TOTAL_MATCH_COUNT` is exported and equals 104, consistent with `GROUP_STAGE_MATCH_COUNT`.
- `LeagueDetail.matches_played` exists; the repo compiles with no other changes.
