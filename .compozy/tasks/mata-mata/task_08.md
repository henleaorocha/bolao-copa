---
status: completed
title: "Sync result ingestion (status + scores)"
type: backend
complexity: medium
dependencies: []
---

# Task 08: Sync result ingestion (status + scores)

## Overview

Teach the existing hourly match-sync to ingest match *results* — fixture status and goals — which it does not do today (it hardcodes `status: 'scheduled'` and never writes scores). This closes the gap that scoring depends on: without finished status and real scores, the scoring engine has nothing to score.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST extend the `lib/football-api.ts` fixture interface to include `fixture.status.short` and `goals.home`/`goals.away`.
- MUST map fixture status: `NS` → `scheduled`; live codes (e.g. `1H/HT/2H/ET/P`) → `live`; `FT/AET/PEN` → `finished` — consistent with the DB `status` CHECK (`scheduled,live,finished`).
- MUST write `home_score`/`away_score` from `goals.home`/`goals.away` into the `matches` row (null when not yet available).
- MUST preserve the existing upsert-by-`external_id` behavior and the delete-rows-with-null-`external_id` behavior unchanged.
- MUST NOT change the round→phase mapping, the cron schedule, or make extra external calls beyond the existing fixture fetch.
- MUST emit the `sync_result_ingested` structured-log event (finished_count, scored_matches), per the TechSpec "Monitoring" section.
</requirements>

## Subtasks
- [x] 8.1 Extend the fixture interface in `lib/football-api.ts` with `status.short` and `goals.home/away`.
- [x] 8.2 Add a status mapping (NS→scheduled / live codes→live / FT,AET,PEN→finished) in the sync route.
- [x] 8.3 Map goals into `home_score`/`away_score` in the upsert payload (replacing the hardcoded `status:'scheduled'`, no-scores behavior).
- [x] 8.4 Add the `sync_result_ingested` log event.
- [x] 8.5 Add unit tests for status/score mapping and an integration test for ingestion.

## Implementation Details

Modify `lib/football-api.ts` (fixture interface — currently `fixture.id/date/venue`, `league.round/group`, `teams.home/away` with no status/goals) and `app/api/admin/sync-matches/route.ts` (the upsert payload currently hardcodes `status: 'scheduled'` ~line 75 and omits scores). Keep the upsert-by-`external_id` (~lines 84-99) and the delete-null-`external_id` cleanup unchanged. The status-string mapping is the only new branching; default unknown codes to `scheduled` defensively. Scores come straight from `goals.home/away`. This task is independent of the bracket tasks but is the prerequisite for task_09 producing meaningful (non-zero) output.

### Relevant Files
- `lib/football-api.ts` — fixture interface to extend with `status.short` + `goals`.
- `app/api/admin/sync-matches/route.ts` — round→phase map (~lines 11-19), upsert payload (~lines 62-99) where `status` is hardcoded and scores are omitted.
- `supabase/migrations/20260522000005_create_matches.sql` — `status` CHECK (`scheduled,live,finished`) and `home_score`/`away_score` columns the mapping targets.
- `lib/api/types.ts` — `Match` type carrying `status`/scores.

### Dependent Files
- `app/api/leagues/[id]/route.ts` (task_09) — scoring reads `status='finished'` rows with real scores produced here.
- `app/api/leagues/[id]/bracket/route.ts` (task_02) — `finished` slot state relies on ingested status/scores.

### Related ADRs
- [ADR-003: Mata-mata Establishes the Full-Tournament Scoring Engine](../adrs/adr-003.md) — points recompute when results arrive via the existing sync.
- [ADR-005: Compute-on-Read Scoring with Pure Functions](../adrs/adr-005.md) — result ingestion feeds compute-on-read; corrected scores reflect on next read.
- [ADR-004: Bracket Skeleton as Static Code + Slot Mapping via Official Calendar](../adrs/adr-004.md) — result ingestion is independent of slot mapping but flows through the same sync.

## Deliverables
- Extended fixture interface and status/score mapping in the sync path.
- `sync_result_ingested` log event.
- Unit tests for mapping + integration test for ingestion, 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Status mapping: `NS` → `scheduled`; a live code (`1H`/`2H`/`ET`) → `live`; `FT` → `finished`; `AET`/`PEN` → `finished`; unknown code → `scheduled`.
  - [x] Goals mapping: `goals.home=2, goals.away=1` → `home_score=2, away_score=1`; null goals → null scores.
- Integration tests (mocked Supabase + mocked feed, per existing sync test pattern):
  - [x] A `FT` fixture with goals upserts a row with `status='finished'` and the correct scores.
  - [x] An `NS` fixture upserts `status='scheduled'` with null scores.
  - [x] Upsert-by-`external_id` and delete-null-`external_id` behavior remain unchanged.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The sync writes real `status` and `home_score`/`away_score`; finished knockout/group matches become available for scoring within the existing hourly cadence.
- `npm run type-check`, `npm run lint`, and `npm run test` pass.
