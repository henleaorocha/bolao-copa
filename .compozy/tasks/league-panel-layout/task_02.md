---
status: completed
title: Extend `LeagueDetail` types (`UserStats`, `RankingEntry`)
type: backend
complexity: low
dependencies: []
---

# Task 2: Extend `LeagueDetail` types (`UserStats`, `RankingEntry`)

## Overview

`lib/api/types.ts` is the single source of truth for API response shapes. This task adds two new interfaces (`UserStats`, `RankingEntry`) and extends `LeagueDetail` with three new fields (`prizes`, `user_stats`, `ranking`). All downstream tasks — the API extension (task_03) and all frontend components (tasks 04–09) — depend on these type definitions being present and correct.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add `UserStats` and `RankingEntry` interfaces to `lib/api/types.ts` exactly as specified in the TechSpec "Core Interfaces" section.
2. MUST add `prizes: string | null`, `user_stats: UserStats`, and `ranking: RankingEntry[]` fields to the `LeagueDetail` interface.
3. MUST NOT modify any existing fields or interfaces in `lib/api/types.ts` — only additions are permitted.
4. MUST NOT break TypeScript compilation for any existing file that imports from `lib/api/types.ts`.
5. SHOULD export `UserStats` and `RankingEntry` as named exports so components can import them directly.
</requirements>

## Subtasks

- [x] 2.1 Add the `UserStats` interface with all five numeric fields (`position`, `points`, `guesses_made`, `guesses_total`, `exact_scores`).
- [x] 2.2 Add the `RankingEntry` interface with `user_id`, `full_name`, `avatar_color`, `points`, and `position` fields.
- [x] 2.3 Extend `LeagueDetail` with `prizes: string | null`, `user_stats: UserStats`, and `ranking: RankingEntry[]`.
- [x] 2.4 Run TypeScript compilation to confirm zero type errors across the codebase.

## Implementation Details

See TechSpec "Core Interfaces" section for the exact field names, types, and inline comments.

All changes are additive — no existing interface is modified. The `LeagueDetail` interface currently extends `LeagueSummary` in `lib/api/types.ts`; add the three new fields after the existing fields.

### Relevant Files

- `lib/api/types.ts` — the only file changed in this task; contains `LeagueSummary`, `LeagueDetail`, `LeagueMember`, `AuthUser`, `ChampionBet`, `CopaCountdown`

### Dependent Files

- `app/api/leagues/[id]/route.ts` — task_03 constructs the extended response; needs `UserStats` and `RankingEntry` types
- `app/ligas/[id]/components/*.tsx` — all Painel section components import from this file
- `tests/unit/league-detail.test.tsx` — existing tests import `LeagueDetail`; must remain passing

### Related ADRs

- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Justifies defining the full final type shape now, even though values are stub zeros

## Deliverables

- Updated `lib/api/types.ts` with `UserStats`, `RankingEntry`, and extended `LeagueDetail`
- TypeScript compilation with zero errors (`tsc --noEmit`)
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests confirming type compatibility **(REQUIRED)**

## Tests

- Unit tests:
  - [x] A mock object of type `LeagueDetail` with all three new fields assigned compiles without TypeScript error.
  - [x] A `UserStats` object with `position: 0, points: 0, guesses_made: 0, guesses_total: 0, exact_scores: 0` satisfies the interface.
  - [x] A `RankingEntry` object with `full_name: null` satisfies the interface (nullable field check).
  - [x] A `LeagueDetail` object with `prizes: null` satisfies the interface (nullable prizes field).
- Integration tests:
  - [x] `tsc --noEmit` exits 0 after applying changes (no type regressions in existing imports).
- Test coverage target: >=80% (type definitions have no runtime branches; compiler check is the primary verification)
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `tsc --noEmit` exits 0 with zero new errors
- `UserStats`, `RankingEntry` are exported and importable by component files
