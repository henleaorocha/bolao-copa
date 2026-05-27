---
status: completed
title: "Pure scoring engine (`lib/scoring.ts`)"
type: backend
complexity: medium
dependencies: []
---

# Task 07: Pure scoring engine (`lib/scoring.ts`)

## Overview

Build the tournament-wide scoring engine as pure, I/O-free functions: group-stage hits, champion/vice bets, and multiplier-weighted knockout hits. This is the trust-critical surface that turns the product's "cada palpite vale mais pontos" promise into real points, so it is exhaustively unit-tested against the documented scoring scheme before any results arrive.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST export `PHASE_MULTIPLIERS` = `{ '32nd':1.5, '16th':2, '8th':2.5, semi:3, '3rd_place':3.5, final:4 }` keyed by `KnockoutPhase`.
- MUST export `scoreGroup(input)` returning +10 for exact score, +5 for correct outcome, 0 otherwise — per the documented scheme (the single source of truth).
- MUST export `scoreKnockout(input, phase)` returning `scoreGroup(input) × PHASE_MULTIPLIERS[phase]`.
- MUST export `scoreChampion(pickChamp, pickVice, realChamp, realVice)` returning +50 for champion hit and +25 for vice hit (additive), 0 when unresolved/missed.
- MUST be PURE: no Supabase, no fetch, no Date/clock dependence, no module side effects.
- MUST produce integer results for the documented multipliers (e.g. 10×1.5=15, 5×2.5=12.5 → confirm rounding/representation against the documented scheme and assert it explicitly in tests).
- MUST reuse the `KnockoutPhase` type/slug set consistent with `lib/bracket-skeleton.ts` (no divergent phase strings).
</requirements>

## Subtasks
- [x] 7.1 Define the `ScoreInput` shape (predicted vs real home/away) per the TechSpec "Core Interfaces" section.
- [x] 7.2 Implement `scoreGroup` (exact / outcome / miss).
- [x] 7.3 Implement `scoreKnockout` applying the phase multiplier.
- [x] 7.4 Implement `scoreChampion` (+50 / +25, additive, unresolved → 0).
- [x] 7.5 Write table-driven unit tests covering every branch and every multiplier.

## Implementation Details

New file `lib/scoring.ts`. Signatures per the TechSpec "Core Interfaces" (`ScoreInput`, `scoreGroup`, `scoreKnockout`, `scoreChampion`) and the multiplier table from ADR-005's implementation notes. The documented scheme in `ScoringSchemeCard.tsx` is the authority for point values (group +10/+5, champion +50, vice +25, multipliers 1.5×–4×). Base knockout hit reuses the group rule (+10 exact / +5 outcome) per the PRD open-question assumption. Keep these functions free of any I/O so they can be reduced over loaded data in task_09 and validated in isolation. The `KnockoutPhase` type should come from / align with `lib/bracket-skeleton.ts` (task_01) but this task has no runtime dependency on it — it can re-declare or import the type without needing task_01's data.

### Relevant Files
- `lib/scoring.ts` — new pure module authored by this task.
- `app/ligas/[id]/components/ScoringSchemeCard.tsx` — documented point scheme (source of truth for values).
- `lib/bracket-skeleton.ts` — `KnockoutPhase` slug set to stay consistent with (task_01).
- `lib/api/types.ts` — shared types for predictions/matches consumed downstream.

### Dependent Files
- `app/api/leagues/[id]/route.ts` (task_09) — reduces loaded data through these functions to build `user_stats` + ranking.

### Related ADRs
- [ADR-003: Mata-mata Establishes the Full-Tournament Scoring Engine](../adrs/adr-003.md) — one engine for group, champion/vice, and knockout.
- [ADR-005: Compute-on-Read Scoring with Pure Functions](../adrs/adr-005.md) — pure `lib/scoring.ts`; multiplier table; champion/vice resolve only when final.

## Deliverables
- `lib/scoring.ts` with `PHASE_MULTIPLIERS`, `scoreGroup`, `scoreKnockout`, `scoreChampion`.
- Exhaustive table-driven unit tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `scoreGroup`: exact score (2-1 vs 2-1) → 10; correct outcome non-exact (2-1 vs 3-1) → 5; wrong outcome (2-1 vs 1-2) → 0; draw exact and draw outcome cases.
  - [x] `scoreKnockout`: each phase multiplier applied to a +10 base (15 / 20 / 25 / 30 / 35 / 40) and to a +5 base (7.5 / 10 / 12.5 / 15 / 17.5 / 20), with the documented rounding/representation asserted.
  - [x] `scoreKnockout`: a miss (0 base) → 0 for every phase.
  - [x] `scoreChampion`: champion hit only → 50; vice hit only → 25; both → 75; neither → 0; unresolved (real champ/vice null) → 0.
  - [x] Functions are pure: same input → same output, no clock/IO dependence.
- Integration tests:
  - [x] N/A for this pure module — exercised end-to-end via task_09 league-API integration tests.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- All scoring branches and every phase multiplier match the documented scheme exactly (validated against known fixtures).
- `npm run type-check` and `npm run test` pass for the new module.
