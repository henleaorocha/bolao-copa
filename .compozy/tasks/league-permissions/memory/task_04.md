# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. Application-layer 403 gate in `POST /api/leagues`: call `canCreateLeague()` after
auth resolution, before body parsing/insert; on `false` emit structured log + return
`FORBIDDEN` 403 and short-circuit. Success path unchanged.

## Important Decisions
- Placed the gate right after the auth block (route.ts:128), before body validation — earliest
  point per subtask 4.1. Consequence: an unpermitted caller with an invalid body gets 403, not
  400 (acceptable; don't reveal validation to unauthorized callers).
- Used `console.warn` (not `console.error`) for the block log — it's an expected denial, not a
  server fault. Log fields mirror the existing POST info log: timestamp/level/endpoint/method/
  user_id/status_code + `reason: 'cannot_create_league'`.

## Learnings
- Integration test invokes the real POST handler by `vi.mock('@/lib/supabase/client')` and
  resolving `getSupabaseServerClient` to `authedClient(token)` per case — exercises API guard
  AND real RLS without a running dev server (no `:3000` fetch needed). Cleaner than HTTP.
- FLAKE FIXED: do NOT reuse the fixed operator e-mail in a new integration suite — it collides
  with `can-create-league.test.ts` when vitest runs files in parallel. Use random e-mails and
  grant `can_create_league` by user id (`update(...).eq('id', id)`); equivalent to the migration
  grant, collision-free.

## Files / Surfaces
- `app/api/leagues/route.ts` — import `canCreateLeague`; gate block at lines ~125-144.
- `tests/unit/leagues-post-api.test.ts` — extended `makeSupabase` (canCreate default true; users
  branch serves both select chain + update); added `leagueInsertArg()` helper; new describe block
  "can_create_league permission gate (task_04)" (5 cases).
- `tests/integration/leagues-post-permission-gate.test.ts` — NEW (2 cases: default→403 zero rows,
  granted→201 league+admin membership).

## Errors / Corrections
- First integration run alone passed but running alongside `can-create-league.test.ts` failed
  ("user already registered" + grant lost) → root cause: shared fixed operator e-mail across
  parallel files. Fixed by switching to random e-mail + grant-by-id. Re-verified 29/29 pass.

## Ready for Next Run
- New-branch coverage 100% (gate L128 hit 18×, block L129/L140 hit 5×, branch [5,13]).
- tsc 0 / eslint 0 / vitest 29 passed (4 files). Auto-commit disabled → diff left for review.
