---
status: completed
title: TypeScript types for matches & predictions
type: backend
complexity: low
dependencies: []
---

# Task 02: TypeScript types for matches & predictions

## Overview

Adds the five new TypeScript interfaces (`Match`, `Prediction`, `MatchWithPrediction`, `MatchDetail`, `OutcomeDistribution`) to `lib/api/types.ts`. These types are the shared contract between all API endpoints and client components in this feature; every subsequent task depends on them.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `Match`, `Prediction`, `MatchWithPrediction`, `MatchDetail`, `OutcomeDistribution` to `lib/api/types.ts`
- MUST NOT break or rename any existing type exports in `lib/api/types.ts`
- `Match.phase` MUST use the union `'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final'`
- `Match.status` MUST use the union `'scheduled' | 'live' | 'finished'`
- `MatchWithPrediction.is_deadline_passed` MUST be typed as `boolean` (server-computed)
- `OutcomeDistribution` percentages MUST be typed as `number` (0–100)
- SHOULD export all new interfaces at the module level (no namespace nesting)
</requirements>

## Subtasks

- [x] 2.1 Add `Match` and `Prediction` base interfaces to `lib/api/types.ts`
- [x] 2.2 Add `MatchWithPrediction` (extends `Match`) and `OutcomeDistribution`
- [x] 2.3 Add `MatchDetail` (extends `MatchWithPrediction`)
- [x] 2.4 Confirm TypeScript compilation passes with `tsc --noEmit`

## Implementation Details

See TechSpec "Core Interfaces" section for exact field names, types, and nullability. All interfaces are added as named exports in `lib/api/types.ts` alongside existing types (`LeagueDetail`, `ChampionBet`, etc.). No new files are created.

`ApiFootballFixture` is also defined in this scope — it belongs in `lib/football-api.ts` (task_03), not here. Keep the two type files separate.

### Relevant Files

- `lib/api/types.ts` — the only file modified; existing types remain untouched

### Dependent Files

- `lib/football-api.ts` (task_03) — imports `Match` fields for mapping
- `app/api/admin/sync-matches/route.ts` (task_04) — uses `Match`
- `app/api/leagues/[id]/matches/route.ts` (task_05) — returns `MatchWithPrediction[]`
- `app/api/leagues/[id]/matches/[matchId]/route.ts` (task_06) — returns `MatchDetail`
- `app/api/leagues/[id]/predictions/[matchId]/route.ts` (task_07) — uses `Prediction`
- `app/ligas/[id]/components/UpcomingMatchesCard.tsx` (task_08) — consumes `MatchWithPrediction`
- `app/ligas/[id]/palpites/page.tsx` (task_09) — consumes `MatchWithPrediction`
- `app/ligas/[id]/palpites/[matchId]/page.tsx` (task_10) — consumes `MatchDetail`

## Deliverables

- Updated `lib/api/types.ts` with 5 new exported interfaces
- Unit tests confirming type shapes and TypeScript compilation **(REQUIRED)**
- No integration tests needed for pure type definitions

## Tests

- Unit tests:
  - [x] `Match` interface has all required fields: `id`, `external_id`, `home_team`, `away_team`, `home_flag`, `away_flag`, `match_date`, `phase`, `group`, `status`, `home_score`, `away_score`, `venue`, `city`
  - [x] `Match.phase` value `'group'` is valid; value `'quarter'` (not in union) causes a TypeScript error
  - [x] `MatchWithPrediction` extends `Match` and adds `prediction` (nullable) and `is_deadline_passed`
  - [x] `MatchDetail` extends `MatchWithPrediction` and adds `distribution` (nullable `OutcomeDistribution`)
  - [x] `OutcomeDistribution` has fields `home_win`, `draw`, `away_win`, `total_predictions` all typed as `number`
  - [x] `tsc --noEmit` exits 0 after adding the new interfaces
- Integration tests:
  - [ ] (None — pure type file, no runtime behavior)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `tsc --noEmit` exits 0
- All 5 interfaces exported from `lib/api/types.ts`
- No existing type imports across the codebase are broken
