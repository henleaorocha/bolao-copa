---
status: completed
title: Reconcile 2026 roster to seed 020
type: backend
complexity: medium
dependencies: []
---

# Task 1: Reconcile 2026 roster to seed 020

## Overview
`lib/copa-teams.ts` lists a non-qualified nation (Itália) and is missing six real 2026 qualifiers, which blocks valid predictions, flags, and champion bets for real teams. This task reconciles the roster to the verified seed 020 draw so every surface that names a team (validity checks, flags, champion/runner-up picker) reflects the real 48 nations.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- The roster MUST equal seed 020's 48 teams: add Irã, Iraque, Suécia, Turquia, Bósnia e Herzegovina, RD Congo; remove Itália, Camarões, Dinamarca, Honduras, Jamaica, Bolívia.
- `VALID_TEAM_NAMES` MUST be derived from the reconciled list (no stale entries).
- Every team MUST carry a valid ISO flag `code` so flag resolution returns a value for all 48.
- PT names MUST exactly match the targets the EN→PT map (task_02) and the validation seeds (task_09) will use, so `isConfirmedMatchup` passes.
- The change MUST NOT alter scoring, deadline, or ranking logic.
</requirements>

## Subtasks
- [x] 1.1 Remove the six non-qualified nations from `ALL_COPA_TEAMS`/`FEATURED_TEAMS`.
- [x] 1.2 Add the six real qualifiers with correct PT names and flag codes.
- [x] 1.3 Confirm the final list is exactly 48 and cross-check against `tests/fixtures/openfootball-wc2026-teams.json`.
- [x] 1.4 Verify `VALID_TEAM_NAMES` and any champion/flag consumers still resolve for all 48.
- [x] 1.5 Update `tests/unit/copa-teams.test.ts` to assert the reconciled roster.

## Implementation Details
Modify `lib/copa-teams.ts` only. The roster is the single source of truth for `VALID_TEAM_NAMES`, flag lookup (`resolveFlag` in the sync route), and the champion/runner-up picker. Decide whether the six new teams belong in `FEATURED_TEAMS` or the long tail — preserve the existing `FEATURED_TEAMS`/`ALL_COPA_TEAMS` split shape. Cross-reference seed 020 (`supabase/migrations/20260526000020_seed_real_copa2026_group_stage.sql`) and the captured team fixture for the authoritative names/groups. Reference TechSpec "Data Models" and "Roster source of truth".

### Relevant Files
- `lib/copa-teams.ts` — the roster module being reconciled (drives validity/flags/champion).
- `tests/unit/copa-teams.test.ts` — must be updated to assert the new 48.
- `tests/fixtures/openfootball-wc2026-teams.json` — cross-check of the real roster.
- `supabase/migrations/20260526000020_seed_real_copa2026_group_stage.sql` — seed 020, the source of truth.

### Dependent Files
- `app/api/admin/sync-matches/route.ts` — `resolveFlag` reads `ALL_COPA_TEAMS`; new names must resolve.
- `lib/team-names.ts` (task_02) — EN→PT targets must equal these PT names.
- Champion/runner-up picker components — render from this roster.

### Related ADRs
- [ADR-003: Seed 020 is the source of truth for the 2026 team roster](adrs/adr-003.md) — defines the exact six-for-six swap.

## Deliverables
- `lib/copa-teams.ts` reconciled to the 48 seed-020 teams with valid flag codes.
- Updated `tests/unit/copa-teams.test.ts` asserting the roster.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Roster contains exactly 48 teams.
  - [x] Roster includes Irã, Iraque, Suécia, Turquia, Bósnia e Herzegovina, RD Congo (stored as the seed-020 name `Rep. Democrática do Congo`).
  - [x] Roster excludes Itália, Camarões, Dinamarca, Honduras, Jamaica, Bolívia.
  - [x] `VALID_TEAM_NAMES` has 48 unique entries and contains every added team.
  - [x] Every team's flag `code` is non-empty (flag resolution returns a value for all 48).
- Integration tests:
  - [x] Sync route `resolveFlag` returns a code for each newly added team name. (Covered at the data layer by a test mirroring `resolveFlag`'s exact lookup; the route's private function is unchanged and out of scope per "modify copa-teams.ts only".)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Roster matches seed 020 exactly (0 non-qualified teams listed)
- Flags resolve for all 48 teams
