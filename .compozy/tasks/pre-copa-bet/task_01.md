---
status: completed
title: Copa teams static data + API types
type: backend
complexity: low
dependencies: []
---

# Task 01: Copa teams static data + API types

## Overview

Creates the foundational data layer for the Pre-Copa Bet feature: a static `lib/copa-teams.ts` file with all 32 Copa 2026 nations, their ISO 3166-1 alpha-2 codes, and the bet deadline constant; and extends `lib/api/types.ts` with the `ChampionBet` interface and `has_champion_bet` field on `LeagueDetail`. Every other task in this feature depends on this task.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `lib/copa-teams.ts` exporting: `CopaTeam` interface, `FEATURED_TEAMS` (exactly 12 teams), `ALL_COPA_TEAMS` (all Copa 2026 nations, `FEATURED_TEAMS` first), `VALID_TEAM_NAMES` (a `Set<string>` of all team names for server-side validation), and `BET_DEADLINE` (a `Date` set to 2026-06-11T21:00:00.000Z, which is 18:00 BRT).
- MUST include all 12 featured teams in order: Brasil, Argentina, França, Espanha, Inglaterra, Portugal, Alemanha, Holanda, Itália, Bélgica, Uruguai, Colômbia.
- MUST use `gb-eng` (not `gb`) as the ISO code for Inglaterra to display the St George's Cross flag via flagcdn.com.
- MUST populate ALL_COPA_TEAMS with all Copa 2026 qualified nations (verify count against official FIFA 2026 roster; correct any discrepancy from the 32 stated in the PRD).
- MUST add `ChampionBet` interface to `lib/api/types.ts` with fields: `id`, `user_id`, `league_id`, `champion_team`, `runner_up_team`, `created_at`, `updated_at` (all strings).
- MUST extend the existing `LeagueDetail` interface in `lib/api/types.ts` with `has_champion_bet: boolean`.
- MUST NOT modify any other existing interface or type.
</requirements>

## Subtasks

- [x] 1.1 Create `lib/copa-teams.ts` with `CopaTeam` interface, `FEATURED_TEAMS`, `ALL_COPA_TEAMS`, `VALID_TEAM_NAMES`, and `BET_DEADLINE`
- [x] 1.2 Verify all 32+ Copa 2026 team names against the official FIFA roster and correct the ISO alpha-2 code for each
- [x] 1.3 Add `ChampionBet` interface to `lib/api/types.ts`
- [x] 1.4 Extend `LeagueDetail` in `lib/api/types.ts` with `has_champion_bet: boolean`
- [x] 1.5 Write unit tests for the static data invariants

## Implementation Details

See TechSpec "Core Interfaces" section for the exact `CopaTeam` interface shape, `FEATURED_TEAMS` list, and `BET_DEADLINE` value.

The `VALID_TEAM_NAMES` set is used in the PUT endpoint (task_03) for server-side team name validation. Keep names in Portuguese (e.g., "Holanda", not "Netherlands").

### Relevant Files

- `lib/copa-teams.ts` — new file to create
- `lib/api/types.ts` — extend with `ChampionBet` and `has_champion_bet` on `LeagueDetail`
- `designReferences/data.jsx` — existing `TEAM_FLAGS` and `TOP_CANDIDATES` constants for reference (not for production use)

### Dependent Files

- `lib/api/types.ts` — all downstream consumers of `LeagueDetail` will gain `has_champion_bet`
- `app/api/leagues/[id]/route.ts` — GET handler (task_02) must include the new field
- `app/api/leagues/[id]/champion-bet/route.ts` — PUT handler (task_03) imports `VALID_TEAM_NAMES` and `BET_DEADLINE`
- `components/PreCopaBetModal.tsx` — modal component (task_04) imports `FEATURED_TEAMS` and `ALL_COPA_TEAMS`

### Related ADRs

- [ADR-002: Bet Status via Extended LeagueDetail Response](adrs/adr-002.md) — `has_champion_bet` addition to `LeagueDetail`
- [ADR-003: Single PUT Endpoint with Upsert](adrs/adr-003.md) — `VALID_TEAM_NAMES` and `BET_DEADLINE` are server-side enforcement tools

## Deliverables

- `lib/copa-teams.ts` — complete static data file
- `lib/api/types.ts` — updated with `ChampionBet` and `LeagueDetail.has_champion_bet`
- Unit tests for `lib/copa-teams.ts` with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `ALL_COPA_TEAMS` contains no duplicate `name` values
  - [x] `ALL_COPA_TEAMS` contains no duplicate `code` values
  - [x] `FEATURED_TEAMS` has exactly 12 entries
  - [x] `FEATURED_TEAMS` is a subset of `ALL_COPA_TEAMS` (every featured team appears in the full list)
  - [x] `FEATURED_TEAMS` appears at the start of `ALL_COPA_TEAMS` (first 12 entries match)
  - [x] `VALID_TEAM_NAMES` contains every name in `ALL_COPA_TEAMS` and no extras
  - [x] `BET_DEADLINE` equals `new Date('2026-06-11T21:00:00.000Z')`
  - [x] `ALL_COPA_TEAMS` entry for "Inglaterra" has `code === 'gb-eng'`
- Integration tests:
  - [ ] (none — static data file; no runtime integration)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- TypeScript compilation passes with `strict: true` (no new type errors)
- `FEATURED_TEAMS` matches the 12 teams shown in the reference design screenshots
- `BET_DEADLINE` is exactly `2026-06-11T21:00:00.000Z` (18:00 BRT)
