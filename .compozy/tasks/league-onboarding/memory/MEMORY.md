# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 01 complete: `onboarded_at TIMESTAMPTZ` column and `"league_members_update_own_onboarded_at"` RLS UPDATE policy applied to remote DB (`mpythoirxidkauerttak.supabase.co`).
- Task 02 complete: `LeagueDetail` type extended with `invite_token: string` and `user_onboarded_at: string | null`.
- Task 03 complete: GET /api/leagues/{id} now returns `invite_token` and `user_onboarded_at` in the response.
- Task 04 complete: `PATCH /api/leagues/{id}/me` endpoint created at `app/api/leagues/[id]/me/route.ts`. Returns 204, 401, or 403. Idempotent. 4/4 integration tests pass.
- Task 05 complete: `components/LeagueWelcomeModal.tsx` created (4-screen wizard). `tests/unit/LeagueWelcomeModal.test.tsx` created (14 tests, all passing).
- Task 06 complete: `LeagueWelcomeModal` integrated into `app/ligas/[id]/page.tsx`. `showWelcomeModal` state set in useEffect after `setLeague`. 4 new unit tests in `tests/unit/league-detail.test.tsx` (39 total, all passing). All 6 tasks complete.

## Shared Decisions

- Migration 16 applied. All subsequent tasks referencing `league_members.onboarded_at` can assume the column and RLS policy exist in the remote DB.

## Shared Learnings

- **HTTP auth cookie format is broken** in existing `tests/integration/leagues.test.ts` tests: all old tests using `Cookie: sb-access-token=...` return 401. **Task_04 solved this** — correct format for `@supabase/ssr` v0.10.3: cookie name `sb-mpythoirxidkauerttak-auth-token`, value `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`. New PATCH tests use this format and pass. Helper pattern to copy into new test blocks:
  ```ts
  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0]
  const authCookieName = `sb-${projectRef}-auth-token`
  function sessionCookieValue(session: any) {
    return `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
  }
  ```
- The project connects to a **remote** Supabase instance, not local. `NEXT_PUBLIC_SUPABASE_URL=https://mpythoirxidkauerttak.supabase.co`. `supabase db push` pushes to remote.
- `authedClient(accessToken)` from `tests/fixtures/factories.ts` uses Bearer header auth and works correctly for RLS testing via Supabase JS client.

## Open Risks

- Pre-existing HTTP auth cookie mismatch in integration tests will cause task_04 HTTP-level 403 tests to fail unless fixed. Fix: use `sb-mpythoirxidkauerttak-auth-token` cookie name, or switch those tests to Supabase client pattern. Task_03 worked around this by using Supabase client tests for authenticated scenarios.
- Pre-existing unit test failures in `tests/unit/get-leagues-hub.test.ts` (3 failures) caused by modified `lib/leagues/get-leagues-hub.ts` already in the working tree. Confirmed via stash isolation — not caused by tasks 01–03.
- Cross-task integration test (user_onboarded_at after PATCH) was resolved in task_04 — the 204 test verifies DB state via adminClient after the HTTP PATCH.

## Handoffs

- task_01 → task_02: Column and RLS policy are live. TypeScript type extension can proceed immediately.
- task_04 → task_05: PATCH endpoint live at `app/api/leagues/[id]/me/route.ts`. task_05's `LeagueWelcomeModal` should call `PATCH /api/leagues/${leagueId}/me` on mount (no body, expect 204).
- task_05 → task_06: `LeagueWelcomeModal` component ready at `components/LeagueWelcomeModal.tsx`. Props: `leagueId`, `leagueName`, `inviteToken`, `role: 'admin'|'member'`, `onComplete: () => void`. Import and render conditionally when `data.user_onboarded_at === null`.
- **jsdom clipboard test pattern**: `userEvent.setup()` installs its own Clipboard stub. To mock clipboard in unit tests, call `Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mockFn } })` AFTER `userEvent.setup()`, not before or in beforeEach.
