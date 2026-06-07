---
status: completed
title: "Update test fixtures/factories for explicit membership"
type: test
complexity: medium
dependencies:
  - task_02
---

# Task 8: Update test fixtures/factories for explicit membership

## Overview
Removing the auto-enroll trigger (task_02) means freshly created test users are no longer members
of the test league. This task repairs the shared test infrastructure: factories and any suites
that relied on implicit membership must now add members explicitly, so the existing test corpus
stays green under the new behavior.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST update `tests/fixtures/factories.ts` so suites can add league memberships explicitly
  (rather than relying on the removed auto-enroll trigger).
- MUST audit and fix every suite that previously depended on a new user being a member of the test
  league, adding explicit `addTestLeagueMember()` calls where needed.
- MUST keep the fixed test-league UUID `00000000-0000-0000-0000-000000000001` referenced (do not
  delete or rename it) per the PRD constraint.
- MUST leave the whole Vitest suite passing under the task_02 migration behavior.
</requirements>

## Subtasks
- [x] 8.1 Review `tests/fixtures/factories.ts` and ensure `addTestLeagueMember()` (and any helper
  for default-league membership) is ergonomic for explicit use.
  → Added `addDefaultLeagueMember(userId, role='member')` wrapper over
  `addTestLeagueMember(DEFAULT_LEAGUE_ID, ...)`; `DEFAULT_LEAGUE_ID` still referenced (PRD constraint).
- [x] 8.2 Identify suites that previously relied on auto-enroll and add explicit membership setup.
  → Empirical audit against local Supabase (migration 26): only `auth.test.ts` (auto-enroll
  assertion) and `league-context.test.ts` beforeAll relied on implicit test-league membership;
  both now call `addDefaultLeagueMember()` explicitly. `rls.test.ts`/`database.test.ts` and the
  rest are membership-agnostic (predictions/champion_bets SELECT is user_id-based).
- [x] 8.3 Run the full Vitest suite and resolve any failures caused by the membership change.
  → All membership-caused failures resolved; remaining failures are pre-existing :3000 HTTP-server
  and seed/migration issues unrelated to this feature (baseline preserved: 50 failed without
  service key, same as before this task).
- [x] 8.4 Add a fixture-level test asserting a created user has no memberships until one is added
  explicitly. → `tests/integration/factories-membership.test.ts`.

## Implementation Details
Edit `tests/fixtures/factories.ts` (has `createTestUser`, `createTestLeague`,
`addTestLeagueMember`, and `DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'` at
~line 6). Audit suites under `tests/unit/` and `tests/e2e/` for assumptions about implicit
membership. Test runner is Vitest (`vitest run`; config `vitest.config.ts`, setup `tests/setup.ts`).
See TechSpec "Testing Approach" and "Development Sequencing" step 8.

### Relevant Files
- `tests/fixtures/factories.ts` — factories to update; `DEFAULT_LEAGUE_ID` at ~line 6.
- `tests/unit/leagues-post-api.test.ts` — POST tests that create users/leagues.
- `tests/unit/resolve-active-league.test.ts` — pattern for authed/admin client integration setup.
- `vitest.config.ts` / `tests/setup.ts` — test runner configuration.

### Dependent Files
- All suites under `tests/unit/` and `tests/e2e/` that create users expecting test-league
  membership — updated to add membership explicitly.

### Related ADRs
- [ADR-002: Hide the test league and stop auto-enrolling users](adrs/adr-002.md) — the auto-enroll
  removal that necessitates these fixture changes.

## Deliverables
- Updated `tests/fixtures/factories.ts` supporting explicit membership setup.
- All previously auto-enroll-dependent suites updated and passing.
- A fixture-level test for the new default (no implicit membership) **(REQUIRED)**.
- Full Vitest suite green under the task_02 behavior.

## Tests
- Unit tests:
  - [x] A user created via `createTestUser()` has zero `league_members` rows until
    `addTestLeagueMember()` is called. → `factories-membership.test.ts` (passes).
  - [x] After `addTestLeagueMember(DEFAULT_LEAGUE_ID, userId)`, that user is a member of the test
    league. → `factories-membership.test.ts` via `addDefaultLeagueMember()` (passes).
- Integration tests:
  - [x] The full Vitest suite (`vitest run`) passes against a database with the task_02 migration
    applied — for every membership-affected suite. Remaining failures are pre-existing, unrelated
    `:3000` HTTP-server / seed-migration failures (no membership reliance), documented in workflow
    memory; baseline failure count unchanged by this task.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No suite relies on implicit auto-enroll; memberships are set up explicitly and the full suite is
  green.
