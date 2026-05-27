---
status: completed
title: "Bracket endpoint (`GET /api/leagues/[id]/bracket`)"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 02: Bracket endpoint (`GET /api/leagues/[id]/bracket`)

## Overview

Add the dedicated read endpoint that merges the static skeleton with live knockout matches by `(phase, slot)` — resolving the slot at read time from `(match_date, venue)` — attaches the requesting user's predictions, derives each slot's `state` and the phase multiplier, and computes the `newlyUnlockedPhase` signal. The screen is a thin renderer of this single payload, so the merge/state/unlock logic is centralized here and unit-tested.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose `GET /api/leagues/[id]/bracket` returning `200 { phases, newlyUnlockedPhase }` in the `BracketResponse` shape defined in the TechSpec "Core Interfaces" section.
- MUST enforce the same guards as `/matches`: `401` (no session), `403` (non-member), `404` (league not found) — reuse the existing patterns in `app/api/leagues/[id]/route.ts` and `/matches/route.ts`.
- MUST merge `BRACKET_SKELETON` (task_01) with the live knockout `matches` rows by `(phase, pos)`, resolving slot from `(match_date, venue)` via the task_01 lookup — no `slot` column, nothing persisted (ADR-004).
- MUST derive per-slot `state`: `placeholder` (no confirmed match), `open` (confirmed via `isConfirmedMatchup` AND before the lock window), `locked` (within the 1h-before-kickoff deadline window), `finished` (`status='finished'`).
- MUST attach each slot's phase `multiplier` (from the documented scheme) and the requesting user's `prediction` for that match if present.
- MUST derive `newlyUnlockedPhase` with no persistence (ADR-006): set when at least one slot is `open` and the user has no prediction on it; name the most recently opened phase with an open, un-bet match.
- MUST place merge + state-derivation + unlock logic in an extracted PURE helper so it is unit-testable without HTTP/Supabase.
- MUST NOT make any external API call on the request path.
</requirements>

## Subtasks
- [x] 2.1 Scaffold `app/api/leagues/[id]/bracket/route.ts` with the auth/membership/404 guards mirroring `/matches`.
- [x] 2.2 Query knockout `matches` (phases in the knockout set) and the user's predictions for the league.
- [x] 2.3 Extract a pure helper that merges skeleton + matches by resolved slot, derives `state`/`multiplier`/`prediction`, and computes `newlyUnlockedPhase`.
- [x] 2.4 Assemble the `BracketResponse` (phases in `PHASE_ORDER` with per-phase label + multiplier) and return it.
- [x] 2.5 Add the `bracket_viewed` structured-log event (league_id, confirmed_slots, duration_ms) per the TechSpec "Monitoring" section.
- [x] 2.6 Write unit tests for the pure helper and integration tests for the endpoint.

## Implementation Details

New route `app/api/leagues/[id]/bracket/route.ts`. Copy the guard sequence from `app/api/leagues/[id]/route.ts` (401 session check via `supabase.auth.getUser()`; 403 membership via `league_members`; 404 league lookup). The 1h lock window must reuse the same threshold the predictions route uses (`Date.now() + 60*60*1000` vs `match.match_date`) so `locked` is consistent with the write path. Slot resolution and `isConfirmedMatchup` come from `lib/bracket-skeleton.ts` (task_01) — do not reimplement. Keep the merge/derivation in a pure function (co-located helper or `lib/bracket.ts`) so tests don't need HTTP. Response shape per the TechSpec "Core Interfaces" (`BracketSlotView`, `BracketPhaseView`, `BracketResponse`).

### Relevant Files
- `app/api/leagues/[id]/bracket/route.ts` — new endpoint authored by this task.
- `lib/bracket-skeleton.ts` — skeleton, `PHASE_ORDER`, slot lookup, `isConfirmedMatchup` (task_01).
- `app/api/leagues/[id]/route.ts` — reference for the 401/403/404 guard sequence (lines ~43-80) and Supabase server client usage.
- `app/api/leagues/[id]/matches/route.ts` — reference for querying matches + attaching the user's prediction and the response-building style.
- `app/api/leagues/[id]/predictions/[matchId]/route.ts` — source of the 1h deadline threshold to reuse for the `locked` state.
- `lib/api/types.ts` — existing `Match` type and shared response types.

### Dependent Files
- `app/ligas/[id]/mata-mata/page.tsx` (task_03) — consumes the `BracketResponse`.
- `app/ligas/[id]/components` for Mata-mata (task_03/task_06) — render slots and the unlock banner from this payload.

### Related ADRs
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](../adrs/adr-004.md) — read-time slot resolution by date+venue.
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](../adrs/adr-006.md) — server-side merge + data-derived unlock signal, no persistence.
- [ADR-002: Standard Per-Phase Betting Model](../adrs/adr-002.md) — confirmed slots become `open`; everyone bets the same real bracket.

## Deliverables
- `app/api/leagues/[id]/bracket/route.ts` returning the `BracketResponse`.
- Extracted pure merge/state/unlock helper.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Integration tests for the endpoint with mocked Supabase **(REQUIRED)**.

## Tests
- Unit tests (pure helper):
  - [x] Pre-Copa with no matches → all slots `placeholder`, `newlyUnlockedPhase` null.
  - [x] Confirmed R32 match (both real teams) before lock → slot `open`, real teams/flags attached.
  - [x] Match within 1h of kickoff → slot `locked`; match `status='finished'` → slot `finished` with scores.
  - [x] Feed returns TBD/placeholder team strings → slot stays `placeholder` (confirmed predicate gates it).
  - [x] `newlyUnlockedPhase` is set when an `open` slot has no user prediction, and clears once the user has bet all open slots.
  - [x] Phases are returned in `PHASE_ORDER` with correct per-phase multiplier and slot counts.
- Integration tests (mocked Supabase, per `tests/unit/league-matches-api.test.ts` pattern):
  - [x] No session → 401; non-member → 403; unknown league → 404.
  - [x] Partial fill (some R32 confirmed, rest placeholder) returns mixed states.
  - [x] A user prediction on a confirmed match is attached to its slot.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Endpoint returns the full 6-phase `BracketResponse` with correct per-slot state and `newlyUnlockedPhase`.
- Guards match `/matches` behavior (401/403/404); no external call on the request path.
- `npm run type-check`, `npm run lint`, and `npm run test` pass.
