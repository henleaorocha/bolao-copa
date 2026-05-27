---
status: completed
title: Pure computeRanking() helper + RankingFullEntry type
type: backend
complexity: medium
dependencies: []
---

# Task 01: Pure computeRanking() helper + RankingFullEntry type

## Overview
Extract the league ranking computation into a pure, I/O-free helper at `lib/ranking.ts` that both API endpoints will share, and add the `RankingFullEntry` type to the API type module. This is the single source of truth for per-member scoring, the exact/outcome counts, and the new most-recent-exact-score tiebreaker — everything downstream depends on it.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST expose a pure `computeRanking(args: RankingComputeArgs): RankingFullEntry[]` function that performs NO I/O (no Supabase, no fetch) — it operates only on the rows passed in. See TechSpec "Core Interfaces".
- MUST compute per-member `points` with parity to the current inline logic, reusing `scoreGroup` / `scoreKnockout` / `scoreChampion` from `lib/scoring.ts` (no reimplementation of scoring math).
- MUST compute `exact_scores` (predicted home AND away equal actual) and `correct_outcomes` (correct winner/draw direction), where exact scores are a strict subset of correct outcomes.
- MUST apply the tiebreaker comparator within each equal-points tier in this order: `points` desc → `hasExact` desc → `mostRecentExactDate` desc → `full_name.localeCompare(other, 'pt-BR')` asc. See ADR-003.
- MUST derive `mostRecentExactDate` per member as `max(match_date)` across that member's exact-score predictions on finished matches; `null` when the member has no exact score. This value is used only for sorting and is NOT returned.
- MUST assign 1-based `position` reflecting final sorted order.
- MUST exclude champion-bet points from the `exact_scores` and `correct_outcomes` counts (champion points contribute to `points` only).
- MUST add the `RankingFullEntry` interface to `lib/api/types.ts` (additive, alongside `RankingEntry`).
</requirements>

## Subtasks
- [x] 01.1 Add the `RankingFullEntry` interface and the helper's input interfaces (`RankingMemberInput`, `RankingMatchInput`, `RankingComputeArgs`) per the TechSpec "Core Interfaces" section.
- [x] 01.2 Implement per-member accumulation of points, exact-score count, correct-outcome count, and most-recent-exact `match_date`.
- [x] 01.3 Implement the three-level tiebreaker comparator with the fixed `pt-BR` locale name fallback.
- [x] 01.4 Assign final 1-based positions over the sorted list and return `RankingFullEntry[]`.
- [x] 01.5 Write unit tests covering scoring parity, count semantics, every tiebreaker level, and the pre-tournament all-zero case.

## Implementation Details
Create `lib/ranking.ts` exporting `computeRanking()` plus the input interfaces. The function mirrors the existing inline loop in `app/api/leagues/[id]/route.ts:220-264` (points + exact counting) but adds `correct_outcomes` and the most-recent-exact-date accumulation, and replaces the `joined_at` sort (`route.ts:266-273`) with the new comparator. Phase routing uses `scoreGroup` for `'group'` and `scoreKnockout` for knockout phases, exactly as the current handler does. Add `RankingFullEntry` to `lib/api/types.ts` directly after `RankingEntry` (around line 80). Reference the TechSpec "Core Interfaces" and "Data Models" sections for field names and the comparator; do not invent additional fields.

### Relevant Files
- `lib/ranking.ts` — new pure helper to create (function + input interfaces).
- `lib/scoring.ts` — `scoreGroup`, `scoreKnockout`, `scoreChampion` (lines 19-40) and `PHASE_MULTIPLIERS`; reused, not modified.
- `lib/api/types.ts` — add `RankingFullEntry` after `RankingEntry` (lines 74-80).
- `app/api/leagues/[id]/route.ts` — current inline loop (220-264) and `joined_at` tiebreaker (266-273) as the behavioral reference for parity.
- `tests/unit/league-detail-get-api.test.ts` — source of fixture shapes (`makePrediction`, `makeFinishedMatch`, `makeChampBet`, lines 32-72) to model helper fixtures on.

### Dependent Files
- `app/api/leagues/[id]/route.ts` — will be refactored to call this helper (task_02).
- `app/api/leagues/[id]/ranking/route.ts` — new endpoint will call this helper (task_03).
- `app/ligas/[id]/ranking/Podium.tsx` and `RankingTable.tsx` — consume `RankingFullEntry` (task_04, task_05).

### Related ADRs
- [ADR-002: Dedicated Ranking Endpoint Backed by a Shared Scoring Helper](../adrs/adr-002.md) — mandates this pure shared helper as the single source of truth.
- [ADR-003: Most-Recent-Exact-Score Tiebreaker](../adrs/adr-003.md) — defines the comparator implemented here.

## Deliverables
- `lib/ranking.ts` with a pure `computeRanking()` and its input interfaces.
- `RankingFullEntry` interface added to `lib/api/types.ts`.
- Unit tests `tests/unit/ranking-helper.test.ts` with 80%+ coverage **(REQUIRED)**
- Integration coverage of the helper through the consuming endpoints is delivered in task_02/task_03; this task's own tests are pure-function unit tests **(REQUIRED)**

## Tests
- Unit tests (`tests/unit/ranking-helper.test.ts`, no mocks — pure function over fixture arrays):
  - [x] Points parity: a member with mixed group + knockout exact/outcome predictions yields the same total as `scoreGroup`/`scoreKnockout` summed manually.
  - [x] Champion bet: `scoreChampion` points are added to `points` but do NOT increment `exact_scores` or `correct_outcomes`.
  - [x] `correct_outcomes` includes exact scores: a member with 2 exact + 1 correct-direction-only prediction reports `exact_scores: 2`, `correct_outcomes: 3`.
  - [x] Tiebreaker level 1: two members tied on points, one with an exact score and one without — the member with an exact score ranks higher.
  - [x] Tiebreaker level 2: two members tied on points, both with exact scores, the one whose latest exact is on the later `match_date` ranks higher.
  - [x] Tiebreaker level 3: members tied on points with identical most-recent-exact `match_date` are ordered A→Z by `full_name` using `pt-BR` locale.
  - [x] All-zero pre-tournament league (no finished matches): every member has 0 points and the list is alphabetical by `full_name`.
  - [x] Fewer than 3 members returns a correctly ordered list of the available members.
- Integration tests:
  - [ ] Covered via the endpoints in task_02 and task_03 (this task ships pure unit tests only; no separate test-only task).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `computeRanking()` performs no I/O and returns a deterministic, fully ordered `RankingFullEntry[]`.
- Scoring totals match the existing panel endpoint behavior for identical inputs (only tie ordering differs).
