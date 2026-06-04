---
status: completed
title: EN→PT team-name normalization map
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 2: EN→PT team-name normalization map

## Overview
openfootball emits English team names (`"South Korea"`, `"Czech Republic"`, `"USA"`, `"Ivory Coast"`), but the app stores and validates Portuguese names. This task adds a dedicated normalization module mapping all 48 openfootball strings to the reconciled PT roster so the adapter, flags, and `isConfirmedMatchup` all agree.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- A new module `lib/team-names.ts` MUST export `OPENFOOTBALL_TO_PT` (48 entries) and `toPtName(name: string): string`.
- The map keys MUST be openfootball's exact strings (from the pinned fixture); values MUST equal the PT names from `lib/copa-teams.ts` (task_01).
- `toPtName` MUST return the PT name for known inputs and the original string unchanged for placeholders/unknowns (`"2A"`, `"W74"`, `"L101"`), so unmapped values stay visible rather than crashing.
- The map MUST resolve the tricky cases: `"South Korea"→Coreia do Sul`, `"Czech Republic"→República Tcheca`, `"USA"→EUA`, `"Ivory Coast"→Costa do Marfim`, `"Bosnia & Herzegovina"→Bósnia e Herzegovina`, `"DR Congo"→RD Congo`.

</requirements>

## Subtasks
- [x] 2.1 Extract the 48 exact EN names from `tests/fixtures/openfootball-wc2026.json` / `-teams.json`.
- [x] 2.2 Create `lib/team-names.ts` with `OPENFOOTBALL_TO_PT` mapping each to its task_01 PT name.
- [x] 2.3 Implement `toPtName` with pass-through for unknown/placeholder strings.
- [x] 2.4 Un-skip and rewrite `tests/unit/sync-team-name-normalization.test.ts` against real openfootball strings.

## Implementation Details
Create `lib/team-names.ts` (new). It is a pure data + lookup module consumed by the adapter (task_03) and reused to un-skip `tests/unit/sync-team-name-normalization.test.ts`. The existing skipped test currently mocks the api-sports shape — it must be rewritten to drive the openfootball seam and assert flag resolution and `isConfirmedMatchup`. Reference TechSpec "Team name normalization" and ADR-006 Implementation Notes for the full mapping intent.

### Relevant Files
- `lib/team-names.ts` — new module (the deliverable).
- `lib/copa-teams.ts` — provides the canonical PT names (map values must match).
- `tests/fixtures/openfootball-wc2026-teams.json` — authoritative EN name list.
- `tests/unit/sync-team-name-normalization.test.ts` — skipped spec to un-skip with real strings.

### Dependent Files
- `lib/football-api.ts` (task_03) — `mapOpenfootballMatch` calls `toPtName` for `team1`/`team2`.

### Related ADRs
- [ADR-006: Replace api-sports with an openfootball ingestion adapter](adrs/adr-006.md) — EN→PT normalization keyed to openfootball's exact strings.
- [ADR-003: Seed 020 is the source of truth](adrs/adr-003.md) — the PT targets the map points to.

## Deliverables
- `lib/team-names.ts` with `OPENFOOTBALL_TO_PT` (48) and `toPtName`.
- Re-enabled `tests/unit/sync-team-name-normalization.test.ts` driving openfootball strings.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `toPtName("South Korea")` returns `"Coreia do Sul"`.
  - [x] `toPtName("Czech Republic")` returns `"República Tcheca"`; `toPtName("USA")` returns `"EUA"`; `toPtName("Ivory Coast")` returns `"Costa do Marfim"`.
  - [x] `toPtName("Bosnia & Herzegovina")`/`toPtName("DR Congo")` return the reconciled PT names.
  - [x] `toPtName("W74")` and `toPtName("2A")` pass through unchanged.
  - [x] Every value in `OPENFOOTBALL_TO_PT` is a member of `VALID_TEAM_NAMES` (48 keys).
- Integration tests:
  - [x] Un-skipped `sync-team-name-normalization.test.ts`: a normalized matchup resolves flags and passes `isConfirmedMatchup`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- All 48 openfootball EN names map to valid PT roster names
- Placeholder/unknown strings pass through untouched
