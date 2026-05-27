---
status: completed
title: Verify and migrate `prizes` column in `leagues` table
type: infra
complexity: low
dependencies: []
---

# Task 1: Verify and migrate `prizes` column in `leagues` table

## Overview

The Painel prizes strip displays league prize text stored in the `leagues` table. This task verifies whether the `prizes TEXT` column already exists; if absent, it creates a Supabase migration to add it. This is a gate task — task_03 (API extension) and task_08 (PrizesStrip component) cannot be completed until the schema is confirmed stable.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST verify whether `prizes TEXT` column exists on the `leagues` table before writing any migration.
2. MUST create a Supabase SQL migration file following the existing naming convention (`YYYYMMDD000017_add_leagues_prizes.sql`) if the column is absent.
3. MUST make `prizes` nullable (`TEXT` with no `NOT NULL` constraint) so existing leagues are unaffected.
4. MUST NOT add a `prizes` input field to the league creation or edit form — that is out of scope for this PRD.
5. SHOULD document the verification result (column present or migration applied) in a comment inside the migration file.
</requirements>

## Subtasks

- [x] 1.1 Query `information_schema.columns` to confirm presence or absence of the `prizes` column on the `leagues` table.
- [x] 1.2 If absent, create `supabase/migrations/20260525000017_add_leagues_prizes.sql` with the `ALTER TABLE` statement.
- [x] 1.3 Apply the migration to the local Supabase instance and confirm the column appears.
- [x] 1.4 Confirm existing league rows have `prizes IS NULL` after migration (no data loss).

## Implementation Details

See TechSpec "Data Models — DB Schema Prerequisite" section for the exact SQL and verification query.

Migration file naming follows the pattern of the most recent existing migration (`20260523000016_add_league_members_onboarded_at.sql`). Use timestamp `20260525000017`.

### Relevant Files

- `supabase/migrations/` — directory where the new migration file will be created
- `supabase/migrations/20260523000016_add_league_members_onboarded_at.sql` — reference for migration file structure and SQL style

### Dependent Files

- `app/api/leagues/[id]/route.ts` — task_03 will add `prizes` to the SELECT query; requires column to exist
- `app/ligas/[id]/components/PrizesStrip.tsx` — task_08 renders `league.prizes`; requires column to exist

### Related ADRs

- [ADR-003: API Stats Fields — Stub Zeros with Defined Shape](adrs/adr-003.md) — Notes the prizes column as a prerequisite risk and mitigation strategy

## Deliverables

- `supabase/migrations/20260525000017_add_leagues_prizes.sql` (if column is absent)
- Confirmation that `leagues.prizes` column exists in local Supabase instance
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for the column's presence and nullability **(REQUIRED)**

## Tests

- Unit tests:
  - [x] No unit tests apply to a pure SQL migration; skip and document why.
- Integration tests:
  - [x] After migration runs, `SELECT prizes FROM leagues LIMIT 1` executes without error.
  - [x] An existing league row has `prizes IS NULL` after migration (no default value injected).
  - [x] Inserting a new league row with `prizes = NULL` succeeds.
  - [x] Inserting a new league row with `prizes = 'R$ 500 pro 1º'` succeeds.
- Test coverage target: N/A (SQL migration — no executable code paths to cover)
- All tests must pass

## Success Criteria

- All tests passing
- `leagues.prizes` column exists and is nullable in local Supabase
- No existing league data modified by the migration
- Task_03 can proceed without schema errors
