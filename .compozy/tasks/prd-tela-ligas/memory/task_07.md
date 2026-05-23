# Task Memory: task_07.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Change fallback redirect in `app/auth/callback-redirect/page.tsx` from `/dashboard` to `/ligas`. Invite redirect path (`sessionStorage.inviteRedirect`) unchanged and still takes precedence.

## Important Decisions

- Tests written in `tests/unit/callback-redirect.test.tsx` (jsdom), NOT in `tests/integration/auth.test.ts`. Reason: `auth.test.ts` is HTTP-level and requires a live Supabase server; callback redirect is a client-side component whose behavior must be tested in a browser/jsdom environment. This follows the same pattern as `tests/unit/ligas-page.test.tsx`.

## Learnings

- None beyond what is captured in shared memory (client component → tests/unit jsdom pattern, which was promoted).

## Files / Surfaces

- `app/auth/callback-redirect/page.tsx` — line 19: `router.push('/dashboard')` → `router.push('/ligas')` (one character change in path string)
- `tests/unit/callback-redirect.test.tsx` — new file, 6 tests: smoke, loading state, fallback to /ligas, invite redirect preserved, sessionStorage cleared after consume, other keys unaffected

## Errors / Corrections

None.

## Ready for Next Run

Task completed. No follow-up items.
