---
status: completed
title: computeStandings pure module and domain types
type: backend
complexity: medium
dependencies: []
---

# Task 01: computeStandings pure module and domain types

## Overview
Create `lib/standings.ts`, a pure, framework-agnostic module that turns the existing `Match[]` rows into ordered group-stage standings. This is the computational core of the Tabela da Copa screen and the foundation every UI task depends on; it must be correct and fully unit-tested in isolation before any rendering work begins.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose `computeStandings(matches: Match[]): GroupStanding[]` plus exported `TeamStanding` and `GroupStanding` interfaces, matching the shapes in the TechSpec "Core Interfaces" section.
- MUST consider only matches where `phase === 'group'` and `group` is non-null; all other rows are ignored.
- MUST derive each group's 4-team roster from the distinct `home_team`/`away_team` values in that group's fixtures, so groups with only `scheduled` matches still list all teams at 0 across every column.
- MUST aggregate results ONLY for `status === 'finished'` matches (3 pts win, 1 draw, 0 loss); `live` and `scheduled` matches contribute 0.
- MUST compute J, V, E, D, GP (goalsFor), GC (goalsAgainst), SG (goalDiff), Pts per team.
- MUST sort each group by `points` desc → `goalDiff` desc → `goalsFor` desc → `team` name asc, then assign `position` 1–4 after sorting.
- MUST take each team's `flag` from the matching `home_flag`/`away_flag` value, defaulting to `null` when absent (never throw).
- MUST return groups ordered A→L and remain a pure function with no I/O, framework, or network dependency.
</requirements>

## Subtasks
- [x] 1.1 Define `TeamStanding` and `GroupStanding` interfaces and export them alongside `computeStandings`.
- [x] 1.2 Filter input to group-phase matches and build each group's distinct team roster with associated flag codes.
- [x] 1.3 Aggregate finished-match results into per-team J/V/E/D/GP/GC/SG/Pts totals.
- [x] 1.4 Sort teams by the tie-break chain and assign 1–4 positions; return groups in A→L order.
- [x] 1.5 Write `tests/unit/standings.test.ts` covering empty/scheduled, point math, tie-breaks, ignored statuses, and missing-flag cases.

## Implementation Details
Create `lib/standings.ts`. Import the `Match` type from `lib/api/types.ts` (interface at `lib/api/types.ts:130`). The module is consumed by the `StandingsGrid` components (Task 03) and the Tabela page (Task 04). See TechSpec "Core Interfaces" and "Data Models" sections for the exact `TeamStanding`/`GroupStanding` shapes and the `computeStandings` rules — do not redefine the `Match` type locally.

Key correctness points from the TechSpec: roster is derived from fixtures (not a separate roster table); only `finished` matches affect totals; the four-key sort chain must be stable and deterministic; missing flag codes resolve to `null` rather than crashing.

### Relevant Files
- `lib/api/types.ts` — source of the `Match` interface (`lib/api/types.ts:130`); import, do not duplicate.
- `vitest.config.ts` — coverage includes `lib/**`; this module is covered by the 80% line threshold.
- `tests/unit/league-matches-api.test.ts` — reference for Vitest unit-test style and `Match[]` fixture shape.

### Dependent Files
- `app/ligas/[id]/components` standings components (Task 03) — consume `GroupStanding[]`.
- `app/ligas/[id]/tabela/page.tsx` (Task 04) — calls `computeStandings` with queried matches.

### Related ADRs
- [ADR-001: DB-Computed Standings with Hourly Background Sync](adrs/adr-001.md) — finished-match aggregation and DB-derived standings.
- [ADR-002: Server Component Rendering for the Tabela Page](adrs/adr-002.md) — mandates `computeStandings` live in a shared `lib/` module for server reuse and isolated testing.

## Deliverables
- `lib/standings.ts` exporting `computeStandings`, `TeamStanding`, `GroupStanding`.
- `tests/unit/standings.test.ts` with comprehensive coverage of the rules above.
- Unit tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] All-`scheduled` group: every team shows 0 for J/V/E/D/GP/GC/SG/Pts, all 4 teams present, positions 1–4 assigned.
  - [x] Win awards 3 pts to winner / 0 to loser; draw awards 1 pt each; J/V/E/D and GP/GC/SG aggregate correctly across multiple finished matches.
  - [x] Tie-break: two teams equal on points are ordered by SG; equal SG resolved by GP; equal GP resolved by team name ascending.
  - [x] `status='live'` and `status='scheduled'` matches are excluded from totals (contribute 0).
  - [x] Match with `home_flag`/`away_flag` null yields `flag: null` on that team and does not throw.
  - [x] Non-`group` phase rows and rows with null `group` are ignored; output groups are returned A→L.
- Integration tests:
  - [ ] Not applicable — pure function; exercised end-to-end via the Tabela page integration test in Task 04.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `computeStandings` is a pure function with no framework/I/O imports.
- Output matches the TechSpec ordering and aggregation rules for seeded data.
