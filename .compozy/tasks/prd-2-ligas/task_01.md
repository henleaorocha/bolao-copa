---
status: completed
title: "DB Migrations: invite_token, active_league_id, member_count, RLS Policies"
type: infra
complexity: high
dependencies: []
---

# Task 1: DB Migrations: invite_token, active_league_id, member_count, RLS Policies

## Overview
Two new SQL migration files extend the Foundation schema to support multi-league functionality. Migration 1 adds `invite_token` and `member_count` to `leagues` plus a trigger to keep the count in sync. Migration 2 adds `active_league_id` to `users`. Both migrations also establish the five new RLS policies that gate league creation, editing, deletion, and membership management.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. Migration 1 MUST add `invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex')` to `public.leagues`; existing rows must receive a generated token automatically via the DEFAULT.
2. Migration 1 MUST add `member_count INTEGER NOT NULL DEFAULT 0` to `public.leagues` and seed the current counts from existing `league_members` rows.
3. Migration 1 MUST create a `sync_league_member_count()` AFTER INSERT OR DELETE trigger on `public.league_members` that keeps `leagues.member_count` accurate.
4. Migration 2 MUST add `active_league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL` (nullable) to `public.users`.
5. Five RLS policies MUST be created as defined in the TechSpec "Data Models — Updated RLS policies" section: `leagues_admin_update`, `leagues_admin_delete`, `leagues_insert`, `league_members_admin_delete`, `league_members_self_insert`.
6. The `invite_token` column MUST be excluded from the existing `leagues` SELECT RLS policy scope — it must not be selectable by regular authenticated users through the Supabase client (server-side only access via service role).
7. Migration files MUST be named with the next sequential timestamp prefix following the pattern already used in `supabase/migrations/`.
8. All migrations MUST be idempotent when re-run against a clean local DB (`supabase db reset`).
</requirements>

## Subtasks
- [x] 1.1 Create migration file for `leagues` table additions (`invite_token`, `member_count`, trigger `sync_league_member_count`)
- [x] 1.2 Seed `member_count` from existing `league_members` rows within the same migration
- [x] 1.3 Create migration file for `users.active_league_id` column addition
- [x] 1.4 Add the five new RLS policies (can go in either migration or a dedicated migration file)
- [x] 1.5 Verify all policies with `supabase db reset` and manual RLS checks

## Implementation Details
Two new migration files go in `supabase/migrations/`. Follow the timestamp naming convention of the existing 10 migrations (all prefixed `20260522000NNN_`). The next available slots are `20260522000011_` and `20260522000012_`.

The `invite_token` column default uses `encode(gen_random_bytes(16), 'hex')` — this requires the `pgcrypto` extension already enabled by Supabase. No new extensions required.

The trigger must cover both INSERT and DELETE events on `league_members`. It should use `COALESCE(NEW.league_id, OLD.league_id)` to handle both row states.

See TechSpec "Data Models" section for exact SQL definitions of all columns, the trigger function, and the five RLS policies.

### Relevant Files
- `supabase/migrations/20260522000002_create_leagues.sql` — current `leagues` table schema (columns to extend)
- `supabase/migrations/20260522000003_create_league_members.sql` — current `league_members` schema (trigger source table)
- `supabase/migrations/20260522000001_create_users.sql` — current `users` table schema (column to extend)
- `supabase/migrations/20260522000009_rls_policies.sql` — existing RLS policies (reference for style)
- `supabase/migrations/20260522000010_fix_rls_policies.sql` — most recent RLS fix (note: league_members SELECT bug was fixed here)

### Dependent Files
- `app/api/auth/me/route.ts` — depends on `users.active_league_id` existing (task_02)
- `app/api/leagues/route.ts` — depends on `leagues.invite_token` and `leagues.member_count` existing (task_04)
- `tests/fixtures/factories.ts` — `DEFAULT_LEAGUE_ID` constant and `createTestUser` must remain valid after migration

### Related ADRs
- [ADR-002: Active League Persisted as DB Column on users Table](adrs/adr-002.md) — Defines `active_league_id` column design and NULL fallback behavior
- [ADR-003: Invite Token as Column on leagues Table](adrs/adr-003.md) — Defines `invite_token` storage rationale and security requirements

## Deliverables
- `supabase/migrations/20260522000011_leagues_invite_token_member_count.sql`
- `supabase/migrations/20260522000012_users_active_league_id_rls.sql`
- Integration tests verifying all new RLS policies **(REQUIRED)**
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `invite_token` column is auto-populated on INSERT to `leagues` (non-null, 32-char hex string)
  - [ ] `member_count` is 0 on league creation before any member rows exist
  - [ ] `member_count` increments by 1 after INSERT into `league_members` for that league
  - [ ] `member_count` decrements by 1 after DELETE from `league_members` for that league
  - [ ] `active_league_id` accepts NULL and a valid `leagues.id`; FK cascade sets it to NULL when referenced league is deleted
- Integration tests:
  - [ ] `leagues_insert` policy: authenticated user can INSERT a league where `created_by = auth.uid()`; anonymous cannot
  - [ ] `leagues_admin_update` policy: admin (`created_by = auth.uid()`) can UPDATE; non-admin member cannot
  - [ ] `leagues_admin_delete` policy: admin can DELETE own league; non-admin cannot
  - [ ] `league_members_self_insert` policy: authenticated user can INSERT a row where `user_id = auth.uid()`; cannot insert for another user
  - [ ] `league_members_admin_delete` policy: league admin can DELETE any member row in their league; a non-admin cannot
  - [ ] Private league with `access_type = 'private'` is NOT visible in SELECT to a non-member via the existing SELECT policy
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `supabase db reset` succeeds with all migrations applied in order
- `supabase db push` applies both migrations cleanly against local Supabase instance
- All five RLS policies appear in `supabase/migrations/` and are confirmed by integration tests
- No existing integration tests broken (auth.test.ts, rls.test.ts, database.test.ts)
