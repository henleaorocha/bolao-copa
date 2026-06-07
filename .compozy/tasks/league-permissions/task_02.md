---
status: completed
title: "Migration: gate leagues_insert, hide test league in leagues_select_open, stop auto-enroll in handle_new_user()"
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 2: Migration: gate leagues_insert, hide test league in leagues_select_open, stop auto-enroll in handle_new_user()

## Overview
This is the authoritative security migration: it gates league creation on the new flag, hides the
seeded test league from open discovery while keeping it visible to its members, and stops the
`handle_new_user()` trigger from auto-enrolling new accounts into the test league. Together these
three policy/trigger objects make the RLS layer enforce every rule the feature promises.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST replace `leagues_insert` so INSERT requires both `auth.uid() = created_by` AND an existing
  `public.users` row for the caller with `can_create_league = true`.
- MUST replace `leagues_select_open` so an `access_type = 'open'` league is visible only when its
  id is NOT the test UUID `00000000-0000-0000-0000-000000000001`, while members of any league
  (including the test league) still see it.
- MUST update `handle_new_user()` to keep the `public.users` upsert (`ON CONFLICT DO NOTHING`) but
  remove the auto-enroll INSERT into the test league; the function MUST remain `SECURITY DEFINER`.
- MUST NOT delete or otherwise make the test league unusable — testers who are members must retain
  full access.
- MUST follow the existing migration naming convention and run after task_01's column migration.
</requirements>

## Subtasks
- [x] 2.1 Create a migration that drops and recreates `leagues_insert` with the `can_create_league`
  check.
- [x] 2.2 In the same migration, drop and recreate `leagues_select_open` excluding the test UUID
  from the open branch while preserving the member branch.
- [x] 2.3 Replace `handle_new_user()` to drop the test-league auto-enroll INSERT, keeping the user
  upsert and `SECURITY DEFINER`.
- [x] 2.4 Apply locally and verify gate, hiding, and no-auto-enroll behaviors at the RLS/trigger
  level.
- [x] 2.5 Add integration tests covering the insert gate, test-league hiding, and no auto-enroll.

## Implementation Details
Create one migration under `supabase/migrations/` (next sequential name after task_01's). It
drops/recreates the two policies and replaces the trigger function. See TechSpec "Data Models"
for the exact policy and function bodies, and "Development Sequencing" step 2. The current
`leagues_insert` (checks only `auth.uid() = created_by`) lives in
`20260522000012_users_active_league_id_rls.sql`; the current `leagues_select_open` lives in
`20260522000009_rls_policies.sql`; the current `handle_new_user()` (with the auto-enroll INSERT)
lives in `20260522000004_create_user_trigger.sql`.

### Relevant Files
- `supabase/migrations/20260522000012_users_active_league_id_rls.sql` — current `leagues_insert`
  policy to replace.
- `supabase/migrations/20260522000009_rls_policies.sql` — current `leagues_select_open` policy to
  replace.
- `supabase/migrations/20260522000004_create_user_trigger.sql` — current `handle_new_user()` with
  the auto-enroll INSERT to remove.
- `supabase/migrations/20260523000014_fix_leagues_select_created_by.sql` — additional
  `leagues_select_own_created` policy; verify it is not disturbed by the select change.

### Dependent Files
- `supabase/migrations/<new>_league_permissions_policies.sql` — file to create.
- `tests/fixtures/factories.ts` — affected because new users are no longer auto-enrolled
  (handled in task_08, but its tests assume this migration's behavior).
- `tests/unit/` — new RLS/trigger integration tests.

### Related ADRs
- [ADR-002: Hide the test league and stop auto-enrolling users](adrs/adr-002.md)
- [ADR-003: Hide the test league via the `leagues_select_open` RLS policy](adrs/adr-003.md)
- [ADR-004: Enforce league-creation permission in RLS and the API](adrs/adr-004.md)

## Deliverables
- A migration replacing `leagues_insert`, `leagues_select_open`, and `handle_new_user()`.
- Local Supabase applies the migration cleanly with the test league preserved.
- Integration tests for the gate, hiding, and no-auto-enroll **(REQUIRED)**.
- Test coverage >=80% for the new test-covered behavior.

## Tests
- Unit tests:
  - [x] `handle_new_user()` upserts the `public.users` row on new signup (idempotent on conflict).
    (DB-backed in `tests/integration/migration-league-permissions-policies.test.ts`; SQL-content
    assertions in `tests/unit/migration-league-permissions-policies.test.ts`.)
- Integration tests:
  - [x] A user with `can_create_league = false` attempting a direct `leagues` INSERT via their
    session is rejected by RLS; no row is created.
  - [x] A user with `can_create_league = true` can insert a league via their session.
  - [x] A non-member user's `SELECT` over `leagues` does not return the test UUID
    `00000000-0000-0000-0000-000000000001`.
  - [x] A member of the test league still receives it in a `SELECT`.
  - [x] A freshly created user has zero `league_members` rows after signup.
- Test coverage target: >=80% — met (behavioral: SQL migration has no TS lines; all three
  policy/trigger objects and both `leagues_select_open` branches are exercised).
- All tests must pass — task-owned suites pass (16 new + 13 leagues-rls + database). The only
  remaining failures in touched suites are pre-existing route/layout HTTP tests requiring a
  running dev server (proven via baseline `comm -13` diff: zero new regressions).

## Success Criteria
- All tests passing
- Test coverage >=80%
- Non-permitted users cannot insert leagues at the RLS layer; permitted users can.
- The test league is invisible to non-members and visible to members.
- New signups create exactly one `public.users` row and zero `league_members` rows.
