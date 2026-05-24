---
status: completed
title: "Database migration: add `onboarded_at` to `league_members`"
type: infra
complexity: low
dependencies: []
---

# Task 1: Database migration: add `onboarded_at` to `league_members`

## Overview

Adds the `onboarded_at TIMESTAMPTZ` column to the `league_members` table and creates an RLS UPDATE policy that allows each user to update only their own row. This is the foundational change that all other tasks in this feature depend on — without it, the API and component cannot read or write the onboarding status.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `onboarded_at TIMESTAMPTZ DEFAULT NULL` column to `public.league_members` using `ADD COLUMN IF NOT EXISTS` (idempotent)
- MUST create an RLS UPDATE policy named `"league_members_update_own_onboarded_at"` that uses `USING (user_id = auth.uid())` and `WITH CHECK (user_id = auth.uid())`
- MUST NOT break existing RLS SELECT policies on `league_members`
- MUST follow the migration naming convention `YYYYMMDDHHMMSS_description.sql` — next sequential file after `20260523000015`
- MUST be applicable with `supabase db push` (local) without errors
</requirements>

## Subtasks

- [x] 1.1 Create migration file `supabase/migrations/20260523000016_add_league_members_onboarded_at.sql`
- [x] 1.2 Write `ALTER TABLE` statement adding the `onboarded_at` column
- [x] 1.3 Write `CREATE POLICY` statement for the UPDATE policy
- [x] 1.4 Apply migration locally and verify column appears in `league_members` schema
- [x] 1.5 Write integration test asserting the column exists and the UPDATE policy allows self-update

## Implementation Details

See TechSpec "Data Models" section for the exact SQL. The migration follows the pattern of `20260523000015_fix_is_member_volatile.sql` — no `BEGIN/COMMIT` wrapper needed for DDL-only migrations in this project.

Existing policies to be aware of (do not conflict):
- `league_members_select_own` — allows SELECT where `user_id = auth.uid()`
- Any existing UPDATE policies — check `20260523000015` for conflict

### Relevant Files

- `supabase/migrations/20260523000015_fix_is_member_volatile.sql` — most recent migration; use as naming and style reference
- `supabase/migrations/20260522000003_create_league_members.sql` — original table definition showing existing column list and policies
- `supabase/migrations/20260522000009_rls_policies.sql` — baseline RLS policies for `league_members`

### Dependent Files

- `app/api/leagues/[id]/route.ts` — GET handler will SELECT `onboarded_at` in task_03
- `app/api/leagues/[id]/me/route.ts` — PATCH endpoint will UPDATE `onboarded_at` in task_04
- `tests/integration/leagues.test.ts` — integration tests for tasks_03 and task_04 require this column to exist

### Related ADRs

- [ADR-001: Per-League Welcome Onboarding Flow](../adrs/adr-001.md) — establishes `onboarded_at` on `league_members` as the source of truth for first-visit tracking
- [ADR-003: PATCH /api/leagues/{id}/me Write Path](../adrs/adr-003.md) — the new RLS UPDATE policy created here is required for the PATCH endpoint to function

## Deliverables

- `supabase/migrations/20260523000016_add_league_members_onboarded_at.sql` — migration file with ALTER TABLE and CREATE POLICY
- Integration test asserting `onboarded_at` column exists and is writable by the row owner **(REQUIRED)**

## Tests

- Unit tests:
  - [x] N/A — SQL migration has no unit-testable logic
- Integration tests:
  - [x] `league_members` table intact after migration (regression — admin client read, confirms column exists with null default)
  - [x] Authenticated member can UPDATE their own `onboarded_at` via Supabase client (policy allows)
  - [x] Authenticated user CANNOT UPDATE `onboarded_at` of a different user's row (policy denies)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `supabase db push` applies the migration without errors
- `league_members` table has `onboarded_at TIMESTAMPTZ` column with `NULL` default
- RLS UPDATE policy `"league_members_update_own_onboarded_at"` is active
- Existing integration tests for league endpoints still pass (no regression)
