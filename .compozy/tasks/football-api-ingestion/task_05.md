---
status: completed
title: Add is_manual / manual_updated_at migration
type: infra
complexity: low
dependencies: []
---

# Task 5: Add is_manual / manual_updated_at migration

## Overview
Operator result control needs a durable way to mark a match as manually controlled so the hourly sync never overwrites it. This task adds two columns to `matches` (`is_manual`, `manual_updated_at`) via a new migration, with no read-path changes (every read already selects from `matches`).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- A new timestamped migration MUST add `is_manual boolean NOT NULL DEFAULT false` and `manual_updated_at timestamptz` to `public.matches`.
- The migration MUST be idempotent (`ADD COLUMN IF NOT EXISTS`).
- Existing rows MUST default to `is_manual = false` (automatic control preserved).
- No change to `predictions`, `champion_bets`, `leagues`, or `league_members`; the `phase` CHECK and `external_id` UNIQUE constraint MUST remain intact.
</requirements>

## Subtasks
- [x] 5.1 Create the next sequentially-numbered migration under `supabase/migrations/`.
- [x] 5.2 Add both columns with the specified defaults/nullability, idempotently.
- [x] 5.3 Add a migration test asserting the columns/defaults (following the existing migration-test pattern).

## Implementation Details
Add a new file under `supabase/migrations/` continuing the `2026MMDD0000NN_*.sql` naming after `...022`. Follow the column spec in TechSpec "Data Models". Mirror the test approach already used by `tests/unit/migration-matches-external-id.test.ts` for asserting schema changes. No application code changes in this task — the sync exclusion (task_06) and operator endpoint (task_07) consume these columns.

### Relevant Files
- `supabase/migrations/` — new migration file (the deliverable); see `20260525000018_add_matches_external_id.sql` for the `matches` ALTER pattern.
- `tests/unit/migration-matches-external-id.test.ts` — template for the migration test.

### Dependent Files
- `app/api/admin/sync-matches/route.ts` (task_06) — reads `is_manual` to exclude rows.
- `app/api/admin/matches/[id]/result/route.ts` (task_07) — writes `is_manual`/`manual_updated_at`.

### Related ADRs
- [ADR-008: Operator result control — is_manual columns + unlisted gated page/API](adrs/adr-008.md) — chooses two columns over enum/side-table.
- [ADR-004: Manual result entry locks a match from automatic overwrite](adrs/adr-004.md) — the durability requirement.

## Deliverables
- New idempotent migration adding `is_manual` + `manual_updated_at` to `matches`.
- Migration test asserting columns, defaults, and nullability.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Migration SQL adds `is_manual boolean NOT NULL DEFAULT false`.
  - [x] Migration SQL adds `manual_updated_at timestamptz` (nullable).
  - [x] Uses `ADD COLUMN IF NOT EXISTS` (idempotent / re-runnable).
  - [x] Does not alter `predictions`/`champion_bets`/`leagues`/`league_members` or drop the `phase`/`external_id` constraints.
- Integration tests:
  - [x] Applying the migration leaves existing matches with `is_manual = false` (asserted structurally via `NOT NULL DEFAULT false`; no live DB in the file-content test harness, per existing migration-test pattern).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `matches` has both new columns with correct defaults; existing rows default to automatic control
- Migration is idempotent
