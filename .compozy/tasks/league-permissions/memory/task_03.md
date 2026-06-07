# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. Added `lib/leagues/can-create-league.ts` exporting `canCreateLeague(supabase, userId)`,
reading `users.can_create_league`, returning `true` only when exactly `true`, else `false`
(missing row / query error, no throw). Signature matches TechSpec "Core Interfaces" verbatim.

## Important Decisions
- Mirrored `get-leagues-hub.ts` typing (`import type { SupabaseClient }`) exactly.
- Unit test mock: `from().select().eq().single()` chain (single() resolves `{data,error}`),
  adapted from `get-leagues-hub.test.ts`'s makeChain (which had no `.single()`).

## Learnings
- Helper unit coverage = 100% (4/4 stmts, 4/4 branch). Ran isolated via
  `--coverage.include='lib/leagues/can-create-league.ts'`.
- Integration test reuses task_01 fixtures (createTestUser/signInTestUser/authedClient/
  adminClient); granted operator via `update().eq('email', OPERATOR_EMAIL)`. Pre-clean +
  explicit two-layer delete (no auth→public cascade), same pattern as task_01 test.

## Files / Surfaces
- NEW `lib/leagues/can-create-league.ts`
- NEW `tests/unit/can-create-league.test.ts` (7 tests)
- NEW `tests/integration/can-create-league.test.ts` (3 tests, skipIf no SERVICE_ROLE_KEY)

## Errors / Corrections
- (none)

## Ready for Next Run
- task_04 (`POST /api/leagues` 403 guard) and task_05 (`app/ligas/page.tsx` create card)
  can import `canCreateLeague` from `@/lib/leagues/can-create-league`.
