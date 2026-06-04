---
status: completed
title: Sync route excludes manually-controlled matches
type: backend
complexity: medium
dependencies:
  - task_03
  - task_05
---

# Task 6: Sync route excludes manually-controlled matches

## Overview
The hourly sync upserts every fetched row by `external_id`, which would overwrite an operator's manual correction. This task makes the sync route read the `external_id`s of manually-controlled matches and exclude them from the upsert set, so manual entries survive automatic runs.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- Before upserting, the route MUST query `external_id`s where `is_manual = true` and exclude those rows from the upsert set.
- The response MUST report `skipped` = count of manual matches excluded (response shape `{ upserted, skipped }` unchanged).
- The route MUST keep deleting null-`external_id` rows and revalidating the `fixtures` tag.
- Logging MUST add `skipped_manual` to the ingestion log and rename the error event from `api_football_error` to source-neutral `ingestion_error`.
- The exclusion MUST NOT overwrite or touch manually-controlled rows in any way during sync.
</requirements>

## Subtasks
- [x] 6.1 Add a query reading `external_id`s where `is_manual = true`.
- [x] 6.2 Filter the mapped rows to exclude those `external_id`s before upsert.
- [x] 6.3 Return `skipped` = excluded count in the success payload.
- [x] 6.4 Add `skipped_manual` to the ingestion log; rename error event to `ingestion_error`.
- [x] 6.5 Extend `sync-result-ingestion.test.ts` for the exclusion + skipped count.

## Implementation Details
Modify `app/api/admin/sync-matches/route.ts` (already consuming the openfootball adapter after task_03). Insert the `is_manual` read between fetch/map and upsert; preserve the service-role auth, the null-`external_id` delete, and `revalidateTag('fixtures')`. Keep the existing structured logs (`sync_start`, `sync_result_ingested`, `sync_complete`) and extend per TechSpec "Monitoring and Observability". Reference ADR-008's exclusion rule.

### Relevant Files
- `app/api/admin/sync-matches/route.ts` — add exclusion query + skipped count + log changes.
- `tests/unit/sync-result-ingestion.test.ts` — extend for exclusion/skipped assertions.
- `lib/football-api.ts` — adapter producing the rows (task_03).

### Dependent Files
- `matches` table — `is_manual` column read here (task_05).
- Validation harness (task_09) — relies on manual entries surviving a sync run.

### Related ADRs
- [ADR-008: is_manual columns + sync exclusion](adrs/adr-008.md) — the exclusion-query decision.
- [ADR-004: Manual result entry locks a match from automatic overwrite](adrs/adr-004.md) — manual entries survive hourly runs.

## Deliverables
- Sync route excluding `is_manual` matches and reporting `skipped`.
- Updated logging (`skipped_manual`, `ingestion_error`).
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] A fetched match whose `external_id` is `is_manual = true` is NOT in the upsert set.
  - [x] `skipped` equals the number of excluded manual matches.
  - [x] `upserted` counts only the non-excluded rows.
  - [x] Null-`external_id` delete and `revalidateTag('fixtures')` still invoked.
  - [x] Success log includes `skipped_manual`; error path emits `ingestion_error`.
  - [x] Non-service-role request still returns 401 (auth unchanged).
- Integration tests:
  - [x] Full sync over a fixture with one seeded manual match upserts the rest and leaves the manual row untouched.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Manually-controlled matches survive a sync run (not overwritten)
- Response/logs report the skipped count
