# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Repair shared test infra after task_02 removed the `handle_new_user()` auto-enroll into the
test league (`DEFAULT_LEAGUE_ID` `…0001`). Make explicit default-league membership ergonomic in
`tests/fixtures/factories.ts`, fix suites that assumed implicit membership, add a fixture-level
test for the new default (zero memberships), keep the suite green under task_02 behavior.

## Important Decisions
- Added `addDefaultLeagueMember(userId, role='member')` wrapper in factories (subtask 8.1) over
  `addTestLeagueMember(DEFAULT_LEAGUE_ID, ...)`. DEFAULT_LEAGUE_ID stays referenced (PRD constraint).
- Empirical audit (ran DB-direct suites against local Supabase, migration 26):
  - ONLY real DB-direct membership regression = `auth.test.ts` test "new user is auto-enrolled in
    default league" (PGRST116 no rows). Repurposed: beforeAll now explicitly adds DEFAULT_LEAGUE_ID
    membership; test renamed to assert explicit membership (no auto-enroll).
  - `rls.test.ts` + `database.test.ts` PASS unchanged — predictions/champion_bets SELECT policies
    are user_id-based, NOT league-membership-based, so no membership needed there.
  - `league-context.test.ts`: task_02 fixed only the trigger-assertion test; its beforeAll still
    needed explicit DEFAULT_LEAGUE_ID membership for the `:3000` line-33 test that asserts
    league.id===DEFAULT_LEAGUE_ID + role==='member'. Added explicit membership in beforeAll.
  - `dashboard.test.ts` (own leagues + try/catch add) and `leagues-hub-api.test.ts` (shape-only)
    are membership-agnostic — no change.
- The bulk of "integration" failures with SERVICE_ROLE_KEY set are `:3000`/HTTP suites
  (ECONNREFUSED) + pre-existing seed/migration mismatches — NOT membership; out of scope.

## Learnings
- Run DB-direct integration only (skip :3000 noise) by selecting the specific files; env via
  `/tmp/test-env.sh` (local Supabase URL + anon + service-role keys from `supabase status -o env`).

## Files / Surfaces
- `tests/fixtures/factories.ts` (+ addDefaultLeagueMember)
- `tests/integration/auth.test.ts`, `tests/integration/league-context.test.ts`
- NEW `tests/integration/factories-membership.test.ts` (fixture-level default-membership test)

## Errors / Corrections
- Running the DB-direct membership suites in one parallel batch surfaced a pre-existing flake:
  `can-create-league.test.ts` fails alongside `migration-*-can-create-league` files because they
  all use the FIXED operator e-mail `henrique.rocha@arkmeds.com` (documented parallel-file
  collision). Passes 3/3 in isolation. NOT membership, NOT introduced by task_08 — left as-is.

## Ready for Next Run
- task_08 COMPLETE. Factories expose `addDefaultLeagueMember()`; `auth.test.ts` +
  `league-context.test.ts` beforeAll add explicit DEFAULT_LEAGUE_ID membership; new
  `tests/integration/factories-membership.test.ts` pins the no-implicit-membership default.
  Verified WITH local service key: all 5 membership tests green; remaining suite failures are
  pre-existing :3000 HTTP / seed-migration issues. Auto-commit disabled — diff left for review.
