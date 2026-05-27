---
status: completed
title: "Static bracket skeleton (`lib/bracket-skeleton.ts`)"
type: backend
complexity: medium
dependencies: []
---

# Task 01: Static bracket skeleton (`lib/bracket-skeleton.ts`)

## Overview

Create the immutable, version-controlled source of truth for the 2026 knockout bracket: 32 slot definitions across 6 phases with design-accurate placeholder labels, official topology, and an official-calendar key used to map live fixtures to slots at read time. This config drives every downstream piece (the bracket endpoint, the screen, the predictions guard) and exists entirely in code so no migration or sync change is needed for matchup fill.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST define `KnockoutPhase` = `'32nd' | '16th' | '8th' | 'semi' | '3rd_place' | 'final'` and `PHASE_ORDER` in render order, per the TechSpec "Core Interfaces" section.
- MUST export `BRACKET_SKELETON` as a `readonly BracketSlot[]` of exactly 32 entries: 16 in `32nd`, 8 in `16th`, 4 in `8th`, 2 in `semi`, 1 in `3rd_place`, 1 in `final`.
- Each `BracketSlot` MUST carry `phase`, 1-based `pos`, human-readable `homeLabel`/`awayLabel` (e.g. `"Vencedor 1º Grupo A"`, `"Vencedor 1/16 #1"`), optional `feeds` topology, and a `calendarKey { date, venue }` from the official 2026 schedule.
- MUST expose a deterministic read-time slot-resolution lookup that maps a match's `(match_date, venue)` to its `(phase, pos)` slot (no DB column, nothing persisted), per ADR-004.
- MUST export a shared `isConfirmedMatchup(homeTeam, awayTeam)` predicate returning true only when BOTH names are in `VALID_TEAM_NAMES` (from `lib/copa-teams.ts`); this is reused by task_02 and task_05.
- MUST NOT seed any rows into the database and MUST NOT invent or infer advancing teams.
- `(phase, pos)` pairs MUST be unique; every `feeds` reference MUST resolve to an existing slot; every `calendarKey` MUST be unique.
</requirements>

## Subtasks
- [x] 1.1 Define `KnockoutPhase`, `PHASE_ORDER`, and the `BracketSlot` interface.
- [x] 1.2 Author the 32 slot entries from the official 2026 knockout schedule (labels + topology + calendar keys).
- [x] 1.3 Implement the read-time `(date, venue) → (phase, pos)` slot-resolution lookup helper.
- [x] 1.4 Implement and export the shared `isConfirmedMatchup` predicate using `VALID_TEAM_NAMES`.
- [x] 1.5 Write exhaustive structural unit tests (counts, uniqueness, feeder resolution, calendar-key uniqueness, confirmed predicate).

## Implementation Details

New file `lib/bracket-skeleton.ts`. Mirror the type signatures in the TechSpec "Core Interfaces" section (do not redefine differently). The `phase` slugs MUST match the existing DB `phase` enum values used by knockout (`32nd,16th,8th,semi,3rd_place,final`); note the `'4th'` enum value is dead and unused here. Placeholder label wording must match the design reference and PRD F2 ("Vencedor 1º Grupo A", later rounds "Vencedor 1/16 #1"). The calendar keys must come from the official 2026 schedule (dates + venues) — this is the technical dependency called out in the TechSpec "Development Sequencing" section.

### Relevant Files
- `lib/bracket-skeleton.ts` — new file authored by this task.
- `lib/copa-teams.ts` — exports `VALID_TEAM_NAMES` (and `ALL_COPA_TEAMS`); source for the `isConfirmedMatchup` predicate.
- `lib/api/types.ts` — existing `Match` type carrying the `phase` union; align phase slugs with it.
- `app/ligas/[id]/components/BetHero.tsx` — existing Portuguese phase-label mapping to stay consistent with for label wording.
- `supabase/migrations/20260522000005_create_matches.sql` — defines the `phase` CHECK enum the slugs must match.

### Dependent Files
- `app/api/leagues/[id]/bracket/route.ts` (task_02) — consumes the skeleton, lookup, and `isConfirmedMatchup`.
- `app/api/leagues/[id]/predictions/[matchId]/route.ts` (task_05) — consumes `isConfirmedMatchup`.

### Related ADRs
- [ADR-001: Knockout Matchup Auto-Fill via Static Skeleton + Sync](../adrs/adr-001.md) — Product owns the placeholder skeleton; feed is the authority on advancement.
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](../adrs/adr-004.md) — Immutable TS skeleton; slot resolved at read time by date+venue; no migration.

## Deliverables
- `lib/bracket-skeleton.ts` with `KnockoutPhase`, `PHASE_ORDER`, `BracketSlot`, `BRACKET_SKELETON` (32 entries), the slot-resolution lookup, and `isConfirmedMatchup`.
- Unit tests with 80%+ coverage **(REQUIRED)**.
- Structural validation tests for the skeleton config **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `BRACKET_SKELETON` has exactly 32 slots with per-phase counts 16/8/4/2/1/1.
  - [x] Every `(phase, pos)` pair is unique across the skeleton.
  - [x] Every `feeds` reference points to an existing `(phase, pos)` slot.
  - [x] Every `calendarKey` is unique; no two slots share a `(date, venue)`.
  - [x] Slot-resolution lookup returns the correct `(phase, pos)` for a known schedule `(date, venue)` and returns null/undefined for an unknown key.
  - [x] `isConfirmedMatchup('Brasil','Argentina')` is true; `isConfirmedMatchup('Vencedor 1º Grupo A','Argentina')` is false; one-real-one-placeholder is false.
- Integration tests:
  - [x] N/A for this pure-config module — exercised end-to-end via task_02 integration tests.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 32 slots authored with correct topology, labels, and unique calendar keys matching the official 2026 schedule.
- `isConfirmedMatchup` and the slot-resolution lookup are exported and importable by task_02 and task_05.
- `npm run type-check` passes for the new module.
