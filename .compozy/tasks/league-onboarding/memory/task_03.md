# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Extend GET /api/leagues/{id} to include `invite_token` (from leagues table) and `user_onboarded_at` (calling user's `onboarded_at` from league_members) in the response.

## Important Decisions

- Used Supabase client pattern for authenticated integration tests instead of HTTP cookie auth — the HTTP cookie format is broken (see shared memory).
- `invite_token` comes from the `leagueResult.data` spread — no explicit mapping needed.
- `user_onboarded_at` derived via `membersResult.data.find(m => m.user_id === user.id)?.onboarded_at ?? null` — no extra DB query.

## Learnings

- Pre-existing 3 failures in `tests/unit/get-leagues-hub.test.ts` are caused by pre-existing changes to `lib/leagues/get-leagues-hub.ts` in the working tree — confirmed via stash isolation. Not introduced by task_03.
- `LeagueDetail` in `lib/api/types.ts` was already updated by task_02 — both `invite_token: string` and `user_onboarded_at: string | null` were present before task_03 started.

## Files / Surfaces

- `app/api/leagues/[id]/route.ts` — modified (GET handler)
  - `LeagueMemberRecord` interface: added `onboarded_at: string | null`
  - leagues SELECT: added `invite_token`
  - members SELECT: added `onboarded_at`
  - Added `currentMember` find + `user_onboarded_at` derivation after members fetch
  - Response object: added `user_onboarded_at` field
- `tests/integration/leagues.test.ts` — added `describe('GET /api/leagues/{id} (task_03)')` block with 5 tests

## Errors / Corrections

None.

## Ready for Next Run

task_03 complete. All changes verified. diff ready for manual review (auto-commit=false).
- task_04 can proceed: PATCH /api/leagues/{id}/me endpoint creation.
- Note: the cross-task integration test (user_onboarded_at after PATCH) is deferred to task_04.
