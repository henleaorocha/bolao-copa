---
status: completed
title: "Migration: add users.can_create_league column + grant operator e-mails"
type: backend
complexity: low
dependencies: []
---

# Task 1: Migration: add users.can_create_league column + grant operator e-mails

## Overview
Add the authoritative per-user capability that gates league creation: a `can_create_league`
boolean on `public.users`, defaulting to `false` for every account, and grant it to the two
operator e-mails. This column is the foundation every other task in the feature reads or
references.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a `can_create_league BOOLEAN NOT NULL DEFAULT false` column to `public.users`.
- MUST grant the capability to `hen.leao.rocha@gmail.com` and `henrique.rocha@arkmeds.com` via
  a one-time idempotent `UPDATE` (per ADR-004's "UPDATE now" approach).
- The grant MUST be resilient to whether those accounts exist yet — if a row is absent the
  `UPDATE` simply affects zero rows and must not error.
- MUST follow the existing migration file naming convention `YYYYMMDD0000NN_description.sql`
  and use the next sequential number after the latest migration.
- MUST NOT alter any other table, policy, or trigger (those belong to task_02).
</requirements>

## Subtasks
- [x] 1.1 Create a new migration file adding the `can_create_league` column with the correct
  default and NOT NULL constraint.
- [x] 1.2 Add the idempotent grant `UPDATE` for the two operator e-mails in the same migration.
- [x] 1.3 Apply the migration to the local Supabase instance and confirm the column and grants.
- [x] 1.4 Add an integration test proving a freshly created user has `can_create_league = false`.

## Implementation Details
Create a new migration under `supabase/migrations/` following the existing convention. The
latest migration is `20260601000024_validation_journey_rls_fixes.sql`; pick the next sequential
name (e.g. `20260601000025_users_can_create_league.sql`). See TechSpec "Data Models" for the
exact column definition and grant SQL, and "Development Sequencing" step 1.

### Relevant Files
- `supabase/migrations/20260522000001_create_users.sql` — current `public.users` definition; the
  new column extends this table.
- `supabase/migrations/20260601000024_validation_journey_rls_fixes.sql` — latest migration; use it
  to determine the next sequential filename.
- `tests/fixtures/factories.ts` — `createTestUser()` is used by the new integration test to
  assert the default value.

### Dependent Files
- `supabase/migrations/<new>_users_can_create_league.sql` — file to create.
- `tests/unit/` — new integration test asserting the default and grant behavior.

### Related ADRs
- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — defines the single
  per-user capability, default off, granted to two e-mails.
- [ADR-004: Enforce league-creation permission in RLS and the API](adrs/adr-004.md) — the
  "UPDATE now" grant decision (no trigger hardcoding of e-mails).

## Deliverables
- A new migration that adds `users.can_create_league` (default `false`, `NOT NULL`) and grants
  the two operator e-mails.
- Local Supabase applies the migration cleanly.
- Integration tests verifying the default and grant **(REQUIRED)**.
- Test coverage >=80% for the new test-covered behavior.

## Tests
- Unit tests:
  - [x] A new user created via `createTestUser()` has `can_create_league = false`.
  - [x] Re-running the grant `UPDATE` is idempotent (running it twice leaves the flag `true`,
    no error).
- Integration tests:
  - [x] After applying the grant, a `public.users` row whose `email` matches an operator e-mail
    has `can_create_league = true`.
  - [x] The grant `UPDATE` against a non-existent operator e-mail affects zero rows and does not
    raise an error.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `public.users.can_create_league` exists with `NOT NULL DEFAULT false`.
- Both operator e-mails (when present) have `can_create_league = true`; all other rows remain
  `false`.
