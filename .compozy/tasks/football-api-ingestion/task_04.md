---
status: completed
title: Re-key knockout bracket to openfootball num
type: backend
complexity: high
dependencies:
  - task_03
---

# Task 4: Re-key knockout bracket to openfootball num

## Overview
The bracket resolves a synced match to a slot via `resolveSlot(date, venue)`, but openfootball's `ground` is a city (not a stadium), so the venue key can never match and the bracket never fills. This task re-keys the knockout topology to openfootball's stable `num`, mapping matches to slots by `external_id` and deriving feeds from the `W##`/`#A`/`L##` placeholders.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Each `BRACKET_SKELETON` slot MUST carry its openfootball `num` (and a round-derived key for the two no-`num` Final/3rd matches).
- `buildBracketResponse` MUST map matches to slots by `external_id` (= `wc2026-<num>` / `-final` / `-3rd`), NOT by `(date, venue)`.
- `resolveSlot`, the per-slot `calendarKey {date, venue}`, and `SLOT_BY_CALENDAR` MUST be removed.
- Slot `feeds`/source labels MUST be derived from the openfootball `W##`/`#A`/`L##` placeholder codes (tolerant parsing for spelling variance).
- `PHASE_ORDER`, phase multipliers, PT labels, and `isConfirmedMatchup` MUST remain unchanged in behavior.
- The now-obsolete `tests/unit/bracket-timestamp-format.test.ts` (tests `resolveSlot`) MUST be removed.
</requirements>

## Subtasks
- [x] 4.1 Replace each slot's `calendarKey` with its openfootball `num` (and round key for Final/3rd).
- [x] 4.2 Derive `feeds`/source labels from the `W##`/`#A`/`L##` placeholders using a tolerant parser.
- [x] 4.3 Remove `resolveSlot` and `SLOT_BY_CALENDAR`.
- [x] 4.4 Switch `buildBracketResponse` to index matches by `external_id`.
- [x] 4.5 Confirm the bracket route still selects knockout phases and passes matches through unchanged.
- [x] 4.6 Update `bracket-skeleton.test.ts`; delete `bracket-timestamp-format.test.ts`; adjust any other consumers.

## Implementation Details
Modify `lib/bracket-skeleton.ts` (slot keys + feeds), `lib/bracket.ts` (`matchBySlot` keyed by `external_id` instead of `resolveSlot`), and verify `app/api/leagues/[id]/bracket/route.ts` needs no logic change (it already selects knockout phases and delegates to `buildBracketResponse`). The 16 R32 + 8 R16 + 4 QF + 2 SF carry `num` 73–102; Final/3rd map via `wc2026-final`/`wc2026-3rd`. Reference TechSpec "Knockout bracket" and ADR-007 for placeholder semantics (`"2A"`=runner-up Group A, `"W74"`=winner of 74, `"L101"`=loser of 101).

### Relevant Files
- `lib/bracket-skeleton.ts` — re-key slots to `num`; remove `resolveSlot`/`calendarKey`/`SLOT_BY_CALENDAR`.
- `lib/bracket.ts` — `buildBracketResponse` maps by `external_id`.
- `app/api/leagues/[id]/bracket/route.ts` — consumer; verify unchanged.
- `tests/unit/bracket-skeleton.test.ts` — update to `num`/`external_id` assertions.
- `tests/unit/bracket-timestamp-format.test.ts` — delete (tests removed `resolveSlot`).
- `tests/unit/bracket-helper.test.ts` — adjust if it relied on `resolveSlot`.
- `tests/fixtures/openfootball-wc2026.json` — knockout `num`/placeholder source for tests.

### Dependent Files
- `app/api/leagues/[id]/bracket/route.ts` — serves the rebuilt bracket.
- Validation harness (task_09) — knockout scenarios depend on the bracket filling by `external_id`.

### Related ADRs
- [ADR-007: Key the knockout bracket to openfootball num](adrs/adr-007.md) — the core decision and rejected alternatives.
- [ADR-006: openfootball adapter](adrs/adr-006.md) — produces `external_id = wc2026-<num>`.

## Deliverables
- `lib/bracket-skeleton.ts` re-keyed to `num` with placeholder-derived feeds; `resolveSlot`/`SLOT_BY_CALENDAR` removed.
- `lib/bracket.ts` mapping matches by `external_id`.
- `bracket-skeleton.test.ts` updated; `bracket-timestamp-format.test.ts` deleted.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] A match with `external_id: 'wc2026-73'` fills R32 slot pos 1.
  - [x] Final/3rd matches fill via `wc2026-final`/`wc2026-3rd`.
  - [x] Feeds derived from `W74`/`2A`/`L101` link the correct downstream slot/side.
  - [x] Tolerant parser handles a spelling variant (e.g. `"Winner 74"` vs `"W74"`).
  - [x] `resolveSlot`/`SLOT_BY_CALENDAR` no longer exported (referencing them fails to compile/import).
  - [x] A confirmed knockout matchup yields `state` open/locked/finished per kickoff vs deadline.
- Integration tests:
  - [x] `buildBracketResponse` over fixture-derived knockout matches fills all expected slots and leaves unknown matchups as placeholders.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Knockout slots map to the correct bracket position by `external_id` when teams are known
- `resolveSlot`/`calendarKey`/`SLOT_BY_CALENDAR` fully removed
