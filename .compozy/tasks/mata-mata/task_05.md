---
status: completed
title: "Predictions confirmed-teams guard"
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 05: Predictions confirmed-teams guard

## Overview

Harden the existing prediction write path so a knockout match can only be bet once both real teams are confirmed. Add a "match confirmed (real teams)" check to `PUT /api/leagues/[id]/predictions/[matchId]` that rejects bets on unconfirmed knockout matches, using the shared `isConfirmedMatchup` predicate, while preserving the existing 1h-before-kickoff `DEADLINE_PASSED` rule.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a guard to `PUT /api/leagues/[id]/predictions/[matchId]` that rejects a bet on a knockout match whose teams are not yet confirmed (via `isConfirmedMatchup` from task_01).
- MUST return a clear, distinct error for the rejection (e.g. a `409`/`403` with a `MATCH_NOT_CONFIRMED` code) separate from `DEADLINE_PASSED`.
- MUST keep the existing 1-hour-before-kickoff `DEADLINE_PASSED` behavior unchanged for confirmed matches.
- MUST allow predictions on confirmed knockout matches and on group-stage matches exactly as today (no regression to the group flow).
- MUST emit the `prediction_rejected_unconfirmed` structured-log event on rejection, per the TechSpec "Monitoring" section.
- MUST NOT add a new endpoint or change the request/response contract beyond the added guard + error.
</requirements>

## Subtasks
- [x] 5.1 Load the target match and determine whether it is a knockout match needing the confirmed check.
- [x] 5.2 Apply `isConfirmedMatchup(home, away)` and reject unconfirmed knockout bets with the distinct error code.
- [x] 5.3 Preserve the existing deadline check and group-stage behavior.
- [x] 5.4 Add the `prediction_rejected_unconfirmed` log event.
- [x] 5.5 Add unit/integration tests for reject/allow/deadline paths.

## Implementation Details

Modify `app/api/leagues/[id]/predictions/[matchId]/route.ts`. The deadline logic already lives there (`deadlineThreshold = new Date(Date.now() + 60*60*1000)` compared to `match.match_date`, returning `DEADLINE_PASSED` ~lines 93-113); add the confirmed-teams guard alongside it. Import `isConfirmedMatchup` from `lib/bracket-skeleton.ts` (task_01) — do not reimplement the predicate. "Confirmed" = both team names in `VALID_TEAM_NAMES`; placeholder slots have no match row at all, so this guard primarily protects against feed-published-but-TBD knockout fixtures. Group-stage matches are always confirmed by construction, so the guard must not affect them.

### Relevant Files
- `app/api/leagues/[id]/predictions/[matchId]/route.ts` — the existing `PUT` to harden (deadline logic at ~lines 93-113).
- `lib/bracket-skeleton.ts` — source of `isConfirmedMatchup` (task_01).
- `lib/copa-teams.ts` — `VALID_TEAM_NAMES` underlying the predicate.
- `lib/api/types.ts` — `Match` type and error-response shapes.

### Dependent Files
- `app/ligas/[id]/mata-mata/page.tsx` (task_03) — the bettable UI whose writes this guard validates.

### Related ADRs
- [ADR-002: Standard Per-Phase Betting Model](../adrs/adr-002.md) — betting opens only once both real teams are populated.
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](../adrs/adr-004.md) — "confirmed" predicate definition (both teams real).
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](../adrs/adr-006.md) — the endpoint additionally guards confirmed teams; this is the write-path counterpart.

## Deliverables
- Confirmed-teams guard added to the existing `PUT` predictions endpoint with a distinct rejection error.
- `prediction_rejected_unconfirmed` log event.
- Unit/integration tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit/Integration tests (mocked Supabase, per `tests/unit/league-matches-api.test.ts` pattern):
  - [x] `PUT` on an unconfirmed knockout match (a team name not in `VALID_TEAM_NAMES`) is rejected with the distinct `MATCH_NOT_CONFIRMED` error.
  - [x] `PUT` on a confirmed knockout match (both real teams) before deadline succeeds and upserts the prediction.
  - [x] `PUT` on a confirmed match within 1h of kickoff still returns `DEADLINE_PASSED` (existing rule intact).
  - [x] `PUT` on a group-stage match behaves exactly as today (no regression).
  - [x] Existing 401/403/404 guards remain enforced.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Unconfirmed knockout bets are rejected with a distinct error; confirmed bets and the deadline rule work unchanged; group flow unaffected.
- `npm run type-check`, `npm run lint`, and `npm run test` pass.
