---
status: completed
title: "DB Migration: extend `matches` table"
type: infra
complexity: low
dependencies: []
---

# Task 01: DB Migration: extend `matches` table

## Overview

Adds five new columns (`external_id`, `venue`, `city`, `home_flag`, `away_flag`) and two indexes to the existing `matches` table. This is the prerequisite for the sync endpoint and all match-related queries, as the new columns are needed to store real Copa 2026 fixture data from API Football.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `external_id TEXT UNIQUE` column to the `matches` table
- MUST add `venue TEXT`, `city TEXT`, `home_flag TEXT`, `away_flag TEXT` columns
- MUST create index `idx_matches_external_id ON matches (external_id)`
- MUST create index `idx_matches_phase_status ON matches (phase, status)`
- MUST use a migration file with timestamp prefix `20260525000018_` (or next available)
- MUST be idempotent: adding columns with `IF NOT EXISTS` or equivalent is preferred
- SHOULD NOT alter existing columns or RLS policies
</requirements>

## Subtasks

- [x] 1.1 Identify next available migration timestamp in `supabase/migrations/`
- [x] 1.2 Write the migration SQL file with column additions and index creation
- [x] 1.3 Apply migration locally via `supabase db push` and verify schema
- [x] 1.4 Verify existing `matches` data (placeholder rows) is unaffected after migration

## Implementation Details

See TechSpec "Data Models — `matches` table — new columns (migration)" section for the exact SQL DDL. The migration file goes in `supabase/migrations/`. The most recent migration is `20260525000017_add_leagues_prizes.sql`, so the next timestamp is `20260525000018_`.

The existing 104 placeholder rows (seeded without `external_id`) will have `external_id = NULL` after migration — this is expected. The sync endpoint (task_04) will upsert real data and then delete all rows where `external_id IS NULL`.

### Relevant Files

- `supabase/migrations/20260525000017_add_leagues_prizes.sql` — reference for migration file format
- `supabase/migrations/20260522000005_create_matches.sql` — original matches table definition showing existing columns

### Dependent Files

- `lib/football-api.ts` (task_03) — uses `external_id` as the upsert conflict key
- `app/api/admin/sync-matches/route.ts` (task_04) — writes to the new columns
- `app/api/leagues/[id]/matches/route.ts` (task_05) — reads `venue`, `city`, `home_flag`, `away_flag`
- `tests/fixtures/factories.ts` — `createTestMatch` factory may need updating to accept new optional fields

## Deliverables

- `supabase/migrations/20260525000018_add_matches_external_id.sql` (or next available timestamp)
- Unit tests validating migration SQL is well-formed **(REQUIRED)**
- Integration test confirming the columns and indexes exist after migration **(REQUIRED)**

## Tests

- Unit tests:
  - [x] Migration SQL file parses without syntax errors (run through `psql --dry-run` or equivalent linter)
  - [x] All 5 new columns are present in the `matches` table schema after applying the migration
  - [x] `external_id` column has a UNIQUE constraint
  - [x] Existing rows retain their original data after migration (spot-check `home_team`, `away_team`, `match_date`)
- Integration tests:
  - [x] `supabase db push` exits 0 against local Supabase instance
  - [x] A new row can be inserted with `external_id = '12345'` and a duplicate `external_id` insert raises a unique constraint violation
  - [x] `idx_matches_external_id` and `idx_matches_phase_status` appear in `pg_indexes`
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `supabase db push` exits 0 with no errors on a clean local DB
- `\d matches` in psql shows all 5 new nullable columns
- Both new indexes visible in `pg_indexes`
- No existing integration tests broken by the schema change
