---
status: completed
title: Rewrite football-api.ts as openfootball adapter
type: backend
complexity: high
dependencies:
  - task_01
  - task_02
---

# Task 3: Rewrite football-api.ts as openfootball adapter

## Overview
The ingestion path is still shaped around api-sports (numeric ids, status enum, stadium venues), which has no 2026 data. This task rewrites `lib/football-api.ts` behind the existing `fetchWorldCupFixtures()` seam to consume openfootball's free 2026 JSON, mapping its very different schema to the `matches` row shape, and wires the sync route to the new mapper so the build compiles.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST keep the exported seam `fetchWorldCupFixtures()` and add `mapOpenfootballMatch(m)` returning the `MatchRow` shape (see TechSpec "Core Interfaces").
- MUST fetch the openfootball raw URL with `next: { revalidate: 3600, tags: ['fixtures'] }` (preserve the cache contract); no api-sports key.
- MUST derive `status`: `score.ft` present → `finished` else `scheduled` (no `live`); unknown `score` shapes fall back to `scheduled`.
- MUST combine `date` + `time` offset (e.g. `"17:00 UTC-4"`) into an ISO `timestamptz`.
- MUST synthesize `external_id`: knockout `wc2026-<num>`; Final/3rd `wc2026-final`/`wc2026-3rd`; group `wc2026-<group>-<team1>-<team2>` (PT names).
- MUST parse `phase`/`group` from `round` ("Matchday N" → group; knockout round names → phase) and normalize EN→PT via `toPtName` (task_02).
- MUST parse defensively: non-array/`matches`-less body throws; unmapped team strings are logged (structured) and left as-is.
- The sync route MUST consume the new shape (mapping logic moves into/behind the adapter), keeping its response shape `{ upserted, skipped }`.
</requirements>

## Subtasks
- [x] 3.1 Replace the api-sports fetch with the openfootball raw-URL fetch + defensive parse.
- [x] 3.2 Implement `mapOpenfootballMatch`: status, date+offset→ISO, `external_id`, phase/group, EN→PT, flags.
- [x] 3.3 Define `OpenfootballMatch`/`MatchRow` interfaces; remove `ApiFootballFixture`/`mapFixtureStatus` from this file.
- [x] 3.4 Update `app/api/admin/sync-matches/route.ts` to build rows from the new adapter shape.
- [x] 3.5 Write/extend unit tests against the pinned fixture (status, date, external_id, phase/group).
- [x] 3.6 Log unmapped team strings structurally without failing the run.

## Implementation Details
Rewrite `lib/football-api.ts`. The route's current `parsePhaseAndGroup`/`resolveFlag` mapping must move to consume `MatchRow` (either inside `mapOpenfootballMatch` or kept thin in the route). The knockout `num` (73–102) is present on R32..SF; Final and 3rd place have no `num`. `time` carries a `UTC±N` offset that must be applied when forming the instant. Reference TechSpec "Core Interfaces", "Data flow (ingestion)", and "Integration Points". Mock boundaries stay: tests mock `fetchWorldCupFixtures`, `@supabase/supabase-js`, `next/cache`.

### Relevant Files
- `lib/football-api.ts` — full rewrite (the deliverable).
- `app/api/admin/sync-matches/route.ts` — consumes the new adapter shape; current mapping/`resolveFlag`/`parsePhaseAndGroup` adjusted.
- `lib/team-names.ts` — `toPtName` used for EN→PT (task_02).
- `lib/copa-teams.ts` — flag resolution source (task_01).
- `tests/fixtures/openfootball-wc2026.json` — pinned 104-match sample for offline mapping tests.
- `tests/unit/football-api.test.ts`, `tests/unit/sync-result-ingestion.test.ts` — adapter/ingestion tests to extend.

### Dependent Files
- `lib/bracket-skeleton.ts` / `lib/bracket.ts` (task_04) — depend on `external_id = wc2026-<num>`.
- `app/api/admin/sync-matches/route.ts` (task_06) — layers `is_manual` exclusion on top.
- api-sports env/refs (task_08) — cleaned after this rewrite removes the in-file types.

### Related ADRs
- [ADR-006: Replace api-sports with an openfootball ingestion adapter](adrs/adr-006.md) — defines the rewrite, status/date/external_id rules.
- [ADR-002: Adopt openfootball as the free match-data source](adrs/adr-002.md) — no `live`; operator override covers timeliness.

## Deliverables
- Rewritten `lib/football-api.ts` (`fetchWorldCupFixtures` + `mapOpenfootballMatch` + interfaces).
- Sync route updated to the new mapper; response `{ upserted, skipped }` preserved.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `mapOpenfootballMatch` with `score.ft` present → `status: 'finished'` and scores set.
  - [x] No `score` → `status: 'scheduled'`, null scores.
  - [x] `"17:00 UTC-4"` + date → correct ISO instant (offset applied).
  - [x] Knockout `num: 73` → `external_id: 'wc2026-73'`, phase from round name.
  - [x] Final → `external_id: 'wc2026-final'`; 3rd place → `'wc2026-3rd'`.
  - [x] Group match → `external_id: 'wc2026-<group>-<team1>-<team2>'`, phase `'group'`, group letter parsed from "Group A".
  - [x] EN names normalized to PT; flags resolved.
  - [x] Non-array / `matches`-less body throws.
  - [x] Unknown `score` shape falls back to `scheduled`; unmapped team string logged and left as-is.
- Integration tests:
  - [x] Sync route over the pinned fixture upserts the expected row count with correct `external_id`s (mocked supabase/cache).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 100% of group matches map to correct team/group/flag from the pinned fixture
- Knockout matches carry `external_id = wc2026-<num>` (Final/3rd by round)
- Adapter fetches openfootball with the preserved cache contract and no api-sports key
